# Benchmark Methodology

## Purpose

The experiment compares a readable baseline contract with a gas-optimized contract that implements the same land registration and approval-based ownership-transfer workflow.

## Environment

- Solidity compiler: `0.8.28`
- Optimizer: enabled, 200 runs
- Execution network: local Hardhat EVM
- Workloads: 10, 100, and 500 complete land-transfer lifecycles
- Modes: sequential submission and concurrent transaction submission

## Measured operations

For each contract, the scripts measure deployment and these lifecycle operations:

1. `registerLand`
2. `requestTransfer`
3. `approveTransfer`
4. `transferOwnership`
5. `getLandDetails` in the single-lifecycle comparison

`getLandDetails` is deliberately implemented as a transaction-style audit read in both contracts because it emits a read event. It is reported separately and excluded from the four-operation transfer-lifecycle total; ordinary frontend lookup uses `eth_call` (`staticCall`) and therefore consumes no transaction gas.

The load experiment reports total gas, gas per full lifecycle, failure rate, and elapsed time. The source data is stored in `gas-comparison-latest.json` and `load-benchmark-latest.json`.

## Fair-comparison rule

Both contracts enforce identical roles and transfer stages. The optimized contract intentionally replaces dynamic on-chain metadata strings with a deterministic metadata hash, uses compact storage, and uses custom errors. The resulting registration savings therefore represent a realistic storage-design trade-off: lower on-chain cost in exchange for off-chain metadata retrieval.

## Interpretation and limitations

- Gas values are reproducible local-EVM measurements, not Ethereum mainnet fees.
- Local confirmation time does not represent public-network congestion or validator behaviour.
- USD and INR values in the dashboard are user-configured estimates based on the receipt gas cost; they are not live exchange-rate data.
- Concurrent mode measures client-side concurrent submission against a local node. It is not a public-network load test.
- The elapsed-time figures include local client/RPC processing and should not be interpreted as public Ethereum confirmation latency.
- Production use would require independent security review, document-storage design, identity verification, privacy controls, and government/legal integration.
