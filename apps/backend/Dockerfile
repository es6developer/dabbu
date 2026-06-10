FROM node:20-alpine AS base
RUN apk add --no-cache tini openssl
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY packages/ ../packages/
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/../packages ./packages
COPY apps/backend ./apps/backend
COPY turbo.json package*.json ./
RUN npm run build -w @dabbu/ai-engine
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM base AS production
RUN apk add --no-cache openssl
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

USER node
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
