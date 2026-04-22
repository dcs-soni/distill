FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy gateway source
COPY gateway/package.json gateway/
COPY gateway/tsconfig.json gateway/
COPY gateway/src gateway/src/

# Copy shared packages if any (like @distill/types)
COPY shared shared/

# Install dependencies and build
RUN npm ci
RUN npm run build --workspace=@distill/gateway

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built artifacts and dependencies
COPY package*.json ./
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/dist/gateway dist/gateway/
COPY --from=builder /app/gateway/package.json gateway/

# Expose gateway port
EXPOSE 3000

CMD ["node", "dist/gateway/src/server.js"]
