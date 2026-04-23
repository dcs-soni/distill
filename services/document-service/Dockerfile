FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY services/document-service/package.json ./services/document-service/
COPY shared/types ./shared/types
COPY shared/utils ./shared/utils

RUN npm ci

COPY services/document-service ./services/document-service
RUN npm run build --workspace=services/document-service

FROM node:20-alpine AS runner

RUN apk add --no-cache tini

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/shared/types /app/shared/types
COPY --from=builder --chown=appuser:appgroup /app/shared/utils /app/shared/utils
COPY --from=builder --chown=appuser:appgroup /app/services/document-service/dist ./services/document-service/dist
COPY --from=builder --chown=appuser:appgroup /app/services/document-service/package.json ./services/document-service/
COPY --from=builder --chown=appuser:appgroup /app/services/document-service/src/infrastructure/persistence/prisma ./services/document-service/prisma

USER appuser

EXPOSE 3002

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "services/document-service/dist/bootstrap.js"]
