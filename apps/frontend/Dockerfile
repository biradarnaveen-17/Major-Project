# ---------- Stage 1: Build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Accept VITE_ variables as build args so they get baked into the static bundle
ARG VITE_APP_NAME="Land Registration Gas Analysis"
ARG VITE_API_BASE_URL="http://localhost:5000"
ARG VITE_CHAIN_ID="31337"
ARG VITE_RPC_URL="http://localhost:8545"
ARG VITE_BASE_CONTRACT_ADDRESS=""
ARG VITE_OPTIMIZED_CONTRACT_ADDRESS=""

# Convert build args to env vars for the Vite build
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CHAIN_ID=$VITE_CHAIN_ID
ENV VITE_RPC_URL=$VITE_RPC_URL
ENV VITE_BASE_CONTRACT_ADDRESS=$VITE_BASE_CONTRACT_ADDRESS
ENV VITE_OPTIMIZED_CONTRACT_ADDRESS=$VITE_OPTIMIZED_CONTRACT_ADDRESS

# Install dependencies (layer caching)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ---------- Stage 2: Serve ----------
FROM node:20-alpine AS production

WORKDIR /app

# Install a lightweight static file server
RUN npm install -g serve

# Copy the built output from the build stage
COPY --from=build /app/dist ./dist

EXPOSE 5173

# Health check: verify the HTTP server responds
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5173/ || exit 1

# Serve the static build on port 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
