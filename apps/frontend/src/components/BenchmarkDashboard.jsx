import React, { useMemo } from "react";

export default function BenchmarkDashboard({
  loadReport,
  runningLoadTest,
  loadProgress,
  onRunBenchmark,
  disabled = false
}) {
  const results = loadReport?.results || [];
  const loads = [...new Set(results.map((row) => Number(row.load)).filter((n) => Number.isFinite(n)))];
  const generatedAt = loadReport?.generatedAt ? new Date(loadReport.generatedAt) : null;

  const metrics = useMemo(() => {
    if (!results.length) {
      return {
        gasSaved: 0,
        gasSavedPercent: "0.0",
        totalTransactions: 0,
        successRate: "100.0",
        baseGas: 0,
        optimizedGas: 0
      };
    }

    const baseRows = results.filter((row) => row.contract.includes("Base"));
    const optimizedRows = results.filter((row) => row.contract.includes("Optimized"));
    const baseGas = baseRows.reduce((sum, row) => sum + (Number(row.totalGas) || 0), 0);
    const optimizedGas = optimizedRows.reduce((sum, row) => sum + (Number(row.totalGas) || 0), 0);
    const gasSaved = baseGas - optimizedGas;
    const gasSavedPercent = baseGas > 0 ? ((gasSaved / baseGas) * 100).toFixed(1) : "0.0";
    const totalTransactions = loads.reduce((sum, loadCount) => sum + loadCount, 0);
    const averageFailureRate = results.length > 0 ? results.reduce((sum, row) => sum + (Number(row.failureRate) || 0), 0) / results.length : 0;
    const successRate = (100 - averageFailureRate).toFixed(1);

    return {
      gasSaved,
      gasSavedPercent,
      totalTransactions,
      successRate,
      baseGas,
      optimizedGas
    };
  }, [results, loads]);

  const resultsByLoad = useMemo(() => {
    const map = {};
    loads.forEach((loadCount) => {
      map[loadCount] = {
        base: results.find((row) => row.load === loadCount && row.contract.includes("Base")),
        optimized: results.find((row) => row.load === loadCount && row.contract.includes("Optimized"))
      };
    });
    return map;
  }, [results, loads]);

  const maxGas = results.length ? Math.max(...results.map((row) => Number(row.totalGas) || 0), 1) : 1;

  return (
    <div className="benchmark-dashboard">
      <div className="benchmark-header">
        <div>
          <div className="benchmark-live-badge">
            <span className={`benchmark-dot ${runningLoadTest ? "active" : "idle"}`} />
            {runningLoadTest ? "LIVE EVM BENCHMARK RUNNING" : "LIVE EVM BENCHMARK"}
          </div>
          <div className="benchmark-meta">
            {generatedAt && !runningLoadTest && (
              <span>Last executed: {generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at {generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
            {!runningLoadTest && <span>Network: Local Hardhat EVM</span>}
            <span>Loads tested: 10 / 100 / 500</span>
          </div>
        </div>

        <button
          className="benchmark-run-btn"
          onClick={onRunBenchmark}
          disabled={disabled || runningLoadTest}
        >
          {runningLoadTest ? "Benchmark running..." : "Run Benchmark"}
        </button>
      </div>

      {runningLoadTest && loadProgress && (
        <div className="benchmark-progress-panel">
          <span className="signal-dot" />
          <span>{loadProgress}</span>
        </div>
      )}

      {results.length > 0 ? (
        <>
          <div className="benchmark-kpis">
            <div className="benchmark-kpi benchmark-kpi--gas">
              <span className="benchmark-kpi-label">Gas Saved</span>
              <strong>{Number(metrics.gasSaved).toLocaleString()} gas</strong>
            </div>
            <div className="benchmark-kpi benchmark-kpi--green">
              <span className="benchmark-kpi-label">Gas Reduction</span>
              <strong>{metrics.gasSavedPercent}%</strong>
            </div>
            <div className="benchmark-kpi benchmark-kpi--purple">
              <span className="benchmark-kpi-label">Transactions</span>
              <strong>{metrics.totalTransactions}</strong>
            </div>
            <div className="benchmark-kpi benchmark-kpi--teal">
              <span className="benchmark-kpi-label">Success Rate</span>
              <strong>{metrics.successRate}%</strong>
            </div>
          </div>

          <div className="benchmark-chart-panel">
            <div className="benchmark-chart-header">
              <div>
                <h4>Base vs Optimized Execution Time</h4>
                <p>Real workload benchmark running on the EVM</p>
              </div>
              <div className="chart-legend">
                <span><i className="legend-swatch base" />Base</span>
                <span><i className="legend-swatch optimized" />Optimized</span>
              </div>
            </div>

            <div className="benchmark-chart-grid">
              {loads.map((loadCount) => {
                const baseRow = resultsByLoad[loadCount]?.base;
                const optimizedRow = resultsByLoad[loadCount]?.optimized;
                if (!baseRow || !optimizedRow) return null;

                const baseHeight = Math.max(36, (Number(baseRow.elapsedMs) / Math.max(...results.map((row) => Number(row.elapsedMs) || 0), 1)) * 180);
                const optimizedHeight = Math.max(36, (Number(optimizedRow.elapsedMs) / Math.max(...results.map((row) => Number(row.elapsedMs) || 0), 1)) * 180);

                return (
                  <div key={loadCount} className="benchmark-chart-column">
                    <div className="benchmark-chart-bars">
                      <div className="chart-stack base-stack">
                        <span className="chart-value">{Number(baseRow.elapsedMs).toFixed(0)} ms</span>
                        <div className="chart-bar base" style={{ height: `${baseHeight}px` }} />
                        <small>Base</small>
                      </div>
                      <div className="chart-stack optimized-stack">
                        <span className="chart-value">{Number(optimizedRow.elapsedMs).toFixed(0)} ms</span>
                        <div className="chart-bar optimized" style={{ height: `${optimizedHeight}px` }} />
                        <small>Opt</small>
                      </div>
                    </div>
                    <strong>{loadCount} txns</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="benchmark-summary-grid">
            <div className="benchmark-summary-card base">
              <span className="summary-label">Base Contract</span>
              <strong>{Number(metrics.baseGas).toLocaleString()} gas</strong>
            </div>
            <div className="benchmark-summary-card optimized">
              <span className="summary-label">Optimized Contract</span>
              <strong>{Number(metrics.optimizedGas).toLocaleString()} gas</strong>
            </div>
          </div>

          <div className="benchmark-evidence-panel">
            <h4>Benchmark evidence</h4>
            <div className="benchmark-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Load</th>
                    <th>Contract</th>
                    <th>Gas Used</th>
                    <th>Gas / Lifecycle</th>
                    <th>Execution Time</th>
                    <th>Success</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, index) => (
                    <tr key={`${row.contract}-${row.load}-${index}`}>
                      <td>{row.load} txns</td>
                      <td>{row.contract}</td>
                      <td>{Number(row.totalGas).toLocaleString()} gas</td>
                      <td>{Number(row.gasPerLifecycle).toLocaleString()} gas</td>
                      <td>{Number(row.elapsedMs).toFixed(0)} ms</td>
                      <td>{Number(row.failureRate) === 0 ? "✓" : `${Number(row.failureRate).toFixed(1)}% fail`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="benchmark-empty-state">
          <p>No benchmark data yet.</p>
          <span>Click “Run Benchmark” to execute the live EVM workload comparison.</span>
        </div>
      )}
    </div>
  );
}
