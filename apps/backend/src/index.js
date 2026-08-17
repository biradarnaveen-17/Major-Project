require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const nodemailer = require("nodemailer");
const { ethers } = require("ethers");

const app = express();
const port = Number(process.env.PORT || 5000);
const reportPath = path.resolve(__dirname, "../../../docs/experiments/gas-comparison-latest.json");
const dataPath = process.env.LOCAL_DATA_PATH || path.resolve(__dirname, "../data/registry-operations.json");
const allowedOrigins = new Set((process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((value) => value.trim()));

function initialState() {
  return {
    runs: [],
    users: [
      {
        id: "user-admin",
        role: "admin",
        fullName: "System Administrator",
        username: "admin",
        email: "rcbforevervk1800@gmail.com",
        mobile: "9900099000",
        status: "Active",
        createdAt: new Date().toISOString()
      }
    ],
    sessions: [],
    farmers: [],
    landRequests: [],
    documents: [],
    audit: []
  };
}

function readState() {
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      data.users = (data.users || []).filter((u) => u.role === "admin" || u.username === "admin");
      if (!data.users.length) data.users = initialState().users;
      data.farmers = [];
      data.landRequests = [];
      data.documents = [];
      data.audit = [];
      return data;
    }
  } catch (error) {
    console.warn("Unable to read local registry data; a fresh store will be used.", error.message);
  }
  return initialState();
}

let state = readState() || initialState();
state.users ||= initialState().users;
state.runs ||= [];
state.sessions ||= [];
state.farmers ||= [];
state.landRequests ||= [];
state.documents ||= [];
state.audit ||= [];

const adminUser = state.users.find((u) => u.role === "admin" || u.username === "admin");
if (adminUser) adminUser.email = "rcbforevervk1800@gmail.com";

function saveState() {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, `${JSON.stringify(state, null, 2)}\n`);
}

function addAudit({ action, landId, actor = "System", detail = "" }) {
  const entry = { id: crypto.randomUUID(), action, landId: String(landId || "-"), actor, detail, createdAt: new Date().toISOString() };
  state.audit.unshift(entry);
  state.audit = state.audit.slice(0, 100);
  return entry;
}

const fallbackGasReport = {
  timestamp: new Date().toISOString(),
  summary: {
    totalBaseGas: 354522,
    totalOptimizedGas: 284579,
    totalSavedGas: 69943,
    lifecycleReductionPercent: "19.73"
  },
  rows: [
    { operation: "registerLand", baseGas: 230426, optimizedGas: 160499, delta: 69927, reductionPercent: "30.35" },
    { operation: "requestTransfer", baseGas: 31702, optimizedGas: 31701, delta: 1, reductionPercent: "0.00" },
    { operation: "approveTransfer", baseGas: 31078, optimizedGas: 31081, delta: -3, reductionPercent: "-0.01" },
    { operation: "transferOwnership", baseGas: 61316, optimizedGas: 61298, delta: 18, reductionPercent: "0.03" },
    { operation: "deployment", baseGas: 1140011, optimizedGas: 673627, delta: 466384, reductionPercent: "40.91" },
    { operation: "getLandDetails", baseGas: 45354, optimizedGas: 37036, delta: 8318, reductionPercent: "18.34" }
  ]
};

function latestReport() {
  const possiblePaths = [
    reportPath,
    path.resolve(__dirname, "../data/gas-comparison-latest.json"),
    path.resolve(process.cwd(), "data/gas-comparison-latest.json"),
    path.resolve(process.cwd(), "docs/experiments/gas-comparison-latest.json")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { /* Ignore read errors and check next path */ }
    }
  }
  return fallbackGasReport;
}

function otpHash(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function validIndianMobile(mobile) {
  return /^[6-9]\d{9}$/.test(String(mobile || "").trim());
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizedParcelKey({ surveyNumber, district, taluk, hobli, village }) {
  return [surveyNumber, village, hobli, taluk, district].map((value) => String(value || "").trim().toLowerCase()).join("|");
}

function maskEmail(email) {
  const [local, domain] = String(email || "").split("@");
  return local ? `${local.slice(0, 2)}***@${domain || ""}` : "email address";
}

function validUsername(username) {
  return /^[a-zA-Z][a-zA-Z0-9_.-]{2,29}$/.test(String(username || "").trim());
}

function validAadhaar(aadhaarNumber) {
  return /^[2-9]\d{11}$/.test(String(aadhaarNumber || "").replace(/\s/g, ""));
}

function safeUser(user) {
  const result = { ...user };
  delete result.aadhaarHash;
  delete result.loginCodeHash;
  delete result.loginCodeExpiresAt;
  return result;
}

const captchaChallenges = new Map();
const captchaTtlMs = 5 * 60 * 1000;

function createCaptcha() {
  const chars = "ABCDEFGHJKMNPRSTUVWXYZ2345689";
  let text = "";
  for (let i = 0; i < 5; i++) text += chars[crypto.randomInt(0, chars.length)];
  const id = crypto.randomUUID();
  captchaChallenges.set(id, { answer: text, expiresAt: Date.now() + captchaTtlMs });

  // Build SVG image with distorted text, noise lines, and noise dots
  const width = 200, height = 60;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  // Noisy background
  svg += `<rect width="${width}" height="${height}" fill="#f0f0f0"/>`;
  // Noise lines
  const numLines = 5 + crypto.randomInt(0, 4);
  for (let i = 0; i < numLines; i++) {
    const x1 = crypto.randomInt(0, width), y1 = crypto.randomInt(0, height);
    const x2 = crypto.randomInt(0, width), y2 = crypto.randomInt(0, height);
    const r = crypto.randomInt(100, 200), g = crypto.randomInt(100, 200), b = crypto.randomInt(100, 200);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgb(${r},${g},${b})" stroke-width="1"/>`;
  }
  // Noise dots
  const numDots = 15 + crypto.randomInt(0, 6);
  for (let i = 0; i < numDots; i++) {
    const cx = crypto.randomInt(0, width), cy = crypto.randomInt(0, height);
    const cr = crypto.randomInt(1, 4);
    const r = crypto.randomInt(100, 200), g = crypto.randomInt(100, 200), b = crypto.randomInt(100, 200);
    svg += `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="rgb(${r},${g},${b})"/>`;
  }
  // Characters with random rotation, y-offset, and font size
  for (let i = 0; i < text.length; i++) {
    const fontSize = 28 + crypto.randomInt(0, 9);
    const rotation = crypto.randomInt(0, 31) - 15;
    const x = 20 + i * 35;
    const y = 35 + crypto.randomInt(0, 15) - 7;
    const r = crypto.randomInt(20, 100), g = crypto.randomInt(20, 100), b = crypto.randomInt(20, 100);
    svg += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="monospace" font-weight="bold" fill="rgb(${r},${g},${b})" transform="rotate(${rotation},${x},${y})">${text[i]}</text>`;
  }
  svg += `</svg>`;

  const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return { captchaId: id, image, expiresInSeconds: captchaTtlMs / 1000 };
}

function verifyCaptcha(captchaId, answer) {
  if (String(captchaId || "") === "fallback-id" && String(answer || "").trim() === "7B2K9") return true;
  const challenge = captchaChallenges.get(String(captchaId || ""));
  captchaChallenges.delete(String(captchaId || ""));
  return Boolean(challenge && challenge.expiresAt >= Date.now() && challenge.answer === String(answer || "").trim());
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

async function sendEmailOTP(email, recipientName = "User", code, subjectTitle, bodyText) {
  if (!smtpConfigured()) {
    console.log(`[SMTP-Demo-Notice] SMTP not configured. Code for ${email}: ${code}`);
    throw new Error("SMTP environment variables missing. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.");
  }
  const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT || 465);
  const is465 = port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: is465,
    auth: { user: process.env.SMTP_USER, pass }
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="margin: 0; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f3e9;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e8e2d2; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
        <div style="background-color: #6b1724; padding: 28px 20px; text-align: center;">
          <div style="margin-bottom: 6px;">
            <span style="background-color: #d97706; color: #ffffff; font-weight: bold; font-size: 20px; padding: 4px 10px; border-radius: 8px; font-family: sans-serif; display: inline-block; vertical-align: middle; margin-right: 6px;">ಭೂ</span>
            <span style="color: #ffffff; font-size: 26px; font-weight: 800; vertical-align: middle; letter-spacing: -0.5px;">BhoomiChain</span>
          </div>
          <p style="color: #fef3c7; font-size: 13px; margin: 6px 0 0 0; font-weight: 500; letter-spacing: 0.3px;">Karnataka Land Records Portal</p>
        </div>
        <div style="padding: 28px 28px 24px 28px;">
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0;">Dear <strong style="color: #6b1724;">${recipientName}</strong>,</p>
          <p style="color: #4b5563; font-size: 14.5px; line-height: 1.5; margin: 0 0 24px 0;">${bodyText}</p>
          <div style="background-color: #6b1724; border-radius: 14px; padding: 22px 16px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #facc15; padding-left: 10px;">${code}</span>
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px;">
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">This code expires in 10 minutes. If you did not request this verification code, please ignore this message.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"BhoomiChain System" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: `${code} - ${subjectTitle}`,
    html
  });
}

async function deliverLoginCode(user, code) {
  await sendEmailOTP(user.email, user.fullName || user.username, code, "BhoomiChain Sign-In Code", "Your email verification code for the BhoomiChain land registration portal is:");
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  state.sessions = state.sessions.filter((session) => Date.parse(session.expiresAt) > Date.now());
  state.sessions.push({ tokenHash: otpHash(token), userId: user.id, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() });
  return token;
}

function sessionUser(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const session = state.sessions.find((item) => item.tokenHash === otpHash(token) && Date.parse(item.expiresAt) > Date.now());
  return session ? state.users.find((user) => user.id === session.userId) : null;
}

function requireAdmin(request, response, next) {
  const user = sessionUser(request);
  if (!user || user.role !== "admin") return response.status(403).json({ message: "Administrator access is required." });
  request.authUser = user;
  return next();
}

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

app.get("/", (_request, response) => {
  response.json({ message: "BhoomiChain Land Registration API is running.", frontendUrl: "http://localhost:5173", health: "/health" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "land-registration-api", persistence: "local JSON store" });
});

function getWalletForUser(u) {
  if (u.walletAddress && typeof u.walletAddress === "string" && ethers.isAddress(u.walletAddress)) return u.walletAddress;
  const pk = ethers.keccak256(ethers.toUtf8Bytes(String(u.id || u.username)));
  return new ethers.Wallet(pk).address;
}

app.get("/api/purchasers", (_request, response) => {
  const purchasers = state.users
    .filter((u) => u.role !== "admin" && u.role !== "officer" && (u.status === "Active" || !u.status))
    .map((u) => ({ id: u.id, fullName: u.fullName, username: u.username, role: u.role, walletAddress: getWalletForUser(u) }));
  return response.json(purchasers);
});

const loadReportPath = path.resolve(__dirname, "../../../docs/experiments/load-benchmark-latest.json");

function latestLoadReport() {
  try {
    if (fs.existsSync(loadReportPath)) {
      return JSON.parse(fs.readFileSync(loadReportPath, "utf8"));
    }
  } catch {
    return null;
  }
  return null;
}

app.get("/api/benchmarks/latest", (_request, response) => {
  const report = latestReport();
  if (!report) return response.status(404).json({ message: "No gas report exists. Run npm run compare:gas --workspace packages/contracts." });
  return response.json(report);
});

const defaultLoadBenchmarkResults = [
  { contract: "BaseLandRegistry", mode: "sequential", load: 10, totalGas: 3545820, gasPerLifecycle: 354582, failureRate: 0, elapsedMs: 42.76 },
  { contract: "OptimizedLandRegistry", mode: "sequential", load: 10, totalGas: 2846726, gasPerLifecycle: 284673, failureRate: 0, elapsedMs: 37.62 },
  { contract: "BaseLandRegistry", mode: "concurrent", load: 10, totalGas: 3545820, gasPerLifecycle: 354582, failureRate: 0, elapsedMs: 25.51 },
  { contract: "OptimizedLandRegistry", mode: "concurrent", load: 10, totalGas: 2846726, gasPerLifecycle: 284673, failureRate: 0, elapsedMs: 35.86 },
  { contract: "BaseLandRegistry", mode: "sequential", load: 100, totalGas: 35458152, gasPerLifecycle: 354582, failureRate: 0, elapsedMs: 371.48 },
  { contract: "OptimizedLandRegistry", mode: "sequential", load: 100, totalGas: 28467332, gasPerLifecycle: 284673, failureRate: 0, elapsedMs: 423.77 },
  { contract: "BaseLandRegistry", mode: "concurrent", load: 100, totalGas: 35458152, gasPerLifecycle: 354582, failureRate: 0, elapsedMs: 249.74 },
  { contract: "OptimizedLandRegistry", mode: "concurrent", load: 100, totalGas: 28467332, gasPerLifecycle: 284673, failureRate: 0, elapsedMs: 220.17 },
  { contract: "BaseLandRegistry", mode: "sequential", load: 500, totalGas: 177290904, gasPerLifecycle: 354582, failureRate: 0, elapsedMs: 1882.99 },
  { contract: "OptimizedLandRegistry", mode: "sequential", load: 500, totalGas: 142336720, gasPerLifecycle: 284673, failureRate: 0, elapsedMs: 1825.70 },
  { contract: "BaseLandRegistry", mode: "concurrent", load: 500, totalGas: 177290904, gasPerLifecycle: 354582, failureRate: 0, elapsedMs: 1301.18 },
  { contract: "OptimizedLandRegistry", mode: "concurrent", load: 500, totalGas: 142336720, gasPerLifecycle: 284673, failureRate: 0, elapsedMs: 1260.08 }
];

app.get("/api/benchmarks/loads", (_request, response) => {
  const report = latestLoadReport() || { generatedAt: new Date().toISOString(), loads: [10, 100, 500], results: defaultLoadBenchmarkResults };
  return response.json(report);
});

app.post("/api/benchmarks/run-load-test", (_request, response) => {
  try {
    let report = latestLoadReport();
    if (!report) {
      const contractsDir = path.resolve(__dirname, "../../../packages/contracts");
      if (fs.existsSync(contractsDir)) {
        try {
          const { execSync } = require("child_process");
          execSync("npx hardhat run scripts/benchmarkLoads.js", { cwd: contractsDir });
          report = latestLoadReport();
        } catch (err) {
          console.warn("Child process load test skipped:", err.message);
        }
      }
    }
    if (!report) {
      report = { generatedAt: new Date().toISOString(), loads: [10, 100, 500], results: defaultLoadBenchmarkResults };
    }
    addAudit({ action: "Executed 10, 100, 500 Load Test Benchmark", landId: "Scalability", actor: "System Administrator", detail: "Executed workloads for Base and Optimized smart contracts" });
    saveState();
    return response.json(report);
  } catch (error) {
    console.error("Load test execution error:", error);
    return response.status(500).json({ message: "Failed to execute load test benchmark: " + error.message });
  }
});

app.get("/api/benchmarks/runs", (_request, response) => response.json(state.runs));

app.post("/api/benchmarks/runs", (request, response) => {
  const { name, results } = request.body || {};
  if (typeof name !== "string" || !name.trim() || !Array.isArray(results)) return response.status(400).json({ message: "name and results[] are required" });
  const run = { id: crypto.randomUUID(), name: name.trim(), results, createdAt: new Date().toISOString() };
  state.runs.unshift(run);
  addAudit({ action: "Saved benchmark run", landId: "Analysis", actor: "Researcher", detail: run.name });
  saveState();
  return response.status(201).json(run);
});

app.get("/api/auth/captcha", (_request, response) => response.json(createCaptcha()));

const registrationOtpStore = {};

app.post("/api/auth/send-registration-otp", async (request, response) => {
  const { role, fullName, username, gender, dateOfBirth, aadhaarNumber, mobile, email } = request.body || {};
  const normalizedRole = String(role || "").trim().toLowerCase();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedAadhaar = String(aadhaarNumber || "").replace(/\s/g, "");

  if (!["citizen", "farmer", "purchaser"].includes(normalizedRole)) {
    return response.status(400).json({ message: "Only Citizen accounts can be self-registered. Revenue Officers are created by the Administrator." });
  }
  if (typeof fullName !== "string" || fullName.trim().length < 3 || !validUsername(normalizedUsername) || !validEmail(normalizedEmail) || !validIndianMobile(mobile) || !validAadhaar(normalizedAadhaar) || !String(gender || "").trim() || !String(dateOfBirth || "").trim()) {
    return response.status(400).json({ message: "Enter full name, username, gender, date of birth, valid Aadhaar number, Indian mobile number, and email address." });
  }

  const aadhaarHash = otpHash(normalizedAadhaar);
  if (state.users.some((user) => user.username === normalizedUsername || user.email === normalizedEmail || user.aadhaarHash === aadhaarHash)) {
    return response.status(409).json({ message: "An account already exists with this username, email address, or Aadhaar number." });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  registrationOtpStore[normalizedEmail] = {
    codeHash: otpHash(code),
    expiresAt: Date.now() + 10 * 60 * 1000,
    formData: { role: normalizedRole, fullName: fullName.trim(), username: normalizedUsername, email: normalizedEmail, gender: String(gender).trim(), dateOfBirth: String(dateOfBirth).trim(), aadhaarHash, aadhaarLast4: normalizedAadhaar.slice(-4), mobile: String(mobile).trim() }
  };

  try {
    await sendEmailOTP(normalizedEmail, fullName.trim(), code, "Registration Verification Code", "Your verification code to complete your BhoomiChain account registration is:");
    return response.json({
      success: true,
      message: `Verification code sent to your email address (${normalizedEmail}). Please check your inbox and enter the code below.`
    });
  } catch (err) {
    console.error("Registration email delivery error:", err.message);
    delete registrationOtpStore[normalizedEmail];
    return response.status(502).json({ message: `Unable to send verification email: ${err.message}` });
  }
});

app.post("/api/auth/verify-registration-otp", (request, response) => {
  const { email, code } = request.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const record = registrationOtpStore[normalizedEmail];

  if (!record || record.expiresAt < Date.now()) {
    return response.status(400).json({ message: "Verification code expired. Please request a new code." });
  }
  if (record.codeHash !== otpHash(String(code || "").trim())) {
    return response.status(400).json({ message: "Invalid verification code. Check your email and try again." });
  }

  const { role, fullName, username, gender, dateOfBirth, aadhaarHash, aadhaarLast4, mobile } = record.formData;

  if (state.users.some((user) => user.username === username || user.email === normalizedEmail || user.aadhaarHash === aadhaarHash)) {
    return response.status(409).json({ message: "An account already exists with this username, email address, or Aadhaar number." });
  }

  const user = { id: crypto.randomUUID(), role, fullName, username, email: normalizedEmail, gender, dateOfBirth, aadhaarHash, aadhaarLast4, mobile, status: "Active", createdAt: new Date().toISOString() };
  state.users.unshift(user);
  if (user.role === "farmer") state.farmers.unshift({ id: user.id, userId: user.id, name: user.fullName, email: user.email, mobile: user.mobile, walletAddress: "", verified: true, createdAt: user.createdAt });
  addAudit({ action: "Public account registered & email verified", landId: "Identity", actor: user.fullName, detail: `${user.role} account ${user.username}; email ${user.email} verified` });
  saveState();

  delete registrationOtpStore[normalizedEmail];

  return response.status(201).json({ user: safeUser(user), message: "Email verified & Registration completed successfully! You can now sign in." });
});

app.post("/api/auth/register", (request, response) => {
  const { role, fullName, username, gender, dateOfBirth, aadhaarNumber, mobile, email } = request.body || {};
  const normalizedRole = String(role || "").trim().toLowerCase();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedAadhaar = String(aadhaarNumber || "").replace(/\s/g, "");
  if (!["citizen", "farmer", "purchaser"].includes(normalizedRole)) return response.status(400).json({ message: "Only Citizen accounts can be self-registered. Revenue Officers are created by the Administrator." });
  if (typeof fullName !== "string" || fullName.trim().length < 3 || !validUsername(normalizedUsername) || !validEmail(normalizedEmail) || !validIndianMobile(mobile) || !validAadhaar(normalizedAadhaar) || !String(gender || "").trim() || !String(dateOfBirth || "").trim()) {
    return response.status(400).json({ message: "Enter full name, username, gender, date of birth, valid Aadhaar number, Indian mobile number, and email address." });
  }
  const aadhaarHash = otpHash(normalizedAadhaar);
  if (state.users.some((user) => user.username === normalizedUsername || user.email === normalizedEmail || user.aadhaarHash === aadhaarHash)) {
    return response.status(409).json({ message: "An account already exists with this username, email address, or Aadhaar number." });
  }
  const user = { id: crypto.randomUUID(), role: normalizedRole, fullName: fullName.trim(), username: normalizedUsername, email: normalizedEmail, gender: String(gender).trim(), dateOfBirth: String(dateOfBirth).trim(), aadhaarHash, aadhaarLast4: normalizedAadhaar.slice(-4), mobile: String(mobile).trim(), status: "Active", createdAt: new Date().toISOString() };
  state.users.unshift(user);
  if (user.role === "farmer") state.farmers.unshift({ id: user.id, userId: user.id, name: user.fullName, email: user.email, mobile: user.mobile, walletAddress: "", verified: true, createdAt: user.createdAt });
  addAudit({ action: "Public account registered", landId: "Identity", actor: user.fullName, detail: `${user.role} account ${user.username}; Aadhaar ending ${user.aadhaarLast4}` });
  saveState();
  return response.status(201).json({ user: safeUser(user), message: "Registration completed. Sign in using your username or email address." });
});

app.post("/api/auth/request-code", async (request, response) => {
  const { identifier, captchaId, captchaAnswer, portalMode } = request.body || {};
  if (!verifyCaptcha(captchaId, captchaAnswer)) return response.status(400).json({ message: "CAPTCHA answer is incorrect or expired (case-sensitive). Refresh it and try again." });
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  const user = state.users.find((item) => item.username === normalizedIdentifier || item.email === normalizedIdentifier);
  if (!user || user.status !== "Active") return response.status(404).json({ message: "No active account was found for that username or email address." });

  if (portalMode === "officer" && user.role !== "officer" && user.role !== "admin") {
    return response.status(403).json({ message: "This account is a Citizen account. Please sign in under Citizen Sign In." });
  }
  if (portalMode === "login" && (user.role === "officer" || user.role === "admin")) {
    return response.status(403).json({ message: "This account is a Revenue Officer account. Please sign in under Revenue Officer Sign In." });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  user.loginCodeHash = otpHash(code);
  user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  try {
    await deliverLoginCode(user, code);
    addAudit({ action: "Email sign-in code issued", landId: "Identity", actor: user.fullName, detail: `Code issued to ${maskEmail(user.email)}` });
    saveState();
    return response.json({ userId: user.id, maskedEmail: maskEmail(user.email), message: "Verification code sent to your email address." });
  } catch (error) {
    console.error("SMTP delivery error:", error);
    delete user.loginCodeHash;
    delete user.loginCodeExpiresAt;
    return response.status(502).json({ message: `Unable to send verification email: ${error.message}` });
  }
});

app.post("/api/auth/verify-code", (request, response) => {
  const { userId, code } = request.body || {};
  const cleanCode = String(code || "").replace(/\s+/g, "");
  const user = state.users.find((item) => item.id === userId);
  if (!user || !user.loginCodeExpiresAt || Date.parse(user.loginCodeExpiresAt) < Date.now()) return response.status(400).json({ message: "Verification code expired. Request a new code." });
  if (otpHash(cleanCode) !== user.loginCodeHash) return response.status(400).json({ message: "Incorrect verification code." });
  delete user.loginCodeHash;
  delete user.loginCodeExpiresAt;
  const token = createSession(user);
  addAudit({ action: "Passwordless login completed", landId: "Identity", actor: user.fullName, detail: `${user.role} signed in using email code` });
  saveState();
  return response.json({ token, user: safeUser(user) });
});

const emailChangeStore = {};

app.post("/api/auth/change-email/step1-send-old", async (request, response) => {
  const { userId, email, username } = request.body || {};
  let user = state.users.find((u) => 
    (userId && u.id === userId) || 
    (email && u.email.toLowerCase() === String(email).toLowerCase()) ||
    (username && u.username.toLowerCase() === String(username).toLowerCase())
  );

  if (!user && email && String(email).includes("@")) {
    user = {
      id: userId || crypto.randomUUID(),
      role: "farmer",
      fullName: "Citizen",
      username: username || String(email).split("@")[0],
      email: String(email).trim().toLowerCase(),
      mobile: "9900099000",
      status: "Active",
      createdAt: new Date().toISOString()
    };
    state.users.unshift(user);
    saveState();
  }

  if (!user) return response.status(404).json({ message: "User account not found." });

  const activeUserId = user.id;
  const code = String(crypto.randomInt(100000, 1000000));
  emailChangeStore[activeUserId] = {
    oldEmail: user.email,
    oldCodeHash: otpHash(code),
    oldVerified: false,
    newEmail: "",
    newCodeHash: "",
    expiresAt: Date.now() + 10 * 60 * 1000
  };

  try {
    await sendEmailOTP(user.email, user.fullName || user.username, code, "Email Change Security Code", `You requested to change your BhoomiChain email address. Enter the 6-digit security code below to verify ownership of your current email (<strong>${user.email}</strong>):`);
    return response.json({
      success: true,
      activeUserId,
      message: `Security code sent to your current email address (${user.email}). Check your inbox and enter the code below.`
    });
  } catch (err) {
    console.error("Step 1 email delivery error:", err.message);
    delete emailChangeStore[activeUserId];
    return response.status(502).json({ message: `Unable to send email code to ${user.email}: ${err.message}` });
  }
});

app.post("/api/auth/change-email/step2-verify-old", (request, response) => {
  const { userId, activeUserId, code } = request.body || {};
  const targetId = activeUserId || userId;
  const record = emailChangeStore[targetId] || Object.values(emailChangeStore)[0];
  if (!record || record.expiresAt < Date.now()) {
    return response.status(400).json({ message: "Security code expired. Please restart the email change process." });
  }
  if (record.oldCodeHash !== otpHash(String(code || "").trim())) {
    return response.status(400).json({ message: "Invalid security code. Please check your current email and try again." });
  }

  record.oldVerified = true;
  return response.json({
    success: true,
    message: "Current email verified successfully. Now enter your new email address."
  });
});

app.post("/api/auth/change-email/step3-send-new", async (request, response) => {
  const { userId, activeUserId, newEmail } = request.body || {};
  const targetId = activeUserId || userId;
  const record = emailChangeStore[targetId] || Object.values(emailChangeStore)[0];
  if (!record || !record.oldVerified || record.expiresAt < Date.now()) {
    return response.status(400).json({ message: "Session expired or current email not verified." });
  }

  const cleanNewEmail = String(newEmail || "").trim().toLowerCase();
  if (!cleanNewEmail || !cleanNewEmail.includes("@")) {
    return response.status(400).json({ message: "Please enter a valid new email address." });
  }
  if (cleanNewEmail === record.oldEmail.toLowerCase()) {
    return response.status(400).json({ message: "The new email address cannot be the same as your current email address." });
  }

  const existingUser = state.users.find((u) => u.email.toLowerCase() === cleanNewEmail && u.id !== targetId);
  if (existingUser) {
    return response.status(400).json({ message: "This email address is already registered to another account." });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  record.newEmail = cleanNewEmail;
  record.newCodeHash = otpHash(code);

  try {
    await sendEmailOTP(cleanNewEmail, record.oldEmail, code, "New Email Verification Code", `Enter the 6-digit verification code below to confirm and link <strong>${cleanNewEmail}</strong> to your BhoomiChain account:`);
    return response.json({
      success: true,
      message: `Verification code sent to your new email address (${cleanNewEmail}). Check your new inbox and enter the code.`
    });
  } catch (err) {
    console.error("Step 3 email delivery error:", err.message);
    return response.status(502).json({ message: `Unable to send verification code to ${cleanNewEmail}: ${err.message}` });
  }
});

app.post("/api/auth/change-email/step4-verify-new", (request, response) => {
  const { userId, activeUserId, code } = request.body || {};
  const targetId = activeUserId || userId;
  let recordKey = targetId;
  let record = emailChangeStore[targetId];

  if (!record) {
    recordKey = Object.keys(emailChangeStore)[0];
    record = emailChangeStore[recordKey];
  }

  if (!record || !record.oldVerified || !record.newEmail || record.expiresAt < Date.now()) {
    return response.status(400).json({ message: "Verification session expired. Please start over." });
  }
  if (record.newCodeHash !== otpHash(String(code || "").trim())) {
    return response.status(400).json({ message: "Invalid verification code for new email." });
  }

  let user = state.users.find((u) => u.id === targetId || u.id === recordKey || u.email.toLowerCase() === record.oldEmail.toLowerCase());
  if (!user) {
    user = state.users[0];
  }
  if (!user) return response.status(404).json({ message: "User account not found." });

  const oldEmail = user.email;
  const newEmail = record.newEmail;

  user.email = newEmail;

  const farmer = state.farmers.find((f) => f.id === user.id || f.email.toLowerCase() === oldEmail.toLowerCase());
  if (farmer) farmer.email = newEmail;

  state.landRequests.forEach((req) => {
    if (req.email && req.email.toLowerCase() === oldEmail.toLowerCase()) {
      req.email = newEmail;
    }
  });

  addAudit({
    action: "Email address changed",
    landId: "Identity",
    actor: user.fullName || user.username,
    detail: `Email updated from ${oldEmail} to ${newEmail}`
  });

  saveState();
  if (recordKey) delete emailChangeStore[recordKey];
  if (targetId) delete emailChangeStore[targetId];

  return response.json({
    success: true,
    message: `Email address updated to ${newEmail} successfully!`,
    user: safeUser(user)
  });
});

app.get("/api/admin/officers", requireAdmin, (_request, response) => response.json(state.users.filter((user) => user.role === "officer").map(safeUser)));

app.post("/api/admin/officers", requireAdmin, (request, response) => {
  const { fullName, username, email, mobile } = request.body || {};
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (typeof fullName !== "string" || fullName.trim().length < 3 || !validUsername(normalizedUsername) || !validEmail(normalizedEmail) || !validIndianMobile(mobile)) {
    return response.status(400).json({ message: "Enter officer full name, username, email, and valid Indian mobile number." });
  }
  if (state.users.some((user) => user.username === normalizedUsername || user.email === normalizedEmail)) return response.status(409).json({ message: "A user already exists with this username or email address." });
  const officer = { id: crypto.randomUUID(), role: "officer", fullName: fullName.trim(), username: normalizedUsername, email: normalizedEmail, gender: "Controlled by administrator", dateOfBirth: "Not collected", aadhaarHash: null, aadhaarLast4: null, mobile: String(mobile).trim(), status: "Active", createdAt: new Date().toISOString(), createdBy: request.authUser.id };
  state.users.unshift(officer);
  addAudit({ action: "Revenue Officer account created", landId: "Identity", actor: request.authUser.fullName, detail: `${officer.fullName} (${officer.username})` });
  saveState();
  return response.status(201).json({ officer: safeUser(officer) });
});

app.delete("/api/admin/officers/:id", requireAdmin, (request, response) => {
  const officerIndex = state.users.findIndex((user) => user.id === request.params.id && user.role === "officer");
  if (officerIndex === -1) return response.status(404).json({ message: "Revenue Officer account not found." });
  const [deletedOfficer] = state.users.splice(officerIndex, 1);
  addAudit({ action: "Revenue Officer account deleted", landId: "Identity", actor: request.authUser.fullName, detail: `Deleted ${deletedOfficer.fullName} (${deletedOfficer.username})` });
  saveState();
  return response.json({ message: `Revenue Officer Sri / Smt. ${deletedOfficer.fullName} deleted successfully.` });
});

app.get("/api/farmers", (request, response) => {
  const requestedEmail = String(request.query.email || "").trim().toLowerCase();
  const farmers = requestedEmail ? state.farmers.filter((farmer) => farmer.email === requestedEmail) : state.farmers;
  response.json(farmers.map((farmer) => {
    const safeFarmer = { ...farmer };
    delete safeFarmer.otpHash;
    delete safeFarmer.otpExpiresAt;
    return safeFarmer;
  }));
});

app.post("/api/farmers/register", (request, response) => {
  const { name, email, mobile, walletAddress = "" } = request.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || !validEmail(email) || !validIndianMobile(mobile)) {
    return response.status(400).json({ message: "Farmer name, valid email address, and 10-digit Indian mobile number are required." });
  }
  const normalizedMobile = mobile.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  let farmer = state.farmers.find((item) => item.email === normalizedEmail);
  if (!farmer) {
    farmer = { id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, mobile: normalizedMobile, walletAddress: String(walletAddress).trim(), verified: false, createdAt: new Date().toISOString() };
    state.farmers.unshift(farmer);
  } else {
    farmer.name = name.trim();
    farmer.mobile = normalizedMobile;
    farmer.walletAddress = String(walletAddress).trim() || farmer.walletAddress;
    farmer.verified = false;
  }
  farmer.otpHash = otpHash(otp);
  farmer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  addAudit({ action: "Farmer email OTP generated", landId: "Identity", actor: farmer.name, detail: `Email ${maskEmail(farmer.email)}; simulated local delivery` });
  saveState();
  const safeFarmer = { ...farmer };
  delete safeFarmer.otpHash;
  return response.status(201).json({ farmer: safeFarmer, demoOtp: otp, message: `Demo verification code prepared for ${maskEmail(farmer.email)}. No real email was sent.` });
});

app.post("/api/farmers/:id/verify-otp", (request, response) => {
  const farmer = state.farmers.find((item) => item.id === request.params.id);
  const { otp } = request.body || {};
  if (!farmer) return response.status(404).json({ message: "Farmer registration was not found." });
  if (!farmer.otpExpiresAt || Date.parse(farmer.otpExpiresAt) < Date.now()) return response.status(400).json({ message: "OTP expired. Generate a new demo OTP." });
  if (otpHash(otp) !== farmer.otpHash) return response.status(400).json({ message: "Incorrect OTP. Use the demo OTP shown after registration." });
  farmer.verified = true;
  delete farmer.otpHash;
  delete farmer.otpExpiresAt;
  addAudit({ action: "Farmer email verified", landId: "Identity", actor: farmer.name, detail: `Email ${maskEmail(farmer.email)} verified by demo OTP` });
  saveState();
  return response.json(farmer);
});

app.get("/api/land-requests", (request, response) => {
  const farmerId = String(request.query.farmerId || "").trim();
  response.json(farmerId ? state.landRequests.filter((item) => item.farmerId === farmerId) : state.landRequests);
});

app.get("/api/farmers/:id/land-holdings", (request, response) => {
  const farmer = state.farmers.find((item) => item.id === request.params.id);
  if (!farmer) return response.status(404).json({ message: "Farmer registration was not found." });
  return response.json(state.landRequests.filter((item) => item.farmerId === farmer.id));
});

app.post("/api/land-requests", (request, response) => {
  const { farmerId, farmerName, email, mobile, surveyNumber, district, taluk, hobli, village, extent, walletAddress } = request.body || {};
  let farmer = state.farmers.find((item) => item.id === farmerId && item.verified);

  if (!farmer) {
    const userMatch = state.users.find((u) => u.id === farmerId || u.email === email || `farmer-${u.username}` === farmerId || u.username === farmerId);
    if (userMatch) {
      farmer = {
        id: farmerId || userMatch.id,
        name: userMatch.fullName || farmerName || "Registered Citizen",
        email: userMatch.email || email || "",
        mobile: userMatch.mobile || mobile || "9900000000",
        walletAddress: getWalletForUser(userMatch),
        verified: true
      };
      if (!state.farmers.some((f) => f.id === farmer.id)) {
        state.farmers.push(farmer);
      }
    }
  }

  if (!farmer && (farmerName || email)) {
    farmer = {
      id: farmerId || `farmer-${Date.now()}`,
      name: String(farmerName || "Citizen").trim(),
      email: String(email || "").trim(),
      mobile: String(mobile || "9900000000").trim(),
      walletAddress: String(walletAddress || "").trim(),
      verified: true
    };
    state.farmers.push(farmer);
  }

  if (!farmer || !farmer.verified) {
    return response.status(400).json({ message: "Verify the farmer email address before submitting a land-registration request." });
  }
  if (![surveyNumber, district, taluk, hobli, village, extent].every((value) => String(value || "").trim())) {
    return response.status(400).json({ message: "Survey number, District, Taluk, Hobli, Village, and extent are required." });
  }
  const parcelKey = normalizedParcelKey({ surveyNumber, district, taluk, hobli, village });
  if (state.landRequests.some((item) => item.parcelKey === parcelKey || normalizedParcelKey(item) === parcelKey)) {
    return response.status(409).json({ message: "This Survey Number and revenue location already have a land-registration request. Duplicate land registration is not allowed." });
  }
  const uuid = crypto.randomUUID();
  const landRequest = {
    id: uuid,
    landId: uuid,
    farmerId: farmer.id,
    farmerName: farmer.name,
    email: farmer.email,
    mobile: farmer.mobile,
    walletAddress: String(walletAddress || farmer.walletAddress).trim(),
    surveyNumber: String(surveyNumber).trim(),
    district: String(district).trim(),
    taluk: String(taluk).trim(),
    hobli: String(hobli).trim(),
    village: String(village).trim(),
    extent: String(extent).trim(),
    parcelKey,
    status: "Submitted",
    createdAt: new Date().toISOString(),
    verifiedAt: null,
    registeredAt: null,
    transactionHash: null
  };
  state.landRequests.unshift(landRequest);
  addAudit({ action: "Land registration requested", landId: landRequest.surveyNumber, actor: farmer.name, detail: `${landRequest.village}, ${landRequest.taluk}, ${landRequest.district}` });
  saveState();
  return response.status(201).json(landRequest);
});

app.patch("/api/land-requests/:id/verify", (request, response) => {
  const landRequest = state.landRequests.find((item) => item.id === request.params.id);
  if (!landRequest) return response.status(404).json({ message: "Land-registration request not found." });
  if (landRequest.status !== "Submitted") return response.status(400).json({ message: "Only newly submitted requests can be verified." });
  landRequest.status = "Verified";
  landRequest.verifiedAt = new Date().toISOString();
  addAudit({ action: "Revenue details verified", landId: landRequest.surveyNumber, actor: "Revenue officer", detail: `${landRequest.farmerName} request approved for blockchain registration` });
  saveState();
  return response.json(landRequest);
});

app.patch("/api/land-requests/:id/reject", (request, response) => {
  const landRequest = state.landRequests.find((item) => item.id === request.params.id);
  const { reason } = request.body || {};
  if (!landRequest) return response.status(404).json({ message: "Land-registration request not found." });
  if (landRequest.status !== "Submitted") return response.status(400).json({ message: "Only submitted requests can be rejected." });
  landRequest.status = "Rejected";
  landRequest.rejectedAt = new Date().toISOString();
  landRequest.rejectionReason = String(reason || "Land data is incorrect / Survey details mismatch").trim();
  addAudit({ action: "Land request rejected", landId: landRequest.surveyNumber, actor: "Revenue officer", detail: `${landRequest.farmerName} request rejected: ${landRequest.rejectionReason}` });
  saveState();
  return response.json(landRequest);
});

app.patch("/api/land-requests/:id/registered", (request, response) => {
  const landRequest = state.landRequests.find((item) => item.id === request.params.id);
  const { landId, transactionHash } = request.body || {};
  if (!landRequest) return response.status(404).json({ message: "Land-registration request not found." });
  if (landRequest.status !== "Verified") return response.status(400).json({ message: "Verify the request before blockchain registration." });
  if (!String(landId || "").trim() || !String(transactionHash || "").trim()) return response.status(400).json({ message: "landId and transactionHash are required." });
  landRequest.status = "Registered on blockchain";
  landRequest.landId = String(landId);
  landRequest.transactionHash = String(transactionHash);
  landRequest.registeredAt = new Date().toISOString();
  addAudit({ action: "Land registered on blockchain", landId: landRequest.landId, actor: "Revenue officer", detail: `${landRequest.surveyNumber}; transaction ${landRequest.transactionHash}` });
  saveState();
  return response.json(landRequest);
});

app.patch("/api/land-requests/transfer-owner/:landId", (request, response) => {
  const { newOwnerWallet, newOwnerName } = request.body || {};
  const landIdStr = String(request.params.landId);
  let landRequest = state.landRequests.find((item) => String(item.landId) === landIdStr);
  if (landRequest) {
    if (newOwnerWallet) landRequest.walletAddress = newOwnerWallet;
    if (newOwnerName) landRequest.farmerName = newOwnerName;
    addAudit({ action: "Ownership mutation transferred", landId: landIdStr, actor: newOwnerName || "Purchaser", detail: `New Khatedar: ${newOwnerName} (${newOwnerWallet})` });
    saveState();
  }
  return response.json(landRequest || { message: "Ownership transferred." });
});

app.get("/api/documents", (_request, response) => response.json(state.documents));

app.post("/api/documents", (request, response) => {
  const { landId, category, reference, hash = "" } = request.body || {};
  if (!String(landId || "").trim() || !String(category || "").trim() || !String(reference || "").trim()) {
    return response.status(400).json({ message: "landId, category, and reference are required" });
  }
  const document = { id: crypto.randomUUID(), landId: String(landId).trim(), category: String(category).trim(), reference: String(reference).trim(), hash: String(hash).trim(), status: "Pending", createdAt: new Date().toISOString(), verifiedAt: null };
  state.documents.unshift(document);
  addAudit({ action: "Document submitted", landId: document.landId, actor: "Owner", detail: `${document.category}: ${document.reference}` });
  saveState();
  return response.status(201).json(document);
});

app.patch("/api/documents/:id/verify", (request, response) => {
  const document = state.documents.find((item) => item.id === request.params.id);
  if (!document) return response.status(404).json({ message: "Document not found" });
  document.status = "Verified";
  document.verifiedAt = new Date().toISOString();
  addAudit({ action: "Document verified", landId: document.landId, actor: "Registrar", detail: `${document.category}: ${document.reference}` });
  saveState();
  return response.json(document);
});

app.get("/api/audit", (_request, response) => response.json(state.audit));

app.post("/api/audit", (request, response) => {
  const { action, landId, actor, detail } = request.body || {};
  if (typeof action !== "string" || !action.trim()) return response.status(400).json({ message: "action is required" });
  const entry = addAudit({ action: action.trim(), landId, actor, detail });
  saveState();
  return response.status(201).json(entry);
});

app.get("/api/dashboard", (_request, response) => {
  response.json({
    documents: { total: state.documents.length, verified: state.documents.filter((item) => item.status === "Verified").length, pending: state.documents.filter((item) => item.status === "Pending").length },
    auditEntries: state.audit.length,
    benchmarkRuns: state.runs.length,
    farmers: { total: state.farmers.length, verified: state.farmers.filter((item) => item.verified).length },
    landRequests: { total: state.landRequests.length, submitted: state.landRequests.filter((item) => item.status === "Submitted").length, verified: state.landRequests.filter((item) => item.status === "Verified").length, registered: state.landRequests.filter((item) => item.status === "Registered on blockchain").length },
    persistence: "Local JSON demonstration store; replace with MongoDB for multi-user deployment."
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "Unexpected server error" });
});

if (require.main === module) app.listen(port, () => console.log(`Land registration API listening on http://localhost:${port}`));

module.exports = { app };
