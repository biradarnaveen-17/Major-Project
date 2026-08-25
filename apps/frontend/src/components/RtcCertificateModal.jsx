import React from "react";
import { statusText } from "../config.js";

export default function RtcCertificateModal({ land, contractAddress, onClose, resolveName }) {
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
          <button onClick={() => window.print()}>️ Print / Save as PDF</button>
          <button className="quiet" onClick={onClose}>XClose</button>
        </div>
        <div className="rtc-certificate-paper">
          <div className="rtc-header">
            <div className="rtc-emblem">️</div>
            <h2>Government of Karnataka</h2>
            <h3>Revenue Department — BhoomiChain Land Records</h3>
            <p>Digital Record of Rights, Tenancy and Crops (RTC / Pahani)</p>
          </div>

          <div className="rtc-badge-banner">
            <span className="rtc-badge-icon">️</span>
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
              <p>{land.history.map((h) => resolveName ? resolveName(h) : h).join(" ->")}</p>
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
