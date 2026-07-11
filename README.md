# Performance and Feasibility Analysis of Gas Cost in Ethereum-Based Smart Contracts

Case study: Land Registration.

This repository is an initial project scaffold for a research-oriented dApp stack. It prepares the workspace for Solidity contracts, Hardhat/Ganache local chains, a Node.js/Express API, MongoDB persistence, a React frontend, MetaMask wallet flows, ethers.js integration, and Chart.js visualizations.

No product features or smart contract logic are implemented yet.

## Tech Stack

- Solidity
- Hardhat
- Ganache
- React
- Node.js
- Express
- MongoDB
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

## Getting Started

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

Start the local infrastructure:

```bash
docker compose up -d mongo ganache
```

Future development commands are already reserved:

```bash
npm run dev
npm run build
npm test
```

## Planned Modules

- Smart contract benchmarking with Hardhat gas reporting
- Land registration contract suite
- Gas-cost experiment datasets
- Backend API for experiment metadata and analysis results
- React dashboard with wallet connectivity and Chart.js visualizations
- MongoDB collections for runs, transactions, measurements, and study notes

## Environment Strategy

Environment templates are committed as `.env.example` files. Real `.env` files must stay local and must not be committed.

## Docker Strategy

The root `docker-compose.yml` defines development services for:

- MongoDB
- Ganache
- Backend API
- Frontend application

The backend and frontend Dockerfiles are placeholders for containerized development and deployment workflows.

## GitHub Structure

This scaffold includes:

- `.github/workflows/ci.yml`
- `.gitignore`
- `.editorconfig`
- Workspace-level package files
- Documentation directories

CI currently performs dependency installation, lint, test, and build commands where they exist. Feature implementation can extend those checks later.
