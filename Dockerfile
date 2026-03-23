# =============================================================================
# DojoLM Web — Multi-stage Docker Build
# =============================================================================
# Stage 1: Install dependencies
# Stage 2: Build all packages
# Stage 3: Production runtime (slim)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps — install all dependencies
# ---------------------------------------------------------------------------
FROM node:22-slim AS deps

WORKDIR /app

# Copy workspace root config
COPY package.json package-lock.json ./

# Copy all package.json files for workspace resolution
COPY packages/bu-tpi/package.json ./packages/bu-tpi/
COPY packages/dojolm-scanner/package.json ./packages/dojolm-scanner/
COPY packages/dojolm-web/package.json ./packages/dojolm-web/
COPY packages/dojolm-mcp/package.json ./packages/dojolm-mcp/

# Install ALL dependencies (including dev for build step)
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder — compile TypeScript + Next.js build
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/bu-tpi/node_modules ./packages/bu-tpi/node_modules
COPY --from=deps /app/packages/dojolm-scanner/node_modules ./packages/dojolm-scanner/node_modules
COPY --from=deps /app/packages/dojolm-web/node_modules ./packages/dojolm-web/node_modules
COPY --from=deps /app/packages/dojolm-mcp/node_modules ./packages/dojolm-mcp/node_modules

# Copy all source
COPY package.json package-lock.json tsconfig.json ./
COPY packages/bu-tpi/ ./packages/bu-tpi/
COPY packages/dojolm-scanner/ ./packages/dojolm-scanner/
COPY packages/dojolm-mcp/ ./packages/dojolm-mcp/
COPY packages/dojolm-web/ ./packages/dojolm-web/

# Build bu-tpi (scanner engine)
RUN npx tsc -b packages/bu-tpi --force

# Build dojolm-scanner
RUN npx tsc -b packages/dojolm-scanner --force

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN cd packages/dojolm-web && npx next build

# ---------------------------------------------------------------------------
# Stage 3: runner — production runtime
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=42001
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 dojolm && \
    adduser --system --uid 1001 dojolm

# Copy standalone output (includes server + dependencies)
COPY --from=builder /app/packages/dojolm-web/.next/standalone ./
# Copy static assets
COPY --from=builder /app/packages/dojolm-web/.next/static ./packages/dojolm-web/.next/static
# Copy public assets
COPY --from=builder /app/packages/dojolm-web/public ./packages/dojolm-web/public

# Copy fixture data (required for scanner)
COPY --from=builder /app/packages/bu-tpi/fixtures ./packages/bu-tpi/fixtures
# Copy compiled bu-tpi (used by scanner engine at runtime)
COPY --from=builder /app/packages/bu-tpi/dist ./packages/bu-tpi/dist
COPY --from=builder /app/packages/bu-tpi/package.json ./packages/bu-tpi/package.json
# Copy compiled dojolm-scanner
COPY --from=builder /app/packages/dojolm-scanner/dist ./packages/dojolm-scanner/dist
COPY --from=builder /app/packages/dojolm-scanner/package.json ./packages/dojolm-scanner/package.json

# Create data directory for JSON file storage (mount point)
RUN mkdir -p /app/data && chown dojolm:dojolm /app/data

USER dojolm

EXPOSE 42001

# The standalone server entry point
CMD ["node", "packages/dojolm-web/server.js"]
