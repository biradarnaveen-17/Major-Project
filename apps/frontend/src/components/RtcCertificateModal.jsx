import React from "react";

const REVENUE_KANADA_MAP = {
  "Bengaluru Urban": "ಬೆಂಗಳೂರು ನಗರ",
  "Bengaluru Rural": "ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ",
  "Bengaluru North": "ಬೆಂಗಳೂರು ಉತ್ತರ",
  "Bengaluru South": "ಬೆಂಗಳೂರು ದಕ್ಷಿಣ",
  "Yelahanka": "ಯಲಹಂಕ",
  "Jakkur": "ಜಕ್ಕೂರು",
  "Attur": "ಅಟ್ಟೂರು",
  "Self": "ಸ್ವಂತ",
  "Owner": "ಸ್ವಂತ",
  "Red Soil": "ಕೆಂಪು ಮಣ್ಣು",
  "Borewell": "ಬೋರ್‌ವೆಲ್",
  "Rainfed": "ಮಳೆ ಆಶ್ರಯ"
};

function toKannada(text) {
  if (!text) return "";
  const str = String(text).trim();
  return REVENUE_KANADA_MAP[str] || str;
}

export default function RtcCertificateModal({ land, contractAddress, onClose, resolveName }) {
  if (!land) return null;

  const landIdStr = String(land.id || land.landId || "8888001");
  const surveyNo = land.survey || "64/1";
  const revenueLocation = land.location || "Attur, Yelahanka, Bengaluru North, Bengaluru Urban";
  const ownerName = resolveName ? resolveName(land.owner) : (land.ownerName || "Sri / Smt. Khatedar");

  const locationParts = revenueLocation.split(",").map(s => s.trim());
  const village = locationParts[0] || "Attur";
  const hobli = locationParts[1] || "Yelahanka";
  const taluk = locationParts[2] || "Bengaluru North";
  const district = locationParts[3] || "Bengaluru Urban";

  // Official Barcode URL encoding Land ID (Code 128 format)
  const barcodeUrl = `https://barcodeapi.org/api/128/BC-${landIdStr}`;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `RTC_Pahani_Land_${landIdStr}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const rtc = {
    surveyNumber: surveyNo,
    hissaNumber: "1",
    district: toKannada(district),
    taluk: toKannada(taluk),
    hobli: toKannada(hobli),
    village: toKannada(village),
    khataNo: landIdStr,
    totalExtent: `${land.area || "50"} Gunta`,
    kharabA: "0.00.00",
    kharabB: "0.00.00",
    netArea: `${land.area || "50"} Gunta`,
    landRevenue: "12.50",
    soilType: toKannada("Red Soil"),
    irrigationType: toKannada("Rainfed"),
    ownerName: `ಶ್ರೀ / Smt. ${ownerName}`,
    ownerAddress: `${toKannada(village)}, ${toKannada(hobli)}, ${toKannada(district)}`,
    mutationDetails: (land.history && land.history.length > 0 ? land.history : [land.owner]).map((hAddr, idx) => ({
      mrNo: `MR BC/2026-00${idx + 1}`,
      date: new Date().toLocaleDateString(),
      order: `Verified Transfer: ${resolveName ? resolveName(hAddr) : hAddr}`
    })),
    cropDetails: [
      { season: "ಮುಂಗಾರು 2025", cultivator: toKannada("Self"), cropName: "ರಾಗಿ", area: `${land.area || "50"} Gunta`, waterSource: toKannada("Rainfed") }
    ],
    validFrom: "21-11-2016 17:59:00",
    blockchainHash: contractAddress || "0x7f8bc63bbcad18155201308c8f3540b07f84f5e29a90412b1"
  };

  return (
    <div className="rtc-print-overlay" style={styles.overlay} onClick={onClose}>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape !important;
              margin: 4mm !important;
            }
            html, body, #root {
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
            }
            .no-print {
              display: none !important;
            }
            .rtc-print-overlay, .rtc-print-card {
              position: static !important;
              display: block !important;
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              background: transparent !important;
            }
            .document-canvas {
              border: 1px solid #334155 !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 8px !important;
              page-break-inside: avoid !important;
              font-size: 11px !important;
            }
          }
        `}
      </style>

      <div className="rtc-print-card" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className="no-print" style={styles.noPrintBar}>
          <span style={{ fontSize: "0.9rem", color: "#334155", fontWeight: "500" }}>
            ಕರ್ನಾಟಕ ಸರ್ಕಾರ ಕಂದಾಯ ಇಲಾಖೆ - ಆನ್‌ಲೈನ್ ಪಹಣಿ (R.T.C Form No. 16) • Land #{landIdStr}
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={styles.printBtn} onClick={handlePrint}>
              🖨️ Print / Save PDF (RTC_Pahani_Land_{landIdStr}.pdf)
            </button>
            <button style={styles.closeBtn} onClick={onClose}>
              ✖ Close
            </button>
          </div>
        </div>

        <div className="document-canvas" style={styles.documentCanvas}>
          <div style={styles.watermarkContainer}>
            <div style={styles.watermarkText}>For Viewing Only</div>
            <div style={styles.watermarkText}>For Viewing Only</div>
            <div style={styles.watermarkText}>For Viewing Only</div>
          </div>

          <div style={styles.topHeader}>
            <div style={{ width: "25%", fontSize: "0.76rem", color: "#334155" }}>
              <div><span>ಗ್ರಾಮದ ಕೋಡ್:</span> 01</div>
              <div><span>ತಾಲೂಕು:</span> {rtc.taluk}</div>
            </div>
            <div style={{ width: "50%", textAlign: "center" }}>
              <h2 style={styles.mainTitle}>ರಿಕಾರ್ಡ್ ಆಫ್ ರೈಟ್ಸ್, ಗೇಣಿ ಮತ್ತು ಪಹಣಿ ಪತ್ರಿಕೆ (R.T.C) ಫಾರಂ ನಂ. ೧೬</h2>
              <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: "1px" }}>
                RECORD OF RIGHTS, TENANCY AND CROPS (VILLAGE ACCOUNT FORM NO. 2)
              </div>
            </div>
            <div style={{ width: "25%", textAlign: "right", fontSize: "0.76rem", color: "#334155" }}>
              <div><span>Print Page No:</span> 1/1</div>
              <div><span>Valid From:</span> {rtc.validFrom} To Till Date</div>
            </div>
          </div>

          <div style={styles.locationBar}>
            <span><strong>ಜಿಲ್ಲೆ:</strong> {rtc.district}</span>
            <span><strong>ಹೋಬಳಿ:</strong> {rtc.hobli}</span>
            <span><strong>ಗ್ರಾಮ:</strong> {rtc.village}</span>
          </div>

          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={{ width: "5%" }}>1. ಸರ್ವೆ ನಂಬರು</th>
                <th style={{ width: "5%" }}>2. ಹಿಸ್ಸಾ</th>
                <th style={{ width: "10%" }}>3. ವಿಸ್ತೀರ್ಣ</th>
                <th style={{ width: "6%" }}>4. ಕಂದಾಯ</th>
                <th style={{ width: "10%" }}>5-8. ಮಣ್ಣು / ನೀರಾವರಿ</th>
                <th style={{ width: "22%" }}>9. ಖಾತೆದಾರರ ಹೆಸರು ಮತ್ತು ವಿಳಾಸ</th>
                <th style={{ width: "7%" }}>10. ಖಾತೆ ನಂ.</th>
                <th style={{ width: "20%" }}>11. ಹಕ್ಕುಗಳು & ಮ್ಯುಟೇಷನ್ ಆದೇಶಗಳು</th>
                <th style={{ width: "15%" }}>12-16. ಸಾಗುವಳಿ & ಬೆಳೆ ವಿವರ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tdCenterBold}>{rtc.surveyNumber}</td>
                <td style={styles.tdCenterBold}>{rtc.hissaNumber}</td>
                <td style={styles.tdText}>
                  <div><span>ಒಟ್ಟು:</span> {rtc.totalExtent}</div>
                  <div><span>ಖರಾಬು:</span> {rtc.kharabA}</div>
                  <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "2px", paddingTop: "2px" }}>
                    <span>ಉಳಿದದ್ದು:</span> {rtc.netArea}
                  </div>
                </td>
                <td style={styles.tdCenter}>₹ {rtc.landRevenue}</td>
                <td style={styles.tdText}>
                  <div><span>ಮಣ್ಣು:</span> {rtc.soilType}</div>
                  <div><span>ನೀರಾವರಿ:</span> {rtc.irrigationType}</div>
                </td>
                <td style={styles.tdText}>
                  <div style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: "600" }}>
                    {rtc.ownerName}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                    {rtc.ownerAddress}
                  </div>
                </td>
                <td style={styles.tdCenterBold}>{rtc.khataNo}</td>
                <td style={styles.tdText}>
                  {rtc.mutationDetails.map((m, idx) => (
                    <div key={idx} style={{ marginBottom: "3px", fontSize: "0.72rem", color: "#334155" }}>
                      <span style={{ fontWeight: "600" }}>{m.mrNo}</span> ({m.date}): {m.order}
                    </div>
                  ))}
                  <div style={{ fontSize: "0.62rem", color: "#64748b", background: "#f8fafc", padding: "2px 4px", marginTop: "4px", border: "1px solid #e2e8f0" }}>
                    On-Chain Hash: {rtc.blockchainHash.slice(0, 26)}...
                  </div>
                </td>
                <td style={styles.tdText}>
                  {rtc.cropDetails.map((c, i) => (
                    <div key={i} style={{ fontSize: "0.72rem", color: "#334155", marginBottom: "3px" }}>
                      <div><span>{c.season}:</span> {c.cropName}</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>ವಿಸ್ತೀರ್ಣ: {c.area} ({c.cultivator})</div>
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer Barcode & Official Signature */}
          <div style={styles.footer}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <img 
                src={barcodeUrl} 
                alt={`Land Record Barcode BC-${landIdStr}`} 
                style={{ height: "34px", maxWidth: "160px", objectFit: "contain" }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://bwipjs-api.metafloor.com/bwipjs?bcid=code128&text=BC-${landIdStr}&scale=2&height=10`;
                }}
              />
              <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Government Land Record Barcode (BC-{landIdStr})</div>
            </div>

            <div style={{ textAlign: "center", fontSize: "0.76rem", color: "#334155" }}>
              <div>ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಕಂದಾಯ ಇಲಾಖೆ</div>
              <div style={{ fontSize: "0.68rem", color: "#64748b" }}>ಕಂಪ್ಯೂಟರೀಕೃತ ಪಹಣಿ ಪತ್ರಿಕೆ (Form No. 16)</div>
            </div>

            <div style={{ textAlign: "right", fontSize: "0.76rem", color: "#334155" }}>
              <div>ತಾಲ್ಲೂಕು ಶಿರಸ್ತೇದಾರ್ / ಕಂದಾಯ ನಿರೀಕ್ಷಕರು</div>
              <div style={{ color: "#16a34a", fontSize: "0.68rem", marginTop: "1px", fontWeight: "500" }}>
                ✓ Digitally Signed & Sealed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.75)",
    display: "flex",
    justify: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: "16px",
    overflowY: "auto"
  },
  modalCard: {
    background: "#ffffff",
    width: "98vw",
    maxWidth: "1400px",
    borderRadius: "6px",
    padding: "16px",
    maxHeight: "94vh",
    overflowY: "auto"
  },
  noPrintBar: {
    display: "flex",
    justify: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e2e8f0"
  },
  printBtn: { background: "#16a34a", color: "#fff", border: "none", padding: "7px 14px", borderRadius: "4px", fontWeight: "500", cursor: "pointer", fontSize: "0.85rem" },
  closeBtn: { background: "#ef4444", color: "#fff", border: "none", padding: "7px 12px", borderRadius: "4px", fontWeight: "500", cursor: "pointer", fontSize: "0.85rem" },
  documentCanvas: {
    position: "relative",
    border: "1px solid #475569",
    padding: "12px",
    background: "#ffffff",
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    color: "#1e293b"
  },
  watermarkContainer: {
    position: "absolute",
    top: "35%",
    left: "5%",
    right: "5%",
    pointerEvents: "none",
    opacity: 0.03,
    display: "flex",
    justify: "space-between",
    transform: "rotate(-12deg)",
    zIndex: 1
  },
  watermarkText: { fontSize: "4rem", fontWeight: "700", color: "#000" },
  topHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #475569", paddingBottom: "4px", marginBottom: "6px" },
  mainTitle: { margin: 0, fontSize: "1rem", fontWeight: "600", color: "#0f172a" },
  locationBar: { display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "4px 8px", border: "1px solid #64748b", fontSize: "0.78rem", marginBottom: "6px", color: "#334155" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" },
  thRow: { background: "#f8fafc", border: "1px solid #64748b", padding: "4px", textAlign: "center", color: "#1e293b", fontWeight: "600" },
  tdText: { border: "1px solid #64748b", padding: "4px", verticalAlign: "top", color: "#334155" },
  tdCenter: { border: "1px solid #64748b", padding: "4px", textAlign: "center", verticalAlign: "top", color: "#334155" },
  tdCenterBold: { border: "1px solid #64748b", padding: "4px", textAlign: "center", verticalAlign: "top", fontWeight: "600", color: "#0f172a", fontSize: "0.85rem" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "6px", borderTop: "1px solid #475569" }
};
