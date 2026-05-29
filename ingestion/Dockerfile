FROM node:22-alpine AS base
WORKDIR /app

# Copy workspace 
FROM base AS deps
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY ingestion/package.json ./ingestion/
COPY packages/sdk/package.json ./packages/sdk/
RUN npm ci

# Build ingestion TypeScript
FROM deps AS builder
COPY ingestion ./ingestion
RUN npm run build --workspace=ingestion

# Production runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ingestion

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/ingestion/dist ./ingestion/dist
COPY --from=builder /app/ingestion/package.json ./ingestion/package.json
COPY package.json ./

USER ingestion
WORKDIR /app/ingestion
EXPOSE 4001

CMD ["node", "dist/index.js"]
