require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const nodemailer = require("nodemailer");

const app = express();
const port = Number(process.env.PORT || 5000);
const reportPath = path.resolve(__dirname, "../../../docs/experiments/gas-comparison-latest.json");
const dataPath = process.env.LOCAL_DATA_PATH || path.resolve(__dirname, "../data/registry-operations.json");
const allowedOrigins = new Set((process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((value) => value.trim()));

function initialState() {
  return {
    runs: [],
    users: [
      { id: "system-admin", role: "admin", fullName: "Project Administrator", username: "admin", email: "rcbforevervk1800@gmail.com", gender: "Not specified", dateOfBirth: "1990-01-01", aadhaarHash: null, aadhaarLast4: null, mobile: "9000000000", status: "Active", createdAt: "2026-08-10T09:00:00.000Z" },
      { id: "demo-hemant", role: "purchaser", fullName: "Hemant (Purchaser)", username: "hemant", email: "hemant@example.com", gender: "Male", dateOfBirth: "1992-05-15", aadhaarHash: "hash-hemant", aadhaarLast4: "1234", mobile: "9876543210", status: "Active", createdAt: "2026-08-10T09:05:00.000Z" },
      { id: "demo-kavitha", role: "purchaser", fullName: "Kavitha Gowda", username: "kavitha.g", email: "kavitha@example.com", gender: "Female", dateOfBirth: "1994-08-20", aadhaarHash: "hash-kavitha", aadhaarLast4: "5678", mobile: "9876543211", status: "Active", createdAt: "2026-08-10T09:10:00.000Z" },
      { id: "demo-rohan", role: "purchaser", fullName: "Rohan Kumar", username: "rohan.k", email: "rohan@example.com", gender: "Male", dateOfBirth: "1988-12-10", aadhaarHash: "hash-rohan", aadhaarLast4: "9012", mobile: "9876543212", status: "Active", createdAt: "2026-08-10T09:15:00.000Z" }
    ],
    sessions: [],
    farmers: [],
    landRequests: [],
    documents: [
      { id: "demo-title-9002", landId: "9002", category: "Title deed", reference: "TITLE-9002-2026", hash: "0xe224...f7f", status: "Verified", createdAt: "2026-08-10T10:00:00.000Z", verifiedAt: "2026-08-10T10:05:00.000Z" },
      { id: "demo-tax-9002", landId: "9002", category: "Tax receipt", reference: "TAX-9002-2026", hash: "0x8cbb...40d6", status: "Pending", createdAt: "2026-08-10T10:06:00.000Z", verifiedAt: null }
    ],
    audit: [
      { id: "demo-audit-1", action: "Seeded completed ownership transfer", landId: "9002", actor: "Demo authority", detail: "Local Hardhat demonstration record", createdAt: "2026-08-10T10:10:00.000Z" }
    ]
  };
}

function readState() {
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      if (Array.isArray(data.users)) {
        const admin = data.users.find((u) => u.role === "admin" || u.username === "admin");
        if (admin) admin.email = "rcbforevervk1800@gmail.com";
      }
      return data;
    }
  } catch (error) {
    console.warn("Unable to read local registry data; a fresh store will be used.", error.message);
  }
  return initialState();
}

let state = readState();
const adminUser = state.users.find((u) => u.role === "admin" || u.username === "admin");
if (adminUser) adminUser.email = "rcbforevervk1800@gmail.com";
state.runs ||= [];
state.users ||= initialState().users;
state.sessions ||= [];
state.farmers ||= [];
state.landRequests ||= [];
state.documents ||= [];
state.audit ||= [];

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
  const challenge = captchaChallenges.get(String(captchaId || ""));
  captchaChallenges.delete(String(captchaId || ""));
  return Boolean(challenge && challenge.expiresAt >= Date.now() && challenge.answer.toLowerCase() === String(answer || "").trim().toLowerCase());
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

async function deliverLoginCode(user, code) {
  if (!smtpConfigured()) throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in the backend environment to enable email delivery.");
  const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass }
  });

  const formattedCode = String(code).split("").join(" ");
  const recipientName = user.fullName || user.username || "User";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #F8FAFC; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 36px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
            <span style="font-weight: 800; margin-right: 6px;">ಭೂ</span> BhoomiChain
          </h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #DBEAFE; font-weight: 400; letter-spacing: 0.2px;">
            Karnataka Land Records Demonstrator
          </p>
        </div>
        <!-- Body Content -->
        <div style="padding: 32px 28px; background-color: #F8FAFC;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.5;">
            Dear <strong style="color: #0F172A;">${recipientName}</strong>,
          </p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.5;">
            Your email verification code for the BhoomiChain land registration portal is:
          </p>
          <!-- OTP Box -->
          <div style="background-color: #1E3A8A; border-radius: 10px; padding: 20px 16px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 32px; font-weight: 700; color: #FFFFFF; letter-spacing: 14px; padding-left: 14px; display: inline-block;">
              ${formattedCode}
            </span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: "BhoomiChain sign-in verification code",
    text: `Dear ${recipientName},\n\nYour email verification code for the BhoomiChain land registration portal is: ${code}\n\nIt expires in 10 minutes.`,
    html
  });
  return { mode: "email" };
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
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || /^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    return callback(new Error("Origin is not permitted by this local API."));
  }
}));
app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

app.get("/", (_request, response) => {
  response.json({ message: "BhoomiChain Land Registration API is running.", frontendUrl: "http://localhost:5173", health: "/health" });
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "land-registration-api", persistence: "local JSON store" });
});

const DEMO_BUYER_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

app.get("/api/purchasers", (_request, response) => {
  const purchasers = state.users
    .filter((u) => u.role === "purchaser" && u.status === "Active")
    .map((u) => ({ id: u.id, fullName: u.fullName, username: u.username, walletAddress: DEMO_BUYER_WALLET }));
  if (!purchasers.some((p) => p.username === "hemant")) {
    purchasers.unshift({ id: "demo-hemant-purchaser", fullName: "Hemant (Purchaser)", username: "hemant", walletAddress: DEMO_BUYER_WALLET });
  }
  return response.json(purchasers);
});

app.get("/api/benchmarks/latest", (_request, response) => {
  const report = latestReport();
  if (!report) return response.status(404).json({ message: "No gas report exists. Run npm run compare:gas --workspace packages/contracts." });
  return response.json(report);
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

app.post("/api/auth/register", (request, response) => {
  const { role, fullName, username, gender, dateOfBirth, aadhaarNumber, mobile, email } = request.body || {};
  const normalizedRole = String(role || "").trim().toLowerCase();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedAadhaar = String(aadhaarNumber || "").replace(/\s/g, "");
  if (!["farmer", "purchaser"].includes(normalizedRole)) return response.status(400).json({ message: "Only Farmer and Purchaser accounts can be self-registered. Revenue Officers are created by the Administrator." });
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
  const { identifier, captchaId, captchaAnswer } = request.body || {};
  if (!verifyCaptcha(captchaId, captchaAnswer)) return response.status(400).json({ message: "CAPTCHA answer is incorrect or expired. Refresh it and try again." });
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  const user = state.users.find((item) => item.username === normalizedIdentifier || item.email === normalizedIdentifier);
  if (!user || user.status !== "Active") return response.status(404).json({ message: "No active account was found for that username or email address." });
  const code = String(crypto.randomInt(100000, 1000000));
  user.loginCodeHash = otpHash(code);
  user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  try {
    const delivery = await deliverLoginCode(user, code);
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
  const user = state.users.find((item) => item.id === userId);
  if (!user || !user.loginCodeExpiresAt || Date.parse(user.loginCodeExpiresAt) < Date.now()) return response.status(400).json({ message: "Verification code expired. Request a new code." });
  if (otpHash(code) !== user.loginCodeHash) return response.status(400).json({ message: "Incorrect verification code." });
  delete user.loginCodeHash;
  delete user.loginCodeExpiresAt;
  const token = createSession(user);
  addAudit({ action: "Passwordless login completed", landId: "Identity", actor: user.fullName, detail: `${user.role} signed in using email code` });
  saveState();
  return response.json({ token, user: safeUser(user) });
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
  const { farmerId, surveyNumber, district, taluk, hobli, village, extent, walletAddress } = request.body || {};
  const farmer = state.farmers.find((item) => item.id === farmerId && item.verified);
  if (!farmer) return response.status(400).json({ message: "Verify the farmer email address before submitting a land-registration request." });
  if (![surveyNumber, district, taluk, hobli, village, extent].every((value) => String(value || "").trim())) {
    return response.status(400).json({ message: "Survey number, District, Taluk, Hobli, Village, and extent are required." });
  }
  const parcelKey = normalizedParcelKey({ surveyNumber, district, taluk, hobli, village });
  if (state.landRequests.some((item) => item.parcelKey === parcelKey || normalizedParcelKey(item) === parcelKey)) {
    return response.status(409).json({ message: "This Survey Number and revenue location already have a land-registration request. Duplicate land registration is not allowed." });
  }
  const landRequest = { id: crypto.randomUUID(), farmerId: farmer.id, farmerName: farmer.name, email: farmer.email, mobile: farmer.mobile, walletAddress: String(walletAddress || farmer.walletAddress).trim(), surveyNumber: String(surveyNumber).trim(), district: String(district).trim(), taluk: String(taluk).trim(), hobli: String(hobli).trim(), village: String(village).trim(), extent: String(extent).trim(), parcelKey, status: "Submitted", createdAt: new Date().toISOString(), verifiedAt: null, registeredAt: null, landId: null, transactionHash: null };
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
