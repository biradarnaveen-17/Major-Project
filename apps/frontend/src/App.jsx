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

// Basis-point offsets for a visual replay only; these are not fresh on-chain measurements.
const BENCHMARK_REPLAY_VARIATIONS = Object.freeze([
  { baseBps: -36, optimizedBps: 18 }, { baseBps: 22, optimizedBps: -31 },
  { baseBps: 41, optimizedBps: 27 }, { baseBps: -18, optimizedBps: 36 },
  { baseBps: 29, optimizedBps: -12 }, { baseBps: -43, optimizedBps: 24 },
  { baseBps: 15, optimizedBps: 44 }, { baseBps: 38, optimizedBps: -26 },
  { baseBps: -27, optimizedBps: -38 }, { baseBps: 47, optimizedBps: 11 },
  { baseBps: -11, optimizedBps: 42 }, { baseBps: 33, optimizedBps: -19 },
  { baseBps: -48, optimizedBps: 7 }, { baseBps: 19, optimizedBps: 32 },
  { baseBps: 8, optimizedBps: -45 }, { baseBps: -24, optimizedBps: 29 },
  { baseBps: 45, optimizedBps: -6 }, { baseBps: -32, optimizedBps: -17 },
  { baseBps: 26, optimizedBps: 39 }, { baseBps: -5, optimizedBps: -34 }
]);

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
  const [form, setForm] = useState({ landId: DEFAULT_DEMO_LAND_ID, owner: "", survey: "12/3A", district: "Bengaluru Urban", taluk: "Bengaluru North", hobli: "Yelahanka", village: "Jakkur", area: "48", buyer: "" });
  const [purchasers, setPurchasers] = useState([]);
  const [purchaserQuery, setPurchaserQuery] = useState("");
  const [loadReport, setLoadReport] = useState(null);
  const [runningLoadTest, setRunningLoadTest] = useState(false);
  const [loadProgress, setLoadProgress] = useState("");
  const [benchmarkReplayIndex, setBenchmarkReplayIndex] = useState(0);

  async function runLoadTest(targetLoads = [10, 100, 500]) {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date().toISOString();
    try {
      setRunningLoadTest(true);
      setLoadReport({ runId, startedAt, generatedAt: startedAt, isRealtime: true, loads: [], results: [] });
      setLoadProgress("Connecting to local EVM blockchain...");
      setMessage("Starting real-time EVM workload benchmark...");

      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const authorityWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", rpcProvider);
      const buyerWallet = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", rpcProvider);

      const baseContractAdmin = new ethers.Contract(ADDRESSES.base, BASE_ABI, authorityWallet);
      const baseContractBuyer = new ethers.Contract(ADDRESSES.base, BASE_ABI, buyerWallet);
      const optContractAdmin = new ethers.Contract(ADDRESSES.optimized, OPTIMIZED_ABI, authorityWallet);
      const optContractBuyer = new ethers.Contract(ADDRESSES.optimized, OPTIMIZED_ABI, buyerWallet);

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

        setLoadReport({
          runId,
          startedAt,
          generatedAt: new Date().toISOString(),
          isRealtime: true,
          loads: targetLoads.slice(0, index + 1),
          results: [...results]
        });

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

        setLoadReport({
          runId,
          startedAt,
          generatedAt: new Date().toISOString(),
          isRealtime: true,
          loads: targetLoads.slice(0, index + 1),
          results: [...results]
        });
      }

      setLoadReport((current) => current ? { ...current, completedAt: new Date().toISOString() } : current);
      setMessage("Real-time EVM load test completed live on blockchain!");
      appendAudit("Real-Time EVM Load Test", "Scalability", `Executed real-time workloads: ${targetLoads.join(", ")} txns`);
    } catch (error) {
      console.error("Real-time load test error:", error);
      setMessage("Load test error: " + error.message);
    } finally {
      setRunningLoadTest(false);
      setLoadProgress("");
    }
  }

  async function loadSavedBenchmark() {
    const runId = `saved-${Date.now()}`;
    const startedAt = new Date().toISOString();
    try {
      setRunningLoadTest(true);
      const savedReport = await api("/api/benchmarks/loads");
      const variationIndex = benchmarkReplayIndex % BENCHMARK_REPLAY_VARIATIONS.length;
      const variation = BENCHMARK_REPLAY_VARIATIONS[variationIndex];
      setBenchmarkReplayIndex((current) => current + 1);
      const replayRows = (savedReport.results || [])
        .filter((row) => row.mode === "sequential")
        .sort((left, right) => left.load - right.load || (left.contract.includes("Base") ? -1 : 1));

      if (!replayRows.length) throw new Error("The saved report does not contain sequential benchmark results.");

      const variedRows = replayRows.map((row) => {
        const offset = row.contract.includes("Base") ? variation.baseBps : variation.optimizedBps;
        const gasPerLifecycle = Math.round(Number(row.gasPerLifecycle) * (1 + offset / 10000));
        return {
          ...row,
          gasPerLifecycle,
          totalGas: gasPerLifecycle * Number(row.load),
          simulated: true,
          variationIndex: variationIndex + 1
        };
      });

      setLoadReport({ runId, startedAt, generatedAt: savedReport.generatedAt, isStored: true, simulated: true, variationIndex: variationIndex + 1, loads: [], results: [] });
      setMessage(`Replaying saved workload benchmark variation ${variationIndex + 1} of ${BENCHMARK_REPLAY_VARIATIONS.length}...`);

      for (let index = 0; index < variedRows.length; index++) {
        const row = variedRows[index];
        setLoadProgress(`[${index + 1}/${variedRows.length}] Loading ${row.contract.includes("Base") ? "Base" : "Optimized"} Contract (${row.load} txns)...`);
        await new Promise((resolve) => setTimeout(resolve, 850));
        const visibleRows = variedRows.slice(0, index + 1);
        setLoadReport({
          runId,
          startedAt,
          generatedAt: savedReport.generatedAt,
          isStored: true,
          simulated: true,
          variationIndex: variationIndex + 1,
          loads: [...new Set(visibleRows.map((item) => item.load))],
          results: visibleRows
        });
      }

      setLoadReport((current) => current ? { ...current, completedAt: new Date().toISOString() } : current);
      setMessage(`Saved workload benchmark variation ${variationIndex + 1} completed. No live EVM transactions were sent.`);
    } catch (error) {
      console.error("Saved benchmark load error:", error);
      setMessage("Could not load the saved benchmark: " + error.message);
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
  const isRecordedOwner = Boolean(
    selectedLand?.owner && currentAccount && selectedLand.owner.toLowerCase() === currentAccount
  );
  const isPendingPurchaser = Boolean(
    selectedLand?.pendingOwner && currentAccount && selectedLand.pendingOwner.toLowerCase() === currentAccount
  );
  const portal = session ? (PORTALS[session.user.role] || PORTALS.farmer) : PORTALS.farmer;
  const accountRole = session ? (session.user.role === "officer" ? "Revenue Officer" : session.user.role === "admin" ? "System Administrator" : session.user.role === "purchaser" ? "Purchaser" : "Farmer") : "Visitor";
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
        const existingReq = (landRequests || []).find((r) => String(r.landId) === String(land.id));
        list.unshift({
          id: `chain-${land.id}`,
          surveyNumber: land.survey || existingReq?.surveyNumber || "12/3A",
          extent: land.area || existingReq?.extent || "48",
          village: land.location ? land.location.split(",")[0] : (existingReq?.village || "Jakkur"),
          hobli: land.location ? (land.location.split(",")[1] || "") : (existingReq?.hobli || "Yelahanka"),
          taluk: land.location ? (land.location.split(",")[2] || "") : (existingReq?.taluk || "Bengaluru North"),
          district: land.location ? (land.location.split(",")[3] || "") : (existingReq?.district || "Bengaluru Urban"),
          status: "Registered on blockchain",
          landId: String(land.id),
          walletAddress: land.owner
        });
      }
    }
    return list;
  }, [myLandRequests, landRequests, land, wallet, farmer]);

  const allSelectableParcels = useMemo(() => {
    const list = [...allMyHoldings];
    const target = selectedLand || land;
    if (target && target.id) {
      const targetIdStr = String(target.id);
      if (!list.some((item) => String(item.landId || item.id.replace("chain-", "").replace("selected-", "")) === targetIdStr)) {
        const existingReq = (landRequests || []).find((r) => String(r.landId) === targetIdStr);
        list.unshift({
          id: `selected-${targetIdStr}`,
          surveyNumber: target.survey || existingReq?.surveyNumber || "12/3A",
          village: target.location ? target.location.split(",")[0] : (existingReq?.village || "Jakkur"),
          landId: targetIdStr,
          isPendingIncoming: Number(target.status) > 0
        });
      }
    }
    return list;
  }, [allMyHoldings, selectedLand, land, landRequests]);

  const availablePurchasers = useMemo(() => {
    const currentOwnerAddr = (selectedLand?.owner || land?.owner || "").toLowerCase();
    return (purchasers || []).filter((p) => {
      const pAddr = String(p.walletAddress || "").toLowerCase();
      const isMeWallet = wallet?.account && pAddr === String(wallet.account).toLowerCase();
      const isMeUser = session?.user?.username && String(p.username || "").toLowerCase() === String(session.user.username).toLowerCase();
      const isCurrentOwner = currentOwnerAddr && pAddr === currentOwnerAddr;
      return !isMeWallet && !isMeUser && !isCurrentOwner;
    });
  }, [purchasers, wallet, session, selectedLand, land]);

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

  const api = useCallback(async (path, options) => {
    const headers = new Headers(options?.headers || {});
    if (session?.token && !headers.has("authorization")) headers.set("authorization", `Bearer ${session.token}`);
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : { message: await response.text() };
    if (!response.ok) throw new Error(body.message || `API request failed (${response.status})`);
    if (!contentType.includes("application/json")) throw new Error("The local API returned an invalid response. Restart the backend with npm run start --workspace apps/backend.");
    return body;
  }, [session?.token]);

  async function loadPortalData() {
    const [dashboardResult, documentResult, auditResult, reportResult, requestResult, purchaserResult] = await Promise.allSettled([api("/api/dashboard"), api("/api/documents"), api("/api/audit"), api("/api/benchmarks/latest"), api("/api/land-requests"), api("/api/purchasers")]);
    if (dashboardResult.status === "fulfilled") setPortalStats(dashboardResult.value);
    if (documentResult.status === "fulfilled") setDocuments(documentResult.value);
    if (auditResult.status === "fulfilled") setAudit(auditResult.value);
    if (reportResult.status === "fulfilled") setReport(reportResult.value);
    if (requestResult.status === "fulfilled") setLandRequests(requestResult.value);
    if (purchaserResult.status === "fulfilled") setPurchasers(purchaserResult.value);
  }

  async function refreshAppData() {
    const tasks = [loadPortalData()];

    if (session?.user?.role === "admin") {
      tasks.push(loadAllUsers());
      tasks.push(loadOfficers());
    }

    await Promise.allSettled(tasks);
  }

  async function appendAudit(action, landId, detail) {
    try {
      const entry = await api("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, landId, actor: accountRole, detail })
      });
      setAudit((current) => [entry, ...current].slice(0, 50));
    } catch (error) {
      console.warn("Audit write failed:", error.message);
    }
  }

  const loadAllUsers = useCallback(async () => {
    try {
      const data = await api("/api/admin/users");
      setAllUsers(data);
    } catch (e) {
      console.warn("Failed to load users:", e.message);
    }
  }, [api]);

  useEffect(() => {
    if (session?.token) {
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
      await refreshAppData();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function deleteUser(userId, fullName) {
    if (!window.confirm(`Are you sure you want to permanently DELETE the account for Sri / Smt. ${fullName}? This action cannot be undone.`)) return;
    try {
      const res = await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      setMessage(res.message);
      await refreshAppData();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function resetSystemDatabase() {
    if (!window.confirm("Are you sure you want to purge ALL test land records, requests, and non-admin user accounts? This will reset the database to clean initial state.")) return;
    try {
      const res = await api("/api/admin/reset-database", { method: "POST" });
      setMessage(res.message || "Database reset successfully.");
      localStorage.removeItem("bhoomi_transferred_lands");
      localStorage.removeItem("bhoomi_active_land_id");
      await refreshAppData();
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
      const result = await api("/api/admin/officers", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` },
        body: JSON.stringify(officerForm)
      });

      setOfficers((current) => [result.officer, ...current]);

      setOfficerForm({
        fullName: "",
        username: "",
        email: "",
        mobile: ""
      });

      setMessage(`Revenue Officer account created for ${result.officer.fullName}.`);

      await refreshAppData();
    } catch (error) { setMessage(error.message); }
  }

  async function deleteOfficer(id, name) {
    if (!window.confirm(`Are you sure you want to delete Revenue Officer Sri / Smt. ${name}?`)) return;
    try {
      const res = await api(`/api/admin/officers/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${session.token}` } });
      setMessage(res.message || "Officer account deleted.");
      await refreshAppData();
    } catch (error) { setMessage(error.message); }
  }

  async function useDemoAccount(role, user) {
    try {
      let localProvider = new ethers.JsonRpcProvider(RPC_URL);
      let network;
      try {
        network = await localProvider.getNetwork();
      } catch {
        localProvider = new ethers.JsonRpcProvider(RPC_URL);
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

  async function signIn(authResult, options = {}) {
    const role = authResult.user.role || "citizen";
    const portalRole = PORTALS[role] ? role : "citizen";

    const savedView = options.restoreView ? sessionStorage.getItem("bhoomichain_view") : null;

    const nextView =
      savedView && PORTALS[portalRole].views.includes(savedView)
        ? savedView
        : PORTALS[portalRole].defaultView;

    setSession({
      ...authResult,
      signedInAt: new Date().toISOString()
    });

    sessionStorage.setItem("bhoomichain_session", JSON.stringify(authResult));

    setView(nextView);
    sessionStorage.setItem("bhoomichain_view", nextView);

    window.location.hash = `/${portalRole}/${nextView}`;

    useDemoAccount(PORTALS[portalRole].account, authResult.user).catch((error) => {
      console.warn("Background blockchain initialization:", error.message);
    });

    if (["citizen", "farmer", "purchaser"].includes(role)) {
      const activeWallet =
        authResult.user.username === "sudeep"
          ? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          : authResult.user.username === "raj" || authResult.user.username === "boss"
          ? "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
          : role === "farmer"
          ? DEMO_ACCOUNTS.farmer
          : DEMO_ACCOUNTS.buyer;

      setFarmer({
        id: authResult.user.id,
        name: authResult.user.fullName,
        email: authResult.user.email,
        mobile: authResult.user.mobile,
        walletAddress: activeWallet,
        verified: true
      });

      api(`/api/farmers?email=${encodeURIComponent(authResult.user.email)}`)
        .then((savedFarmers) => {
          if (savedFarmers[0]) {
            setFarmer((prev) => ({
              ...prev,
              ...savedFarmers[0],
              walletAddress: activeWallet
            }));
          }
        })
        .catch(() => {});
    }

    if (role === "admin") {
      loadOfficers(authResult.token).catch(() => {});
    }
  }

  function signOut() {
    sessionStorage.removeItem("bhoomichain_session");
    sessionStorage.removeItem("bhoomichain_view");
    setSession(null);
    setWallet(null);
    setIsRegistrar(null);
    setFarmer(null);
    setOfficers([]);
    setView("overview");
    setMessage("Choose a portal to continue.");
  }

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
        if (parsed?.user?.role) {
          signIn(parsed, { restoreView: true });
        }
      } catch { sessionStorage.removeItem("bhoomichain_session"); }
    }
  }, []);

  useEffect(() => { if (portal && !portal.views.includes(view)) setView(portal.defaultView); }, [portal, view]);
  useEffect(() => {
    if (session?.user?.role && portal?.views?.includes(view)) {
      sessionStorage.setItem("bhoomichain_view", view);
    }
  }, [session, portal, view]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const localProvider = new ethers.JsonRpcProvider(RPC_URL);
        const [block, feeData] = await Promise.all([localProvider.getBlockNumber(), localProvider.getFeeData()]);
        if (active) setChainStats({ block, gasPrice: feeData.gasPrice || 0n });
      } catch {
        try {
          const fallbackProvider = new ethers.JsonRpcProvider(RPC_URL);
          const [block, feeData] = await Promise.all([fallbackProvider.getBlockNumber(), fallbackProvider.getFeeData()]);
          if (active) setChainStats({ block, gasPrice: feeData.gasPrice || 0n });
        } catch {
          if (active) setChainStats(null);
        }
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(interval); };
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

  async function signerFor(action) {
    const activeProvider = wallet?.provider || defaultProvider;

    if (action === "approve" || action === "register") {
      return new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
    }
    if (!wallet?.signer || !wallet?.account) {
      throw new Error("Your blockchain wallet is not ready. Please sign in again and wait for it to connect.");
    }
    return wallet.signer;
  }

  function toNumericLandId(id) {
    if (!id) return "0";
    const str = String(id).trim();
    if (/^\d+$/.test(str)) return str;
    const hash = ethers.keccak256(ethers.toUtf8Bytes(str));
    return (BigInt(hash) % 900000000000n + 100000000000n).toString();
  }

  function parseLandDetails(details, targetVariant = variant) {
    if (!details) return null;
    try {
      if (targetVariant === "base") {
        const rawPending = details.pendingOwner || details[5] || "";
        const pendingClean = (!rawPending || rawPending === ethers.ZeroAddress) ? "" : rawPending;
        return {
          id: (details.id || details[0] || "").toString(),
          survey: details.surveyNumber || details[1] || "",
          location: details.location || details[2] || "",
          area: (details.area || details[3] || "0").toString(),
          owner: details.currentOwner || details[4] || "",
          pendingOwner: pendingClean,
          status: Number(details.transferStatus ?? details[6] ?? 0),
          history: details.ownershipHistory || details[7] || []
        };
      } else {
        const rawPending = details.pendingOwner || details[3] || "";
        const pendingClean = (!rawPending || rawPending === ethers.ZeroAddress) ? "" : rawPending;
        return {
          owner: details.currentOwner || details[0] || "",
          area: (details.area || details[1] || "0").toString(),
          metadataHash: details.metadataHash || details[2] || "",
          pendingOwner: pendingClean,
          status: Number(details.transferStatus ?? details[4] ?? 0),
          history: details.ownershipHistory || details[5] || []
        };
      }
    } catch (e) {
      console.warn("parseLandDetails error:", e.message);
      return null;
    }
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
            pendingOwner: "",
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
      const item = parseLandDetails(result, foundVariant);
      if (item) {
        if (foundVariant === "optimized") item.id = String(landIdInput);
        setLand(item);
        setForm((current) => ({ ...current, landId: String(landIdInput), lookupId: String(landIdInput) }));
        if (!silent) setMessage(`Land record #${landIdInput} loaded from blockchain (${foundVariant === "optimized" ? "Optimized" : "Base"} contract).`);
        return item;
      }
      setLand(null);
      return null;
    } catch {
      if (!silent) setMessage(`Unable to retrieve land record #${landIdInput}.`);
      setLand(null);
      return null;
    }
  }

  async function submit(action) {
    if (!form.landId) {
      setMessage("Please enter or select a valid land ID first.");
      return;
    }
    const numericLandId = toNumericLandId(form.landId);
    const targetLand = land || (allMyHoldings || []).find((l) => String(l.landId || l.id) === String(form.landId));
    const isOfficer = ["officer", "admin"].includes(session?.user?.role);
    if ((action === "register" || action === "approve") && !isOfficer) {
      setMessage("Only a Revenue Officer can perform this action.");
      return;
    }
    setBusyAction(action);
    setMessage(`Preparing ${action} transaction for land ID #${form.landId}...`);

    try {
      const activeProvider = wallet?.provider || defaultProvider;
      const registry = contract(false);
      const signer = await signerFor(action, targetLand);

      if (action !== "approve") {
        try {
          const signerAddress = await signer.getAddress();
          const signerBalance = await activeProvider.getBalance(signerAddress);
          if (signerBalance < ethers.parseEther("0.1")) {
            const faucet = new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
            const fundTx = await faucet.sendTransaction({ to: signerAddress, value: ethers.parseEther("1.0") });
            await fundTx.wait();
          }
        } catch (gasErr) {
          console.warn("Gas faucet auto-topup skipped:", gasErr.message);
        }
      }

      const landVariant = targetLand?.variant || variant;
      const landAddress = ADDRESSES[landVariant] || address;
      const landAbi = landVariant === "base" ? BASE_ABI : OPTIMIZED_ABI;

      let tx;
      let transferSigner = null;
      if (action === "register") {
        const revenueLocation = `${form.village}, ${form.hobli}, ${form.taluk}, ${form.district}`;
        const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(parcelMetadata(form.survey, form.district, form.taluk, form.hobli, form.village)));
        const validOwner = (form.owner && ethers.isAddress(form.owner)) ? form.owner : wallet?.account || DEMO_ACCOUNTS.farmer;

        const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
        const authorityRegistry = new ethers.Contract(landAddress, landAbi, authoritySigner);

        try {
          const isReg = await authorityRegistry.registrars(authoritySigner.address).catch(() => true);
          if (!isReg) {
            const setRegTx = await authorityRegistry.setRegistrar(authoritySigner.address, true);
            await setRegTx.wait();
          }
        } catch (regErr) {
          console.warn("Auto-setRegistrar skipped:", regErr.message);
        }

        if (landVariant === "base") {
          tx = await authorityRegistry["registerLand(uint256,address,string,string,uint256)"](numericLandId, validOwner, form.survey, revenueLocation, form.area);
        } else {
          tx = await authorityRegistry["registerLand(uint256,address,bytes32,uint96)"](numericLandId, validOwner, metadataHash, form.area);
        }
      }
      if (action === "request") {
        let targetBuyer = form.buyer;
        if (!ethers.isAddress(targetBuyer)) throw new Error("Please select a registered purchaser from the dropdown list.");

        const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
        const authorityRegistry = new ethers.Contract(landAddress, landAbi, authoritySigner);

        let details = null;
        try {
          const raw = await authorityRegistry.getLandDetails(numericLandId);
          details = parseLandDetails(raw, landVariant);
        } catch {
          details = null;
        }

        if (!details) {
          throw new Error(`Land #${form.landId} is not registered on the active contract. A Revenue Officer must register it before a mutation can be requested.`);
        }

        const onChainOwner = details.owner;
        const requestSigner = await signerFor("request");
        const requestSignerAddress = (await requestSigner.getAddress()).toLowerCase();
        if (onChainOwner.toLowerCase() !== requestSignerAddress) {
          throw new Error(`Only the recorded owner (${shortAddress(onChainOwner)}) can submit a mutation request for land #${form.landId}.`);
        }
        if (targetBuyer.toLowerCase() === requestSignerAddress) {
          throw new Error("You cannot nominate yourself as the purchaser. Please select a different registered purchaser.");
        }

        try {
          const activeProvider = wallet?.provider || defaultProvider;
          const reqAddr = await requestSigner.getAddress();
          const reqBal = await activeProvider.getBalance(reqAddr);
          if (reqBal < ethers.parseEther("0.1")) {
            const faucet = new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
            const fTx = await faucet.sendTransaction({ to: reqAddr, value: ethers.parseEther("1.0") });
            await fTx.wait();
          }
        } catch (fErr) {
          console.warn("Request signer gas funding skipped:", fErr.message);
        }

        const requestRegistry = new ethers.Contract(landAddress, landAbi, requestSigner);
        tx = await requestRegistry.requestTransfer(numericLandId, targetBuyer);
      }
      if (action === "approve") {
        const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
        const authorityRegistry = new ethers.Contract(landAddress, landAbi, authoritySigner);
        tx = await authorityRegistry.approveTransfer(numericLandId);
      }
      if (action === "transfer") {
        const authoritySigner = new ethers.Wallet(DEMO_KEYS.authority, wallet?.provider || defaultProvider);
        const authorityRegistry = new ethers.Contract(landAddress, landAbi, authoritySigner);

        try {
          const isReg = await authorityRegistry.registrars(authoritySigner.address).catch(() => true);
          if (!isReg) {
            const setRegTx = await authorityRegistry.setRegistrar(authoritySigner.address, true);
            await setRegTx.wait();
          }
        } catch { /* Ignore */ }

        let details = null;
        try {
          const raw = await authorityRegistry.getLandDetails(numericLandId);
          details = parseLandDetails(raw, landVariant);
        } catch {
          /* Fallback to local record if getLandDetails throws */
        }

        if (!details) {
          throw new Error(`Land #${form.landId} is not registered on the active contract.`);
        }

        const onChainStatus = details.status;
        const pendingOwnerAddr = details.pendingOwner;

        if (!pendingOwnerAddr || pendingOwnerAddr === ethers.ZeroAddress) {
          throw new Error(`No pending purchaser found for land #${form.landId}. Please submit a mutation request (Step 1) first.`);
        }

        if (onChainStatus !== 2) {
          throw new Error("This mutation has not been approved by a Revenue Officer yet.");
        }

        transferSigner = await signerFor("transfer");
        const transferSignerAddress = (await transferSigner.getAddress()).toLowerCase();
        if (pendingOwnerAddr.toLowerCase() !== transferSignerAddress) {
          throw new Error(`Only the nominated purchaser (${shortAddress(pendingOwnerAddr)}) can finalize this mutation.`);
        }

        try {
          const activeProvider = wallet?.provider || defaultProvider;
          const trAddr = await transferSigner.getAddress();
          const trBal = await activeProvider.getBalance(trAddr);
          if (trBal < ethers.parseEther("0.1")) {
            const faucet = new ethers.Wallet(DEMO_KEYS.authority, activeProvider);
            const fTx = await faucet.sendTransaction({ to: trAddr, value: ethers.parseEther("1.0") });
            await fTx.wait();
          }
        } catch (fErr) {
          console.warn("Transfer signer gas funding skipped:", fErr.message);
        }

        const transferRegistry = new ethers.Contract(landAddress, landAbi, transferSigner);
        tx = await transferRegistry.transferOwnership(numericLandId);
      }

      const receipt = await tx.wait();
      const gasPrice = receipt.gasPrice || 0n;
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
          const newOwnerWallet = await transferSigner.getAddress();
          const newOwnerName = (purchasers || []).find((f) => f.walletAddress?.toLowerCase() === newOwnerWallet.toLowerCase())?.fullName || shortAddress(newOwnerWallet);
          const existingMeta = (landRequests || []).find((r) => String(r.landId) === String(form.landId));
          const transferPayload = {
            newOwnerWallet,
            newOwnerName,
            surveyNumber: existingMeta?.surveyNumber || targetLand?.survey || form.survey || "12/3A",
            village: existingMeta?.village || targetLand?.location?.split(",")[0] || form.village || "Jakkur",
            hobli: existingMeta?.hobli || targetLand?.location?.split(",")[1] || form.hobli || "Yelahanka",
            taluk: existingMeta?.taluk || targetLand?.location?.split(",")[2] || form.taluk || "Bengaluru North",
            district: existingMeta?.district || targetLand?.location?.split(",")[3] || form.district || "Bengaluru Urban",
            extent: existingMeta?.extent || targetLand?.area || form.area || "48"
          };
          await api(`/api/land-requests/transfer-owner/${form.landId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(transferPayload)
          });
          const savedOwned = JSON.parse(localStorage.getItem("bhoomi_transferred_lands") || "[]");
          if (!savedOwned.includes(String(form.landId))) {
            savedOwned.push(String(form.landId));
            localStorage.setItem("bhoomi_transferred_lands", JSON.stringify(savedOwned));
          }
          await refreshAppData();
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
        await findLand(form.landId, true);
        setMessage(`Land ID #${form.landId} registered on blockchain in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed.toString()}.`);
        setView(session?.user?.role === "officer" ? "agent" : "farmer");
        await refreshAppData();
      } else if (action === "transfer") {
        const finalAddr = transferSigner ? await transferSigner.getAddress() : (session?.user?.walletAddress || form.buyer);
        const transferOwnerName = resolveName(finalAddr) || session?.user?.fullName || "New Owner";
        setMessage(`Mutation transfer completed successfully! Ownership of Land #${form.landId} is now finalized on-chain under Sri / Smt. ${transferOwnerName} in block ${receipt.blockNumber}. Gas used: ${receipt.gasUsed.toString()}.`);
        await findLand(form.landId);
        await refreshAppData();
        setView("transfer");
      } else {
        setMessage(`${action} completed in block ${receipt.blockNumber}; gas used: ${receipt.gasUsed.toString()}.`);
        await findLand(form.landId);
        await refreshAppData();
        setView("transfer");
      }
    } catch (error) {
      console.error("Submit transaction failed:", error);
      const friendlyError = displayError(error);
      if (action === "register" && friendlyError === errorText.DuplicateRegistration) {
        const freshId = String(Date.now());
        setForm((current) => ({ ...current, landId: freshId }));
        setMessage(`Land ID ${form.landId} is already registered. A fresh ID (${freshId}) has been generated; click Register again.`);
      } else {
        setMessage(friendlyError);
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function createDocument(event) {
    event.preventDefault();
    try { const item = await api("/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(documentForm) }); setDocuments((current) => [item, ...current]); setMessage("Document reference submitted for verification."); } catch (error) { setMessage(error.message); }
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
      setMessage(`Land-registration request for Survey #${form.survey} (${form.village}) submitted to the Revenue Officer desk.`);
      setView("farmer");
      await refreshAppData();
    } catch (error) { setMessage(error.message); }
  }

  async function verifyLandRequest(id) {
    try {
      const request = await api(`/api/land-requests/${id}/verify`, { method: "PATCH" });
      setLandRequests((current) => current.map((item) => item.id === id ? request : item));
      setMessage("Revenue details verified. The request is ready for blockchain registration.");
      await refreshAppData();
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
      await refreshAppData();
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
    try { const item = await api(`/api/documents/${id}/verify`, { method: "PATCH" }); setDocuments((current) => current.map((document) => document.id === id ? item : document)); setMessage("Document verified successfully."); } catch (error) { setMessage(error.message); }
  }

  function chooseVariant(next) { setVariant(next); setAddress(ADDRESSES[next]); setLand(null); }
  const isCompletedTransfer = selectedLand && selectedLand.status === 0 && selectedLand.history && selectedLand.history.length > 1;
  const workflowStage = isCompletedTransfer ? 4 : selectedLand?.status === 2 ? 3 : selectedLand?.status === 1 ? 2 : selectedLand ? 1 : 0;
  const primaryAction = session?.user.role === "farmer" ? ["farmer", "Start land request"] : session?.user.role === "officer" ? ["agent", "Open verification desk"] : session?.user.role === "purchaser" ? ["transfer", "Open transfer workflow"] : ["overview", "Overview"];

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
            <button key={id} className={view === id ? "nav-item active" : "nav-item"} onClick={() => {
              setView(id);
              sessionStorage.setItem("bhoomichain_view", id);
              window.location.hash = `/${session?.user?.role || "citizen"}/${id}`;
            }}>
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
          </section>
        )}
      </main>
    </div>
  );
}
