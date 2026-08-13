# Performance and Feasibility Analysis of Gas Cost in Ethereum-Based Smart Contracts

Case study: Land Registration.

This repository contains a working research-oriented dApp prototype: two equivalent Solidity land-registry contracts, an Express API, a MetaMask React interface, and repeatable gas benchmarks.

## Tech Stack

- Solidity
- Hardhat
- Ganache
- React
- Node.js
- Express
- Local JSON persistence for the demonstrator (MongoDB is an optional production extension)
- MetaMask
- ethers.js
- Chart.js

## Repository Layout

```text
.
|-- apps
|   |-- backend
|   |   |-- src
|   |   |   |-- config
|   |   |   |-- controllers
|   |   |   |-- middleware
|   |   |   |-- models
|   |   |   |-- routes
|   |   |   |-- services
|   |   |   `-- utils
|   |   |-- tests
|   |   |-- Dockerfile
|   |   |-- .env.example
|   |   `-- package.json
|   `-- frontend
|       |-- public
|       |-- src
|       |   |-- assets
|       |   |-- components
|       |   |-- hooks
|       |   |-- pages
|       |   |-- services
|       |   |-- store
|       |   `-- styles
|       |-- Dockerfile
|       |-- .env.example
|       `-- package.json
|-- docs
|   |-- architecture
|   |-- experiments
|   `-- research
|-- infra
|   |-- docker
|   `-- mongo
|-- packages
|   `-- contracts
|       |-- contracts
|       |-- scripts
|       |-- test
|       |-- hardhat.config.js
|       |-- .env.example
|       `-- package.json
|-- scripts
|-- .github
|   `-- workflows
|-- docker-compose.yml
|-- .env.example
|-- .gitignore
|-- .editorconfig
`-- package.json
```

## Run locally

## Recommended fresh local Hardhat demo

This is the quickest repeatable demonstration path. It uses only the disposable Hardhat accounts built into the local node; do not use its accounts or contract addresses on a public network.

1. In terminal 1, start a new local chain:

```powershell
cd packages/contracts
npx hardhat node
```

2. In terminal 2, deploy both contracts and seed the optional completed example (land ID `9002`):

```powershell
npm run deploy:local --workspace packages/contracts
npm run demo:seed --workspace packages/contracts
```

3. Copy the `base` and `optimized` addresses printed by deployment to `apps/frontend/.env`, then start the API and dashboard in separate terminals:

```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_BASE_CONTRACT_ADDRESS=0x...
VITE_OPTIMIZED_CONTRACT_ADDRESS=0x...
```

```powershell
npm run start --workspace apps/backend
npm run dev --workspace apps/frontend
```

4. Open `http://localhost:5173`. The dashboard selects **Demo authority** automatically. Enter a new land ID, register it, request and approve the transfer, and accept it with the configured demo buyer. The land details and live transaction-receipt table refresh after every successful transaction.

If the Hardhat node is restarted, all deployed contracts, seeded records, and local receipts disappear. Repeat steps 1-3, replace the two frontend addresses, and restart Vite. `docs/deployment-local.json` records only the most recent local deployment and is not a persistent-network record.

For methodology and report-ready results, see [docs/experiments/METHODOLOGY.md](docs/experiments/METHODOLOGY.md) and [docs/experiments/RESULTS_SUMMARY.md](docs/experiments/RESULTS_SUMMARY.md).

Prerequisites:

- Node.js 20+
- npm 10+
- Docker Desktop
- MetaMask browser extension
- Ganache, either Dockerized through this repository or installed locally

Install all workspaces:

```bash
npm install
```

Or use the setup script:

```bash
bash scripts/install.sh
```

On Windows PowerShell:

```powershell
.\scripts\install.ps1
```

Create local environment files:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
cp packages/contracts/.env.example packages/contracts/.env
```

Start Ganache (Docker or a local Ganache app):

```bash
docker compose up -d mongo ganache
```

Copy `packages/contracts/.env.example` to `packages/contracts/.env` and set `DEPLOYER_PRIVATE_KEY` to one funded **local Ganache test-account** private key. Deploy both contracts to Ganache and copy the printed addresses into `apps/frontend/.env`:

```bash
npm run deploy:local --workspace packages/contracts
```

Set the generated addresses:

```env
VITE_BASE_CONTRACT_ADDRESS=0x...
VITE_OPTIMIZED_CONTRACT_ADDRESS=0x...
```

Then run the API and interface in separate terminals:

```bash
npm run dev --workspace apps/backend
npm run dev --workspace apps/frontend
```

Compile and test contracts:

```bash
npm test --workspace packages/contracts
npm run compare:gas --workspace packages/contracts
npm run benchmark:loads --workspace packages/contracts
```

For an instant local demonstration after deployment, run `npm run demo:seed --workspace packages/contracts`. It registers and transfers land ID `9002` in both contracts; enter `9002` in the dashboard lookup.

The frontend supports registration, transfer request, registrar approval, buyer acceptance, and record lookup. Use the appropriate Ganache/MetaMask account for each role. The optimized contract stores a deterministic metadata hash rather than raw survey and location strings.

## Implemented Modules

- Base and optimized land-registration contracts, with role-based approvals and immutable ownership history
- Contract tests for authorization, duplicate prevention, full transfer, and invalid states
- Single lifecycle gas comparison plus 10/100/500 sequential and concurrent workload runner
- Backend health, document-verification, benchmark-history, and audit-trail APIs with local persistent storage
- Multi-view React research portal: overview, land registry, controlled transfer workflow, document queue, gas analytics, and audit trail

## Major-Project Architecture

```text
React research portal
  |-- Role-based local demo accounts / optional MetaMask
  |-- Registry and transfer workflow -> Solidity contracts -> Hardhat EVM
  |-- Document references, audit trail, benchmark history -> Express API -> local JSON store
  `-- Gas analysis -> reproducible benchmark reports
```

The blockchain is the source of truth for ownership and transfer state. The API deliberately stores only off-chain document references, user-facing audit entries, and research metadata. The demonstration does not upload identity documents or claim production legal validity.

## Suggested Viva Demonstration

### Role-based login portals

The landing screen uses passwordless authentication. Farmer and Purchaser accounts self-register with full name, username, gender, date of birth, Aadhaar number, mobile number, and email. Aadhaar is stored off-chain only as a hash plus last four digits. Every sign-in requires username/email, CAPTCHA, and a six-digit email code.

| Portal | Account creation | Main actions |
| --- | --- | --- |
| Farmer | Self-registration | Land request, mutation request, document reference |
| Purchaser | Self-registration | Review a mutation and accept ownership |
| Revenue Officer | Created only by Administrator | Verify requests, register land on blockchain, verify mutation/documents |
| System Administrator | Seeded local administrator (`admin`) | Create and control officer accounts; gas and audit review |

Without SMTP configuration, the email code is shown on screen for local viva demonstration. To send real email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `apps/backend/.env`.

### Farmer-to-government registration flow

1. Create a **Farmer** account with full name, username, gender, date of birth, Aadhaar number, mobile number, and email address.
2. Sign in using the username or email, answer the CAPTCHA, and enter the six-digit email code. The code is shown only when SMTP is not configured for this local demo.
3. Submit the Survey No., District, Taluk, Hobli, Village, and extent as a **land-registration request**.
4. Open **Revenue officer desk**, verify the request, and choose **Register on blockchain**.
5. The verified data is pre-filled in **Land registration**. Registering it creates the on-chain land record and updates the request to **Registered on blockchain**.
6. For later ownership changes, use **Mutation & transfer**: owner request -> Revenue Officer verification -> purchaser consent.

Farmer name, mobile number, OTP verification state, documents, and request status are intentionally stored off-chain in the local API. The smart contract records only the wallet-linked land ownership, lifecycle state, and compact metadata needed for the blockchain experiment.

1. Start at **Overview** and explain the four-stage ownership workflow and local-chain scope.
2. In **Land registry**, look up seeded parcel `9002`, then show its ownership history.
3. Register a new parcel and use **Transfers** to request, approve, and accept ownership.
4. In **Documents**, submit a reference and verify it using the registrar role; show the resulting **Audit trail** entry.
5. Open **Gas analytics** to compare the base and optimized lifecycle. Explain that the largest saving is registration because the optimized contract stores a hash instead of human-readable metadata.
6. State the limitations: local Hardhat gas is not a mainnet fee quote; the JSON store is a demonstrator persistence layer; real deployment needs identity, legal, privacy, document-storage, and security controls.

## Environment Strategy

Environment templates are committed as `.env.example` files. Real `.env` files must stay local and must not be committed.

## Docker Strategy

The root `docker-compose.yml` defines development services for:

- MongoDB
- Ganache
- Backend API
- Frontend application

The backend and frontend Dockerfiles support containerized development once the local environment files have been created.

## GitHub Structure

This scaffold includes:

- `.github/workflows/ci.yml`
- `.gitignore`
- `.editorconfig`
- Workspace-level package files
- Documentation directories

CI currently performs dependency installation, lint, test, and build commands where they exist. Feature implementation can extend those checks later.
