const currentHost = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
export const API_URL = `http://${currentHost}:5000`;
export const RPC_URL = `http://${currentHost}:8545`;
export const ADDRESSES = { base: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE", optimized: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed" };
export const DEMO_ACCOUNTS = { authority: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", buyer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", farmer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" };
export const DEFAULT_DEMO_LAND_ID = String(Date.now());
export const NAV = [["overview", "Dashboard"], ["farmer", "My land & registration"], ["agent", "Revenue officer desk"], ["registry", "Land registration"], ["transfer", "Mutation & transfer"], ["documents", "RTC & documents"], ["accounts", "Officer accounts"], ["analytics", "Gas analysis"], ["loadtest", "Workload benchmark (10, 100, 500)"], ["audit", "Audit register"]];
export const PORTALS = {
  citizen: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  farmer: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  purchaser: { label: "Citizen portal", account: "buyer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  officer: { label: "Revenue Officer portal", account: "authority", defaultView: "agent", views: ["overview", "agent", "registry", "transfer", "documents"] },
  admin: { label: "System Administrator", account: "authority", defaultView: "analytics", views: ["overview", "accounts", "analytics", "loadtest", "audit"] }
};
export const COMMON_ABI = ["function registerLand(uint256,address,string,string,uint256)", "function registerLand(uint256,address,bytes32,uint96)", "function requestTransfer(uint256,address)", "function approveTransfer(uint256)", "function transferOwnership(uint256)", "function registrars(address) view returns (bool)"];
export const BASE_ABI = [...COMMON_ABI, "function getLandDetails(uint256) returns (uint256,string,string,uint256,address,address,uint8,address[])"];
export const OPTIMIZED_ABI = [...COMMON_ABI, "function getLandDetails(uint256) returns (address,uint96,bytes32,address,uint8,address[])", "error NotRegistrar()", "error ZeroAddress()", "error InvalidArea()", "error LandNotRegistered()", "error DuplicateRegistration()", "error DuplicateParcel()", "error NotCurrentOwner()", "error InvalidNewOwner()", "error TransferAlreadyActive()", "error TransferNotRequested()", "error TransferNotApproved()", "error NotPendingOwner()"];
export const statusText = ["No transfer", "Requested", "Approved"];
export const errorText = { NotRegistrar: "Registration and approval require a registrar account.", DuplicateRegistration: "This land ID is already registered. Choose a new land ID.", DuplicateParcel: "This Survey Number and revenue location are already registered. A second blockchain land ID cannot be created for the same parcel.", InvalidArea: "Area must be greater than zero.", ZeroAddress: "An owner or buyer address is missing or invalid.", NotCurrentOwner: "Only the current owner can request a transfer.", TransferAlreadyActive: "A transfer is already active for this land ID.", TransferNotRequested: "Request the transfer before approving it.", TransferNotApproved: "Approve the transfer before the buyer accepts it.", NotPendingOwner: "Only the selected buyer can accept this transfer.", LandNotRegistered: "This land ID has not been registered." };
export const baseErrorText = [["duplicate land registration", errorText.DuplicateRegistration], ["duplicate survey and location", errorText.DuplicateParcel], ["area must be positive", errorText.InvalidArea], ["owner is zero address", errorText.ZeroAddress], ["new owner is zero address", errorText.ZeroAddress], ["new owner is current owner", "Choose a buyer who is different from the current owner."], ["caller is not owner", errorText.NotCurrentOwner], ["transfer already active", errorText.TransferAlreadyActive], ["transfer not requested", errorText.TransferNotRequested], ["transfer not approved", errorText.TransferNotApproved], ["caller is not pending owner", errorText.NotPendingOwner], ["land is not registered", errorText.LandNotRegistered], ["caller is not registrar", errorText.NotRegistrar]];
export const DEMO_KEYS = {
  authority: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  buyer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  farmer: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
};
