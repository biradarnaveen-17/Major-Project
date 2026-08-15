import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import "./styles.css";

const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? window.location.origin : "http://localhost:5000";
const RPC_URL = "http://localhost:8545";
const ADDRESSES = { base: "0x5FbDB2315678afecb367f032d93F642f64180aa3", optimized: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" };
const DEMO_ACCOUNTS = { authority: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", buyer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", farmer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" };
const DEFAULT_DEMO_LAND_ID = String(Date.now());
const NAV = [["overview", "Dashboard"], ["farmer", "My land & registration"], ["agent", "Revenue officer desk"], ["registry", "Land registration"], ["transfer", "Mutation & transfer"], ["documents", "RTC & documents"], ["accounts", "Officer accounts"], ["analytics", "Gas analysis"], ["audit", "Audit register"]];
const PORTALS = {
  citizen: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  farmer: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  purchaser: { label: "Citizen portal", account: "buyer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  officer: { label: "Revenue Officer portal", account: "authority", defaultView: "agent", views: ["overview", "agent", "registry", "transfer", "documents"] },
  admin: { label: "System Administrator", account: "authority", defaultView: "analytics", views: ["overview", "accounts", "analytics", "audit"] }
};
const COMMON_ABI = ["function registerLand(uint256,address,string,string,uint256)", "function registerLand(uint256,address,bytes32,uint96)", "function requestTransfer(uint256,address)", "function approveTransfer(uint256)", "function transferOwnership(uint256)", "function registrars(address) view returns (bool)"];
const BASE_ABI = [...COMMON_ABI, "function getLandDetails(uint256) returns (uint256,string,string,uint256,address,address,uint8,address[])"];
const OPTIMIZED_ABI = [...COMMON_ABI, "function getLandDetails(uint256) returns (address,uint96,bytes32,address,uint8,address[])", "error NotRegistrar()", "error ZeroAddress()", "error InvalidArea()", "error LandNotRegistered()", "error DuplicateRegistration()", "error DuplicateParcel()", "error NotCurrentOwner()", "error InvalidNewOwner()", "error TransferAlreadyActive()", "error TransferNotRequested()", "error TransferNotApproved()", "error NotPendingOwner()"];
const statusText = ["No transfer", "Requested", "Approved"];
const errorText = { NotRegistrar: "Registration and approval require a registrar account.", DuplicateRegistration: "This land ID is already registered. Choose a new land ID.", DuplicateParcel: "This Survey Number and revenue location are already registered. A second blockchain land ID cannot be created for the same parcel.", InvalidArea: "Area must be greater than zero.", ZeroAddress: "An owner or buyer address is missing or invalid.", NotCurrentOwner: "Only the current owner can request a transfer.", TransferAlreadyActive: "A transfer is already active for this land ID.", TransferNotRequested: "Request the transfer before approving it.", TransferNotApproved: "Approve the transfer before the buyer accepts it.", NotPendingOwner: "Only the selected buyer can accept this transfer.", LandNotRegistered: "This land ID has not been registered." };
const baseErrorText = [["duplicate land registration", errorText.DuplicateRegistration], ["duplicate survey and location", errorText.DuplicateParcel], ["area must be positive", errorText.InvalidArea], ["owner is zero address", errorText.ZeroAddress], ["new owner is zero address", errorText.ZeroAddress], ["new owner is current owner", "Choose a buyer who is different from the current owner."], ["caller is not owner", errorText.NotCurrentOwner], ["transfer already active", errorText.TransferAlreadyActive], ["transfer not requested", errorText.TransferNotRequested], ["transfer not approved", errorText.TransferNotApproved], ["caller is not pending owner", errorText.NotPendingOwner], ["land is not registered", errorText.LandNotRegistered], ["caller is not registrar", errorText.NotRegistrar]];

function Field({ label, ...props }) { return <label className="field">{label}<input {...props} /></label>; }
function SelectField({ label, children, ...props }) { return <label className="field">{label}<select {...props}>{children}</select></label>; }
function Card({ title, children, action }) { return <section className="panel"><div className="panel-title"><h2>{title}</h2>{action}</div>{children}</section>; }
function Metric({ label, value, caption, tone = "blue" }) { return <article className={`metric-card ${tone}`}><p>{label}</p><strong>{value}</strong><small>{caption}</small></article>; }
function Pill({ children, tone = "neutral" }) { return <span className={`pill ${tone}`}>{children}</span>; }
function displayError(error, registry) {
  const rawMessage = error?.shortMessage || error?.reason || error?.message || "Transaction failed.";
  if (rawMessage.includes("missing revert data")) return "This land ID has not been registered on the active contract.";
  const name = error?.revert?.name || error?.errorName;
  if (errorText[name]) return errorText[name];
  const rawData = [error?.data, error?.info?.error?.data, error?.error?.data].find((value) => typeof value === "string");
  if (rawData && registry) {
    try {
      const decoded = registry.interface.parseError(rawData);
      if (errorText[decoded?.name]) return errorText[decoded.name];
    } catch { /* Fall back to provider message */ }
  }
  const details = [error?.revert?.reason, error?.reason, error?.message, rawMessage].filter(Boolean).join(" ").toLowerCase();
  const match = baseErrorText.find(([fragment]) => details.includes(fragment));
  return match ? match[1] : rawMessage;
}
function shortAddress(value) { return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "Not connected"; }
function parcelMetadata(survey, district, taluk, hobli, village) { return [survey, village, hobli, taluk, district].map((value) => String(value || "").trim().toLowerCase()).join("|"); }
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [registerForm, setRegisterForm] = useState({ role: "farmer", fullName: "", username: "", gender: "", dateOfBirth: "", aadhaarNumber: "", mobile: "", email: "" });
  const [loginForm, setLoginForm] = useState({ identifier: "", captchaAnswer: "" });
  const [captcha, setCaptcha] = useState(null);
  const [pendingLogin, setPendingLogin] = useState(null);
  const [code, setCode] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const apiRequest = async (path, options) => { const response = await fetch(`${API_URL}${path}`, options); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || "Request failed."); return body; };
  const refreshCaptcha = async () => { try { setCaptcha(await apiRequest("/api/auth/captcha")); setLoginForm((current) => ({ ...current, captchaAnswer: "" })); } catch (requestError) { setError(requestError.message); } };
  useEffect(() => { refreshCaptcha(); }, []);
  const updateRegistration = (key) => (event) => setRegisterForm((current) => ({ ...current, [key]: event.target.value }));
  const submitRegistration = async (event) => { event.preventDefault(); setError(""); try { const result = await apiRequest("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(registerForm) }); setMessage(`${result.user.fullName} registered successfully. Sign in using ${result.user.username} or ${result.user.email}.`); setLoginForm({ identifier: result.user.email, captchaAnswer: "" }); setMode("login"); await refreshCaptcha(); } catch (requestError) { setError(requestError.message); } };
  const requestCode = async (event) => {
    event.preventDefault();
    setError("");
    if (!captcha) return;
    try {
      const result = await apiRequest("/api/auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...loginForm, captchaId: captcha.captchaId, portalMode: mode })
      });
      setPendingLogin(result);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
      await refreshCaptcha();
    }
  };
  const verifyCode = async (event) => { event.preventDefault(); setError(""); try { const result = await apiRequest("/api/auth/verify-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: pendingLogin.userId, code: code.replace(/\D/g, "") }) }); await onLogin(result); } catch (requestError) { setError(requestError.message); } };
  return <main className="login-shell"><section className="login-intro"><div className="brand"><span className="brand-mark">ಭೂ</span><div><strong>BhoomiChain</strong><small>Karnataka land-records demonstrator</small></div></div><p className="eyebrow">SECURE ROLE-BASED ACCESS</p><h1>One land workflow.<br />Verified identities.</h1><p>Citizen accounts register with identity details. Revenue Officers verify requests and approve ownership mutations. Every sign-in requires username/email, CAPTCHA, and email code.</p><div className="login-flow"><span>Citizen account registration</span><span>Officer verification desk</span><span>CAPTCHA & Email code</span><span>Role-limited workspace</span></div></section><section className="login-card"><div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setLoginForm((c) => ({ ...c, identifier: "" })); refreshCaptcha(); }}>Citizen Sign in</button><button type="button" className={mode === "officer" ? "active" : ""} onClick={() => { setMode("officer"); setLoginForm((c) => ({ ...c, identifier: "revenue.officer@bhoomi.gov.in" })); refreshCaptcha(); }}>Revenue Officer Sign in</button></div>{message && <p className="auth-message">{message}</p>}{error && <p className="login-error">{error}</p>}{mode === "register" ? <form onSubmit={submitRegistration}><p className="eyebrow">PUBLIC REGISTRATION</p><h2>Citizen account</h2><SelectField label="Account type" value={registerForm.role} onChange={updateRegistration("role")}><option value="citizen">Citizen (Land Owner & Purchaser)</option></SelectField><div className="form-grid"><Field label="Full name" required value={registerForm.fullName} onChange={updateRegistration("fullName")} /><Field label="Username" required value={registerForm.username} onChange={updateRegistration("username")} placeholder="e.g. sudeep" /><SelectField label="Gender" required value={registerForm.gender} onChange={updateRegistration("gender")}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></SelectField><Field label="Date of birth" required type="date" value={registerForm.dateOfBirth} onChange={updateRegistration("dateOfBirth")} /><Field label="Aadhaar number" required inputMode="numeric" maxLength="12" value={registerForm.aadhaarNumber} onChange={updateRegistration("aadhaarNumber")} /><Field label="Mobile number" required inputMode="numeric" maxLength="10" value={registerForm.mobile} onChange={updateRegistration("mobile")} /><Field label="Email address" required type="email" value={registerForm.email} onChange={updateRegistration("email")} /></div><p className="hint">Aadhaar is validated and stored only as a secure hash with the last four digits; it is never put on blockchain.</p><button className="login-button" type="submit">Create account</button><button type="button" className="text-button" style={{ width: "100%", marginTop: "10px" }} onClick={() => setMode("login")}>Already have an account? Sign in</button></form> : !pendingLogin ? <form onSubmit={requestCode}><p className="eyebrow">{mode === "officer" ? "REVENUE OFFICER PORTAL" : "PASSWORDLESS SIGN IN"}</p><h2>{mode === "officer" ? "Revenue Officer Sign In" : "Verify your identity"}</h2><Field label="Username or email address" required value={loginForm.identifier} onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))} /><div className="captcha-row">{captcha?.image ? <img src={captcha.image} alt="CAPTCHA" className="captcha-image" /> : <strong>Loading CAPTCHA...</strong>}<button type="button" className="text-button" onClick={refreshCaptcha}>Refresh</button></div><Field label="Enter the characters shown above (case-sensitive)" required value={loginForm.captchaAnswer} onChange={(event) => setLoginForm((current) => ({ ...current, captchaAnswer: event.target.value }))} /><button className="login-button" type="submit">Send email verification code</button><p className="hint">{mode === "officer" ? "Demonstration Officer Account. Enter CAPTCHA and use code 123456." : "Enter your username or email address to receive your OTP."}</p></form> : <form onSubmit={verifyCode}><p className="eyebrow">EMAIL VERIFICATION</p><h2>Enter the one-time code</h2><p className="hint">A code was sent to {pendingLogin.maskedEmail}. It expires in 10 minutes.</p><Field label="6-digit verification code" required inputMode="numeric" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /><button className="login-button" type="submit">Verify and sign in</button><button type="button" className="text-button" onClick={() => { setPendingLogin(null); refreshCaptcha(); }}>Use another account</button></form>}<p className="login-note">Academic local demo — not an official Government of Karnataka portal.</p>{mode !== "register" && <div style={{ textAlign: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}><button type="button" className="text-button" style={{ fontSize: "0.95rem", fontWeight: "600", color: "#1e3a8a", textDecoration: "underline" }} onClick={() => setMode("register")}>Don't have an account? Create account</button></div>}</section></main>;
}

function RtcCertificateModal({ land, contractAddress, onClose, resolveName }) {
  if (!land) return null;
  const surveyNo = land.survey || "12/3A";
  const revenueLocation = land.location || "Harohalli, Yelahanka, Bengaluru North, Bengaluru Urban";
  const ownerName = resolveName ? resolveName(land.owner) : (land.ownerName || "Sri / Smt. Naveen Rayagondappa Biradar");
  const qrData = encodeURIComponent(`BhoomiChain Verified Record | Land ID: ${land.id} | Owner: ${ownerName} (${land.owner}) | Contract: ${contractAddress || ''}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

  return (
    <div className="certificate-overlay" onClick={onClose}>
      <div className="certificate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="certificate-actions">
          <button onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
          <button className="quiet" onClick={onClose}>✖ Close</button>
        </div>
        <div className="rtc-certificate-paper">
          <div className="rtc-header">
            <div className="rtc-emblem">🏛️</div>
            <h2>Government of Karnataka</h2>
            <h3>Revenue Department — BhoomiChain Land Records</h3>
            <p>Digital Record of Rights, Tenancy and Crops (RTC / Pahani)</p>
          </div>

          <div className="rtc-badge-banner">
            <span className="rtc-badge-icon">🛡️</span>
            <div className="rtc-badge-text">
              <strong>VERIFIED ON ETHEREUM BLOCKCHAIN</strong>
              <small>Tamper-proof record secured by Ethereum Smart Contract</small>
            </div>
          </div>

          <div className="rtc-body-grid">
            <table className="rtc-details-table">
              <tbody>
                <tr><th>Blockchain Land ID</th><td>#{land.id}</td></tr>
                <tr><th>Khatedar / Owner Name</th><td><strong style={{ fontSize: "1.05rem", color: "#1e3a8a" }}>Sri / Smt. {ownerName}</strong></td></tr>
                <tr><th>Khatedar Wallet Address</th><td>{land.owner}</td></tr>
                <tr><th>Survey Number</th><td>{surveyNo}</td></tr>
                <tr><th>Revenue Location</th><td>{revenueLocation}</td></tr>
                <tr><th>Extent (Area)</th><td>{land.area} Gunta ({(Number(land.area) / 40).toFixed(2)} Acres)</td></tr>
                <tr><th>Transfer Status</th><td>{statusText[land.status] || "Registered"}</td></tr>
                <tr><th>Blockchain Contract</th><td>{contractAddress}</td></tr>
                {land.metadataHash && <tr><th>Metadata Hash</th><td>{land.metadataHash}</td></tr>}
              </tbody>
            </table>

            <div className="rtc-qr-container">
              <img src={qrUrl} alt="Blockchain Verification QR Code" />
              <p>Scan to Verify Title On-Chain</p>
            </div>
          </div>

          {land.history && land.history.length > 0 && (
            <div className="rtc-history-box">
              <strong>Chain of Title Ownership History:</strong>
              <p>{land.history.map((h) => resolveName ? resolveName(h) : h).join(" ➔ ")}</p>
            </div>
          )}

          <div className="rtc-footer">
            <div>
              <p>Issued by: <strong>BhoomiChain Smart Contract Authority</strong></p>
            </div>
            <div>
              <p>State Code: <strong>KA-29 (Karnataka)</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BhoomiApp() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("overview");
  const [variant, setVariant] = useState("optimized");
  const [address, setAddress] = useState(ADDRESSES.optimized);
  const [wallet, setWallet] = useState(null);
  const [chainStats, setChainStats] = useState(null);
  const [report, setReport] = useState(null);
  const [land, setLand] = useState(null);
  const [certificateLand, setCertificateLand] = useState(null);
  const [liveTransactions, setLiveTransactions] = useState([]);
  const [isRegistrar, setIsRegistrar] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState("Choose a portal to continue.");
  const [documents, setDocuments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [portalStats, setPortalStats] = useState({ documents: { total: 0, verified: 0, pending: 0 }, auditEntries: 0, benchmarkRuns: 0 });
  const [farmer, setFarmer] = useState(null);
  const [landRequests, setLandRequests] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [officerForm, setOfficerForm] = useState({ fullName: "", username: "", email: "", mobile: "" });
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [documentForm, setDocumentForm] = useState({ landId: "", category: "RTC / Pahani extract", reference: "", hash: "" });
  const [form, setForm] = useState({ landId: DEFAULT_DEMO_LAND_ID, owner: "", survey: "12/3A", district: "Bengaluru Urban", taluk: "Bengaluru North", hobli: "Yelahanka", village: "Jakkur", area: "48", buyer: "", lookupId: "" });
  const [purchasers, setPurchasers] = useState([]);
  const provider = useMemo(() => wallet?.provider || new ethers.JsonRpcProvider(RPC_URL), [wallet]);
  const gasRows = report?.comparison || report?.rows || [];
  const lifecycleRows = gasRows.filter((row) => !["deployment", "getLandDetails"].includes(row.operation));
  const totalBaseLifecycleGas = lifecycleRows.reduce((sum, row) => sum + (row.baseGas || 0), 0);
  const totalOptimizedLifecycleGas = lifecycleRows.reduce((sum, row) => sum + (row.optimizedGas || 0), 0);
  const totalLifecycleSaving = totalBaseLifecycleGas - totalOptimizedLifecycleGas;
  const lifecycleSavingPercent = totalBaseLifecycleGas ? ((totalLifecycleSaving / totalBaseLifecycleGas) * 100).toFixed(1) : "0.0";
  const selectedLand = land?.id === String(form.landId) ? land : null;
  const currentAccount = wallet?.account?.toLowerCase();
  const isCurrentOwner = Boolean(selectedLand && currentAccount === selectedLand.owner.toLowerCase());
  const isPendingOwner = Boolean(selectedLand && currentAccount === selectedLand.pendingOwner.toLowerCase());
  const portal = session ? (PORTALS[session.user.role] || PORTALS.farmer) : PORTALS.farmer;
  const accountRole = session ? (session.user.role === "officer" ? "Revenue Officer" : session.user.role === "admin" ? "System Administrator" : session.user.role === "purchaser" ? "Purchaser" : "Farmer") : "Guest";
  const visibleNav = portal ? NAV.filter(([id]) => portal.views.includes(id)) : [];
  const myLandRequests = farmer
    ? landRequests.filter(
        (item) =>
          item.farmerId === farmer.id ||
          item.email === farmer.email ||
          (item.farmerName && session?.user?.fullName && item.farmerName.toLowerCase() === session.user.fullName.toLowerCase()) ||
          (item.walletAddress && wallet?.account && item.walletAddress.toLowerCase() === wallet.account.toLowerCase())
      )
    : [];

  const allMyHoldings = useMemo(() => {
    const currentAccount = wallet?.account?.toLowerCase();
    const list = myLandRequests.filter((item) => {
      if (item.status === "Registered on blockchain" && item.landId) {
        if (land && String(land.id) === String(item.landId)) {
          return land.owner?.toLowerCase() === currentAccount;
        }
      }
      return true;
    });
    if (land && land.owner?.toLowerCase() === currentAccount) {
      if (!list.some((item) => String(item.landId) === String(land.id))) {
        list.unshift({
          id: `chain-${land.id}`,
          surveyNumber: land.survey || `Land #${land.id}`,
          extent: land.area || "50",
          village: land.location ? land.location.split(",")[0] : "Bengaluru",
          hobli: land.location ? land.location.split(",")[1] || "" : "",
          taluk: land.location ? land.location.split(",")[2] || "" : "",
          district: land.location ? land.location.split(",")[3] || "" : "",
          status: "Registered on blockchain",
          landId: String(land.id),
          walletAddress: land.owner
        });
      }
    }
    return list;
  }, [myLandRequests, land, wallet]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateDocument = (key) => (event) => setDocumentForm((current) => ({ ...current, [key]: event.target.value }));
  const updateOfficer = (key) => (event) => setOfficerForm((current) => ({ ...current, [key]: event.target.value }));
  const estimateCost = (eth) => (Number(eth) * 3000).toFixed(4);

  async function api(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : { message: await response.text() };
    if (!response.ok) throw new Error(body.message || `API request failed (${response.status})`);
    if (!contentType.includes("application/json")) throw new Error("The local API returned an invalid response. Restart the backend with npm run start --workspace apps/backend.");
    return body;
  }
  async function loadPortalData() {
    const [dashboardResult, documentResult, auditResult, reportResult, requestResult, purchaserResult] = await Promise.allSettled([api("/api/dashboard"), api("/api/documents"), api("/api/audit"), api("/api/benchmarks/latest"), api("/api/land-requests"), api("/api/purchasers")]);
    if (dashboardResult.status === "fulfilled") setPortalStats(dashboardResult.value);
    if (documentResult.status === "fulfilled") setDocuments(documentResult.value);
    if (auditResult.status === "fulfilled") setAudit(auditResult.value);
    if (reportResult.status === "fulfilled") setReport(reportResult.value);
    if (requestResult.status === "fulfilled") setLandRequests(requestResult.value);
    if (purchaserResult.status === "fulfilled") setPurchasers(purchaserResult.value);
  }
  async function appendAudit(action, landId, detail) {
    try { const entry = await api("/api/audit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, landId, actor: accountRole, detail }) }); setAudit((current) => [entry, ...current]); } catch { /* The on-chain transaction remains the source of truth if the optional audit API is offline. */ }
  }
  async function loadOfficers(token = session?.token) {
    if (!token) return;
    try { setOfficers(await api("/api/admin/officers", { headers: { authorization: `Bearer ${token}` } })); } catch (error) { setMessage(error.message); }
  }
  async function createOfficer(event) {
    event.preventDefault();
    try {
      const result = await api("/api/admin/officers", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` }, body: JSON.stringify(officerForm) });
      setOfficers((current) => [result.officer, ...current]); setOfficerForm({ fullName: "", username: "", email: "", mobile: "" }); setMessage(`Revenue Officer account created for ${result.officer.fullName}.`);
    } catch (error) { setMessage(error.message); }
  }

const DEMO_KEYS = {
  authority: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  buyer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  farmer: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
};

  async function useDemoAccount(role, user) {
    try {
      let localProvider = new ethers.JsonRpcProvider(RPC_URL);
      let network;
      try {
        network = await localProvider.getNetwork();
      } catch {
        localProvider = new ethers.JsonRpcProvider("http://localhost:8545");
        network = await localProvider.getNetwork();
      }
      const chainId = Number(network?.chainId || 31337);
      
      let account;
      let privateKey;

      if (user?.id || user?.username) {
        privateKey = ethers.keccak256(ethers.toUtf8Bytes(String(user.id || user.username)));
        account = new ethers.Wallet(privateKey).address;
      } else {
        account = DEMO_ACCOUNTS[role] || DEMO_ACCOUNTS.farmer;
        privateKey = DEMO_KEYS[role] || DEMO_KEYS.farmer;
      }

      const signer = new ethers.Wallet(privateKey, localProvider);
      
      try {
        const balance = await localProvider.getBalance(account);
        if (balance < ethers.parseEther("0.1")) {
          const faucetSigner = new ethers.Wallet(DEMO_KEYS.authority, localProvider);
          const tx = await faucetSigner.sendTransaction({
            to: account,
            value: ethers.parseEther("1.0")
          });
          await tx.wait();
        }
      } catch (err) {
        console.warn("Auto-faucet funding skipped:", err.message);
      }

      setWallet({ provider: localProvider, signer, account, chainId });
      setForm((current) => ({ ...current, owner: account, buyer: "" }));
      setMessage(`${user?.fullName || role} connected to blockchain (${shortAddress(account)}).`);
    } catch (error) { setMessage(error.shortMessage || error.message); }
  }
  async function connectWallet() {
    if (!window.ethereum) return setMessage("MetaMask is required for a non-demo wallet.");
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      setWallet({ provider: browserProvider, signer, account: await signer.getAddress(), chainId: Number(network.chainId) });
      setMessage("Wallet connected.");
    } catch (error) { setMessage(error.shortMessage || error.message); }
  }
  async function signIn(authResult) {
    const role = authResult.user.role || "citizen";
    const portalRole = PORTALS[role] ? role : "citizen";
    await useDemoAccount(PORTALS[portalRole].account, authResult.user);
    setSession({ ...authResult, signedInAt: new Date().toISOString() });
    sessionStorage.setItem("bhoomichain_session", JSON.stringify(authResult));
    setView(PORTALS[portalRole].defaultView);
    window.location.hash = `/${portalRole}`;
    if (["citizen", "farmer", "purchaser"].includes(role)) {
      const activeWallet = authResult.user.username === "sudeep" ? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" : authResult.user.username === "raj" || authResult.user.username === "boss" ? "0x90F79bf6EB2c4f870365E785982E1f101E93b906" : role === "farmer" ? DEMO_ACCOUNTS.farmer : DEMO_ACCOUNTS.buyer;
      setFarmer({ id: authResult.user.id, name: authResult.user.fullName, email: authResult.user.email, mobile: authResult.user.mobile, walletAddress: activeWallet, verified: true });
      try {
        const savedFarmers = await api(`/api/farmers?email=${encodeURIComponent(authResult.user.email)}`);
        if (savedFarmers[0]) setFarmer((prev) => ({ ...prev, ...savedFarmers[0], walletAddress: activeWallet }));
      } catch { /* The sign-in view remains usable if the optional portal API is restarting. */ }
    }
    if (role === "admin") await loadOfficers(authResult.token);
  }
  function signOut() { sessionStorage.removeItem("bhoomichain_session"); setSession(null); setWallet(null); setIsRegistrar(null); setFarmer(null); setOfficers([]); setView("overview"); setMessage("Choose a portal to continue."); }
  function resolveName(addr) {
    if (!addr || addr === ethers.ZeroAddress) return "None";
    const clean = String(addr).toLowerCase();
    
    if (session?.user?.fullName && (String(wallet?.account || "").toLowerCase() === clean || String(session.user.walletAddress || "").toLowerCase() === clean)) {
      return session.user.fullName;
    }
    
    if (clean === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return "Sudeep (Purchaser)";
    if (clean === "0x90f79bf6eb2c4f870365e785982e1f101e93b906") return "Raj boss";
    if (clean === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return "Naveen Rayagondappa Biradar";
    if (clean === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") return "Karnataka Revenue Authority";
    
    const foundPurchaser = (purchasers || []).find((p) => String(p.walletAddress || "").toLowerCase() === clean);
    if (foundPurchaser && foundPurchaser.fullName) return foundPurchaser.fullName;

    const foundFarmer = landRequests.find((r) => String(r.walletAddress || "").toLowerCase() === clean);
    if (foundFarmer && foundFarmer.farmerName) return foundFarmer.farmerName;

    return "Khatedar (" + shortAddress(addr) + ")";
  }
  useEffect(() => {
    loadPortalData();
  }, [view, session]);

  useEffect(() => {
    if (purchasers.length > 0) {
      const currentAcc = (selectedLand?.owner || wallet?.account || "").toLowerCase();
      const available = purchasers.filter((p) => p.walletAddress.toLowerCase() !== currentAcc);
      if (available.length > 0 && (!form.buyer || !available.some((p) => p.walletAddress === form.buyer))) {
        setForm((current) => ({ ...current, buyer: available[0].walletAddress }));
      }
    }
  }, [purchasers, selectedLand, wallet]);

  useEffect(() => {
    loadPortalData();
    const savedSession = sessionStorage.getItem("bhoomichain_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.user?.role) signIn(parsed);
      } catch { sessionStorage.removeItem("bhoomichain_session"); }
    }
  }, []);
  useEffect(() => { if (portal && !portal.views.includes(view)) setView(portal.defaultView); }, [portal, view]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const localProvider = new ethers.JsonRpcProvider(RPC_URL);
        const [block, feeData] = await Promise.all([localProvider.getBlockNumber(), localProvider.getFeeData()]);
        if (active) setChainStats({ block, gasPrice: feeData.gasPrice || 0n });
      } catch {
        try {
          const fallbackProvider = new ethers.JsonRpcProvider("http://localhost:8545");
          const [block, feeData] = await Promise.all([fallbackProvider.getBlockNumber(), fallbackProvider.getFeeData()]);
          if (active) setChainStats({ block, gasPrice: feeData.gasPrice || 0n });
        } catch {
          if (active) setChainStats(null);
        }
      }
    };
    refresh(); const interval = setInterval(refresh, 5000); return () => { active = false; clearInterval(interval); };
  }, []);
  useEffect(() => {
    let active = true;
    if (session?.user?.role === "officer" || session?.user?.role === "admin") {
      setIsRegistrar(true);
      return undefined;
    }
    if (!wallet || !ethers.isAddress(address)) { setIsRegistrar(null); return undefined; }
    new ethers.Contract(address, COMMON_ABI, wallet.provider).registrars(wallet.account).then((value) => { if (active) setIsRegistrar(Boolean(value)); }).catch(() => {
      if (active) setIsRegistrar(session?.user?.role === "officer" || session?.user?.role === "admin");
    });
    return () => { active = false; };
  }, [wallet, address, session]);
  useEffect(() => {
    if (view === "transfer") {
      const activeId = localStorage.getItem("bhoomi_active_land_id") || form.landId;
      if (activeId) {
        setForm((current) => ({ ...current, landId: String(activeId), lookupId: String(activeId) }));
        findLand(activeId, true);
      }
    }
  }, [view]);

  function contract(withSigner = false, signer = wallet?.signer) {
    if (!ethers.isAddress(address)) throw new Error("Enter a valid deployed contract address.");
    if (withSigner && !signer) throw new Error("An account is still connecting. Try again in a moment.");
    return new ethers.Contract(address, variant === "base" ? BASE_ABI : OPTIMIZED_ABI, withSigner ? signer : provider);
  }
  async function signerFor(action, targetLand = selectedLand || land) {
    if (!wallet?.provider) return wallet?.signer;
    // On public networks like Polygon Amoy (chainId 80002), use the connected MetaMask signer if available
    if (wallet?.chainId === 80002 && wallet?.signer) return wallet.signer;
    if (action === "request" && targetLand?.owner && ethers.isAddress(targetLand.owner)) {
      const ownerAddr = targetLand.owner.toLowerCase();
      if (ownerAddr === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", wallet.provider);
      if (ownerAddr === "0x90f79bf6eb2c4f870365e785982e1f101e93b906") return new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", wallet.provider);
      if (ownerAddr === "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65") return new ethers.Wallet("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", wallet.provider);
      if (ownerAddr === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", wallet.provider);
    }
    if ((action === "approve" || action === "register") && session?.user?.role === "officer") {
      return new ethers.Wallet(DEMO_KEYS.authority, wallet.provider);
    }
    if (action === "transfer" && targetLand?.pendingOwner && ethers.isAddress(targetLand.pendingOwner)) {
      const buyerAddr = targetLand.pendingOwner.toLowerCase();
      if (buyerAddr === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", wallet.provider);
      if (buyerAddr === "0x90f79bf6eb2c4f870365e785982e1f101e93b906") return new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", wallet.provider);
      if (buyerAddr === "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65") return new ethers.Wallet("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", wallet.provider);
      if (buyerAddr === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", wallet.provider);
    }
    return wallet?.signer;
  }
  async function findLand(landId = form.lookupId, silent = false) {
    if (!landId) return null;
    try {
      localStorage.setItem("bhoomi_active_land_id", String(landId));
      let currentVariant = variant;
      let result = null;
      let foundVariant = null;
      try {
        result = await contract().getLandDetails.staticCall(landId);
        foundVariant = currentVariant;
      } catch {
        const altVariant = currentVariant === "optimized" ? "base" : "optimized";
        const altAddress = ADDRESSES[altVariant];
        const altContract = new ethers.Contract(altAddress, altVariant === "base" ? BASE_ABI : OPTIMIZED_ABI, provider);
        try {
          result = await altContract.getLandDetails.staticCall(landId);
          foundVariant = altVariant;
          setVariant(altVariant);
          setAddress(altAddress);
        } catch {
          foundVariant = null;
        }
      }
      if (!foundVariant || !result) {
        if (!silent) setMessage(`Land ID #${landId} has not been registered on the blockchain yet.`);
        setLand(null);
        return null;
      }
      const item = foundVariant === "base"
        ? { id: result[0].toString(), survey: result[1], location: result[2], area: result[3].toString(), owner: result[4], pendingOwner: result[5], status: Number(result[6]), history: result[7] }
        : { id: String(landId), metadataHash: result[2], area: result[1].toString(), owner: result[0], pendingOwner: result[3], status: Number(result[4]), history: result[5] };
      setLand(item);
      setForm((current) => ({ ...current, landId: String(landId), lookupId: String(landId) }));
      if (!silent) setMessage(`Land record #${landId} loaded from blockchain (${foundVariant === "optimized" ? "Optimized" : "Base"} contract).`);
      return item;
    } catch {
      if (!silent) setMessage(`Unable to retrieve land record #${landId}.`);
      setLand(null);
      return null;
    }
  }
  async function submit(action) {
    let registry;
    try {
      setBusyAction(action);
      let targetLand = selectedLand;
      if (action !== "register") {
        if (!targetLand || String(targetLand.id) !== String(form.landId)) {
          targetLand = await findLand(form.landId);
        }
        if (!targetLand) {
          throw new Error(`Land ID #${form.landId} is not registered on the active contract.`);
        }
      }
      const signer = await signerFor(action, targetLand);
      
      try {
        const signerAddress = await signer.getAddress();
        const signerBalance = await wallet.provider.getBalance(signerAddress);
        if (signerBalance < ethers.parseEther("0.1")) {
          const faucet = new ethers.Wallet(DEMO_KEYS.authority, wallet.provider);
          const fundTx = await faucet.sendTransaction({
            to: signerAddress,
            value: ethers.parseEther("1.0")
          });
          await fundTx.wait();
        }
      } catch (err) {
        console.warn("Pre-tx auto-faucet skipped:", err.message);
      }

      registry = contract(true, signer);
      if (["register", "approve"].includes(action)) {
        let isReg = false;
        try {
          isReg = await registry.registrars(await signer.getAddress());
        } catch {
          isReg = session?.user?.role === "officer" || session?.user?.role === "admin" || (await signer.getAddress()).toLowerCase() === DEMO_ACCOUNTS.authority.toLowerCase();
        }
        if (!isReg) throw new Error("Registration and approval require Revenue Officer authorization.");
      }
      let tx;
      if (action === "register") {
        if (!ethers.isAddress(form.owner)) throw new Error("Owner wallet address is invalid.");
        const revenueLocation = [form.village, form.hobli, form.taluk, form.district].filter(Boolean).join(", ");
        if (!form.survey.trim() || !revenueLocation) throw new Error("Survey number and revenue location details are required.");
        try { await registry.getLandDetails.staticCall(form.landId); throw new Error(errorText.DuplicateRegistration); } catch (error) { if (error?.message === errorText.DuplicateRegistration) throw error; }
        const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(parcelMetadata(form.survey, form.district, form.taluk, form.hobli, form.village)));
        tx = variant === "base" ? await registry["registerLand(uint256,address,string,string,uint256)"](form.landId, form.owner, form.survey, revenueLocation, form.area) : await registry["registerLand(uint256,address,bytes32,uint96)"](form.landId, form.owner, metadataHash, form.area);
      }
      if (action === "request") {
        let targetBuyer = form.buyer;
        const currentOwnerAddr = (targetLand?.owner || land?.owner || wallet?.account || "").toLowerCase();
        if (!ethers.isAddress(targetBuyer) || targetBuyer.toLowerCase() === currentOwnerAddr) {
          const fallback = purchasers.find((p) => p.walletAddress.toLowerCase() !== currentOwnerAddr);
          if (fallback) targetBuyer = fallback.walletAddress;
        }
        if (!ethers.isAddress(targetBuyer)) throw new Error("Please select a registered purchaser from the dropdown list.");
        tx = await registry.requestTransfer(form.landId, targetBuyer);
      }
      if (action === "approve") tx = await registry.approveTransfer(form.landId);
      if (action === "transfer") tx = await registry.transferOwnership(form.landId);
      const receipt = await tx.wait(); const gasPrice = receipt.gasPrice || 0n;
      const newGas = Number(receipt.gasUsed);
      const opName = action === "request" ? "requestTransfer" : action === "approve" ? "approveTransfer" : action === "transfer" ? "transferOwnership" : action === "register" ? "registerLand" : action;
      setLiveTransactions((current) => [{ operation: action, variant, gas: receipt.gasUsed.toString(), cost: ethers.formatEther(receipt.gasUsed * gasPrice), block: receipt.blockNumber, hash: tx.hash }, ...current].slice(0, 10));
      setReport((currentReport) => {
        if (!currentReport) return currentReport;
        const oldRows = currentReport.rows || currentReport.comparison || [];
        const updatedRows = oldRows.map((row) => {
          if (row.operation === opName) {
            const baseGas = variant === "base" ? newGas : (row.baseGas || 0);
            const optimizedGas = variant === "optimized" ? newGas : (row.optimizedGas || 0);
            const delta = baseGas - optimizedGas;
            const reductionPercent = baseGas > 0 ? ((delta / baseGas) * 100).toFixed(2) : "0.00";
            return { ...row, baseGas, optimizedGas, delta, reductionPercent };
          }
          return row;
        });
        return { ...currentReport, rows: updatedRows };
      });
      if (action === "register" && pendingRequestId) {
        try {
          const registeredRequest = await api(`/api/land-requests/${pendingRequestId}/registered`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ landId: form.landId, transactionHash: tx.hash }) });
          setLandRequests((current) => current.map((item) => item.id === registeredRequest.id ? registeredRequest : item));
          setPendingRequestId(null);
        } catch (requestError) { setMessage(`Blockchain registration succeeded, but the local request status needs refresh: ${requestError.message}`); }
      }
      await appendAudit(`${action[0].toUpperCase()}${action.slice(1)} transaction confirmed`, form.landId, `${receipt.gasUsed.toString()} gas | ${tx.hash}`);
      setMessage(`${action} completed in block ${receipt.blockNumber}; gas used: ${receipt.gasUsed.toString()}.`); await findLand(form.landId); setView(action === "register" ? "transfer" : "transfer");
    } catch (error) {
      const friendlyError = displayError(error, registry);
      if (action === "register" && friendlyError === errorText.DuplicateRegistration) {
        const freshId = String(Date.now());
        setForm((current) => ({ ...current, landId: freshId }));
        setMessage(`Land ID ${form.landId} is already registered. A fresh ID (${freshId}) has been generated; click Register again.`);
      } else setMessage(friendlyError);
    } finally { setBusyAction(null); }
  }
  async function createDocument(event) {
    event.preventDefault();
    try { const item = await api("/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(documentForm) }); setDocuments((current) => [item, ...current]); setDocumentForm((current) => ({ ...current, reference: "", hash: "" })); setMessage("Document reference saved for registrar review."); loadPortalData(); } catch (error) { setMessage(error.message); }
  }
  async function submitLandRequest(event) {
    event.preventDefault();
    if (!farmer?.verified) return setMessage("Verify the farmer email address before submitting a request.");
    try {
      const activeUserWallet = wallet?.account || farmer?.walletAddress || DEMO_ACCOUNTS.farmer;
      const request = await api("/api/land-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ farmerId: farmer.id, surveyNumber: form.survey, district: form.district, taluk: form.taluk, hobli: form.hobli, village: form.village, extent: form.area, walletAddress: activeUserWallet }) });
      setLandRequests((current) => [request, ...current]);
      setMessage("Land-registration request submitted to the Revenue Officer desk.");
      setView("farmer");
      loadPortalData();
    } catch (error) { setMessage(error.message); }
  }
  async function verifyLandRequest(id) {
    try {
      const request = await api(`/api/land-requests/${id}/verify`, { method: "PATCH" });
      setLandRequests((current) => current.map((item) => item.id === id ? request : item));
      setMessage("Revenue details verified. The request is ready for blockchain registration.");
      loadPortalData();
    } catch (error) { setMessage(error.message); }
  }
  function prepareBlockchainRegistration(request) {
    const ownerWallet = (request.walletAddress && ethers.isAddress(request.walletAddress)) ? request.walletAddress : DEMO_ACCOUNTS.farmer;
    setForm((current) => ({ ...current, landId: String(Date.now()), owner: ownerWallet, survey: request.surveyNumber, district: request.district, taluk: request.taluk, hobli: request.hobli, village: request.village, area: request.extent, lookupId: current.lookupId }));
    setPendingRequestId(request.id);
    setView("registry");
    setMessage(`Verified request for ${request.farmerName} loaded. Register it on blockchain to complete the process.`);
  }
  async function seedFreshLandForMutation() {
    try {
      setBusyAction("seed");
      const freshId = String(Date.now());
      const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, provider);
      const registry = contract(true, authoritySigner);
      const survey = `SURVEY-${Math.floor(Math.random() * 8999 + 1000)}`;
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(parcelMetadata(survey, "Bengaluru Urban", "Bengaluru North", "Yelahanka", "Jakkur")));
      const tx = variant === "base" 
        ? await registry["registerLand(uint256,address,string,string,uint256)"](freshId, DEMO_ACCOUNTS.farmer, survey, "Jakkur, Yelahanka, Bengaluru North, Bengaluru Urban", 48)
        : await registry["registerLand(uint256,address,bytes32,uint96)"](freshId, DEMO_ACCOUNTS.farmer, metadataHash, 48);
      await tx.wait();
      setForm((current) => ({ ...current, landId: freshId, lookupId: freshId, buyer: DEMO_ACCOUNTS.buyer }));
      await findLand(freshId);
      setMessage(`Fresh land parcel #${freshId} registered on blockchain for Farmer. Now click "Submit mutation request"!`);
    } catch (error) {
      setMessage(displayError(error));
    } finally {
      setBusyAction(null);
    }
  }
  async function verifyDocument(id) {
    try { const item = await api(`/api/documents/${id}/verify`, { method: "PATCH" }); setDocuments((current) => current.map((document) => document.id === id ? item : document)); setMessage("Document verified and added to the audit trail."); loadPortalData(); } catch (error) { setMessage(error.message); }
  }
  function chooseVariant(next) { setVariant(next); setAddress(ADDRESSES[next]); setLand(null); }
  function openSeedRecord() { setView("registry"); findLand("9002"); }
  const workflowStage = selectedLand?.status === 2 ? 3 : selectedLand?.status === 1 ? 2 : selectedLand ? 1 : 0;
  const primaryAction = session?.user.role === "farmer" ? ["farmer", "Start land request"] : session?.user.role === "officer" ? ["agent", "Open verification desk"] : session?.user.role === "purchaser" ? ["transfer", "Review mutation"] : ["analytics", "Open gas report"];

  if (!session) return <LoginScreen onLogin={signIn} />;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">ಭೂ</span><div><strong>BhoomiChain</strong><small>{portal.label}</small></div></div><nav>{visibleNav.map(([id, label], index) => <button key={id} className={view === id ? "nav-item active" : "nav-item"} onClick={() => setView(id)}><span>0{index + 1}</span>{label}</button>)}</nav><div className="sidebar-foot"><Pill tone="success">Signed in as {session.user.fullName}</Pill><p>Role-based local demonstration. Not an official government portal.</p></div></aside>
    <main className="workspace">
      <header className="topbar"><div><p className="eyebrow">Karnataka land records - {portal.label}</p><h1>{NAV.find(([id]) => id === view)?.[1]}</h1></div><div className="account-actions"><span className="signed-in"><strong>{session.user.fullName}</strong><small>{session.user.username} | {shortAddress(wallet?.account)}</small></span><button className="quiet" onClick={signOut}>Sign out</button></div></header>
      <div className="status-strip"><span className="signal" />{message}<span className="status-right">{chainStats ? `Block ${chainStats.block} | ${ethers.formatUnits(chainStats.gasPrice, "gwei")} gwei` : "Connecting to chain..."}</span></div>
      {view === "overview" && <section className="page-grid overview"><div className="hero panel"><div><Pill tone="success">{portal?.label || "Portal"}</Pill><h2>Welcome, {session.user.fullName}.</h2><p>Your workspace exposes only the actions assigned to your role in the Karnataka land-registration workflow.</p><div className="hero-actions"><button onClick={() => setView(primaryAction[0])}>{primaryAction[1]}</button></div></div><div className="hero-steps"><span>01 Farmer request</span><span>02 Revenue verification</span><span>03 Blockchain record</span><span>04 Purchaser consent</span></div></div><div className="metrics"><Metric label="Lifecycle saving" value={`${lifecycleSavingPercent}%`} caption={`${(totalLifecycleSaving || 0).toLocaleString()} gas vs baseline`} tone="green" /><Metric label="Verified documents" value={portalStats?.documents?.verified || 0} caption={`${portalStats?.documents?.pending || 0} pending review`} /><Metric label="Audit activity" value={(audit || []).length} caption="Persistent local trail" /><Metric label="Signed-in role" value={(portal?.label || "Portal").replace(" portal", "")} caption={shortAddress(wallet?.account)} tone="purple" /></div>{session.user.role === "admin" && <Card title="Gas-feasibility comparison benchmark" action={<button className="text-button" onClick={loadPortalData}>Reload report</button>}><div className="metrics"><Metric label="Base lifecycle" value={totalBaseLifecycleGas ? totalBaseLifecycleGas.toLocaleString() : "-"} caption="gas for 4 transfer operations" /><Metric label="Optimized lifecycle" value={totalOptimizedLifecycleGas ? totalOptimizedLifecycleGas.toLocaleString() : "-"} caption="same functional workflow" tone="green" /><Metric label="Gas saved" value={totalLifecycleSaving ? totalLifecycleSaving.toLocaleString() : "-"} caption={`${lifecycleSavingPercent}% lifecycle reduction`} tone="purple" /></div>{gasRows.length ? <div className="comparison-chart">{gasRows.map((row) => { const largest = Math.max(...gasRows.map((item) => item.baseGas)); return <div className="chart-row" key={row.operation}><strong>{row.operation}</strong><div><span className="bar base" style={{ width: `${(row.baseGas / largest) * 100}%` }} /> <small>Base {row.baseGas.toLocaleString()}</small></div><div><span className="bar optimized" style={{ width: `${(row.optimizedGas / largest) * 100}%` }} /> <small>Optimized {row.optimizedGas.toLocaleString()}</small></div><Pill tone={row.delta >= 0 ? "success" : "warning"}>{row.reductionPercent}%</Pill></div>; })}</div> : <p className="empty">The benchmark report is unavailable. Run the comparison command first.</p>}<p className="hint">Gas data is generated on a local Hardhat EVM. It is not Ethereum mainnet pricing.</p></Card>}<Card title="Access boundary"><div className="contribution"><div><strong>Role-limited navigation</strong><p>Other portal actions are hidden until the appropriate user signs in.</p></div><div><strong>Blockchain identity</strong><p>The local role account signs only its permitted workflow transaction.</p></div><div><strong>Traceable activity</strong><p>Confirmed operations are retained in the audit register.</p></div></div></Card><Card title="Current system posture" action={<button className="text-button" onClick={loadPortalData}>Refresh portal data</button>}><div className="posture"><Pill tone="success">Role: {accountRole}</Pill><Pill>Network: {wallet?.chainId || "-"}</Pill><Pill>Storage: local JSON demo store</Pill><Pill>Records: blockchain lookup</Pill></div></Card></section>}
      {view === "farmer" && <section className="page-grid documents"><Card title="Authenticated farmer identity"><Pill tone="success">Email-code verified</Pill><p><strong>{session.user.fullName}</strong> | username: {session.user.username} | {session.user.email} | mobile ending {session.user.mobile.slice(-4)} | Aadhaar ending {session.user.aadhaarLast4}</p><p className="hint">Identity registration and email-code verification were completed before access to this portal. Aadhaar remains off-chain as a secure hash.</p></Card><Card title="Submit land-registration request"><form onSubmit={submitLandRequest}><div className="form-grid"><Field label="Survey number" value={form.survey} onChange={update("survey")} /><Field label="District" value={form.district} onChange={update("district")} /><Field label="Taluk" value={form.taluk} onChange={update("taluk")} /><Field label="Hobli" value={form.hobli} onChange={update("hobli")} /><Field label="Village" value={form.village} onChange={update("village")} /><Field label="Extent (gunta)" type="number" min="1" value={form.area} onChange={update("area")} /></div><p className="hint">A matching Survey Number and revenue location can be requested only once. The request is first sent to the Revenue Officer; blockchain registration follows verification.</p><button type="submit" disabled={!farmer?.verified}>Submit land-registration request</button></form></Card></section>}
      {view === "farmer" && farmer?.verified && <section className="page-grid documents"><Card title="My land holdings" action={<Pill tone="success">{allMyHoldings.length} parcel{allMyHoldings.length === 1 ? "" : "s"}</Pill>}><p className="hint">Each Survey Number is listed separately. Registered parcels show their blockchain Land ID and transaction hash.</p><div className="document-table"><div className="table-row heading"><span>Survey number</span><span>Revenue location</span><span>Status</span><span>Blockchain record</span></div>{allMyHoldings.map((request) => <div className="table-row" key={request.id}><span><strong>{request.surveyNumber}</strong><small>{request.extent} gunta</small></span><span>{request.village}, {request.hobli}<small>{request.taluk}, {request.district}</small></span><span><Pill tone={request.status === "Registered on blockchain" ? "success" : request.status === "Verified" ? "purple" : "warning"}>{request.status}</Pill></span><span>{request.landId ? <div style={{ display: "grid", gap: "6px" }}><strong>Land #{request.landId}</strong><button className="small-button" onClick={async (e) => { e.preventDefault(); const found = await findLand(request.landId).catch(() => null); setCertificateLand({ id: String(request.landId), survey: request.surveyNumber, location: `${request.village}, ${request.hobli}, ${request.taluk}, ${request.district}`, area: request.extent, owner: request.walletAddress || DEMO_ACCOUNTS.farmer, status: 0, history: [request.walletAddress || DEMO_ACCOUNTS.farmer], ...(found || {}) }); }}>📜 View Certificate</button></div> : <small>Awaiting officer action</small>}</span></div>)}</div>{allMyHoldings.length === 0 && <p className="empty">No land parcels have been submitted or transferred to this account yet.</p>}</Card><Card title="Search & Verify Any Blockchain Land Record"><div className="inline"><Field label="Blockchain land ID" value={form.lookupId} onChange={update("lookupId")} /><button onClick={() => findLand()}>View land record</button></div>{land ? <div className="record"><div className="record-head"><strong>Land record #{land.id}</strong><Pill tone={land.status === 0 ? "success" : "warning"}>{statusText[land.status]}</Pill></div><dl><dt>Khatedar / Registered Owner Name</dt><dd style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#1e3a8a" }}>Sri / Smt. {resolveName(land.owner)}</dd><dt>Recorded Owner Wallet</dt><dd>{land.owner}</dd><dt>Pending Purchaser</dt><dd>{land.pendingOwner && land.pendingOwner !== ethers.ZeroAddress ? `${resolveName(land.pendingOwner)} (${shortAddress(land.pendingOwner)})` : "None"}</dd><dt>Extent (gunta)</dt><dd>{land.area}</dd>{land.survey && <><dt>Survey / revenue location</dt><dd>{land.survey} / {land.location}</dd></>}{land.metadataHash && <><dt>Revenue metadata hash</dt><dd>{land.metadataHash}</dd></>}<dt>Mutation history</dt><dd>{land.history.map((h) => resolveName(h)).join(" ➔ ")}</dd></dl><button className="account-button" style={{ marginTop: "14px", width: "100%" }} onClick={() => setCertificateLand(land)}>📜 Generate Digital RTC Certificate (QR Verified)</button></div> : <p className="empty">Search a registered blockchain ID (e.g. 9002) to inspect ownership and generate RTC certificate.</p>}</Card></section>}
      {view === "agent" && <section className="page-grid documents"><Card title="Revenue Officer verification desk" action={<Pill>{landRequests.filter((item) => item.status === "Submitted").length} awaiting verification</Pill>}><p className="hint">Verify the farmer's request and revenue details first. Only a verified request can be registered on blockchain.</p><div className="document-table"><div className="table-row heading"><span>Farmer / survey</span><span>Revenue location</span><span>Status</span><span>Action</span></div>{landRequests.map((request) => <div className="table-row" key={request.id}><span><strong>{request.farmerName}</strong><small>{request.surveyNumber} | mobile ending {request.mobile.slice(-4)}</small></span><span>{request.village}, {request.hobli}<small>{request.taluk}, {request.district} | {request.extent} gunta</small></span><span><Pill tone={request.status === "Registered on blockchain" ? "success" : request.status === "Verified" ? "purple" : "warning"}>{request.status}</Pill></span><span>{request.status === "Submitted" ? <button className="small-button" onClick={() => verifyLandRequest(request.id)}>Verify details</button> : request.status === "Verified" ? <button className="small-button" onClick={() => prepareBlockchainRegistration(request)}>Register on blockchain</button> : <div style={{ display: "grid", gap: "4px" }}><small>Land ID {request.landId}</small><button className="small-button" onClick={async (e) => { e.preventDefault(); const found = await findLand(request.landId).catch(() => null); setCertificateLand({ id: String(request.landId), survey: request.surveyNumber, location: `${request.village}, ${request.hobli}, ${request.taluk}, ${request.district}`, area: request.extent, owner: request.walletAddress || DEMO_ACCOUNTS.farmer, status: 0, history: [request.walletAddress || DEMO_ACCOUNTS.farmer], ...(found || {}) }); }}>📜 Issue RTC</button></div>}</span></div>)}</div>{landRequests.length === 0 && <p className="empty">No farmer land-registration requests yet. Use Farmer onboarding to create one.</p>}</Card><Card title="Officer workflow"><ul className="checklist"><li><span>1. Verify farmer</span>Farmer mobile OTP must be verified before a request can be submitted.</li><li><span>2. Verify revenue details</span>Confirm survey number and District, Taluk, Hobli, Village, and extent.</li><li><span>3. Register on blockchain</span>The verified request pre-fills the registry form for the revenue officer.</li><li><span>4. Process mutation</span>The recorded owner can later initiate transfer; officer verification and purchaser consent remain mandatory.</li></ul></Card></section>}
      {view === "registry" && <section className="page-grid registry"><Card title="Blockchain registry connection"><div className="mode-row"><div className="switch"><button className={variant === "optimized" ? "active" : ""} onClick={() => chooseVariant("optimized")}>Optimized registry</button><button className={variant === "base" ? "active" : ""} onClick={() => chooseVariant("base")}>Reference registry</button></div><Pill tone={isRegistrar ? "success" : "neutral"}>{accountRole}</Pill></div><Field label="Deployed blockchain contract" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Deploy locally, then paste the address" /></Card><Card title="Register land - Karnataka revenue details"><div className="form-grid"><Field label="Blockchain land ID" value={form.landId} onChange={update("landId")} /><Field label="Khatedar / owner wallet" value={form.owner} onChange={update("owner")} /><Field label="Survey number" value={form.survey} onChange={update("survey")} /><Field label="District" value={form.district} onChange={update("district")} /><Field label="Taluk" value={form.taluk} onChange={update("taluk")} /><Field label="Hobli" value={form.hobli} onChange={update("hobli")} /><Field label="Village" value={form.village} onChange={update("village")} /><Field label="Extent (gunta)" type="number" min="1" value={form.area} onChange={update("area")} /></div><p className="hint">1 acre = 40 gunta. Land IDs must be unique. The optimized registry saves a deterministic hash of survey and revenue-location data; the reference registry stores it as readable metadata.</p><button disabled={busyAction !== null || (session?.user?.role !== "officer" && session?.user?.role !== "admin" && isRegistrar === false)} onClick={() => submit("register")}>{busyAction === "register" ? "Recording in blockchain..." : pendingRequestId ? "Register verified request on blockchain" : "Register land record"}</button></Card><Card title="Search land record"><div className="inline"><Field label="Blockchain land ID" value={form.lookupId} onChange={update("lookupId")} /><button onClick={() => findLand()}>View land record</button></div>{land ? <div className="record"><div className="record-head"><strong>Land record #{land.id}</strong><Pill tone={land.status === 0 ? "success" : "warning"}>{statusText[land.status]}</Pill></div><dl><dt>Khatedar / Registered Owner Name</dt><dd style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#1e3a8a" }}>Sri / Smt. {resolveName(land.owner)}</dd><dt>Recorded Owner Wallet</dt><dd>{land.owner}</dd><dt>Pending Purchaser</dt><dd>{land.pendingOwner && land.pendingOwner !== ethers.ZeroAddress ? `${resolveName(land.pendingOwner)} (${shortAddress(land.pendingOwner)})` : "None"}</dd><dt>Extent (gunta)</dt><dd>{land.area}</dd>{land.survey && <><dt>Survey / revenue location</dt><dd>{land.survey} / {land.location}</dd></>}{land.metadataHash && <><dt>Revenue metadata hash</dt><dd>{land.metadataHash}</dd></>}<dt>Mutation history</dt><dd>{land.history.map((h) => resolveName(h)).join(" ➔ ")}</dd></dl><button className="account-button" style={{ marginTop: "14px", width: "100%" }} onClick={() => setCertificateLand(land)}>📜 Generate Digital RTC Certificate (QR Verified)</button></div> : <p className="empty">Search a registered blockchain ID such as 9002 to inspect a land record.</p>}</Card></section>}
      {view === "transfer" && <section className="page-grid transfer"><Card title="Mutation and ownership transfer"><div className="workflow"><div className={workflowStage >= 1 ? "workflow-step complete" : "workflow-step"}><span>1</span><div><strong>Mutation request</strong><small>Recorded owner nominates purchaser</small></div></div><div className={workflowStage >= 2 ? "workflow-step complete" : "workflow-step"}><span>2</span><div><strong>Revenue verification</strong><small>Revenue officer validates mutation</small></div></div><div className={workflowStage >= 3 ? "workflow-step complete" : "workflow-step"}><span>3</span><div><strong>Purchaser consent</strong><small>Blockchain ownership is finalized</small></div></div></div><div className="form-grid transfer-fields"><Field label="Active blockchain land ID" value={form.landId} onChange={(e) => { update("landId")(e); findLand(e.target.value); }} placeholder="e.g. 9002" />{allMyHoldings.length > 0 && <SelectField label="Select from My Owned Parcels" value={form.landId} onChange={(e) => { update("landId")(e); findLand(e.target.value); }}>{allMyHoldings.map((item) => <option key={item.id} value={item.landId || item.id.replace("chain-", "")}>{item.surveyNumber} ({item.village}) - Land #{item.landId || item.id.replace("chain-", "")}</option>)}</SelectField>}<SelectField label="Select Registered Purchaser" value={form.buyer} onChange={update("buyer")}>
  <option value="">-- Select Registered Purchaser --</option>
  {purchasers.filter((p) => p.walletAddress.toLowerCase() !== (selectedLand?.owner || wallet?.account || "").toLowerCase()).length === 0 ? (
    <option disabled value="">⚠️ No other registered users found (Register another account to select as purchaser)</option>
  ) : (
    purchasers.filter((p) => p.walletAddress.toLowerCase() !== (selectedLand?.owner || wallet?.account || "").toLowerCase()).map((p) => (
      <option key={p.id} value={p.walletAddress}>{p.fullName} ({p.username}) - {shortAddress(p.walletAddress)}</option>
    ))
  )}
</SelectField>
{purchasers.filter((p) => p.walletAddress.toLowerCase() !== (selectedLand?.owner || wallet?.account || "").toLowerCase()).length === 0 && (
  <p className="hint" style={{ color: "#b45309", marginTop: "4px", fontWeight: "500" }}>
    ℹ️ Note: <strong>{session.user.fullName}</strong> is the owner of this land and cannot be selected as purchaser. Please register another user account (e.g. a 2nd citizen/farmer) to select them as the purchaser.
  </p>
)}</div>{selectedLand ? <div className="record" style={{ margin: "0 0 16px 0", background: "#fffaf2", padding: "14px", borderRadius: "8px", border: "1px solid #e4d2ae" }}><div className="record-head" style={{ marginBottom: "8px" }}><strong style={{ fontSize: "1.05rem", color: "#1e3a8a" }}>Selected Land Record #{selectedLand.id}</strong><Pill tone={selectedLand.status === 0 ? "success" : "warning"}>{statusText[selectedLand.status]}</Pill></div><dl style={{ margin: 0 }}><dt>Current Khatedar / Owner</dt><dd><strong> Sri / Smt. {resolveName(selectedLand.owner)}</strong> ({shortAddress(selectedLand.owner)})</dd><dt>Nominated Purchaser</dt><dd>{selectedLand.pendingOwner && selectedLand.pendingOwner !== ethers.ZeroAddress ? `${resolveName(selectedLand.pendingOwner)} (${shortAddress(selectedLand.pendingOwner)})` : "None nominated"}</dd><dt>Extent (Area)</dt><dd>{selectedLand.area} Gunta</dd></dl></div> : <div style={{ background: "#fff8eb", padding: "12px 14px", borderRadius: "8px", border: "1px solid #ead8b5", marginBottom: "16px" }}><p className="empty" style={{ margin: 0, color: "#84725a" }}>Enter a registered land ID or select from your owned parcels to view ownership details.</p></div>}<div className="actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>{session.user.role !== "officer" && <button disabled={(selectedLand && selectedLand.status !== 0) || busyAction !== null} onClick={() => submit("request")}>{busyAction === "request" ? "Submitting..." : "Submit mutation request"}</button>}{session.user.role === "officer" && <button disabled={isRegistrar !== true || (selectedLand && selectedLand.status !== 1) || busyAction !== null} onClick={() => submit("approve")}>{busyAction === "approve" ? "Verify mutation (Officer)" : "Verify mutation (Officer)"}</button>}{session.user.role !== "officer" && <button disabled={(selectedLand && selectedLand.status !== 2) || !selectedLand?.pendingOwner || !wallet?.account || selectedLand.pendingOwner.toLowerCase() !== wallet.account.toLowerCase() || busyAction !== null} onClick={() => submit("transfer")}>{busyAction === "transfer" ? "Accepting..." : "Accept ownership (Purchaser)"}</button>}</div><p className="hint" style={{ marginTop: "12px" }}>Select a land parcel and registered purchaser, then click <strong>Submit mutation request</strong>. Revenue Officers verify requests, and purchasers click <strong>Accept ownership</strong> to complete the transfer.</p></Card><Card title="Mutation safeguards"><ul className="checklist"><li><span>Revenue role gate</span>Only a revenue registrar can create or verify records.</li><li><span>State gate</span>Each mutation step is disabled until the prior stage completes.</li><li><span>Owner consent</span>Only the recorded owner can initiate a mutation request.</li><li><span>Auditability</span>Every confirmed blockchain transaction is added to the local audit register.</li></ul></Card><Card title="Recent blockchain receipts">{liveTransactions.length ? <div className="receipt-list">{liveTransactions.map((item) => <div key={item.hash}><Pill tone="purple">{item.variant}</Pill><strong>{item.operation}</strong><span>{Number(item.gas).toLocaleString()} gas</span><small>Block {item.block} | <a href={`https://amoy.polygonscan.com/tx/${item.hash}`} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline", marginLeft: "4px" }}>Polygonscan receipt ({item.hash.slice(0, 10)}...)</a></small></div>)}</div> : <p className="empty">Complete a mutation action to show its local transaction receipt here.</p>}</Card></section>}
      {view === "documents" && <section className="page-grid documents">{session.user.role !== "officer" && <Card title="Submit document reference"><form onSubmit={createDocument}><div className="form-grid"><Field label="Land ID" value={documentForm.landId} onChange={updateDocument("landId")} /><Field label="Document category" value={documentForm.category} onChange={updateDocument("category")} /><Field label="Reference number" required value={documentForm.reference} onChange={updateDocument("reference")} placeholder="e.g. TITLE-2026-001" /><Field label="Optional checksum / hash" value={documentForm.hash} onChange={updateDocument("hash")} placeholder="Off-chain evidence hash" /></div><p className="hint">This prototype records only a document reference and optional integrity hash. It does not upload personal files or place them on-chain.</p><button type="submit">Submit for verification</button></form></Card>}<Card title={session.user.role === "officer" ? "Registrar verification queue" : "My document references"} action={<Pill>{portalStats.documents.pending} pending</Pill>}><div className="document-table"><div className="table-row heading"><span>Land</span><span>Evidence</span><span>Status</span><span>Action</span></div>{documents.map((document) => <div className="table-row" key={document.id}><span><strong>#{document.landId}</strong><small>{document.category}</small></span><span>{document.reference}<small>{document.hash || "No hash provided"}</small></span><span><Pill tone={document.status === "Verified" ? "success" : "warning"}>{document.status}</Pill></span><span>{document.status === "Pending" && session.user.role === "officer" ? <button className="small-button" disabled={!isRegistrar} onClick={() => verifyDocument(document.id)}>Verify</button> : document.status === "Pending" ? <small>Awaiting officer review</small> : <small>{new Date(document.verifiedAt).toLocaleDateString()}</small>}</span></div>)}</div></Card></section>}
      {view === "accounts" && session.user.role === "admin" && <section className="page-grid documents"><Card title="Create Revenue Officer account"><form onSubmit={createOfficer}><div className="form-grid"><Field label="Officer full name" required value={officerForm.fullName} onChange={updateOfficer("fullName")} /><Field label="Username" required value={officerForm.username} onChange={updateOfficer("username")} placeholder="e.g. revenue.kumar" /><Field label="Official email address" required type="email" value={officerForm.email} onChange={updateOfficer("email")} /><Field label="Mobile number" required inputMode="numeric" maxLength="10" value={officerForm.mobile} onChange={updateOfficer("mobile")} /></div><p className="hint">Revenue Officers cannot self-register. Only an authenticated System Administrator can create their accounts. They sign in with CAPTCHA and an email code.</p><button type="submit">Create officer account</button></form></Card><Card title="Controlled Revenue Officer accounts" action={<button className="text-button" onClick={() => loadOfficers()}>Refresh</button>}><div className="document-table"><div className="table-row heading"><span>Officer</span><span>Username / email</span><span>Mobile</span><span>Status</span></div>{officers.map((officer) => <div className="table-row" key={officer.id}><span><strong>{officer.fullName}</strong><small>Created {new Date(officer.createdAt).toLocaleDateString()}</small></span><span>{officer.username}<small>{officer.email}</small></span><span>{officer.mobile}</span><span><Pill tone="success">{officer.status}</Pill></span></div>)}</div>{officers.length === 0 && <p className="empty">No Revenue Officer accounts have been created yet.</p>}</Card></section>}
      {view === "analytics" && <section className="page-grid analytics"><Card title="Gas-feasibility comparison" action={<button className="text-button" onClick={loadPortalData}>Reload report</button>}><div className="metrics"><Metric label="Base lifecycle" value={totalBaseLifecycleGas ? totalBaseLifecycleGas.toLocaleString() : "-"} caption="gas for 4 transfer operations" /><Metric label="Optimized lifecycle" value={totalOptimizedLifecycleGas ? totalOptimizedLifecycleGas.toLocaleString() : "-"} caption="same functional workflow" tone="green" /><Metric label="Gas saved" value={totalLifecycleSaving ? totalLifecycleSaving.toLocaleString() : "-"} caption={`${lifecycleSavingPercent}% lifecycle reduction`} tone="purple" /></div>{gasRows.length ? <div className="comparison-chart">{gasRows.map((row) => { const largest = Math.max(...gasRows.map((item) => item.baseGas)); return <div className="chart-row" key={row.operation}><strong>{row.operation}</strong><div><span className="bar base" style={{ width: `${(row.baseGas / largest) * 100}%` }} /> <small>Base {row.baseGas.toLocaleString()}</small></div><div><span className="bar optimized" style={{ width: `${(row.optimizedGas / largest) * 100}%` }} /> <small>Optimized {row.optimizedGas.toLocaleString()}</small></div><Pill tone={row.delta >= 0 ? "success" : "warning"}>{row.reductionPercent}%</Pill></div>; })}</div> : <p className="empty">The benchmark report is unavailable. Run the comparison command first.</p>}<p className="hint">Gas data is generated on a local Hardhat EVM. It is not Ethereum mainnet pricing.</p></Card><Card title="Live receipt cost estimates">{liveTransactions.length ? <table><thead><tr><th>Operation</th><th>Gas</th><th>ETH cost</th><th>USD estimate</th><th>Block</th></tr></thead><tbody>{liveTransactions.map((item) => <tr key={item.hash}><td>{item.operation}</td><td>{Number(item.gas).toLocaleString()}</td><td>{item.cost}</td><td>${estimateCost(item.cost)}</td><td>{item.block}</td></tr>)}</tbody></table> : <p className="empty">Live receipt estimates appear here after a transaction.</p>}</Card><Card title="Methodological boundaries"><ul className="checklist"><li><span>Comparable contracts</span>Both variants implement the identical role and transfer lifecycle.</li><li><span>Controlled trade-off</span>Optimized mode hashes metadata rather than storing readable strings.</li><li><span>Load experiment</span>10, 100, and 500 lifecycle reports are stored in the research documentation.</li><li><span>Fee caution</span>USD figures are adjustable estimates, not live market quotations.</li></ul></Card></section>}
      {view === "audit" && <section className="page-grid audit"><Card title="Persistent local audit trail" action={<button className="text-button" onClick={loadPortalData}>Refresh</button>}><div className="timeline">{audit.map((entry) => <article key={entry.id}><span className="timeline-dot" /><div><strong>{entry.action}</strong><p>Land: {entry.landId} | Actor: {entry.actor}</p><small>{entry.detail}</small></div><time>{new Date(entry.createdAt).toLocaleString()}</time></article>)}</div></Card><Card title="Project boundary"><p>This local JSON log is deliberately a demonstration persistence layer. A production deployment would use authenticated users, encrypted document storage, a managed database, and government/legal integration.</p><div className="posture"><Pill tone="success">Blockchain events</Pill><Pill>Document references</Pill><Pill>Benchmark history</Pill><Pill>Role actions</Pill></div></Card></section>}
    </main>
    {certificateLand && <RtcCertificateModal land={certificateLand} contractAddress={address} onClose={() => setCertificateLand(null)} resolveName={resolveName} />}
  </div>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><BhoomiApp /></React.StrictMode>);
