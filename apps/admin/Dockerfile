FROM node:20-alpine AS base
RUN apk add --no-cache tini
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
