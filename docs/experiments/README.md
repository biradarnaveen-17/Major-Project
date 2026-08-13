# Experiments

This directory stores generated and written analysis artifacts for the gas-cost comparison phase.

## Gas Comparison

Run the benchmark from the repository root:

```bash
npm run compare:gas --workspace packages/contracts
```

The script deploys both contracts, runs the same land registration and transfer lifecycle, and writes:

- `docs/experiments/gas-comparison-latest.json`
- `docs/experiments/gas-comparison-latest.md`

The comparison focuses on:

- Deployment gas
- `registerLand`
- `requestTransfer`
- `approveTransfer`
- `transferOwnership`
- `getLandDetails`

## Load Benchmark

Run the 10, 100, and 500 lifecycle workloads in sequential and concurrent submission modes:

```bash
npm run benchmark:loads --workspace packages/contracts
```

It writes `docs/experiments/load-benchmark-latest.json`, including total gas, gas per complete lifecycle, failure rate, and elapsed time. To make a quick smoke test, set `BENCHMARK_LOADS=10`.

The base contract is intentionally more explicit and storage-heavy. The optimized contract stores compact metadata, packs fields, uses custom errors, and reduces unnecessary writes.

For methodology, assumptions, and report-ready limitations, see [METHODOLOGY.md](METHODOLOGY.md).
