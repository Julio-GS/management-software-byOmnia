# ==========================================
# Backend Dockerfile (NestJS + Prisma)
# ==========================================
# Optimized for Railway deployment with PNPM
# Port: 8080

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy all package.json files (including shared packages)
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/

# Install ALL dependencies (we need them for build)
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

WORKDIR /app

# Copy ALL node_modules from deps stage (root + workspace packages)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules

# Copy source files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types
COPY packages/api-client ./packages/api-client

# Build shared packages FIRST (explicit order)
RUN pnpm --filter @omnia/shared-types build
RUN pnpm --filter @omnia/api-client build

# Generate Prisma Client - this writes into root node_modules/.pnpm/...
RUN cd apps/backend && pnpm exec prisma generate --schema=./prisma/schema.prisma

# Build backend (prebuild runs prisma generate again via script, that's fine)
RUN pnpm --filter @omnia/backend build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl bash

# Install PNPM in runtime
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

# Copy workspace configs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy the ENTIRE root node_modules from builder
# This includes the generated Prisma client in node_modules/.pnpm/...
COPY --from=builder /app/node_modules ./node_modules

# Copy built backend
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built shared packages
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/packages/api-client/package.json ./packages/api-client/package.json

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose backend port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Start: push schema to DB then start app
# Using db push because no migration files exist yet
CMD ["sh", "-c", "cd apps/backend && pnpm exec prisma db push --schema=./prisma/schema.prisma --accept-data-loss && cd ../.. && node apps/backend/dist/main.js"]
