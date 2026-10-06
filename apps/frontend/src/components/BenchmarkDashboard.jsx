import React, { useMemo } from "react";
import { Pill } from "./UIComponents.jsx";

export default function BenchmarkDashboard({
  loadReport,
  loadProgress,
  runningLoadTest,
  onRunBenchmark,
  disabled = false
}) {
  // Parse report data
  const results = loadReport?.results || [];
  const generatedAt = loadReport?.generatedAt ? new Date(loadReport.generatedAt) : null;
  const loads = loadReport?.loads || [];

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (results.length === 0) {
      return {
        totalGasSaved: 0,
        gasSavedPercent: "0.0",
        totalTransactions: 0,
        successRate: "0.0",
        baseContractGas: 0,
        optimizedContractGas: 0
      };
    }

    const baseResults = results.filter((r) => r.contract.includes("Base"));
    const optResults = results.filter((r) => r.contract.includes("Optimized"));

    const baseTotalGas = baseResults.reduce((sum, r) => sum + (r.totalGas || 0), 0);
    const optTotalGas = optResults.reduce((sum, r) => sum + (r.totalGas || 0), 0);
    const gasSaved = baseTotalGas - optTotalGas;
    const gasSavedPercent = baseTotalGas > 0 ? ((gasSaved / baseTotalGas) * 100).toFixed(1) : "0.0";

    const totalTransactions = loads.length > 0 ? loads.reduce((sum, l) => sum + l, 0) : 0;
    const totalFailures = results.reduce((sum, r) => sum + (r.failureRate || 0), 0);
    const successRate = (100 - (totalFailures / results.length)).toFixed(1);

    return {
      totalGasSaved: gasSaved,
      gasSavedPercent,
      totalTransactions,
      successRate,
      baseContractGas: baseTotalGas,
      optimizedContractGas: optTotalGas
    };
  }, [results, loads]);

  // Group results by load size
  const resultsByLoad = useMemo(() => {
    const grouped = {};
    loads.forEach((load) => {
      grouped[load] = {
        base: results.find((r) => r.load === load && r.contract.includes("Base")),
        optimized: results.find((r) => r.load === load && r.contract.includes("Optimized"))
      };
    });
    return grouped;
  }, [results, loads]);

  const hasResults = results.length > 0;

  return (
    <div className="benchmark-dashboard">
      {/* Header with Live Badge */}
      <div className="benchmark-header">
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                background: runningLoadTest ? "#dc2626" : "#16a34a",
                borderRadius: "50%",
                animation: runningLoadTest ? "pulse 1.5s infinite" : "none"
              }}
            />
            {runningLoadTest ? "● LIVE EVM BENCHMARK RUNNING" : "● LIVE EVM BENCHMARK"}
          </h3>
          {generatedAt && !runningLoadTest && (
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Last executed: {generatedAt.toLocaleDateString()} at {generatedAt.toLocaleTimeString()}
            </p>
          )}
          {!hasResults && (
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Network: Local Hardhat EVM | Ready to execute
            </p>
          )}
        </div>
        <button
          onClick={onRunBenchmark}
          disabled={disabled || runningLoadTest}
          style={{
            padding: "10px 16px",
            fontSize: "0.9rem",
            fontWeight: "600",
            background: runningLoadTest ? "#94a3b8" : "#1e3a8a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: runningLoadTest ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}
        >
          {runningLoadTest ? "Benchmark Running..." : "Execute Real-Time Load Test"}
        </button>
      </div>

      {/* Progress Bar */}
      {runningLoadTest && loadProgress && (
        <div style={{ padding: "16px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "8px", marginBottom: "20px", color: "#1e40af", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="signal" style={{ background: "#2563eb", width: "12px", height: "12px", borderRadius: "50%", animation: "pulse 1s infinite" }} />
          <span>{loadProgress}</span>
        </div>
      )}

      {/* KPI Cards */}
      {hasResults && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
          <KPICard label="GAS SAVED" value={kpis.totalGasSaved.toLocaleString()} unit="gas" tone="green" />
          <KPICard label="GAS REDUCTION" value={kpis.gasSavedPercent} unit="%" tone="success" />
          <KPICard label="TRANSACTIONS" value={kpis.totalTransactions} unit="executed" tone="purple" />
          <KPICard label="SUCCESS RATE" value={kpis.successRate} unit="%" tone="green" />
        </div>
      )}

      {/* Benchmark Results */}
      {hasResults ? (
        <>
          {/* Gas Consumption Comparison Chart */}
          <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem", color: "#0f172a" }}>Gas Consumption by Workload</h4>
              <p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b" }}>Comparison of Base vs. Optimized contracts across transaction loads</p>
            </div>

            {/* Chart Bars */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${loads.length}, 1fr)`, gap: "24px", alignItems: "flex-end", minHeight: "280px", padding: "20px 10px", background: "#f8fafc", borderRadius: "8px" }}>
              {loads.map((loadCount) => {
                const loadData = resultsByLoad[loadCount];
                if (!loadData?.base || !loadData?.optimized) return null;

                const maxGas = Math.max(...results.map((r) => r.totalGas)) || 1;
                const baseHeight = Math.max(30, (loadData.base.totalGas / maxGas) * 200);
                const optHeight = Math.max(30, (loadData.optimized.totalGas / maxGas) * 200);
                const gasSaved = loadData.base.totalGas - loadData.optimized.totalGas;
                const percentSaved = loadData.base.totalGas ? ((gasSaved / loadData.base.totalGas) * 100).toFixed(1) : "0.0";

                return (
                  <div key={loadCount} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ marginBottom: "12px", textAlign: "center", width: "100%" }}>
                      <Pill tone="success" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>
                        {percentSaved}% Saved
                      </Pill>
                      <small style={{ display: "block", color: "#64748b", fontSize: "0.7rem" }}>
                        {gasSaved.toLocaleString()} gas
                      </small>
                    </div>

                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", width: "100%", height: "200px", justifyContent: "center" }}>
                      {/* Base Contract Bar */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                        <span style={{ fontSize: "0.7rem", color: "#b45309", fontWeight: "bold", marginBottom: "6px", textAlign: "center", width: "100%", wordBreak: "break-word" }}>
                          {loadData.base.totalGas >= 1000000 ? `${(loadData.base.totalGas / 1000000).toFixed(1)}M` : (loadData.base.totalGas / 1000).toFixed(0)}K
                        </span>
                        <div
                          style={{
                            width: "100%",
                            height: `${baseHeight}px`,
                            background: "linear-gradient(180deg, #d97706 0%, #b45309 100%)",
                            borderRadius: "6px 6px 0 0",
                            transition: "height 0.3s ease"
                          }}
                        />
                        <small style={{ marginTop: "6px", fontSize: "0.7rem", color: "#1e293b", fontWeight: "600" }}>Base</small>
                      </div>

                      {/* Optimized Contract Bar */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                        <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: "bold", marginBottom: "6px", textAlign: "center", width: "100%", wordBreak: "break-word" }}>
                          {loadData.optimized.totalGas >= 1000000 ? `${(loadData.optimized.totalGas / 1000000).toFixed(1)}M` : (loadData.optimized.totalGas / 1000).toFixed(0)}K
                        </span>
                        <div
                          style={{
                            width: "100%",
                            height: `${optHeight}px`,
                            background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
                            borderRadius: "6px 6px 0 0",
                            transition: "height 0.3s ease"
                          }}
                        />
                        <small style={{ marginTop: "6px", fontSize: "0.7rem", color: "#15803d", fontWeight: "600" }}>Optimized</small>
                      </div>
                    </div>

                    <div style={{ marginTop: "12px", textAlign: "center", borderTop: "2px solid #cbd5e1", paddingTop: "8px", width: "100%", minWidth: "80px" }}>
                      <strong style={{ fontSize: "0.85rem", color: "#1e293b" }}>{loadCount} Txns</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <SummaryCard title="BASE CONTRACT" gas={kpis.baseContractGas} variant="base" />
            <SummaryCard title="OPTIMIZED CONTRACT" gas={kpis.optimizedContractGas} variant="optimized" savings={kpis.totalGasSaved} savingsPercent={kpis.gasSavedPercent} />
          </div>

          {/* Detailed Results Table */}
          <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "#0f172a" }}>Detailed Results</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: "600", color: "#1e293b" }}>Contract</th>
                  <th style={{ padding: "10px", textAlign: "center", fontWeight: "600", color: "#1e293b" }}>Workload</th>
                  <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#1e293b" }}>Total Gas</th>
                  <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#1e293b" }}>Gas/Lifecycle</th>
                  <th style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#1e293b" }}>Execution (ms)</th>
                  <th style={{ padding: "10px", textAlign: "center", fontWeight: "600", color: "#1e293b" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: row.contract.includes("Optimized") ? "#f0fdf4" : "#ffffff" }}>
                    <td style={{ padding: "10px", fontWeight: "600", color: row.contract.includes("Optimized") ? "#15803d" : "#1e293b" }}>
                      <Pill tone={row.contract.includes("Optimized") ? "success" : "warning"} style={{ fontSize: "0.75rem" }}>
                        {row.contract}
                      </Pill>
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: "600" }}>{row.load} txns</td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace", fontWeight: "600" }}>{Number(row.totalGas).toLocaleString()}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace" }}>{Number(row.gasPerLifecycle).toLocaleString()}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontFamily: "monospace" }}>{row.elapsedMs.toFixed(0)}</td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <Pill tone={row.failureRate === 0 ? "success" : "warning"} style={{ fontSize: "0.7rem" }}>
                        {row.failureRate === 0 ? "✓ OK" : `${row.failureRate.toFixed(1)}% failed`}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Benchmark Info */}
          <div style={{ marginTop: "20px", padding: "14px", background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1e40af", fontSize: "0.85rem" }}>
            <strong>ℹ Benchmark Information</strong>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
              <li>Executed on local Hardhat EVM blockchain</li>
              <li>Each transaction lifecycle includes: Register → Request Transfer → Approve → Complete Transfer</li>
              <li>Gas measurements are real on-chain values from actual transaction receipts</li>
              <li>Execution time is measured using JavaScript performance.now() for precision</li>
              <li>Success rate reflects transaction confirmation without errors</li>
            </ul>
          </div>
        </>
      ) : (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
          <p style={{ fontSize: "1rem", fontWeight: "600", color: "#475569", margin: "0 0 8px 0" }}>No benchmark data yet</p>
          <p style={{ fontSize: "0.9rem", color: "#64748b", margin: 0 }}>Click "Execute Real-Time Load Test" to run the benchmark and see real transaction data from your local Hardhat EVM.</p>
        </div>
      )}

      <style>{`
        .benchmark-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .benchmark-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .benchmark-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .benchmark-header button {
            width: 100%;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .signal {
          display: inline-block;
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

function KPICard({ label, value, unit, tone }) {
  const toneColors = {
    green: { bg: "#f0fdf4", border: "#86efac", text: "#15803d", label: "#166534" },
    success: { bg: "#f0fdf4", border: "#86efac", text: "#15803d", label: "#166534" },
    purple: { bg: "#f3e8ff", border: "#d8b4fe", text: "#7e22ce", label: "#9333ea" },
    warning: { bg: "#fef3c7", border: "#fde047", text: "#b45309", label: "#ca8a04" }
  };

  const colors = toneColors[tone] || toneColors.green;

  return (
    <div
      style={{
        padding: "16px",
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: "10px",
        textAlign: "center"
      }}
    >
      <p style={{ margin: "0 0 8px 0", fontSize: "0.75rem", fontWeight: "700", color: colors.label, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </p>
      <p style={{ margin: "0", fontSize: "1.5rem", fontWeight: "800", color: colors.text }}>
        {value}
        <span style={{ fontSize: "0.9rem", fontWeight: "600", marginLeft: "4px" }}>{unit}</span>
      </p>
    </div>
  );
}

function SummaryCard({ title, gas, variant, savings, savingsPercent }) {
  const isOptimized = variant === "optimized";
  const bgColor = isOptimized ? "#f0fdf4" : "#fef3c7";
  const borderColor = isOptimized ? "#86efac" : "#fde047";
  const labelColor = isOptimized ? "#166534" : "#ca8a04";

  return (
    <div style={{ padding: "18px", background: bgColor, border: `2px solid ${borderColor}`, borderRadius: "10px" }}>
      <p style={{ margin: "0 0 12px 0", fontSize: "0.8rem", fontWeight: "700", color: labelColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {title}
      </p>
      <p style={{ margin: "0 0 4px 0", fontSize: "1.3rem", fontWeight: "700", color: "#1e293b", fontFamily: "monospace" }}>
        {Number(gas).toLocaleString()} gas
      </p>
      <p style={{ margin: "0", fontSize: "0.85rem", color: "#64748b" }}>
        Lifecycle gas consumption
      </p>
      {isOptimized && savings !== undefined && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${borderColor}` }}>
          <p style={{ margin: "0 0 2px 0", fontSize: "0.75rem", color: "#666666" }}>Optimization impact:</p>
          <p style={{ margin: "0", fontSize: "1rem", fontWeight: "700", color: "#15803d" }}>
            -&nbsp;{Number(savings).toLocaleString()} gas ({savingsPercent}%)
          </p>
        </div>
      )}
    </div>
  );
}
