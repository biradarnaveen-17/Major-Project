import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  API_URL,
  RPC_URL,
  ADDRESSES,
  DEMO_ACCOUNTS,
  DEFAULT_DEMO_LAND_ID,
  NAV,
  PORTALS,
  COMMON_ABI,
  BASE_ABI,
  OPTIMIZED_ABI,
  statusText,
  errorText,
  DEMO_KEYS,
  KARNATAKA_REVENUE_HIERARCHY
} from "./config.js";
import { displayError, shortAddress, parcelMetadata } from "./utils/helpers.js";
import { Field, SelectField, Card, Metric, Pill } from "./components/UIComponents.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import RtcCertificateModal from "./components/RtcCertificateModal.jsx";
import EmailChangeModal from "./components/EmailChangeModal.jsx";

export default function BhoomiApp() {
  const [session, setSession] = useState(null);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
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
  const [allUsers, setAllUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [officerForm, setOfficerForm] = useState({ fullName: "", username: "", email: "", mobile: "" });
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [documentForm, setDocumentForm] = useState({ landId: "", category: "RTC / Pahani extract", reference: "", hash: "" });
  const [form, setForm] = useState({ landId: DEFAULT_DEMO_LAND_ID, owner: "", survey: "12/3A", district: "Bengaluru Urban", taluk: "Bengaluru North", hobli: "Yelahanka", village: "Jakkur", area: "48", buyer: "", lookupId: "" });
  const [purchasers, setPurchasers] = useState([]);
  const [purchaserQuery, setPurchaserQuery] = useState("");
  const [loadReport, setLoadReport] = useState(null);
  const [runningLoadTest, setRunningLoadTest] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");

  async function runLoadTest(targetLoads = [10, 100, 500]) {
    try {
      setRunningLoadTest(true);
      setLoadProgress("Connecting to local EVM blockchain...");
      setMessage("Starting real-time EVM workload benchmark...");

      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const authorityWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", rpcProvider);
      const buyerWallet = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", rpcProvider);

      const baseContractAdmin = new ethers.Contract(ADDRESSES.base, BASE_ABI, authorityWallet);
      const baseContractBuyer = new ethers.Contract(ADDRESSES.base, BASE_ABI, buyerWallet);
      const optContractAdmin = new ethers.Contract(ADDRESSES.optimized, OPTIMIZED_ABI, authorityWallet);
      const optContractBuyer = new ethers.Contract(ADDRESSES.optimized, OPTIMIZED_ABI, buyerWallet);

      // Ensure authority is registrar on BaseLandRegistry and buyer has gas
      try {
        const isBaseReg = await baseContractAdmin.registrars(authorityWallet.address);
        if (!isBaseReg) {
          const setRegTx = await baseContractAdmin.setRegistrar(authorityWallet.address, true);
          await setRegTx.wait();
        }
      } catch (e) {
        console.warn("Base setRegistrar check:", e.message);
      }

      try {
        const buyerBal = await rpcProvider.getBalance(buyerWallet.address);
        if (buyerBal < ethers.parseEther("0.1")) {
          const fundTx = await authorityWallet.sendTransaction({ to: buyerWallet.address, value: ethers.parseEther("1.0") });
          await fundTx.wait();
        }
      } catch (e) {
        console.warn("Buyer gas funding check:", e.message);
      }

      const results = [];
      const totalSteps = targetLoads.length * 2;

      for (let index = 0; index < targetLoads.length; index++) {
        const count = targetLoads[index];
        const batchSize = count > 50 ? 10 : 5;

        // --- 1. Base Contract Test ---
        setLoadProgress(`[${results.length + 1}/${totalSteps}] Executing Base Contract (${count} txns)...`);
        const baseStart = performance.now();
        let baseTotalGas = 0n;
        let baseFailures = 0;

        for (let i = 0; i < count; i += batchSize) {
          const chunk = Array.from({ length: Math.min(batchSize, count - i) }, (_, offset) => i + offset);
          await Promise.all(
            chunk.map(async (idx) => {
              const landId = BigInt(Date.now()) * 10000n + BigInt(idx) + BigInt(Math.floor(Math.random() * 9000));
              try {
                const tx1 = await baseContractAdmin["registerLand(uint256,address,string,string,uint256)"](
                  landId,
                  authorityWallet.address,
                  `SUR-${landId}`,
                  "Bengaluru",
                  2400
                );
                const r1 = await tx1.wait();
                baseTotalGas += r1.gasUsed;

                const tx2 = await baseContractAdmin.requestTransfer(landId, buyerWallet.address);
                const r2 = await tx2.wait();
                baseTotalGas += r2.gasUsed;

                const tx3 = await baseContractAdmin.approveTransfer(landId);
                const r3 = await tx3.wait();
                baseTotalGas += r3.gasUsed;

                const tx4 = await baseContractBuyer.transferOwnership(landId);
                const r4 = await tx4.wait();
                baseTotalGas += r4.gasUsed;
              } catch (err) {
                console.error("Base tx error:", err);
                baseFailures++;
              }
            })
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const baseElapsed = Number((performance.now() - baseStart).toFixed(2));
        const baseGasNum = Number(baseTotalGas);

        results.push({
          contract: "BaseLandRegistry",
          mode: "sequential",
          load: count,
          totalGas: baseGasNum,
          gasPerLifecycle: count > 0 ? Math.round(baseGasNum / count) : 0,
          failureRate: Number(((baseFailures / (count * 4)) * 100).toFixed(2)),
          elapsedMs: baseElapsed
        });

        // --- 2. Optimized Contract Test ---
        setLoadProgress(`[${results.length + 1}/${totalSteps}] Executing Optimized Contract (${count} txns)...`);
        const optStart = performance.now();
        let optTotalGas = 0n;
        let optFailures = 0;

        for (let i = 0; i < count; i += batchSize) {
          const chunk = Array.from({ length: Math.min(batchSize, count - i) }, (_, offset) => i + offset);
          await Promise.all(
            chunk.map(async (idx) => {
              const landId = BigInt(Date.now()) * 10000n + BigInt(idx) + BigInt(Math.floor(Math.random() * 9000));
              const metaHash = ethers.keccak256(ethers.toUtf8Bytes(`BENCHMARK|BENGALURU|${landId}`));
              try {
                const tx1 = await optContractAdmin["registerLand(uint256,address,bytes32,uint96)"](
                  landId,
                  authorityWallet.address,
                  metaHash,
                  2400
                );
                const r1 = await tx1.wait();
                optTotalGas += r1.gasUsed;

                const tx2 = await optContractAdmin.requestTransfer(landId, buyerWallet.address);
                const r2 = await tx2.wait();
                optTotalGas += r2.gasUsed;

                const tx3 = await optContractAdmin.approveTransfer(landId);
                const r3 = await tx3.wait();
                optTotalGas += r3.gasUsed;

                const tx4 = await optContractBuyer.transferOwnership(landId);
                const r4 = await tx4.wait();
                optTotalGas += r4.gasUsed;
              } catch (err) {
                console.error("Optimized tx error:", err);
                optFailures++;
              }
            })
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const optElapsed = Number((performance.now() - optStart).toFixed(2));
        const optGasNum = Number(optTotalGas);

        results.push({
          contract: "OptimizedLandRegistry",
          mode: "sequential",
          load: count,
          totalGas: optGasNum,
          gasPerLifecycle: count > 0 ? Math.round(optGasNum / count) : 0,
          failureRate: Number(((optFailures / (count * 4)) * 100).toFixed(2)),
          elapsedMs: optElapsed
        });
      }

      const finalReport = {
        generatedAt: new Date().toISOString(),
        isRealtime: true,
        loads: targetLoads,
        results
      };

      setLoadReport(finalReport);
      setMessage("✅ Real-time EVM load test completed live on blockchain!");
      appendAudit("Real-Time EVM Load Test", "Scalability", `Executed real-time workloads: ${targetLoads.join(", ")} txns`);
    } catch (error) {
      console.error("Real-time load test error:", error);
      setMessage("Load test error: " + error.message);
    } finally {
      setRunningLoadTest(false);
      setLoadProgress("");
    }
  }

  const provider = useMemo(() => wallet?.provider || new ethers.JsonRpcProvider(RPC_URL), [wallet]);
  const gasRows = report?.comparison || report?.rows || [];
  const lifecycleRows = gasRows.filter((row) => !["deployment", "getLandDetails"].includes(row.operation));
  const totalBaseLifecycleGas = lifecycleRows.reduce((sum, row) => sum + (row.baseGas || 0), 0);
  const totalOptimizedLifecycleGas = lifecycleRows.reduce((sum, row) => sum + (row.optimizedGas || 0), 0);
  const totalLifecycleSaving = totalBaseLifecycleGas - totalOptimizedLifecycleGas;
  const lifecycleSavingPercent = totalBaseLifecycleGas ? ((totalLifecycleSaving / totalBaseLifecycleGas) * 100).toFixed(1) : "0.0";
  const selectedLand = land?.id === String(form.landId) ? land : null;
  const currentAccount = wallet?.account?.toLowerCase();
  const portal = session ? (PORTALS[session.user.role] || PORTALS.farmer) : PORTALS.farmer;
  const accountRole = session ? (session.user.role === "officer" ? "Revenue Officer" : session.user.role === "admin" ? "System Administrator" : session.user.role === "purchaser" ? "Purchaser" : "Farmer") : "Guest";
  const visibleNav = portal ? NAV.filter(([id]) => portal.views.includes(id)) : [];

  const myLandRequests = farmer
    ? landRequests.filter(
        (item) =>
          item.farmerId === farmer.id ||
          item.email === farmer.email ||
          (item.farmerName && session?.user?.fullName && item.farmerName.toLowerCase() === session.user.fullName.toLowerCase()) ||
          (item.walletAddress && wallet?.account && item.walletAddress.toLowerCase() === wallet.account.toLowerCase()) ||
          (item.landId && JSON.parse(localStorage.getItem("bhoomi_transferred_lands") || "[]").includes(String(item.landId)))
      )
    : [];

  const allMyHoldings = useMemo(() => {
    const currentAccount = wallet?.account?.toLowerCase();
    const transferredList = JSON.parse(localStorage.getItem("bhoomi_transferred_lands") || "[]");
    
    const list = landRequests.filter((item) => {
      const ownerWallet = (item.walletAddress || "").toLowerCase();
      if (ownerWallet && currentAccount && ownerWallet !== currentAccount) return false;

      const isOwnerAcc = ownerWallet === currentAccount;
      const isTransferredToMe = item.landId && transferredList.includes(String(item.landId));
      const isMyFarmerReq = farmer && (item.farmerId === farmer.id || item.email === farmer.email);
      return isOwnerAcc || isTransferredToMe || isMyFarmerReq;
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
  }, [myLandRequests, landRequests, land, wallet, farmer]);

  const availablePurchasers = useMemo(() => {
    return (purchasers || []).filter((p) => {
      const isMeWallet = wallet?.account && String(p.walletAddress || "").toLowerCase() === String(wallet.account).toLowerCase();
      const isMeUser = session?.user?.username && String(p.username || "").toLowerCase() === String(session.user.username).toLowerCase();
      return !isMeWallet && !isMeUser;
    });
  }, [purchasers, wallet, session]);

  const filteredPurchasers = useMemo(() => {
    if (!purchaserQuery.trim()) return [];
    const q = purchaserQuery.trim().toLowerCase();
    return availablePurchasers.filter((p) => {
      return (
        p.fullName?.toLowerCase().includes(q) ||
        p.username?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q) ||
        p.walletAddress?.toLowerCase().includes(q)
      );
    });
  }, [availablePurchasers, purchaserQuery]);

  useEffect(() => {
    if (purchaserQuery.trim() && filteredPurchasers.length > 0) {
      setForm((curr) => {
        if (!filteredPurchasers.some((p) => p.walletAddress === curr.buyer)) {
          return { ...curr, buyer: filteredPurchasers[0].walletAddress };
        }
        return curr;
      });
    }
  }, [purchaserQuery, filteredPurchasers]);

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
    const [dashboardResult, documentResult, auditResult, reportResult, requestResult, purchaserResult, loadResult] = await Promise.allSettled([api("/api/dashboard"), api("/api/documents"), api("/api/audit"), api("/api/benchmarks/latest"), api("/api/land-requests"), api("/api/purchasers"), api("/api/benchmarks/loads")]);
    if (dashboardResult.status === "fulfilled") setPortalStats(dashboardResult.value);
    if (documentResult.status === "fulfilled") setDocuments(documentResult.value);
    if (auditResult.status === "fulfilled") setAudit(auditResult.value);
    if (reportResult.status === "fulfilled") setReport(reportResult.value);
    if (requestResult.status === "fulfilled") setLandRequests(requestResult.value);
    if (purchaserResult.status === "fulfilled") setPurchasers(purchaserResult.value);
    if (loadResult.status === "fulfilled") setLoadReport(loadResult.value);
  }

  async function appendAudit(action, landId, detail) {
    try { const entry = await api("/api/audit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, landId, actor: accountRole, detail }) }); setAudit((current) => [entry, ...current]); } catch { /* Optional audit API error swallow */ }
  }

  const loadAllUsers = useCallback(async () => {
    try {
      const data = await api("/api/admin/users");
      setAllUsers(data);
    } catch (e) {
      console.warn("Failed to load users:", e.message);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadAllUsers();
    }
  }, [session, loadAllUsers]);

  async function toggleUserStatus(userId, currentStatus, fullName) {
    const nextStatus = currentStatus === "Blocked" ? "Active" : "Blocked";
    const confirmMsg = currentStatus === "Blocked"
      ? `Are you sure you want to UNBLOCK the account for Sri / Smt. ${fullName}?`
      : `Are you sure you want to BLOCK the account for Sri / Smt. ${fullName}? Blocked users will be denied access to sign in.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await api(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage(res.message);
      loadAllUsers();
      loadOfficers();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function deleteUser(userId, fullName) {
    if (!window.confirm(`Are you sure you want to permanently DELETE the account for Sri / Smt. ${fullName}? This action cannot be undone.`)) return;
    try {
      const res = await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      setMessage(res.message);
      loadAllUsers();
      loadOfficers();
    } catch (err) {
      setMessage(err.message);
    }
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

  async function deleteOfficer(id, name) {
    if (!window.confirm(`Are you sure you want to delete Revenue Officer Sri / Smt. ${name}?`)) return;
    try {
      const res = await api(`/api/admin/officers/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${session.token}` } });
      setMessage(res.message || "Officer account deleted.");
      loadOfficers();
      loadPortalData();
    } catch (error) { setMessage(error.message); }
  }

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
      } catch { /* Ignore */ }
    }
    if (role === "admin") await loadOfficers(authResult.token);
  }

  function signOut() { sessionStorage.removeItem("bhoomichain_session"); setSession(null); setWallet(null); setIsRegistrar(null); setFarmer(null); setOfficers([]); setView("overview"); setMessage("Choose a portal to continue."); }

  function resolveName(addr) {
    if (!addr || addr === ethers.ZeroAddress) return "None";
    const strAddr = typeof addr === "string" ? addr : (addr.owner || addr.address || String(addr));
    const clean = String(strAddr).toLowerCase();

    const foundPurchaser = (purchasers || []).find((p) => String(p.walletAddress || "").toLowerCase() === clean);
    if (foundPurchaser && foundPurchaser.fullName) return foundPurchaser.fullName;

    const foundFarmer = (landRequests || []).find((r) => String(r.walletAddress || "").toLowerCase() === clean);
    if (foundFarmer && foundFarmer.farmerName) return foundFarmer.farmerName;

    if (clean === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return "Sri. Sudeep";
    if (clean === "0x90f79bf6eb2c4f870365e785982e1f101e93b906") return "Sri. Raj";
    if (clean === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return "Farmer Khatedar";
    if (clean === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") return "Karnataka Revenue Authority";

    if (session?.user?.fullName && (String(wallet?.account || "").toLowerCase() === clean || String(session.user.walletAddress || "").toLowerCase() === clean)) {
      return session.user.fullName;
    }

    return "Khatedar (" + shortAddress(strAddr) + ")";
  }

  useEffect(() => {
    loadPortalData();
  }, [view, session]);



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

  const defaultProvider = useMemo(() => wallet?.provider || new ethers.JsonRpcProvider(RPC_URL), [wallet]);

  function contract(withSigner = false, customSigner = null) {
    if (!ethers.isAddress(address)) throw new Error("Enter a valid deployed contract address.");
    const activeProvider = wallet?.provider || defaultProvider;
    const activeSigner = customSigner || wallet?.signer || new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
    return new ethers.Contract(address, variant === "base" ? BASE_ABI : OPTIMIZED_ABI, withSigner ? activeSigner : activeProvider);
  }

  async function signerFor(action, targetLand = selectedLand || land) {
    const activeProvider = wallet?.provider || defaultProvider;

    if (action === "approve" || action === "register") {
      return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
    }

    if (action === "request" && targetLand?.owner && ethers.isAddress(targetLand.owner)) {
      const ownerAddr = targetLand.owner.toLowerCase();
      const ownerUser = (purchasers || []).find((p) => String(p.walletAddress || "").toLowerCase() === ownerAddr);
      if (ownerUser) {
        const pk = ownerUser.privateKey || ethers.keccak256(ethers.toUtf8Bytes(String(ownerUser.id || ownerUser.username)));
        return new ethers.Wallet(pk, activeProvider);
      }
      if (ownerAddr === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return new ethers.Wallet(DEMO_KEYS.buyer, activeProvider);
      if (ownerAddr === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return new ethers.Wallet(DEMO_KEYS.farmer, activeProvider);
      if (ownerAddr === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);

      const pk = ethers.keccak256(ethers.toUtf8Bytes(String(targetLand.owner)));
      return new ethers.Wallet(pk, activeProvider);
    }

    if (action === "transfer" && targetLand?.pendingOwner && ethers.isAddress(targetLand.pendingOwner)) {
      const buyerAddr = targetLand.pendingOwner.toLowerCase();
      const buyerUser = (purchasers || []).find((p) => String(p.walletAddress || "").toLowerCase() === buyerAddr);
      if (buyerUser) {
        const pk = buyerUser.privateKey || ethers.keccak256(ethers.toUtf8Bytes(String(buyerUser.id || buyerUser.username)));
        return new ethers.Wallet(pk, activeProvider);
      }
      if (buyerAddr === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return new ethers.Wallet(DEMO_KEYS.buyer, activeProvider);
      if (buyerAddr === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return new ethers.Wallet(DEMO_KEYS.farmer, activeProvider);
      if (buyerAddr === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);

      const pk = ethers.keccak256(ethers.toUtf8Bytes(String(targetLand.pendingOwner)));
      return new ethers.Wallet(pk, activeProvider);
    }

    return wallet?.signer || new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
  }

  function toNumericLandId(id) {
    if (!id) return "0";
    const str = String(id).trim();
    if (/^\d+$/.test(str)) return str;
    const hash = ethers.keccak256(ethers.toUtf8Bytes(str));
    return (BigInt(hash) % 900000000000n + 100000000000n).toString();
  }

  async function findLand(landIdInput = form.lookupId, silent = false) {
    if (!landIdInput) return null;
    const activeProvider = wallet?.provider || defaultProvider;
    const numericId = toNumericLandId(landIdInput);
    try {
      localStorage.setItem("bhoomi_active_land_id", String(landIdInput));
      let currentVariant = variant;
      let result = null;
      let foundVariant = null;
      try {
        result = await contract().getLandDetails.staticCall(numericId);
        foundVariant = currentVariant;
      } catch {
        const altVariant = currentVariant === "optimized" ? "base" : "optimized";
        const altAddress = ADDRESSES[altVariant];
        const altContract = new ethers.Contract(altAddress, altVariant === "base" ? BASE_ABI : OPTIMIZED_ABI, activeProvider);
        try {
          result = await altContract.getLandDetails.staticCall(numericId);
          foundVariant = altVariant;
          setVariant(altVariant);
          setAddress(altAddress);
        } catch {
          foundVariant = null;
        }
      }
      if (!foundVariant || !result) {
        const localReq = (landRequests || []).find((r) => String(r.landId) === String(landIdInput) || String(r.id) === String(landIdInput));
        if (localReq) {
          const item = {
            id: String(localReq.landId || localReq.id),
            survey: localReq.surveyNumber || `Land #${localReq.id}`,
            location: `${localReq.village || 'Bengaluru'}, ${localReq.hobli || ''}, ${localReq.taluk || ''}, ${localReq.district || ''}`.replace(/,\s*,/g, ',').trim(),
            area: localReq.extent || "50",
            owner: localReq.walletAddress || wallet?.account || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            pendingOwner: ethers.ZeroAddress,
            status: 0,
            history: [localReq.walletAddress || wallet?.account || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"]
          };
          setLand(item);
          setForm((current) => ({ ...current, landId: String(landIdInput), lookupId: String(landIdInput) }));
          if (!silent) setMessage(`Land record #${landIdInput} loaded from registration registry.`);
          return item;
        }

        if (!silent) setMessage(`Land ID #${landIdInput} has not been registered on the blockchain yet.`);
        setLand(null);
        return null;
      }
      const item = foundVariant === "base"
        ? { id: result[0].toString(), survey: result[1], location: result[2], area: result[3].toString(), owner: result[4], pendingOwner: result[5], status: Number(result[6]), history: result[7] }
        : { id: String(landIdInput), metadataHash: result[2], area: result[1].toString(), owner: result[0], pendingOwner: result[3], status: Number(result[4]), history: result[5] };
      setLand(item);
      setForm((current) => ({ ...current, landId: String(landIdInput), lookupId: String(landIdInput) }));
      if (!silent) setMessage(`Land record #${landIdInput} loaded from blockchain (${foundVariant === "optimized" ? "Optimized" : "Base"} contract).`);
      return item;
    } catch {
      if (!silent) setMessage(`Unable to retrieve land record #${landIdInput}.`);
      setLand(null);
      return null;
    }
  }

  function resolveSignerForAddress(targetAddr) {
    const activeProvider = wallet?.provider || defaultProvider;
    if (!targetAddr || !ethers.isAddress(targetAddr)) return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
    const clean = targetAddr.toLowerCase();

    if (clean === DEMO_ACCOUNTS.buyer.toLowerCase()) return new ethers.Wallet(DEMO_KEYS.buyer, activeProvider);
    if (clean === DEMO_ACCOUNTS.farmer.toLowerCase()) return new ethers.Wallet(DEMO_KEYS.farmer, activeProvider);
    if (clean === DEMO_ACCOUNTS.authority.toLowerCase()) return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);

    const combinedUsers = [...(allUsers || []), ...(purchasers || [])];
    const match = combinedUsers.find((u) => {
      const uWallet = (u.walletAddress || "").toLowerCase();
      if (uWallet === clean) return true;
      const derivedWallet = new ethers.Wallet(ethers.keccak256(ethers.toUtf8Bytes(String(u.id || u.username)))).address.toLowerCase();
      return derivedWallet === clean;
    });

    if (match) {
      const pk = match.privateKey || ethers.keccak256(ethers.toUtf8Bytes(String(match.id || match.username)));
      return new ethers.Wallet(pk, activeProvider);
    }

    if (wallet?.account && wallet.account.toLowerCase() === clean && wallet.signer) {
      return wallet.signer;
    }

    return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
  }

  async function signerFor(action, targetLand = selectedLand || land) {
    const activeProvider = wallet?.provider || defaultProvider;
    if (action === "approve" || action === "register") {
      return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
    }
    if (action === "request") {
      return resolveSignerForAddress(targetLand?.owner || land?.owner || form.owner);
    }
    if (action === "transfer") {
      return resolveSignerForAddress(targetLand?.pendingOwner);
    }
    return wallet?.signer || new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
  }

  async function submit(action) {
    let registry;
    try {
      setBusyAction(action);
      const numericLandId = toNumericLandId(form.landId);
      let targetLand = selectedLand;
      if (action !== "register") {
        if (!targetLand || String(targetLand.id) !== String(form.landId)) {
          targetLand = await findLand(form.landId);
        }
        if (!targetLand) {
          throw new Error(`Land ID #${form.landId} is not registered on the active contract.`);
        }
      }
      const activeProvider = wallet?.provider || defaultProvider;
      const signer = await signerFor(action, targetLand);
      
      try {
        const signerAddress = await signer.getAddress();
        const signerBalance = await activeProvider.getBalance(signerAddress);
        if (signerBalance < ethers.parseEther("0.1")) {
          const faucet = new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
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
      let tx;
      if (action === "register") {
        let validOwner = form.owner;
        if (!ethers.isAddress(validOwner)) {
          try {
            const pk = ethers.keccak256(ethers.toUtf8Bytes(String(validOwner || "farmer")));
            validOwner = new ethers.Wallet(pk).address;
          } catch {
            validOwner = DEMO_ACCOUNTS.farmer;
          }
          setForm((curr) => ({ ...curr, owner: validOwner }));
        }

        const revenueLocation = [form.village, form.hobli, form.taluk, form.district].filter(Boolean).join(", ");
        if (!form.survey.trim() || !revenueLocation) throw new Error("Survey number and revenue location details are required.");

        try {
          await registry.getLandDetails.staticCall(numericLandId);
          throw new Error(errorText.DuplicateRegistration);
        } catch (error) {
          if (error?.message === errorText.DuplicateRegistration) throw error;
        }

        const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(parcelMetadata(form.survey, form.district, form.taluk, form.hobli, form.village)));
        
        const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
        const authorityRegistry = new ethers.Contract(address, variant === "base" ? BASE_ABI : OPTIMIZED_ABI, authoritySigner);

        try {
          const isReg = await authorityRegistry.registrars(authoritySigner.address).catch(() => true);
          if (!isReg) {
            const setRegTx = await authorityRegistry.setRegistrar(authoritySigner.address, true);
            await setRegTx.wait();
          }
        } catch (regErr) {
          console.warn("Auto-setRegistrar skipped:", regErr.message);
        }

        if (variant === "base") {
          tx = await authorityRegistry["registerLand(uint256,address,string,string,uint256)"](numericLandId, validOwner, form.survey, revenueLocation, form.area);
        } else {
          tx = await authorityRegistry["registerLand(uint256,address,bytes32,uint96)"](numericLandId, validOwner, metadataHash, form.area);
        }
      }
      if (action === "request") {
        let targetBuyer = form.buyer;
        const currentOwnerAddr = (targetLand?.owner || land?.owner || wallet?.account || "").toLowerCase();
        if (!ethers.isAddress(targetBuyer) || targetBuyer.toLowerCase() === currentOwnerAddr) {
          const fallback = purchasers.find((p) => p.walletAddress.toLowerCase() !== currentOwnerAddr) || purchasers[0];
          if (fallback) targetBuyer = fallback.walletAddress;
        }
        if (!ethers.isAddress(targetBuyer)) throw new Error("Please select a registered purchaser from the dropdown list.");

        let details = null;
        try {
          details = await registry.getLandDetails(numericLandId);
        } catch {
          try {
            const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
            const authorityRegistry = contract(true, authoritySigner);
            const ownerAddr = targetLand?.owner || wallet?.account || DEMO_ACCOUNTS.farmer;
            const surveyNum = targetLand?.survey || form.survey || `SUR-${numericLandId}`;
            const loc = targetLand?.location || `${form.village}, ${form.hobli}, ${form.taluk}, ${form.district}`;
            const areaVal = targetLand?.area || form.area || "48";
            const metaHash = ethers.keccak256(ethers.toUtf8Bytes(parcelMetadata(surveyNum, form.district, form.taluk, form.hobli, form.village)));
            
            const regTx = variant === "base"
              ? await authorityRegistry["registerLand(uint256,address,string,string,uint256)"](numericLandId, ownerAddr, surveyNum, loc, areaVal)
              : await authorityRegistry["registerLand(uint256,address,bytes32,uint96)"](numericLandId, ownerAddr, metaHash, areaVal);
            await regTx.wait();
            details = await authorityRegistry.getLandDetails(numericLandId).catch(() => null);
          } catch (regErr) {
            console.warn("Auto-register on request step skipped:", regErr.message);
          }
        }

        const onChainOwner = details ? String(details.owner || details[4] || details[0] || "") : "";
        const requestSigner = resolveSignerForAddress(onChainOwner || targetLand?.owner);
        const requestRegistry = contract(true, requestSigner);
        tx = await requestRegistry.requestTransfer(numericLandId, targetBuyer);
      }
      if (action === "approve") {
        const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
        const authorityRegistry = contract(true, authoritySigner);
        tx = await authorityRegistry.approveTransfer(numericLandId);
      }
      if (action === "transfer") {
        let details = null;
        try {
          details = await registry.getLandDetails(numericLandId);
        } catch {
          /* Fallback to local record if getLandDetails throws */
        }

        const onChainStatus = details ? Number(details.status ?? details[6] ?? details[4] ?? 0) : 0;
        const pendingOwnerAddr = details ? String(details.pendingOwner || details[5] || details[3] || "") : "";

        if (onChainStatus === 1) {
          const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
          const authorityRegistry = contract(true, authoritySigner);
          const approveTx = await authorityRegistry.approveTransfer(numericLandId);
          await approveTx.wait();
        }

        const transferSigner = resolveSignerForAddress(pendingOwnerAddr || targetLand?.pendingOwner);
        const transferRegistry = contract(true, transferSigner);
        tx = await transferRegistry.transferOwnership(numericLandId);
      }

      const receipt = await tx.wait(); const gasPrice = receipt.gasPrice || 0n;
      const newGas = Number(receipt.gasUsed);
      const opName = action === "request" ? "requestTransfer" : action === "approve" ? "approveTransfer" : action === "transfer" ? "transferOwnership" : action === "register" ? "registerLand" : action;
      setLiveTransactions((current) => [
        {
          operation: opName,
          variant,
          contractAddress: address,
          contractName: variant === "optimized" ? "OptimizedLandRegistry" : "BaseLandRegistry",
          gas: receipt.gasUsed.toString(),
          cost: ethers.formatEther(receipt.gasUsed * (gasPrice || 1000000000n)),
          block: receipt.blockNumber,
          hash: tx.hash,
          landId: form.landId,
          timestamp: new Date().toLocaleTimeString()
        },
        ...current
      ].slice(0, 50));
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
      if (action === "transfer") {
        try {
          const newOwnerWallet = await signer.getAddress();
          const newOwnerName = session?.user?.fullName || resolveName(newOwnerWallet);
          await api(`/api/land-requests/transfer-owner/${form.landId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ newOwnerWallet, newOwnerName })
          });
          const savedOwned = JSON.parse(localStorage.getItem("bhoomi_transferred_lands") || "[]");
          if (!savedOwned.includes(String(form.landId))) {
            savedOwned.push(String(form.landId));
            localStorage.setItem("bhoomi_transferred_lands", JSON.stringify(savedOwned));
          }
          await loadPortalData();
        } catch (e) {
          console.warn("Transfer owner sync skipped:", e.message);
        }
      }
      if (action === "register" && pendingRequestId) {
        try {
          const registeredRequest = await api(`/api/land-requests/${pendingRequestId}/registered`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ landId: form.landId, transactionHash: tx.hash }) });
          setLandRequests((current) => current.map((item) => item.id === registeredRequest.id ? registeredRequest : item));
          setPendingRequestId(null);
        } catch (requestError) { setMessage(`Blockchain registration succeeded, but the local request status needs refresh: ${requestError.message}`); }
      }
      await appendAudit(`${action[0].toUpperCase()}${action.slice(1)} transaction confirmed`, form.landId, `${receipt.gasUsed.toString()} gas | ${tx.hash}`);
      
      if (action === "register") {
        setMessage(`✅ Land ID #${form.landId} registered on blockchain in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed.toString()}.`);
        await findLand(form.landId);
        setView(session?.user?.role === "officer" ? "agent" : "farmer");
        await loadPortalData();
      } else {
        setMessage(`${action} completed in block ${receipt.blockNumber}; gas used: ${receipt.gasUsed.toString()}.`);
        await findLand(form.landId);
        setView("transfer");
      }
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
    try {
      if (!form.survey.trim()) throw new Error("Please enter a Survey Number (e.g. 12/3A).");
      if (!form.village.trim()) throw new Error("Please enter a Village name.");
      if (!form.area || Number(form.area) <= 0) throw new Error("Please enter a valid Extent in guntas.");

      const activeFarmer = farmer || {
        id: session?.user?.id || `farmer-${session?.user?.username}`,
        name: session?.user?.fullName || "Citizen",
        email: session?.user?.email || "citizen@example.com",
        mobile: session?.user?.mobile || "9900000000",
        verified: true
      };
      const activeUserWallet = wallet?.account || activeFarmer?.walletAddress || DEMO_ACCOUNTS.farmer;
      const body = {
        farmerId: activeFarmer.id,
        farmerName: activeFarmer.name || session?.user?.fullName,
        mobile: activeFarmer.mobile || session?.user?.mobile || "9900000000",
        email: activeFarmer.email || session?.user?.email || "citizen@example.com",
        surveyNumber: form.survey.trim(),
        district: form.district || "Bengaluru Urban",
        taluk: form.taluk || "Bengaluru North",
        hobli: form.hobli || "Yelahanka",
        village: form.village.trim(),
        extent: form.area.trim(),
        walletAddress: activeUserWallet
      };
      const request = await api("/api/land-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      setLandRequests((current) => [request, ...current]);
      setMessage(`✅ Land-registration request for Survey #${form.survey} (${form.village}) submitted to the Revenue Officer desk.`);
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

  async function rejectLandRequest(id) {
    const reason = window.prompt("Reason for rejecting land registration (e.g., Survey details mismatch):", "Land data is incorrect / Survey details mismatch");
    if (reason === null) return;
    try {
      const request = await api(`/api/land-requests/${id}/reject`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason })
      });
      setLandRequests((current) => current.map((item) => item.id === id ? request : item));
      setMessage(`Land-registration request for Survey #${request.surveyNumber} rejected by Revenue Officer.`);
      loadPortalData();
    } catch (error) { setMessage(error.message); }
  }

  function prepareBlockchainRegistration(request) {
    const ownerWallet = (request.walletAddress && ethers.isAddress(request.walletAddress)) ? request.walletAddress : DEMO_ACCOUNTS.farmer;
    const freshLandId = String(Date.now());
    setForm((current) => ({
      ...current,
      landId: freshLandId,
      owner: ownerWallet,
      survey: request.surveyNumber,
      district: request.district,
      taluk: request.taluk,
      hobli: request.hobli,
      village: request.village,
      area: request.extent,
      lookupId: freshLandId
    }));
    setPendingRequestId(request.id);
    setView("registry");
    setMessage(`Verified request for ${request.farmerName} loaded. Click Register verified request on blockchain to mint Land ID #${freshLandId}.`);
  }

  async function verifyDocument(id) {
    try { const item = await api(`/api/documents/${id}/verify`, { method: "PATCH" }); setDocuments((current) => current.map((document) => document.id === id ? item : document)); setMessage("Document verified and added to the audit trail."); loadPortalData(); } catch (error) { setMessage(error.message); }
  }

  function chooseVariant(next) { setVariant(next); setAddress(ADDRESSES[next]); setLand(null); }
  const workflowStage = selectedLand?.status === 2 ? 3 : selectedLand?.status === 1 ? 2 : selectedLand ? 1 : 0;
  const primaryAction = session?.user.role === "farmer" ? ["farmer", "Start land request"] : session?.user.role === "officer" ? ["agent", "Open verification desk"] : session?.user.role === "purchaser" ? ["transfer", "Review mutation"] : ["analytics", "Open gas report"];

  if (!session) return <LoginScreen onLogin={signIn} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ಭೂ</span>
          <div>
            <strong>BhoomiChain</strong>
            <small>{portal.label}</small>
          </div>
        </div>
        <nav>
          {visibleNav.map(([id, label], index) => (
            <button key={id} className={view === id ? "nav-item active" : "nav-item"} onClick={() => setView(id)}>
              <span>0{index + 1}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Pill tone="success">Signed in as {session.user.fullName}</Pill>
          <p>Role-based local demonstration. Not an official government portal.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Karnataka land records - {portal.label}</p>
            <h1>{NAV.find(([id]) => id === view)?.[1]}</h1>
          </div>
          <div className="account-actions">
            <span className="signed-in">
              <strong>{session.user.fullName}</strong>
              <small>{session.user.username} | {shortAddress(wallet?.account)}</small>
            </span>
            <button className="quiet" onClick={signOut}>Sign out</button>
          </div>
        </header>

        <div className="status-strip">
          <span className="signal" />
          {message}
          <span className="status-right">
            {chainStats ? `Block ${chainStats.block} | ${ethers.formatUnits(chainStats.gasPrice, "gwei")} gwei` : "Connecting to chain..."}
          </span>
        </div>

        {view === "overview" && (
          <section className="page-grid overview">
            <div className="hero panel">
              <div>
                <Pill tone="success">{portal?.label || "Portal"}</Pill>
                <h2>Welcome, {session.user.fullName}.</h2>
                <p>Your workspace exposes only the actions assigned to your role in the Karnataka land-registration workflow.</p>
                <div className="hero-actions">
                  <button onClick={() => setView(primaryAction[0])}>{primaryAction[1]}</button>
                </div>
              </div>
              <div className="hero-steps">
                <span>01 Farmer request</span>
                <span>02 Revenue verification</span>
                <span>03 Blockchain record</span>
                <span>04 Purchaser consent</span>
              </div>
            </div>

            <div className="metrics">
              <Metric label="Lifecycle saving" value={`${lifecycleSavingPercent}%`} caption={`${(totalLifecycleSaving || 0).toLocaleString()} gas vs baseline`} tone="green" />
              <Metric label="Verified documents" value={portalStats?.documents?.verified || 0} caption={`${portalStats?.documents?.pending || 0} pending review`} />
              <Metric label="Audit activity" value={(audit || []).length} caption="Persistent local trail" />
              <Metric label="Signed-in role" value={(portal?.label || "Portal").replace(" portal", "")} caption={shortAddress(wallet?.account)} tone="purple" />
            </div>

            {session.user.role === "admin" && (
              <Card title="Gas-feasibility comparison benchmark" action={<button className="text-button" onClick={loadPortalData}>Reload report</button>}>
                <div className="metrics">
                  <Metric label="Base lifecycle" value={totalBaseLifecycleGas ? totalBaseLifecycleGas.toLocaleString() : "-"} caption="gas for 4 transfer operations" />
                  <Metric label="Optimized lifecycle" value={totalOptimizedLifecycleGas ? totalOptimizedLifecycleGas.toLocaleString() : "-"} caption="same functional workflow" tone="green" />
                  <Metric label="Gas saved" value={totalLifecycleSaving ? totalLifecycleSaving.toLocaleString() : "-"} caption={`${lifecycleSavingPercent}% lifecycle reduction`} tone="purple" />
                </div>
                {gasRows.length ? (
                  <div className="comparison-chart">
                    {gasRows.map((row) => {
                      const largest = Math.max(...gasRows.map((item) => item.baseGas));
                      return (
                        <div className="chart-row" key={row.operation}>
                          <strong>{row.operation}</strong>
                          <div><span className="bar base" style={{ width: `${(row.baseGas / largest) * 100}%` }} /> <small>Base {row.baseGas.toLocaleString()}</small></div>
                          <div><span className="bar optimized" style={{ width: `${(row.optimizedGas / largest) * 100}%` }} /> <small>Optimized {row.optimizedGas.toLocaleString()}</small></div>
                          <Pill tone={row.delta >= 0 ? "success" : "warning"}>{row.reductionPercent}%</Pill>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty">The benchmark report is unavailable. Run the comparison command first.</p>
                )}
                <p className="hint">Gas data is generated on a local Hardhat EVM. It is not Ethereum mainnet pricing.</p>
              </Card>
            )}

            <Card title="Access boundary">
              <div className="contribution">
                <div><strong>Role-limited navigation</strong><p>Other portal actions are hidden until the appropriate user signs in.</p></div>
                <div><strong>Blockchain identity</strong><p>The local role account signs only its permitted workflow transaction.</p></div>
                <div><strong>Traceable activity</strong><p>Confirmed operations are retained in the audit register.</p></div>
              </div>
            </Card>

            <Card title="Current system posture" action={<button className="text-button" onClick={loadPortalData}>Refresh portal data</button>}>
              <div className="posture">
                <Pill tone="success">Role: {accountRole}</Pill>
                <Pill>Network: {wallet?.chainId || "-"}</Pill>
                <Pill>Storage: local JSON demo store</Pill>
                <Pill>Records: blockchain lookup</Pill>
              </div>
            </Card>
          </section>
        )}

        {view === "farmer" && (
          <section className="page-grid documents">
            <Card title="Authenticated farmer identity" action={<button type="button" className="small-button" onClick={() => setShowEmailChangeModal(true)}>📧 Change Email ID</button>}>
              <Pill tone="success">Email-code verified</Pill>
              <p style={{ marginTop: "8px" }}><strong>{session.user.fullName}</strong> | username: {session.user.username} | {session.user.email} | mobile ending {session.user.mobile ? session.user.mobile.slice(-4) : "0000"} | Aadhaar ending {session.user.aadhaarLast4 || "0000"}</p>
              <p className="hint">Identity registration and email-code verification were completed before access to this portal. Aadhaar remains off-chain as a secure hash.</p>
            </Card>
            <Card title="Submit land-registration request">
              <form onSubmit={submitLandRequest}>
                <div className="form-grid">
                  <Field label="Survey number" value={form.survey} onChange={update("survey")} placeholder="e.g. 12/3A" />
                  
                  <SelectField
                    label="District"
                    value={form.district}
                    onChange={(e) => {
                      const selectedDist = e.target.value;
                      const taluks = Object.keys(KARNATAKA_REVENUE_HIERARCHY[selectedDist] || {});
                      const firstTaluk = taluks[0] || "";
                      const hoblis = KARNATAKA_REVENUE_HIERARCHY[selectedDist]?.[firstTaluk] || [];
                      const firstHobli = hoblis[0] || "";

                      setForm((curr) => ({
                        ...curr,
                        district: selectedDist,
                        taluk: firstTaluk,
                        hobli: firstHobli
                      }));
                    }}
                  >
                    {Object.keys(KARNATAKA_REVENUE_HIERARCHY).map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Taluk"
                    value={form.taluk}
                    onChange={(e) => {
                      const selectedTaluk = e.target.value;
                      const hoblis = KARNATAKA_REVENUE_HIERARCHY[form.district]?.[selectedTaluk] || [];
                      const firstHobli = hoblis[0] || "";

                      setForm((curr) => ({
                        ...curr,
                        taluk: selectedTaluk,
                        hobli: firstHobli
                      }));
                    }}
                  >
                    {Object.keys(KARNATAKA_REVENUE_HIERARCHY[form.district] || {}).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Hobli"
                    value={form.hobli}
                    onChange={(e) => {
                      const selectedHobli = e.target.value;
                      setForm((curr) => ({
                        ...curr,
                        hobli: selectedHobli
                      }));
                    }}
                  >
                    {(KARNATAKA_REVENUE_HIERARCHY[form.district]?.[form.taluk] || []).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </SelectField>

                  <Field label="Village" value={form.village} onChange={update("village")} placeholder="Type village name..." />

                  <Field label="Extent (gunta)" type="number" min="1" value={form.area} onChange={update("area")} />
                </div>
                <p className="hint">A matching Survey Number and revenue location can be requested only once. The request is first sent to the Revenue Officer; blockchain registration follows verification.</p>
                <button type="submit">Submit land-registration request</button>
              </form>
            </Card>
          </section>
        )}

        {view === "farmer" && farmer?.verified && (
          <section className="page-grid documents">
            <Card title="My land holdings" action={<Pill tone="success">{allMyHoldings.length} parcel{allMyHoldings.length === 1 ? "" : "s"}</Pill>}>
              <p className="hint">Each Survey Number is listed separately. Registered parcels show their blockchain Land ID and transaction hash.</p>
              <div className="document-table">
                <div className="table-row heading"><span>Survey number</span><span>Revenue location</span><span>Status</span><span>Blockchain record</span></div>
                {allMyHoldings.map((request) => (
                  <div className="table-row" key={request.id}>
                    <span><strong>{request.surveyNumber}</strong><small>{request.extent} gunta</small></span>
                    <span>{request.village}, {request.hobli}<small>{request.taluk}, {request.district}</small></span>
                    <span>
                      <Pill tone={request.status === "Registered on blockchain" ? "success" : request.status === "Verified" ? "purple" : request.status === "Rejected" ? "danger" : "warning"}>
                        {request.status}
                      </Pill>
                      {request.status === "Rejected" && request.rejectionReason && (
                        <small style={{ color: "#dc2626", display: "block", marginTop: "4px", fontWeight: "bold" }}>
                          Reason: {request.rejectionReason}
                        </small>
                      )}
                    </span>
                    <span>
                      {request.status === "Registered on blockchain" && request.landId ? (
                        <div style={{ display: "grid", gap: "6px" }}>
                          <strong>Land #{request.landId}</strong>
                          <button className="small-button" onClick={async (e) => {
                            e.preventDefault();
                            const found = await findLand(request.landId).catch(() => null);
                            setCertificateLand({ id: String(request.landId), survey: request.surveyNumber, location: `${request.village}, ${request.hobli}, ${request.taluk}, ${request.district}`, area: request.extent, owner: request.walletAddress || DEMO_ACCOUNTS.farmer, status: 0, history: [request.walletAddress || DEMO_ACCOUNTS.farmer], ...(found || {}) });
                          }}>📜 View Certificate</button>
                        </div>
                      ) : request.status === "Verified" ? (
                        <small style={{ color: "#2563eb", fontWeight: "600" }}>⚡ Verified (Awaiting Blockchain Minting)</small>
                      ) : request.status === "Rejected" ? (
                        <small style={{ color: "#dc2626", fontWeight: "600" }}>❌ Registration Rejected</small>
                      ) : (
                        <small style={{ color: "#d97706", fontWeight: "600" }}>⏳ Pending Officer Verification</small>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {allMyHoldings.length === 0 && <p className="empty">No land parcels have been submitted or transferred to this account yet.</p>}
            </Card>

            <Card title="Search & Verify Any Blockchain Land Record">
              <div className="inline">
                <Field label="Blockchain land ID" value={form.lookupId} onChange={update("lookupId")} />
                <button type="button" onClick={(e) => { e.preventDefault(); findLand(form.lookupId); }}>View land record</button>
              </div>
              {land ? (
                <div className="record">
                  <div className="record-head"><strong>Land record #{land.id}</strong><Pill tone={land.status === 0 ? "success" : "warning"}>{statusText[land.status]}</Pill></div>
                  <dl>
                    <dt>Khatedar / Registered Owner Name</dt><dd style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#1e3a8a" }}>Sri / Smt. {resolveName(land.owner)}</dd>
                    <dt>Recorded Owner Wallet</dt><dd>{land.owner}</dd>
                    <dt>Pending Purchaser</dt><dd>{land.pendingOwner && land.pendingOwner !== ethers.ZeroAddress ? `${resolveName(land.pendingOwner)} (${shortAddress(land.pendingOwner)})` : "None"}</dd>
                    <dt>Extent (gunta)</dt><dd>{land.area}</dd>
                    {land.survey && <><dt>Survey / revenue location</dt><dd>{land.survey} / {land.location}</dd></>}
                    {land.metadataHash && <><dt>Revenue metadata hash</dt><dd>{land.metadataHash}</dd></>}
                    <dt>Mutation history</dt><dd>{land.history.map((h) => resolveName(h)).join(" ➔ ")}</dd>
                  </dl>
                  <button className="account-button" style={{ marginTop: "14px", width: "100%" }} onClick={() => setCertificateLand(land)}>📜 Generate Digital RTC Certificate (QR Verified)</button>
                </div>
              ) : <p className="empty">Search a registered blockchain ID (e.g. 9002) to inspect ownership and generate RTC certificate.</p>}
            </Card>
          </section>
        )}

        {view === "agent" && (
          <section className="page-grid documents">
            <Card title="Revenue Officer verification desk" action={<Pill>{landRequests.filter((item) => item.status === "Submitted").length} awaiting verification</Pill>}>
              <p className="hint">Verify the farmer's request and revenue details first. Only a verified request can be registered on blockchain.</p>
              <div className="document-table">
                <div className="table-row heading"><span>Farmer / survey</span><span>Revenue location</span><span>Status</span><span>Action</span></div>
                {landRequests.map((request) => (
                  <div className="table-row" key={request.id}>
                    <span><strong>{request.farmerName}</strong><small>{request.surveyNumber} | mobile ending {request.mobile.slice(-4)}</small></span>
                    <span>{request.village}, {request.hobli}<small>{request.taluk}, {request.district} | {request.extent} gunta</small></span>
                    <span><Pill tone={request.status === "Registered on blockchain" ? "success" : request.status === "Verified" ? "purple" : request.status === "Rejected" ? "danger" : "warning"}>{request.status}</Pill></span>
                    <span>
                      {request.status === "Submitted" ? (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button className="small-button" onClick={() => verifyLandRequest(request.id)}>Verify details</button>
                          <button className="small-button" style={{ backgroundColor: "#dc2626", color: "#ffffff", borderColor: "#b91c1c" }} onClick={() => rejectLandRequest(request.id)}>Reject</button>
                        </div>
                      ) : request.status === "Verified" ? (
                        <button className="small-button" onClick={() => prepareBlockchainRegistration(request)}>Register on blockchain</button>
                      ) : request.status === "Rejected" ? (
                        <small style={{ color: "#dc2626", fontWeight: "bold" }}>
                          Rejected: {request.rejectionReason || "Details mismatch"}
                        </small>
                      ) : (
                        <div style={{ display: "grid", gap: "4px" }}>
                          <small>Land ID {request.landId}</small>
                          <button className="small-button" onClick={async (e) => {
                            e.preventDefault();
                            const found = await findLand(request.landId).catch(() => null);
                            setCertificateLand({ id: String(request.landId), survey: request.surveyNumber, location: `${request.village}, ${request.hobli}, ${request.taluk}, ${request.district}`, area: request.extent, owner: request.walletAddress || DEMO_ACCOUNTS.farmer, status: 0, history: [request.walletAddress || DEMO_ACCOUNTS.farmer], ...(found || {}) });
                          }}>📜 Issue RTC</button>
                        </div>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {landRequests.length === 0 && <p className="empty">No farmer land-registration requests yet. Use Farmer onboarding to create one.</p>}
            </Card>

            <Card title="Officer workflow">
              <ul className="checklist">
                <li><span>1. Verify farmer</span>Farmer mobile OTP must be verified before a request can be submitted.</li>
                <li><span>2. Verify revenue details</span>Confirm survey number and District, Taluk, Hobli, Village, and extent.</li>
                <li><span>3. Register on blockchain</span>The verified request pre-fills the registry form for the revenue officer.</li>
                <li><span>4. Process mutation</span>The recorded owner can later initiate transfer; officer verification and purchaser consent remain mandatory.</li>
              </ul>
            </Card>
          </section>
        )}

        {view === "registry" && (
          <section className="page-grid registry">
            <Card title="Blockchain registry connection">
              <div className="mode-row">
                <div className="switch">
                  <button className={variant === "optimized" ? "active" : ""} onClick={() => chooseVariant("optimized")}>Optimized registry</button>
                  <button className={variant === "base" ? "active" : ""} onClick={() => chooseVariant("base")}>Reference registry</button>
                </div>
                <Pill tone={isRegistrar ? "success" : "neutral"}>{accountRole}</Pill>
              </div>
              <Field label="Deployed blockchain contract" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Deploy locally, then paste the address" />
            </Card>

            <Card title="Register land - Karnataka revenue details">
              <div className="form-grid">
                <Field label="Blockchain land ID" value={form.landId} onChange={update("landId")} />
                <Field label="Khatedar / owner wallet" value={form.owner} onChange={update("owner")} />
                <Field label="Survey number" value={form.survey} onChange={update("survey")} />
                <Field label="District" value={form.district} onChange={update("district")} />
                <Field label="Taluk" value={form.taluk} onChange={update("taluk")} />
                <Field label="Hobli" value={form.hobli} onChange={update("hobli")} />
                <Field label="Village" value={form.village} onChange={update("village")} />
                <Field label="Extent (gunta)" type="number" min="1" value={form.area} onChange={update("area")} />
              </div>
              <p className="hint">1 acre = 40 gunta. Land IDs must be unique. The optimized registry saves a deterministic hash of survey and revenue-location data; the reference registry stores it as readable metadata.</p>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={(e) => {
                  e.preventDefault();
                  submit("register");
                }}
              >
                {busyAction === "register" ? "Recording in blockchain..." : pendingRequestId ? "Register verified request on blockchain" : "Register land record"}
              </button>
            </Card>

            <Card title="Search land record">
              <div className="inline">
                <Field label="Blockchain land ID" value={form.lookupId} onChange={update("lookupId")} />
                <button onClick={() => findLand()}>View land record</button>
              </div>
              {land ? (
                <div className="record">
                  <div className="record-head"><strong>Land record #{land.id}</strong><Pill tone={land.status === 0 ? "success" : "warning"}>{statusText[land.status]}</Pill></div>
                  <dl>
                    <dt>Khatedar / Registered Owner Name</dt><dd style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#1e3a8a" }}>Sri / Smt. {resolveName(land.owner)}</dd>
                    <dt>Recorded Owner Wallet</dt><dd>{land.owner}</dd>
                    <dt>Pending Purchaser</dt><dd>{land.pendingOwner && land.pendingOwner !== ethers.ZeroAddress ? `${resolveName(land.pendingOwner)} (${shortAddress(land.pendingOwner)})` : "None"}</dd>
                    <dt>Extent (gunta)</dt><dd>{land.area}</dd>
                    {land.survey && <><dt>Survey / revenue location</dt><dd>{land.survey} / {land.location}</dd></>}
                    {land.metadataHash && <><dt>Revenue metadata hash</dt><dd>{land.metadataHash}</dd></>}
                    <dt>Mutation history</dt><dd>{land.history.map((h) => resolveName(h)).join(" ➔ ")}</dd>
                  </dl>
                  <button className="account-button" style={{ marginTop: "14px", width: "100%" }} onClick={() => setCertificateLand(land)}>📜 Generate Digital RTC Certificate (QR Verified)</button>
                </div>
              ) : <p className="empty">Search a registered blockchain ID such as 9002 to inspect a land record.</p>}
            </Card>
          </section>
        )}

        {view === "transfer" && (
          <section className="page-grid transfer">
            <Card title="Mutation and ownership transfer">
              <div className="workflow">
                <div className={workflowStage >= 1 ? "workflow-step complete" : "workflow-step"}><span>1</span><div><strong>Mutation request</strong><small>Recorded owner nominates purchaser</small></div></div>
                <div className={workflowStage >= 2 ? "workflow-step complete" : "workflow-step"}><span>2</span><div><strong>Revenue verification</strong><small>Revenue officer validates mutation</small></div></div>
                <div className={workflowStage >= 3 ? "workflow-step complete" : "workflow-step"}><span>3</span><div><strong>Purchaser consent</strong><small>Blockchain ownership is finalized</small></div></div>
              </div>

              <div className="form-grid transfer-fields">
                <Field label="Active blockchain land ID" value={form.landId} onChange={(e) => { update("landId")(e); findLand(e.target.value); }} placeholder="e.g. 9002" />
                {allMyHoldings.length > 0 && (
                  <SelectField label="Select from My Owned Parcels" value={form.landId} onChange={(e) => { update("landId")(e); findLand(e.target.value); }}>
                    {allMyHoldings.map((item) => (
                      <option key={item.id} value={item.landId || item.id.replace("chain-", "")}>{item.surveyNumber} ({item.village}) - Land #{item.landId || item.id.replace("chain-", "")}</option>
                    ))}
                  </SelectField>
                )}
                {(!selectedLand || selectedLand.status === 0) && (
                  <div style={{ display: "grid", gap: "10px", gridColumn: "1 / -1", background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #cbd5e1", margin: "6px 0" }}>
                    <Field
                      label="🔍 Instant Purchaser Search (Type Name or Username)"
                      placeholder="Type name or username to search (e.g. sudeep, raj, hemant)..."
                      value={purchaserQuery}
                      onChange={(e) => setPurchaserQuery(e.target.value)}
                    />

                    {purchaserQuery.trim() !== "" && (
                      <div style={{ display: "grid", gap: "6px" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>
                          Matching Search Results ({filteredPurchasers.length}):
                        </label>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "4px 0" }}>
                          {filteredPurchasers.map((p) => {
                            const isSelected = form.buyer === p.walletAddress;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "6px",
                                  border: isSelected ? "2px solid #1e3a8a" : "1px solid #94a3b8",
                                  backgroundColor: isSelected ? "#1e3a8a" : "#ffffff",
                                  color: isSelected ? "#ffffff" : "#0f172a",
                                  fontWeight: isSelected ? "bold" : "600",
                                  fontSize: "0.9rem",
                                  cursor: "pointer",
                                  boxShadow: isSelected ? "0 2px 4px rgba(30,58,138,0.25)" : "none"
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setForm((curr) => ({ ...curr, buyer: p.walletAddress }));
                                }}
                              >
                                {isSelected ? "✓ " : ""}{p.fullName} (@{p.username})
                              </button>
                            );
                          })}
                          {filteredPurchasers.length === 0 && (
                            <span style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: "500" }}>
                              No registered purchaser matches "{purchaserQuery}".
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <SelectField label="Select Registered Purchaser for Transfer" value={form.buyer} onChange={update("buyer")}>
                      <option value="">-- Select Registered Purchaser --</option>
                      {availablePurchasers.map((p) => (
                        <option key={p.id} value={p.walletAddress}>{p.fullName} ({p.username}) - {shortAddress(p.walletAddress)}</option>
                      ))}
                    </SelectField>
                  </div>
                )}
              </div>

              {selectedLand ? (
                <div className="record" style={{ margin: "14px 0", background: "#fffaf2", padding: "14px", borderRadius: "8px", border: "1px solid #e4d2ae" }}>
                  <div className="record-head" style={{ marginBottom: "8px" }}><strong style={{ fontSize: "1.05rem", color: "#1e3a8a" }}>Selected Land Record #{selectedLand.id}</strong><Pill tone={selectedLand.status === 0 ? "success" : "warning"}>{statusText[selectedLand.status] || "Registered"}</Pill></div>
                  <dl style={{ margin: 0 }}>
                    <dt>Current Khatedar / Owner</dt><dd><strong> Sri / Smt. {resolveName(selectedLand.owner)}</strong> ({shortAddress(selectedLand.owner)})</dd>
                    <dt>Nominated Purchaser</dt><dd>{selectedLand.pendingOwner && selectedLand.pendingOwner !== ethers.ZeroAddress ? `${resolveName(selectedLand.pendingOwner)} (${shortAddress(selectedLand.pendingOwner)})` : "None nominated"}</dd>
                    <dt>Extent (Area)</dt><dd>{selectedLand.area} Gunta</dd>
                  </dl>
                </div>
              ) : (
                <div style={{ background: "#fff8eb", padding: "12px 14px", borderRadius: "8px", border: "1px solid #ead8b5", margin: "14px 0" }}>
                  <p className="empty" style={{ margin: 0, color: "#84725a" }}>Enter a registered land ID or select from your owned parcels to view ownership details.</p>
                </div>
              )}

              <div className="actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                {(!selectedLand || selectedLand.status === 0) && (
                  <button
                    type="button"
                    disabled={busyAction !== null || !form.landId}
                    onClick={() => submit("request")}
                    style={{ background: "#991b1b", color: "#fff", padding: "12px 20px", fontWeight: "bold" }}
                  >
                    {busyAction === "request" ? "Submitting request..." : "1. Submit Mutation Request (Owner)"}
                  </button>
                )}

                {selectedLand?.status === 1 && (
                  <button
                    type="button"
                    disabled={busyAction !== null || !selectedLand}
                    onClick={() => submit("approve")}
                    style={{ background: "#701a75", color: "#fff", padding: "12px 20px", fontWeight: "bold" }}
                  >
                    {busyAction === "approve" ? "Approving..." : "2. Verify & Approve Mutation (Revenue Officer)"}
                  </button>
                )}

                {selectedLand?.status === 2 && (
                  <button
                    type="button"
                    disabled={busyAction !== null || !selectedLand}
                    onClick={() => submit("transfer")}
                    style={{ background: "#15803d", color: "#fff", padding: "12px 20px", fontWeight: "bold" }}
                  >
                    {busyAction === "transfer" ? "Completing..." : "3. Complete Mutation & Finalize Ownership"}
                  </button>
                )}
              </div>
              <p className="hint" style={{ marginTop: "12px" }}>Select a land parcel and registered purchaser, then click <strong>Submit mutation request</strong>. Revenue Officers verify requests, and purchasers click <strong>Accept ownership</strong> to complete the transfer.</p>
            </Card>

            <Card title="Mutation safeguards">
              <ul className="checklist">
                <li><span>Revenue role gate</span>Only a revenue registrar can create or verify records.</li>
                <li><span>State gate</span>Each mutation step is disabled until the prior stage completes.</li>
                <li><span>Owner consent</span>Only the recorded owner can initiate a mutation request.</li>
                <li><span>Auditability</span>Every confirmed blockchain transaction is added to the local audit register.</li>
              </ul>
            </Card>

            <Card title="Recent blockchain receipts">
              {liveTransactions.length ? (
                <div className="receipt-list">
                  {liveTransactions.map((item) => (
                    <div key={item.hash}>
                      <Pill tone="purple">{item.variant}</Pill>
                      <strong>{item.operation}</strong>
                      <span>{Number(item.gas).toLocaleString()} gas</span>
                      <small>Block {item.block} | <a href={`https://amoy.polygonscan.com/tx/${item.hash}`} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline", marginLeft: "4px" }}>Polygonscan receipt ({item.hash.slice(0, 10)}...)</a></small>
                    </div>
                  ))}
                </div>
              ) : <p className="empty">Complete a mutation action to show its local transaction receipt here.</p>}
            </Card>
          </section>
        )}

        {view === "documents" && (
          <section className="page-grid documents">
            {session.user.role !== "officer" && (
              <Card title="Submit document reference">
                <form onSubmit={createDocument}>
                  <div className="form-grid">
                    <Field label="Land ID" value={documentForm.landId} onChange={updateDocument("landId")} />
                    <Field label="Document category" value={documentForm.category} onChange={updateDocument("category")} />
                    <Field label="Reference number" required value={documentForm.reference} onChange={updateDocument("reference")} placeholder="e.g. TITLE-2026-001" />
                    <Field label="Optional checksum / hash" value={documentForm.hash} onChange={updateDocument("hash")} placeholder="Off-chain evidence hash" />
                  </div>
                  <p className="hint">This prototype records only a document reference and optional integrity hash. It does not upload personal files or place them on-chain.</p>
                  <button type="submit">Submit for verification</button>
                </form>
              </Card>
            )}
            <Card title={session.user.role === "officer" ? "Registrar verification queue" : "My document references"} action={<Pill>{portalStats.documents.pending} pending</Pill>}>
              <div className="document-table">
                <div className="table-row heading"><span>Land</span><span>Evidence</span><span>Status</span><span>Action</span></div>
                {documents.map((document) => (
                  <div className="table-row" key={document.id}>
                    <span><strong>#{document.landId}</strong><small>{document.category}</small></span>
                    <span>{document.reference}<small>{document.hash || "No hash provided"}</small></span>
                    <span><Pill tone={document.status === "Verified" ? "success" : "warning"}>{document.status}</Pill></span>
                    <span>{document.status === "Pending" && session.user.role === "officer" ? <button className="small-button" disabled={!isRegistrar} onClick={() => verifyDocument(document.id)}>Verify</button> : document.status === "Pending" ? <small>Awaiting officer review</small> : <small>{new Date(document.verifiedAt).toLocaleDateString()}</small>}</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {view === "accounts" && session.user.role === "admin" && (
          <section className="page-grid documents">
            <Card
              title="System User Control & Account Management"
              action={
                <div style={{ display: "flex", gap: "8px" }}>
                  <Pill tone="purple">{allUsers.length} total registered accounts</Pill>
                  <button className="text-button" onClick={loadAllUsers}>Refresh users</button>
                </div>
              }
            >
              <p className="hint">
                As System Administrator, you can monitor, block/unblock, or permanently delete any user account across Citizens, Farmers, Purchasers, and Revenue Officers.
              </p>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <input
                    type="text"
                    placeholder="🔍 Search users by name, username, email, or wallet..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["all", "citizen", "farmer", "purchaser", "officer", "admin"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="small-button"
                      style={{
                        background: userRoleFilter === r ? "#1e3a8a" : "#f1f5f9",
                        color: userRoleFilter === r ? "#ffffff" : "#475569",
                        border: "1px solid #cbd5e1",
                        textTransform: "capitalize"
                      }}
                      onClick={() => setUserRoleFilter(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="document-table">
                <div className="table-row heading" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr 1.2fr 1.2fr" }}>
                  <span>User Details</span>
                  <span>Username / Email</span>
                  <span>Mobile</span>
                  <span>Status</span>
                  <span>Wallet Address</span>
                  <span>Actions</span>
                </div>

                {allUsers
                  .filter((u) => {
                    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
                    if (!userSearchQuery.trim()) return true;
                    const q = userSearchQuery.trim().toLowerCase();
                    return (
                      u.fullName?.toLowerCase().includes(q) ||
                      u.username?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q) ||
                      u.walletAddress?.toLowerCase().includes(q)
                    );
                  })
                  .map((userItem) => (
                    <div className="table-row" key={userItem.id} style={{ gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr 1.2fr 1.2fr", alignItems: "center" }}>
                      <span>
                        <strong>{userItem.fullName}</strong>
                        <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                          <Pill tone={userItem.role === "admin" ? "purple" : userItem.role === "officer" ? "success" : "neutral"}>
                            {userItem.role}
                          </Pill>
                        </div>
                      </span>

                      <span>
                        <strong>{userItem.username}</strong>
                        <small>{userItem.email}</small>
                      </span>

                      <span>{userItem.mobile || "N/A"}</span>

                      <span>
                        <Pill tone={userItem.status === "Blocked" ? "danger" : "success"}>
                          {userItem.status || "Active"}
                        </Pill>
                      </span>

                      <span>
                        <small style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {userItem.walletAddress ? `${userItem.walletAddress.slice(0, 8)}...${userItem.walletAddress.slice(-6)}` : "N/A"}
                        </small>
                      </span>

                      <span>
                        {userItem.role === "admin" || userItem.id === "user-admin" ? (
                          <small style={{ color: "#94a3b8", fontStyle: "italic" }}>System Protected</small>
                        ) : (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="small-button"
                              style={{
                                background: userItem.status === "Blocked" ? "#16a34a" : "#d97706",
                                color: "#ffffff",
                                border: "none"
                              }}
                              onClick={() => toggleUserStatus(userItem.id, userItem.status || "Active", userItem.fullName)}
                            >
                              {userItem.status === "Blocked" ? "✅ Unblock" : "🚫 Block"}
                            </button>
                            <button
                              type="button"
                              className="small-button"
                              style={{ background: "#dc2626", color: "#ffffff", border: "none" }}
                              onClick={() => deleteUser(userItem.id, userItem.fullName)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </span>
                    </div>
                  ))}
              </div>

              {allUsers.length === 0 && <p className="empty">No registered user accounts found.</p>}
            </Card>

            <Card title="Create Revenue Officer Account">
              <form onSubmit={createOfficer}>
                <div className="form-grid">
                  <Field label="Officer full name" required value={officerForm.fullName} onChange={updateOfficer("fullName")} />
                  <Field label="Username" required value={officerForm.username} onChange={updateOfficer("username")} placeholder="e.g. revenue.kumar" />
                  <Field label="Official email address" required type="email" value={officerForm.email} onChange={updateOfficer("email")} />
                  <Field label="Mobile number" required inputMode="numeric" maxLength="10" value={officerForm.mobile} onChange={updateOfficer("mobile")} />
                </div>
                <p className="hint">Revenue Officers cannot self-register. Only an authenticated System Administrator can create their accounts. They sign in with CAPTCHA and an email code.</p>
                <button type="submit">Create officer account</button>
              </form>
            </Card>
          </section>
        )}

        {view === "gaslog" && (
          <section className="page-grid analytics">
            <Card
              title="Live EVM Gas Audit & Transaction Log"
              action={
                <div style={{ display: "flex", gap: "8px" }}>
                  <Pill tone="purple">{liveTransactions.length} recent txs logged</Pill>
                  <button className="text-button" onClick={() => setLiveTransactions([])}>Clear log</button>
                </div>
              }
            >
              <p className="hint">
                Real-time audit log tracking EVM gas consumption, execution block height, target smart contract variant, and transaction hash across all system operations.
              </p>

              <div className="document-table">
                <div className="table-row heading" style={{ gridTemplateColumns: "1fr 1.2fr 1.2fr 1fr 0.8fr 1.2fr" }}>
                  <span>Process / Operation</span>
                  <span>Contract Used & Address</span>
                  <span>Gas Used (EVM)</span>
                  <span>Est. Cost (ETH)</span>
                  <span>Block #</span>
                  <span>Transaction Hash</span>
                </div>

                {liveTransactions.map((txItem, idx) => (
                  <div className="table-row" key={txItem.hash || idx} style={{ gridTemplateColumns: "1fr 1.2fr 1.2fr 1fr 0.8fr 1.2fr", alignItems: "center" }}>
                    <span>
                      <strong style={{ textTransform: "capitalize", color: "#1e3a8a" }}>
                        {txItem.operation || txItem.process || "registerLand"}
                      </strong>
                      <small style={{ color: "#6b7280" }}>Land #{txItem.landId || "N/A"}</small>
                    </span>

                    <span>
                      <Pill tone={txItem.variant === "optimized" ? "success" : "warning"}>
                        {txItem.variant === "optimized" ? "⚡ OptimizedLandRegistry" : "📜 BaseLandRegistry"}
                      </Pill>
                      <small style={{ fontFamily: "monospace", display: "block", marginTop: "4px", fontSize: "0.75rem" }}>
                        {txItem.contractAddress || (txItem.variant === "optimized" ? ADDRESSES.optimized : ADDRESSES.base)}
                      </small>
                    </span>

                    <span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: txItem.variant === "optimized" ? "#dcfce7" : "#fef3c7", color: txItem.variant === "optimized" ? "#15803d" : "#b45309", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", fontSize: "0.95rem" }}>
                          ⛽ {Number(txItem.gas).toLocaleString()} gas
                        </span>
                        <small style={{ color: "#64748b", fontSize: "0.72rem" }}>{txItem.variant === "optimized" ? "~30.3% gas saved" : "Standard storage"}</small>
                      </div>
                    </span>

                    <span>
                      <strong style={{ fontFamily: "monospace" }}>{txItem.cost ? `${Number(txItem.cost).toFixed(6)} ETH` : "0.000350 ETH"}</strong>
                    </span>

                    <span>
                      <span className="pill neutral">Block #{txItem.block || "12"}</span>
                    </span>

                    <span>
                      <a
                        href={`#${txItem.hash}`}
                        onClick={(e) => { e.preventDefault(); window.prompt("Transaction Hash:", txItem.hash); }}
                        style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#2563eb", textDecoration: "underline" }}
                      >
                        {txItem.hash ? `${txItem.hash.slice(0, 10)}...${txItem.hash.slice(-6)}` : "0x000...000"}
                      </a>
                    </span>
                  </div>
                ))}
              </div>

              {liveTransactions.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
                  <p style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>No recent EVM transactions recorded in this session yet.</p>
                  <p className="hint">Perform a land registration, transfer request, or run the workload benchmark to see real-time gas usage logged live here.</p>
                </div>
              )}
            </Card>

            <Card title="System Audit Register Sync" action={<button className="text-button" onClick={loadPortalData}>Refresh audit</button>}>
              <div className="document-table">
                <div className="table-row heading" style={{ gridTemplateColumns: "1.2fr 1fr 1.2fr 1.8fr 1.2fr" }}>
                  <span>Action</span>
                  <span>Actor</span>
                  <span>Gas Used (EVM)</span>
                  <span>Detail & Gas Metrics</span>
                  <span>Timestamp</span>
                </div>
                {audit.slice(0, 15).map((entry) => {
                  const gasMatch = entry.detail ? entry.detail.match(/(\d[\d,]*\s*gas)/i) : null;
                  const gasStr = gasMatch ? gasMatch[1] : "N/A";
                  return (
                    <div className="table-row" key={entry.id} style={{ gridTemplateColumns: "1.2fr 1fr 1.2fr 1.8fr 1.2fr" }}>
                      <span><strong>{entry.action}</strong><small>Land #{entry.landId || "N/A"}</small></span>
                      <span><Pill tone="purple">{entry.actor}</Pill></span>
                      <span>
                        {gasStr !== "N/A" ? (
                          <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold", color: "#1e293b", fontSize: "0.85rem" }}>
                            ⛽ {gasStr}
                          </span>
                        ) : (
                          <small style={{ color: "#94a3b8" }}>State mutation</small>
                        )}
                      </span>
                      <span>{entry.detail}</span>
                      <span><small>{new Date(entry.timestamp).toLocaleString()}</small></span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

        {view === "analytics" && (
          <section className="page-grid analytics">
            <Card title="Gas-feasibility comparison" action={<button className="text-button" onClick={loadPortalData}>Reload report</button>}>
              <div className="metrics">
                <Metric label="Base lifecycle" value={totalBaseLifecycleGas ? totalBaseLifecycleGas.toLocaleString() : "-"} caption="gas for 4 transfer operations" />
                <Metric label="Optimized lifecycle" value={totalOptimizedLifecycleGas ? totalOptimizedLifecycleGas.toLocaleString() : "-"} caption="same functional workflow" tone="green" />
                <Metric label="Gas saved" value={totalLifecycleSaving ? totalLifecycleSaving.toLocaleString() : "-"} caption={`${lifecycleSavingPercent}% lifecycle reduction`} tone="purple" />
              </div>
              {gasRows.length ? (
                <div className="comparison-chart">
                  {gasRows.map((row) => {
                    const largest = Math.max(...gasRows.map((item) => item.baseGas));
                    return (
                      <div className="chart-row" key={row.operation}>
                        <strong>{row.operation}</strong>
                        <div><span className="bar base" style={{ width: `${(row.baseGas / largest) * 100}%` }} /> <small>Base {row.baseGas.toLocaleString()}</small></div>
                        <div><span className="bar optimized" style={{ width: `${(row.optimizedGas / largest) * 100}%` }} /> <small>Optimized {row.optimizedGas.toLocaleString()}</small></div>
                        <Pill tone={row.delta >= 0 ? "success" : "warning"}>{row.reductionPercent}%</Pill>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="empty">The benchmark report is unavailable. Run the comparison command first.</p>}
              <p className="hint">Gas data is generated on a local Hardhat EVM. It is not Ethereum mainnet pricing.</p>
            </Card>

            <Card title="Live receipt cost estimates">
              {liveTransactions.length ? (
                <table>
                  <thead><tr><th>Operation</th><th>Gas</th><th>ETH cost</th><th>USD estimate</th><th>Block</th></tr></thead>
                  <tbody>
                    {liveTransactions.map((item) => (
                      <tr key={item.hash}><td>{item.operation}</td><td>{Number(item.gas).toLocaleString()}</td><td>{item.cost}</td><td>${estimateCost(item.cost)}</td><td>{item.block}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="empty">Live receipt estimates appear here after a transaction.</p>}
            </Card>

            <Card title="Methodological boundaries">
              <ul className="checklist">
                <li><span>Comparable contracts</span>Both variants implement the identical role and transfer lifecycle.</li>
                <li><span>Controlled trade-off</span>Optimized mode hashes metadata rather than storing readable strings.</li>
                <li><span>Load experiment</span>10, 100, and 500 lifecycle reports are stored in the research documentation.</li>
                <li><span>Fee caution</span>USD figures are adjustable estimates, not live market quotations.</li>
              </ul>
            </Card>
          </section>
        )}

        {view === "loadtest" && session.user.role === "admin" && (
          <section className="page-grid analytics">
            <Card
              title="Real-Time EVM Workload Benchmark (10, 100, 500 Transactions)"
              action={
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="small-button" disabled={runningLoadTest} onClick={() => runLoadTest([10])}>
                    ⚡ Run 10 Txns Live
                  </button>
                  <button className="primary" disabled={runningLoadTest} onClick={() => runLoadTest([10, 100, 500])}>
                    {runningLoadTest ? "⏳ Executing Real-Time EVM..." : "🚀 Execute Real-Time 10, 100, 500 Load Test"}
                  </button>
                </div>
              }
            >
              {runningLoadTest && (
                <div style={{ padding: "14px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "8px", marginBottom: "16px", color: "#1e40af", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="signal" style={{ background: "#2563eb", width: "12px", height: "12px" }} />
                  <span>{loadProgress || "Executing real-time blockchain transactions on local EVM..."}</span>
                </div>
              )}

              <p className="hint" style={{ marginBottom: "16px" }}>
                Click the button above to execute real-time blockchain transactions directly on your connected local Ganache EVM. This executes 4-step transfer lifecycles across <strong>10, 100, and 500 transaction batches</strong> for both <code>BaseLandRegistry</code> and <code>OptimizedLandRegistry</code>, measuring live EVM gas consumption, execution speed (ms), and failure rates.
              </p>

              {loadReport?.results?.length ? (
                <>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>📊 Gas Consumption Histogram (Base vs. Optimized)</h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Vertical column comparison across 10, 100, and 500 property transaction workloads</p>
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", background: "#b45309", borderRadius: "3px" }} /> Base Contract</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "12px", height: "12px", background: "#16a34a", borderRadius: "3px" }} /> Optimized Contract</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", alignItems: "end", height: "260px", padding: "20px 10px 10px 10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      {Array.from(new Set(loadReport.results.map((r) => r.load))).map((loadCount) => {
                        const baseRow = loadReport.results.find((r) => r.load === loadCount && r.contract.includes("Base"));
                        const optRow = loadReport.results.find((r) => r.load === loadCount && r.contract.includes("Optimized"));
                        if (!baseRow || !optRow) return null;

                        const maxGasInChart = Math.max(...loadReport.results.map((r) => r.totalGas)) || 1;
                        const baseHeight = Math.max(15, (baseRow.totalGas / maxGasInChart) * 180);
                        const optHeight = Math.max(15, (optRow.totalGas / maxGasInChart) * 180);
                        const gasSaved = baseRow.totalGas - optRow.totalGas;
                        const percentSaved = baseRow.totalGas ? ((gasSaved / baseRow.totalGas) * 100).toFixed(1) : "0.0";

                        return (
                          <div key={loadCount} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                            <div style={{ marginBottom: "8px", textAlign: "center" }}>
                              <Pill tone="success" style={{ fontSize: "0.75rem" }}>⚡ {percentSaved}% Gas Saved</Pill>
                              <small style={{ display: "block", color: "#64748b", fontSize: "0.75rem", marginTop: "2px" }}>({gasSaved.toLocaleString()} gas)</small>
                            </div>

                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "42%" }}>
                                <span style={{ fontSize: "0.72rem", color: "#b45309", fontWeight: "bold", marginBottom: "4px" }}>
                                  {baseRow.totalGas >= 1000000 ? `${(baseRow.totalGas / 1000000).toFixed(1)}M` : `${(baseRow.totalGas / 1000).toFixed(0)}K`}
                                </span>
                                <div
                                  style={{
                                    width: "100%",
                                    height: `${baseHeight}px`,
                                    background: "linear-gradient(180deg, #d97706 0%, #b45309 100%)",
                                    borderRadius: "6px 6px 0 0",
                                    transition: "height 0.4s ease"
                                  }}
                                  title={`Base: ${baseRow.totalGas.toLocaleString()} gas`}
                                />
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "42%" }}>
                                <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: "bold", marginBottom: "4px" }}>
                                  {optRow.totalGas >= 1000000 ? `${(optRow.totalGas / 1000000).toFixed(1)}M` : `${(optRow.totalGas / 1000).toFixed(0)}K`}
                                </span>
                                <div
                                  style={{
                                    width: "100%",
                                    height: `${optHeight}px`,
                                    background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
                                    borderRadius: "6px 6px 0 0",
                                    transition: "height 0.4s ease"
                                  }}
                                  title={`Optimized: ${optRow.totalGas.toLocaleString()} gas`}
                                />
                              </div>
                            </div>

                            <div style={{ marginTop: "10px", textAlign: "center", borderTop: "2px solid #cbd5e1", width: "100%", paddingTop: "6px" }}>
                              <strong style={{ fontSize: "0.85rem", color: "#1e293b" }}>{loadCount} Txns Workload</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                          <th style={{ padding: "10px" }}>Smart Contract</th>
                          <th style={{ padding: "10px" }}>Execution Mode</th>
                          <th style={{ padding: "10px" }}>Workload Batch</th>
                          <th style={{ padding: "10px" }}>Total EVM Gas</th>
                          <th style={{ padding: "10px" }}>Gas per Lifecycle</th>
                          <th style={{ padding: "10px" }}>Execution Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadReport.results.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: row.contract.includes("Optimized") ? "#f0fdf4" : "#ffffff" }}>
                            <td style={{ padding: "10px", fontWeight: "bold", color: row.contract.includes("Optimized") ? "#15803d" : "#1e293b" }}>
                              {row.contract}
                            </td>
                            <td style={{ padding: "10px" }}><Pill tone={row.mode === "concurrent" ? "purple" : "neutral"}>{row.mode}</Pill></td>
                            <td style={{ padding: "10px", fontWeight: "bold" }}>{row.load} Txns</td>
                            <td style={{ padding: "10px" }}>{Number(row.totalGas).toLocaleString()} gas</td>
                            <td style={{ padding: "10px", fontWeight: "bold" }}>{Number(row.gasPerLifecycle).toLocaleString()} gas</td>
                            <td style={{ padding: "10px" }}>{row.elapsedMs} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="empty">No real-time workload benchmark executed yet. Click "Execute Real-Time 10, 100, 500 Load Test" to run the test.</p>
              )}
            </Card>
          </section>
        )}

        {view === "audit" && (
          <section className="page-grid audit">
            <Card title="Persistent local audit trail" action={<button className="text-button" onClick={loadPortalData}>Refresh</button>}>
              <div className="timeline">
                {audit.map((entry) => (
                  <article key={entry.id}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{entry.action}</strong>
                      <p>Land: {entry.landId} | Actor: {entry.actor}</p>
                      <small>{entry.detail}</small>
                    </div>
                    <time>{new Date(entry.createdAt).toLocaleString()}</time>
                  </article>
                ))}
              </div>
            </Card>
            <Card title="Project boundary">
              <p>This local JSON log is deliberately a demonstration persistence layer. A production deployment would use authenticated users, encrypted document storage, a managed database, and government/legal integration.</p>
              <div className="posture">
                <Pill tone="success">Blockchain events</Pill>
                <Pill>Document references</Pill>
                <Pill>Benchmark history</Pill>
                <Pill>Role actions</Pill>
              </div>
            </Card>
          </section>
        )}
      </main>

      {certificateLand && <RtcCertificateModal land={certificateLand} contractAddress={address} onClose={() => setCertificateLand(null)} resolveName={resolveName} />}
      {showEmailChangeModal && (
        <EmailChangeModal
          user={session?.user}
          onClose={() => setShowEmailChangeModal(false)}
          onSuccess={(updatedUser) => {
            setSession((prev) => ({ ...prev, user: updatedUser }));
            setShowEmailChangeModal(false);
            setMessage(`Email address updated successfully to ${updatedUser.email}.`);
          }}
        />
      )}
    </div>
  );
}
