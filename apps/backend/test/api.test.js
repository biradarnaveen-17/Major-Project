const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dataPath = path.join(os.tmpdir(), `land-registry-api-${process.pid}.json`);
process.env.LOCAL_DATA_PATH = dataPath;
const { app } = require("../src/index");

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  fs.rmSync(dataPath, { force: true });
});

test("health and document verification workflow persist locally", async () => {
  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  assert.equal(health.status, "ok");

  const created = await fetch(`${baseUrl}/api/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ landId: "77", category: "Title deed", reference: "TITLE-77" })
  }).then((response) => response.json());
  assert.equal(created.status, "Pending");

  const verified = await fetch(`${baseUrl}/api/documents/${created.id}/verify`, { method: "PATCH" }).then((response) => response.json());
  assert.equal(verified.status, "Verified");

  const audit = await fetch(`${baseUrl}/api/audit`).then((response) => response.json());
  assert.equal(audit[0].action, "Document verified");
});

test("public registration, CAPTCHA, email code login, and administrator-created officer accounts", async () => {
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "farmer", fullName: "Ramesh Gowda", username: "ramesh.gowda", gender: "Male", dateOfBirth: "1988-04-15", aadhaarNumber: "234567890123", mobile: "9876543210", email: "ramesh@example.com" })
  }).then((response) => response.json());
  assert.equal(registration.user.role, "farmer");
  assert.equal(registration.user.aadhaarHash, undefined);

  const duplicate = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "farmer", fullName: "Another Farmer", username: "another.user", gender: "Female", dateOfBirth: "1990-01-01", aadhaarNumber: "234567890123", mobile: "9876543211", email: "another@example.com" })
  });
  assert.equal(duplicate.status, 409);

  const captcha = await fetch(`${baseUrl}/api/auth/captcha`).then((response) => response.json());
  const answer = String(captcha.question.match(/(\d+) \+ (\d+)/).slice(1).reduce((sum, item) => sum + Number(item), 0));
  const loginCode = await fetch(`${baseUrl}/api/auth/request-code`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "ramesh@example.com", captchaId: captcha.captchaId, captchaAnswer: answer })
  }).then((response) => response.json());
  assert.match(loginCode.demoCode, /^\d{6}$/);

  const farmerLogin = await fetch(`${baseUrl}/api/auth/verify-code`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: loginCode.userId, code: loginCode.demoCode })
  }).then((response) => response.json());
  assert.equal(farmerLogin.user.role, "farmer");
  assert.match(farmerLogin.token, /^[a-f0-9]{64}$/);

  const adminCaptcha = await fetch(`${baseUrl}/api/auth/captcha`).then((response) => response.json());
  const adminAnswer = String(adminCaptcha.question.match(/(\d+) \+ (\d+)/).slice(1).reduce((sum, item) => sum + Number(item), 0));
  const adminCode = await fetch(`${baseUrl}/api/auth/request-code`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "admin", captchaId: adminCaptcha.captchaId, captchaAnswer: adminAnswer })
  }).then((response) => response.json());
  const adminLogin = await fetch(`${baseUrl}/api/auth/verify-code`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: adminCode.userId, code: adminCode.demoCode })
  }).then((response) => response.json());

  const officer = await fetch(`${baseUrl}/api/admin/officers`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${adminLogin.token}` },
    body: JSON.stringify({ fullName: "S. Kumar", username: "revenue.kumar", email: "kumar@example.com", mobile: "9876543212" })
  }).then((response) => response.json());
  assert.equal(officer.officer.role, "officer");
});

test("verified farmer account gates unique land-registration requests", async () => {
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "farmer", fullName: "Lakshmi Devi", username: "lakshmi.devi", gender: "Female", dateOfBirth: "1985-02-10", aadhaarNumber: "345678901234", mobile: "9876543213", email: "lakshmi@example.com" })
  }).then((response) => response.json());

  const farmers = await fetch(`${baseUrl}/api/farmers?email=lakshmi@example.com`).then((response) => response.json());
  assert.equal(farmers[0].verified, true);

  const landRequest = await fetch(`${baseUrl}/api/land-requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ farmerId: registration.user.id, surveyNumber: "12/3A", district: "Bengaluru Urban", taluk: "Bengaluru North", hobli: "Yelahanka", village: "Jakkur", extent: "48", walletAddress: "0xabc" })
  }).then((response) => response.json());
  assert.equal(landRequest.status, "Submitted");

  const approved = await fetch(`${baseUrl}/api/land-requests/${landRequest.id}/verify`, { method: "PATCH" }).then((response) => response.json());
  assert.equal(approved.status, "Verified");

  const duplicate = await fetch(`${baseUrl}/api/land-requests`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ farmerId: registration.user.id, surveyNumber: "12/3A", district: "Bengaluru Urban", taluk: "Bengaluru North", hobli: "Yelahanka", village: "Jakkur", extent: "48", walletAddress: "0xabc" })
  });
  assert.equal(duplicate.status, 409);
});
