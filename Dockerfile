# Stage 1: Build native dependencies
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

# Stage 2: Runtime (no build tools)
FROM node:20-alpine

WORKDIR /app

# Copy only node_modules and app code
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY public ./public

# Create data directory
RUN mkdir -p /data

EXPOSE 3000

ENV DATA_DIR=/data

# Start the application
CMD ["node", "server.js"]
