# Gas Comparison Report

This report compares the basic land registry contract against the optimized contract using the same registration and transfer lifecycle.

| Operation | Base Gas | Optimized Gas | Gas Saved | Reduction |
| --- | ---: | ---: | ---: | ---: |
| deployment | 1140011 | 673627 | 466384 | 40.91% |
| registerLand | 230426 | 160499 | 69927 | 30.35% |
| requestTransfer | 31702 | 31701 | 1 | 0% |
| approveTransfer | 31078 | 31081 | -3 | -0.01% |
| transferOwnership | 61316 | 61298 | 18 | 0.03% |
| getLandDetails | 45354 | 37036 | 8318 | 18.34% |

Notes:

- BaseLandRegistry stores human-readable strings directly on-chain for easier inspection.
- OptimizedLandRegistry stores a metadata hash, packs smaller values, uses custom errors, and avoids unnecessary default writes.
- Gas values depend on compiler version, optimizer settings, EVM target, and local Hardhat configuration.
