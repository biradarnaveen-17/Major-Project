import React, { useState } from "react";
import { API_URL } from "../config.js";
import { Field } from "./UIComponents.jsx";

export default function EmailChangeModal({ user, token, onClose, onEmailUpdated }) {
  const [step, setStep] = useState(1); // 1: Send old code, 2: Enter old code, 3: Enter new email, 4: Enter new code, 5: Success
  const [oldCode, setOldCode] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCode, setNewCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeUserId, setActiveUserId] = useState(user?.id);

  async function apiPost(endpoint, body) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: token ? `Bearer ${token}` : ""
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  async function handleSendOldCode() {
    try {
      setLoading(true);
      setMessage("Sending security code to your current email...");
      const data = await apiPost("/api/auth/change-email/step1-send-old", {
        userId: user?.id,
        email: user?.email,
        username: user?.username
      });
      setMessage(data.message);
      if (data.activeUserId) setActiveUserId(data.activeUserId);
      setOldCode("");
      setStep(2);
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOldCode(e) {
    e.preventDefault();
    if (oldCode.trim().length < 6) return setMessage("Please enter the full 6-digit security code.");
    try {
      setLoading(true);
      setMessage("Verifying code...");
      const data = await apiPost("/api/auth/change-email/step2-verify-old", {
        userId: user?.id,
        activeUserId,
        code: oldCode.trim()
      });
      setMessage(data.message);
      setStep(3);
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNewCode(e) {
    e.preventDefault();
    if (!newEmail.includes("@")) return setMessage("Please enter a valid new email address.");
    try {
      setLoading(true);
      setMessage(`Sending verification code to ${newEmail}...`);
      const data = await apiPost("/api/auth/change-email/step3-send-new", {
        userId: user?.id,
        activeUserId,
        newEmail: newEmail.trim()
      });
      setMessage(data.message);
      setNewCode("");
      setStep(4);
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyNewCode(e) {
    e.preventDefault();
    if (newCode.trim().length < 6) return setMessage("Please enter the full 6-digit verification code.");
    try {
      setLoading(true);
      setMessage("Verifying new email code...");
      const data = await apiPost("/api/auth/change-email/step4-verify-new", {
        userId: user?.id,
        activeUserId,
        code: newCode.trim()
      });
      setMessage(data.message);
      setStep(5);
      if (onEmailUpdated) onEmailUpdated(data.user?.email || newEmail);
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          animation: "modalAppear 0.25s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#6b1724",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "3px solid #d97706"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ backgroundColor: "#d97706", color: "#ffffff", fontWeight: "bold", fontSize: "16px", padding: "2px 8px", borderRadius: "6px" }}>
              ಭೂ
            </span>
            <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1.1rem", fontWeight: "700", letterSpacing: "-0.2px" }}>
              Change Registered Email Address
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#fef3c7",
              fontSize: "1.4rem",
              cursor: "pointer",
              lineHeight: 1,
              padding: "4px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px" }}>
          {/* Progress Tracker */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "6px", borderRadius: "3px", backgroundColor: step >= 1 ? "#6b1724" : "#e2e8f0" }} />
            <div style={{ flex: 1, height: "6px", borderRadius: "3px", backgroundColor: step >= 3 ? "#6b1724" : "#e2e8f0" }} />
            <div style={{ flex: 1, height: "6px", borderRadius: "3px", backgroundColor: step >= 5 ? "#16a34a" : "#e2e8f0" }} />
          </div>

          {message && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "18px",
                fontSize: "0.88rem",
                fontWeight: "500",
                backgroundColor: step === 5 ? "#f0fdf4" : message.startsWith("Error:") ? "#fef2f2" : "#eff6ff",
                border: `1px solid ${step === 5 ? "#bbf7d0" : message.startsWith("Error:") ? "#fecaca" : "#bfdbfe"}`,
                color: step === 5 ? "#15803d" : message.startsWith("Error:") ? "#dc2626" : "#1d4ed8"
              }}
            >
              {message}
            </div>
          )}



          {/* STEP 1: Send Security Code */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: "1.5", margin: "0 0 16px 0" }}>
                To protect your account identity, a 6-digit security code will be sent to your current registered email:
              </p>
              <div
                style={{
                  padding: "14px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: "22px",
                  fontSize: "0.95rem",
                  wordBreak: "break-all"
                }}
              >
                {user.email}
              </div>
              <button
                disabled={loading}
                onClick={handleSendOldCode}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#6b1724",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Sending security code..." : "📩 Send Code to Current Email"}
              </button>
            </div>
          )}

          {/* STEP 2: Enter Code for Current Email */}
          {step === 2 && (
            <form onSubmit={handleVerifyOldCode}>
              <p style={{ fontSize: "0.9rem", color: "#475569", margin: "0 0 14px 0" }}>
                Enter the 6-digit security code sent to <strong>{user.email}</strong>:
              </p>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  6-Digit Security Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={oldCode}
                  onChange={(e) => setOldCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "1.2rem",
                    letterSpacing: "6px",
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: "12px 18px",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || oldCode.trim().length < 6}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#6b1724",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    cursor: loading || oldCode.trim().length < 6 ? "not-allowed" : "pointer",
                    opacity: loading || oldCode.trim().length < 6 ? 0.7 : 1
                  }}
                >
                  {loading ? "Verifying..." : "Verify Current Email Code ➔"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Enter New Email */}
          {step === 3 && (
            <form onSubmit={handleSendNewCode}>
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  color: "#166534",
                  fontSize: "0.85rem",
                  fontWeight: "500"
                }}
              >
                ✅ Current email ownership verified. Now enter your new email address.
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. new.email@domain.com"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "0.95rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newEmail.includes("@")}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#6b1724",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  cursor: loading || !newEmail.includes("@") ? "not-allowed" : "pointer",
                  opacity: loading || !newEmail.includes("@") ? 0.7 : 1
                }}
              >
                {loading ? "Sending verification code..." : "📩 Send Code to New Email"}
              </button>
            </form>
          )}

          {/* STEP 4: Enter Code for New Email */}
          {step === 4 && (
            <form onSubmit={handleVerifyNewCode}>
              <p style={{ fontSize: "0.9rem", color: "#475569", margin: "0 0 14px 0" }}>
                Enter the 6-digit verification code sent to <strong>{newEmail}</strong>:
              </p>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                  New Email Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "1.2rem",
                    letterSpacing: "6px",
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{
                    padding: "12px 18px",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || newCode.trim().length < 6}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    cursor: loading || newCode.trim().length < 6 ? "not-allowed" : "pointer",
                    opacity: loading || newCode.trim().length < 6 ? 0.7 : 1
                  }}
                >
                  {loading ? "Confirming..." : "Confirm & Update Email 🎉"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: Success State */}
          {step === 5 && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: "3.2rem", marginBottom: "8px" }}>🎉</div>
              <h4 style={{ color: "#15803d", margin: "0 0 10px 0", fontSize: "1.25rem", fontWeight: "700" }}>
                Email Address Updated!
              </h4>
              <p style={{ color: "#475569", fontSize: "0.95rem", margin: "0 0 16px 0" }}>
                Your registered email address has been successfully updated to:
              </p>
              <div
                style={{
                  padding: "14px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  fontWeight: "700",
                  color: "#166534",
                  fontSize: "1rem",
                  marginBottom: "24px"
                }}
              >
                {newEmail}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#6b1724",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  cursor: "pointer"
                }}
              >
                Done & Return to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
