FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --production=false

# Copy application source
COPY . .

# Create the local JSON data directory
RUN mkdir -p /app/data

EXPOSE 5000

# Health check: hit the /api/health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "src/index.js"]
