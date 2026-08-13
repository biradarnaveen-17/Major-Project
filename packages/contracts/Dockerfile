FROM node:20-alpine

WORKDIR /app

# Install curl for the Ganache readiness probe
RUN apk add --no-cache curl

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install

# Copy contracts source, scripts, and config
COPY . .

# Create the output directory for deployment artifacts
RUN mkdir -p /app/docs

# wait-for-ganache: poll the Ganache RPC until it responds, then deploy + seed.
# The deployer derives its private key from the Docker mnemonic automatically
# via hardhat.config.js "ganache" network, so DEPLOYER_PRIVATE_KEY is not needed.
CMD ["sh", "-c", "\
  echo 'Waiting for Ganache to be ready...' && \
  until curl -sf -X POST -H 'Content-Type: application/json' \
    --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}' \
    ${RPC_URL:-http://ganache:8545} > /dev/null 2>&1; do \
    echo '  Ganache not ready, retrying in 2s...'; sleep 2; \
  done && \
  echo 'Ganache is ready. Deploying contracts...' && \
  npx hardhat run scripts/deploy.js --network ganache && \
  echo 'Seeding demo data...' && \
  npx hardhat run scripts/seedDemo.js --network ganache && \
  echo 'Deployment and seeding complete.' \
"]