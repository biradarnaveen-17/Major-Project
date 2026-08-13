# Results Summary for Report / Viva

Latest reproducible local-Hardhat results use Solidity `0.8.28` with optimizer enabled at 200 runs. They measure the same registrar registration, owner request, registrar approval, and buyer acceptance workflow in both contracts.

## Main finding

The optimized contract used **262,188 gas** for one complete four-step land-transfer lifecycle, compared with **331,841 gas** for the base contract. This is a reduction of **69,653 gas (21.0%)** per lifecycle.

The largest saving occurs at registration: **138,108 gas** for the optimized registry versus **207,745 gas** for the base registry, a reduction of **33.52%**. The later transfer stages are intentionally very close because both retain the same approvals and ownership-history requirement.

## Workload validation

All 10, 100, and 500 workload runs completed with a **0% failure rate** in sequential and concurrent client-submission modes. Gas per lifecycle remained stable:

| Contract | Gas per lifecycle | 500-lifecycle total gas |
| --- | ---: | ---: |
| BaseLandRegistry | 331,901 | 165,950,404 |
| OptimizedLandRegistry | 262,284 | 131,141,904 |

At 500 lifecycles, the optimized design therefore saved **34,808,500 gas** in the local experiment.

## Interpretation

The savings come primarily from replacing human-readable on-chain strings with a deterministic metadata hash and compacting stored data. The trade-off is that descriptive metadata must be retrieved and verified off-chain. These are local-EVM gas measurements, not mainnet fee quotes; public-network fees depend on gas price, network conditions, and ETH exchange rates.
