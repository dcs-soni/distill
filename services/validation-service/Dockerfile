FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/validation-service/package.json ./services/validation-service/
COPY shared/types ./shared/types
COPY shared/utils ./shared/utils

RUN npm ci

COPY services/validation-service ./services/validation-service
RUN npm run build --workspace=services/validation-service

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
USER node

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/types /app/shared/types
COPY --from=builder /app/shared/utils /app/shared/utils
COPY --from=builder /app/services/validation-service/dist ./services/validation-service/dist
COPY --from=builder /app/services/validation-service/package.json ./services/validation-service/

EXPOSE 3000

CMD ["node", "services/validation-service/dist/bootstrap.js"]
