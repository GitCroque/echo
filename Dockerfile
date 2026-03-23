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

# Create non-root user and data directory with correct permissions
RUN addgroup -S echo && adduser -S echo -G echo \
    && mkdir -p /data && chown echo:echo /data \
    && chown -R echo:echo /app

EXPOSE 3000

ENV DATA_DIR=/data
USER echo

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;require('http').get('http://localhost:'+p+'/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
