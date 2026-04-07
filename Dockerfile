# Backend — Dockerfile
# Node 20 LTS slim
FROM node:20-slim

WORKDIR /app

# Copy package files first (layer cache)
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

# Expose backend port
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
