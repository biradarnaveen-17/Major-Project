import React, { useState, useEffect } from "react";
import { API_URL } from "../config.js";
import { Field, SelectField } from "./UIComponents.jsx";

export default function LoginScreen({ onAuthenticated, onLogin }) {
  const handleLogin = onAuthenticated || onLogin;
  const [mode, setMode] = useState("login");
  const [registerForm, setRegisterForm] = useState({ role: "farmer", fullName: "", username: "", gender: "", dateOfBirth: "", aadhaarNumber: "", mobile: "", email: "" });
  const [loginForm, setLoginForm] = useState({ identifier: "", captchaAnswer: "" });
  const [captcha, setCaptcha] = useState(null);
  const [pendingLogin, setPendingLogin] = useState(null);
  const [code, setCode] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apiRequest = async (path, options) => {
    const response = await fetch(`${API_URL}${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Request failed.");
    return body;
  };

  const refreshCaptcha = async () => {
    try {
      setCaptcha(await apiRequest("/api/auth/captcha"));
      setLoginForm((current) => ({ ...current, captchaAnswer: "" }));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const [pendingRegOtp, setPendingRegOtp] = useState(false);
  const [regCode, setRegCode] = useState("");
  const [regDevCode, setRegDevCode] = useState(null);

  const updateRegistration = (key) => (event) => setRegisterForm((current) => ({ ...current, [key]: event.target.value }));

  const requestRegistrationOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/api/auth/send-registration-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(registerForm)
      });
      setMessage(result.message);
      setRegDevCode(result.devCode || null);
      setRegCode(""); // Keep input empty so user enters manually
      setPendingRegOtp(true);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const verifyRegistrationOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await apiRequest("/api/auth/verify-registration-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: registerForm.email, code: regCode.replace(/\D/g, "") })
      });
      setMessage(`${result.user.fullName} registered & email verified successfully! Sign in using ${result.user.username} or ${result.user.email}.`);
      setLoginForm({ identifier: result.user.email, captchaAnswer: "" });
      setPendingRegOtp(false);
      setRegCode("");
      setRegDevCode(null);
      setMode("login");
      await refreshCaptcha();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

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

  const verifyCode = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await apiRequest("/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: pendingLogin.userId, code: code.replace(/\D/g, "") })
      });
      if (handleLogin) await handleLogin(result);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-intro">
        <div className="brand">
          <span className="brand-mark">ಭೂ</span>
          <div>
            <strong>BhoomiChain</strong>
            <small>Karnataka land-records demonstrator</small>
          </div>
        </div>
        <p className="eyebrow">SECURE ROLE-BASED ACCESS</p>
        <h1>One land workflow.<br />Verified identities.</h1>
        <p>Citizen accounts register with identity details. Revenue Officers verify requests and approve ownership mutations. Every sign-in requires username/email, CAPTCHA, and email code.</p>
        <div className="login-flow">
          <span>Citizen account registration</span>
          <span>Officer verification desk</span>
          <span>CAPTCHA & Email code</span>
          <span>Role-limited workspace</span>
        </div>
      </section>

      <section className="login-card">
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setLoginForm((c) => ({ ...c, identifier: "" })); refreshCaptcha(); }}>Citizen Sign in</button>
          <button type="button" className={mode === "officer" ? "active" : ""} onClick={() => { setMode("officer"); setLoginForm((c) => ({ ...c, identifier: "" })); refreshCaptcha(); }}>Revenue Officer Sign in</button>
        </div>

        {message && <p className="auth-message">{message}</p>}
        {error && <p className="login-error">{error}</p>}

        {mode === "register" ? (
          !pendingRegOtp ? (
            <form onSubmit={requestRegistrationOtp}>
              <p className="eyebrow">PUBLIC REGISTRATION</p>
              <h2>Citizen account</h2>
              <SelectField label="Account type" value={registerForm.role} onChange={updateRegistration("role")}>
                <option value="citizen">Citizen (Land Owner & Purchaser)</option>
              </SelectField>
              <div className="form-grid">
                <Field label="Full name" required value={registerForm.fullName} onChange={updateRegistration("fullName")} />
                <Field label="Username" required value={registerForm.username} onChange={updateRegistration("username")} placeholder="e.g. sudeep" />
                <SelectField label="Gender" required value={registerForm.gender} onChange={updateRegistration("gender")}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                  <option>Prefer not to say</option>
                </SelectField>
                <Field label="Date of birth" required type="date" value={registerForm.dateOfBirth} onChange={updateRegistration("dateOfBirth")} />
                <Field label="Aadhaar number" required inputMode="numeric" maxLength="12" value={registerForm.aadhaarNumber} onChange={updateRegistration("aadhaarNumber")} />
                <Field label="Mobile number" required inputMode="numeric" maxLength="10" value={registerForm.mobile} onChange={updateRegistration("mobile")} />
                <Field label="Email address" required type="email" value={registerForm.email} onChange={updateRegistration("email")} placeholder="e.g. farmer@domain.com" />
              </div>
              <p className="hint">We verify your email address via OTP before saving your account to ensure you can always sign in safely.</p>
              <button className="login-button" type="submit">📩 Send Email Verification Code</button>
              <button type="button" className="text-button" style={{ width: "100%", marginTop: "10px" }} onClick={() => setMode("login")}>Already have an account? Sign in</button>
            </form>
          ) : (
            <form onSubmit={verifyRegistrationOtp}>
              <p className="eyebrow">REGISTRATION EMAIL VERIFICATION</p>
              <h2>Verify your email address</h2>
              <p className="hint">Enter the 6-digit code sent to <strong>{registerForm.email}</strong> to complete registration.</p>
              


              <Field label="6-digit verification code" required inputMode="numeric" maxLength="6" value={regCode} onChange={(event) => setRegCode(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 123456" />
              <button className="login-button" type="submit">✅ Verify Code & Create Account</button>
              <button type="button" className="text-button" style={{ width: "100%", marginTop: "10px" }} onClick={() => setPendingRegOtp(false)}>← Edit Registration Details / Fix Email Typo</button>
            </form>
          )
        ) : !pendingLogin ? (
          <form onSubmit={requestCode}>
            <p className="eyebrow">{mode === "officer" ? "REVENUE OFFICER PORTAL" : "PASSWORDLESS SIGN IN"}</p>
            <h2>{mode === "officer" ? "Revenue Officer Sign In" : "Verify your identity"}</h2>
            <Field label="Username or email address" required value={loginForm.identifier} onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))} />
            <div className="captcha-row">
              {captcha?.image ? <img src={captcha.image} alt="CAPTCHA" className="captcha-image" /> : <strong>Loading CAPTCHA...</strong>}
              <button type="button" className="text-button" onClick={refreshCaptcha}>Refresh</button>
            </div>
            <Field label="Enter the characters shown above (case-sensitive)" required value={loginForm.captchaAnswer} onChange={(event) => setLoginForm((current) => ({ ...current, captchaAnswer: event.target.value }))} />
            <button className="login-button" type="submit">Send email verification code</button>
            <p className="hint">{mode === "officer" ? "Revenue Officer Sign In. Enter your created officer username or email." : "Enter your username or email address to receive your OTP."}</p>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <p className="eyebrow">EMAIL VERIFICATION</p>
            <h2>Enter the one-time code</h2>
            <p className="hint">A code was sent to {pendingLogin.maskedEmail}. It expires in 10 minutes.</p>
            <Field label="6-digit verification code" required inputMode="numeric" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
            <button className="login-button" type="submit">Verify and sign in</button>
            <button type="button" className="text-button" onClick={() => { setPendingLogin(null); refreshCaptcha(); }}>Use another account</button>
          </form>
        )}
        <p className="login-note">Academic local demo — not an official Government of Karnataka portal.</p>
        {mode !== "register" && (
          <div style={{ textAlign: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}>
            <button type="button" className="text-button" style={{ fontSize: "0.95rem", fontWeight: "600", color: "#1e3a8a", textDecoration: "underline" }} onClick={() => setMode("register")}>Don't have an account? Create account</button>
          </div>
        )}
      </section>
    </main>
  );
}
