FROM node:22-alpine AS base
WORKDIR /app

# Copy workspace manifests so npm can resolve the monorepo graph
FROM base AS deps
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY ingestion/package.json ./ingestion/
COPY packages/sdk/package.json ./packages/sdk/
RUN npm ci

# Build the SDK (produces dist/ with declaration files)
FROM deps AS sdk-build
COPY packages/sdk ./packages/sdk
RUN npm run build --workspace=packages/sdk

# Build Next.js
FROM sdk-build AS builder
COPY frontend ./frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=frontend

# Production runner — keep node_modules from deps stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy installed modules and built output
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/frontend ./frontend
COPY package.json ./

USER nextjs
WORKDIR /app/frontend
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/node_modules/.bin/next", "start"]
