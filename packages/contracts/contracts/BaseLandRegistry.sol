// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title BaseLandRegistry
/// @notice Reference implementation for land registration and transfer workflows.
/// @dev This contract favors readability and explicit storage over gas efficiency so it
/// can be compared against OptimizedLandRegistry in gas-cost experiments.
contract BaseLandRegistry {
    /// @notice Operational state for a land parcel.
    enum TransferStatus {
        None,
        Requested,
        Approved
    }

    /// @notice Full land record with human-readable metadata.
    /// @dev Dynamic strings are intentionally stored here in the base contract even
    /// though they are expensive. This makes it useful as a baseline for analysis.
    struct Land {
        uint256 landId;
        string surveyNumber;
        string location;
        uint256 area;
        address currentOwner;
        address pendingOwner;
        bool registered;
        TransferStatus transferStatus;
        address[] ownershipHistory;
    }

    /// @notice Administrator that can assign or remove registrar privileges.
    address public immutable admin;

    /// @notice Accounts allowed to register land and approve transfers.
    mapping(address => bool) public registrars;

    /// @notice Land records keyed by unique land ID.
    mapping(uint256 => Land) private lands;

    /// @notice Canonical Survey No. and revenue-location fingerprints already registered.
    /// @dev Prevents the same physical parcel being registered again under a different generated ID.
    mapping(bytes32 => bool) private registeredParcels;

    event RegistrarUpdated(address indexed registrar, bool enabled);
    event LandRegistered(
        uint256 indexed landId,
        address indexed owner,
        string surveyNumber,
        string location,
        uint256 area
    );
    event TransferRequested(uint256 indexed landId, address indexed from, address indexed to);
    event TransferApproved(uint256 indexed landId, address indexed registrar, address indexed to);
    event OwnershipTransferred(uint256 indexed landId, address indexed previousOwner, address indexed newOwner);
    event LandDetailsRead(uint256 indexed landId, address indexed reader);

    modifier onlyAdmin() {
        require(msg.sender == admin, "BaseLandRegistry: caller is not admin");
        _;
    }

    modifier onlyRegistrar() {
        require(registrars[msg.sender], "BaseLandRegistry: caller is not registrar");
        _;
    }

    modifier onlyRegisteredLand(uint256 landId) {
        require(lands[landId].registered, "BaseLandRegistry: land is not registered");
        _;
    }

    constructor() {
        admin = msg.sender;
        registrars[msg.sender] = true;
        emit RegistrarUpdated(msg.sender, true);
    }

    /// @notice Grants or revokes registrar privileges.
    /// @param registrar Account whose role should be updated.
    /// @param enabled True to grant the role, false to revoke it.
    function setRegistrar(address registrar, bool enabled) external onlyAdmin {
        require(registrar != address(0), "BaseLandRegistry: registrar is zero address");
        registrars[registrar] = enabled;
        emit RegistrarUpdated(registrar, enabled);
    }

    /// @notice Registers a new land parcel for an owner.
    /// @dev Duplicate registration is prevented both by land ID and by survey/location fingerprint.
    /// @param landId Unique parcel identifier from the land authority.
    /// @param owner Initial legal owner.
    /// @param surveyNumber Human-readable survey number.
    /// @param location Human-readable parcel location.
    /// @param area Parcel area in the chosen off-chain unit.
    function registerLand(
        uint256 landId,
        address owner,
        string calldata surveyNumber,
        string calldata location,
        uint256 area
    ) external onlyRegistrar {
        require(!lands[landId].registered, "BaseLandRegistry: duplicate land registration");
        require(owner != address(0), "BaseLandRegistry: owner is zero address");
        require(area > 0, "BaseLandRegistry: area must be positive");
        bytes32 parcelFingerprint = keccak256(abi.encodePacked(surveyNumber, "|", location));
        require(!registeredParcels[parcelFingerprint], "BaseLandRegistry: duplicate survey and location");

        Land storage land = lands[landId];
        land.landId = landId;
        land.surveyNumber = surveyNumber;
        land.location = location;
        land.area = area;
        land.currentOwner = owner;
        land.registered = true;
        land.transferStatus = TransferStatus.None;
        land.ownershipHistory.push(owner);
        registeredParcels[parcelFingerprint] = true;

        emit LandRegistered(landId, owner, surveyNumber, location, area);
    }

    /// @notice Starts a transfer request from the current owner to a proposed new owner.
    /// @param landId Registered land identifier.
    /// @param newOwner Proposed recipient of the land.
    function requestTransfer(uint256 landId, address newOwner) external onlyRegisteredLand(landId) {
        Land storage land = lands[landId];
        require(msg.sender == land.currentOwner, "BaseLandRegistry: caller is not owner");
        require(newOwner != address(0), "BaseLandRegistry: new owner is zero address");
        require(newOwner != land.currentOwner, "BaseLandRegistry: new owner is current owner");
        require(land.transferStatus == TransferStatus.None, "BaseLandRegistry: transfer already active");

        land.pendingOwner = newOwner;
        land.transferStatus = TransferStatus.Requested;

        emit TransferRequested(landId, msg.sender, newOwner);
    }

    /// @notice Approves an owner-requested land transfer.
    /// @dev Approval is separated from execution to model administrative verification.
    /// @param landId Registered land identifier.
    function approveTransfer(uint256 landId) external onlyRegistrar onlyRegisteredLand(landId) {
        Land storage land = lands[landId];
        require(land.transferStatus == TransferStatus.Requested, "BaseLandRegistry: transfer not requested");

        land.transferStatus = TransferStatus.Approved;

        emit TransferApproved(landId, msg.sender, land.pendingOwner);
    }

    /// @notice Finalizes an approved transfer and records ownership history.
    /// @dev The pending owner executes acceptance, giving the workflow an explicit final step.
    /// @param landId Registered land identifier.
    function transferOwnership(uint256 landId) external onlyRegisteredLand(landId) {
        Land storage land = lands[landId];
        require(land.transferStatus == TransferStatus.Approved, "BaseLandRegistry: transfer not approved");
        require(msg.sender == land.pendingOwner, "BaseLandRegistry: caller is not pending owner");

        address previousOwner = land.currentOwner;
        address newOwner = land.pendingOwner;

        land.currentOwner = newOwner;
        land.pendingOwner = address(0);
        land.transferStatus = TransferStatus.None;
        land.ownershipHistory.push(newOwner);

        emit OwnershipTransferred(landId, previousOwner, newOwner);
    }

    /// @notice Returns full details for a registered parcel.
    /// @dev Emits a read event for auditability, although this makes transaction-style reads cost gas.
    /// Frontends should call this as a view through eth_call when they do not need the event.
    /// @param landId Registered land identifier.
    function getLandDetails(uint256 landId)
        external
        onlyRegisteredLand(landId)
        returns (
            uint256 id,
            string memory surveyNumber,
            string memory location,
            uint256 area,
            address currentOwner,
            address pendingOwner,
            TransferStatus transferStatus,
            address[] memory ownershipHistory
        )
    {
        Land storage land = lands[landId];
        emit LandDetailsRead(landId, msg.sender);

        return (
            land.landId,
            land.surveyNumber,
            land.location,
            land.area,
            land.currentOwner,
            land.pendingOwner,
            land.transferStatus,
            land.ownershipHistory
        );
    }
}
