// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title OptimizedLandRegistry
/// @notice Gas-conscious land registration contract for comparison with BaseLandRegistry.
/// @dev Optimization choices:
/// - Stores a bytes32 metadata hash instead of dynamic strings.
/// - Packs owner and area into one storage slot by using uint96 for area.
/// - Uses custom errors instead of revert strings.
/// - Avoids redundant writes where a field already has the desired default value.
/// - Keeps ownership history because it is a functional requirement, but stores only addresses.
contract OptimizedLandRegistry {
    /// @notice Transfer status encoded as a small integer to reduce storage overhead.
    enum TransferStatus {
        None,
        Requested,
        Approved
    }

    /// @notice Compact land record.
    /// @dev Slot layout is intentionally compact:
    /// slot 1: currentOwner address, area uint96
    /// slot 2: metadataHash
    /// slot 3: pendingOwner
    /// slot 4: transferStatus uint8 plus registered bool
    /// slot 5: ownershipHistory dynamic array pointer
    struct Land {
        address currentOwner;
        uint96 area;
        bytes32 metadataHash;
        address pendingOwner;
        TransferStatus transferStatus;
        bool registered;
        address[] ownershipHistory;
    }

    address public immutable admin;

    mapping(address => bool) public registrars;
    mapping(uint256 => Land) private lands;
    mapping(bytes32 => bool) private registeredParcels;

    error NotAdmin();
    error NotRegistrar();
    error ZeroAddress();
    error InvalidArea();
    error AreaTooLarge();
    error LandNotRegistered();
    error DuplicateRegistration();
    error DuplicateParcel();
    error NotCurrentOwner();
    error InvalidNewOwner();
    error TransferAlreadyActive();
    error TransferNotRequested();
    error TransferNotApproved();
    error NotPendingOwner();

    event RegistrarUpdated(address indexed registrar, bool enabled);
    event LandRegistered(uint256 indexed landId, address indexed owner, bytes32 indexed metadataHash, uint96 area);
    event TransferRequested(uint256 indexed landId, address indexed from, address indexed to);
    event TransferApproved(uint256 indexed landId, address indexed registrar, address indexed to);
    event OwnershipTransferred(uint256 indexed landId, address indexed previousOwner, address indexed newOwner);
    event LandDetailsRead(uint256 indexed landId, address indexed reader);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyRegistrar() {
        if (!registrars[msg.sender]) revert NotRegistrar();
        _;
    }

    modifier onlyRegisteredLand(uint256 landId) {
        if (!lands[landId].registered) revert LandNotRegistered();
        _;
    }

    constructor() {
        admin = msg.sender;
        registrars[msg.sender] = true;
        emit RegistrarUpdated(msg.sender, true);
    }

    /// @notice Grants or revokes registrar privileges.
    /// @dev Writes exactly one role slot and emits one audit event.
    /// @param registrar Account whose role should be updated.
    /// @param enabled True to grant the role, false to revoke it.
    function setRegistrar(address registrar, bool enabled) external onlyAdmin {
        if (registrar == address(0)) revert ZeroAddress();
        registrars[registrar] = enabled;
        emit RegistrarUpdated(registrar, enabled);
    }

    /// @notice Registers a new land parcel using a precomputed metadata hash.
    /// @dev Off-chain systems should hash a normalized Survey Number and revenue location
    /// with a deterministic schema. This both avoids dynamic strings and prevents a
    /// physical parcel being registered twice under two different generated IDs.
    /// @param landId Unique parcel identifier from the land authority.
    /// @param owner Initial legal owner.
    /// @param metadataHash Hash of off-chain land metadata.
    /// @param area Parcel area. uint96 is used for packing and is enough for practical land units.
    function registerLand(uint256 landId, address owner, bytes32 metadataHash, uint96 area) external onlyRegistrar {
        Land storage land = lands[landId];

        if (land.registered) revert DuplicateRegistration();
        if (owner == address(0)) revert ZeroAddress();
        if (area == 0) revert InvalidArea();
        if (registeredParcels[metadataHash]) revert DuplicateParcel();

        land.currentOwner = owner;
        land.area = area;
        land.metadataHash = metadataHash;
        land.registered = true;
        land.ownershipHistory.push(owner);
        registeredParcels[metadataHash] = true;

        emit LandRegistered(landId, owner, metadataHash, area);
    }

    /// @notice Starts a transfer request from the current owner to a proposed new owner.
    /// @param landId Registered land identifier.
    /// @param newOwner Proposed recipient of the land.
    function requestTransfer(uint256 landId, address newOwner) external onlyRegisteredLand(landId) {
        Land storage land = lands[landId];

        if (msg.sender != land.currentOwner) revert NotCurrentOwner();
        if (newOwner == address(0) || newOwner == land.currentOwner) revert InvalidNewOwner();
        if (land.transferStatus != TransferStatus.None) revert TransferAlreadyActive();

        land.pendingOwner = newOwner;
        land.transferStatus = TransferStatus.Requested;

        emit TransferRequested(landId, msg.sender, newOwner);
    }

    /// @notice Approves a pending transfer after registrar-side verification.
    /// @param landId Registered land identifier.
    function approveTransfer(uint256 landId) external onlyRegistrar onlyRegisteredLand(landId) {
        Land storage land = lands[landId];

        if (land.transferStatus != TransferStatus.Requested) revert TransferNotRequested();

        land.transferStatus = TransferStatus.Approved;

        emit TransferApproved(landId, msg.sender, land.pendingOwner);
    }

    /// @notice Finalizes an approved transfer and appends the recipient to history.
    /// @dev Clears pendingOwner to receive a gas refund on supported networks and prevent stale data.
    /// @param landId Registered land identifier.
    function transferOwnership(uint256 landId) external onlyRegisteredLand(landId) {
        Land storage land = lands[landId];

        if (land.transferStatus != TransferStatus.Approved) revert TransferNotApproved();
        if (msg.sender != land.pendingOwner) revert NotPendingOwner();

        address previousOwner = land.currentOwner;
        address newOwner = land.pendingOwner;

        land.currentOwner = newOwner;
        delete land.pendingOwner;
        land.transferStatus = TransferStatus.None;
        land.ownershipHistory.push(newOwner);

        emit OwnershipTransferred(landId, previousOwner, newOwner);
    }

    /// @notice Returns compact details for a registered parcel.
    /// @dev This function emits a read event for parity with the base contract. For pure
    /// off-chain reads, prefer eth_call to avoid mining a transaction.
    /// @param landId Registered land identifier.
    function getLandDetails(uint256 landId)
        external
        onlyRegisteredLand(landId)
        returns (
            address currentOwner,
            uint96 area,
            bytes32 metadataHash,
            address pendingOwner,
            TransferStatus transferStatus,
            address[] memory ownershipHistory
        )
    {
        Land storage land = lands[landId];
        emit LandDetailsRead(landId, msg.sender);

        return (
            land.currentOwner,
            land.area,
            land.metadataHash,
            land.pendingOwner,
            land.transferStatus,
            land.ownershipHistory
        );
    }
}
