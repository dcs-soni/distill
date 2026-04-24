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

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/shared/types /app/shared/types
COPY --from=builder --chown=node:node /app/shared/utils /app/shared/utils
COPY --from=builder --chown=node:node /app/services/document-service/dist ./services/document-service/dist
COPY --from=builder --chown=node:node /app/services/document-service/src/infrastructure/persistence/generated ./services/document-service/dist/infrastructure/persistence/generated
COPY --from=builder --chown=node:node /app/services/document-service/package.json ./services/document-service/
COPY --from=builder --chown=node:node /app/services/document-service/src/infrastructure/persistence/prisma ./services/document-service/prisma

USER node

EXPOSE 3002

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "services/document-service/dist/bootstrap.js"]
