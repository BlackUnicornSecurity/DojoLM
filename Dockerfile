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

# Native module build deps (better-sqlite3 needs python3 + make + g++)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace root config
COPY package.json package-lock.json ./

# Copy all package.json files for workspace resolution
COPY packages/bu-tpi/package.json ./packages/bu-tpi/
COPY packages/dojolm-scanner/package.json ./packages/dojolm-scanner/
COPY packages/dojolm-web/package.json ./packages/dojolm-web/
COPY packages/dojolm-mcp/package.json ./packages/dojolm-mcp/
COPY packages/dojolm-control-mcp/package.json ./packages/dojolm-control-mcp/

# Install ALL dependencies (including dev for build step)
# Use npm install instead of npm ci — lockfile generated with npm 11 is incompatible with npm 10 in node:22
# Force install platform-specific optional deps for linux (Tailwind 4 oxide) — detect arch at build time
# npm hoists workspace deps to root; mkdir guarantees per-workspace dirs exist for stage-2 COPY
RUN npm install && \
    ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/') && \
    (npm install @tailwindcss/oxide-linux-${ARCH}-gnu 2>/dev/null || true) && \
    mkdir -p packages/bu-tpi/node_modules \
             packages/dojolm-scanner/node_modules \
             packages/dojolm-web/node_modules \
             packages/dojolm-mcp/node_modules \
             packages/dojolm-control-mcp/node_modules

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
COPY --from=deps /app/packages/dojolm-control-mcp/node_modules ./packages/dojolm-control-mcp/node_modules

# Copy all source
COPY package.json package-lock.json tsconfig.json ./
COPY packages/bu-tpi/ ./packages/bu-tpi/
COPY packages/dojolm-scanner/ ./packages/dojolm-scanner/
COPY packages/dojolm-mcp/ ./packages/dojolm-mcp/
COPY packages/dojolm-control-mcp/ ./packages/dojolm-control-mcp/
COPY packages/dojolm-web/ ./packages/dojolm-web/

# Build bu-tpi (scanner engine)
RUN npx tsc -b packages/bu-tpi --force
# Copy JSON files that tsc doesn't emit (required by require() calls at runtime)
# Uses find to catch any future JSON additions automatically
RUN find packages/bu-tpi/src -name '*.json' -exec sh -c \
    'for f; do dest="packages/bu-tpi/dist${f#packages/bu-tpi/src}"; mkdir -p "$(dirname "$dest")"; cp "$f" "$dest"; done' \
    _ {} +

# Build dojolm-mcp
RUN npx tsc -b packages/dojolm-mcp --force

# Build dojolm-scanner
RUN npx tsc -b packages/dojolm-scanner --force

# Build dojolm-control-mcp (consumed in-process by lib/sensei/tool-source McpToolSource)
RUN npx tsc -b packages/dojolm-control-mcp --force

# Build Next.js (standalone output).
# EPIC-B (F-QA-022): NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_API_URL are intentionally
# NOT baked here — they would freeze a single origin into the client bundle, then
# refuse every other host with a 401 "untrusted browser" storm. The client uses
# relative URLs (location.origin) and the server derives the trusted origin from
# the incoming request Host (with `TPI_APP_URL` as an optional server-side pin
# for multi-domain operators). One image, any hostname.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_IGNORE_INCORRECT_LOCKFILE=1
# Env-chip identity (E6.S4): NEXT_PUBLIC_APP_ENV / NEXT_PUBLIC_GIT_SHA are
# inlined into the client bundle by next.config.ts at build time — unlike the
# origin vars above they are safe to bake (a deployment's environment name is
# fixed per image). Unset → chip defaults to DEV with no build tooltip.
ARG NEXT_PUBLIC_APP_ENV=""
ARG NEXT_PUBLIC_GIT_SHA=""
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
ENV NEXT_PUBLIC_GIT_SHA=${NEXT_PUBLIC_GIT_SHA}
RUN cd packages/dojolm-web && NODE_OPTIONS="--max-old-space-size=8192" npx next build --webpack

# ---------------------------------------------------------------------------
# Stage 3: runner — production runtime
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=42001
ENV HOSTNAME="0.0.0.0"
ENV TPI_DATA_DIR=/app/data

# Build metadata (overridable at build time for traceability)
ARG BUILD_SHA="unknown"
ARG BUILD_DATE="unknown"
LABEL org.opencontainers.image.revision="${BUILD_SHA}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.title="dojolm-web"

# Create non-root user
RUN addgroup --system --gid 1001 dojolm && \
    adduser --system --uid 1001 dojolm

# Copy standalone output (includes server + dependencies)
COPY --from=builder /app/packages/dojolm-web/.next/standalone ./
# Copy static assets
COPY --from=builder /app/packages/dojolm-web/.next/static ./packages/dojolm-web/.next/static
# Copy public assets
COPY --from=builder /app/packages/dojolm-web/public ./packages/dojolm-web/public
# Copy wrapper that blocks unsupported methods before requests hit Next.js
COPY deploy/secure-standalone-server.cjs ./secure-standalone-server.cjs

# Copy DB migrations (required for first-boot schema build — see /app/migrations
# read by the bootstrap migration runner). Without these the fresh DB has only
# `schema_version` and login/setup return 500 ("no such table: users").
COPY --from=builder /app/packages/dojolm-web/migrations ./migrations
# Copy fixture data (required for scanner)
COPY --from=builder /app/packages/bu-tpi/fixtures ./packages/bu-tpi/fixtures
# Copy compiled bu-tpi (used by scanner engine at runtime)
COPY --from=builder /app/packages/bu-tpi/dist ./packages/bu-tpi/dist
COPY --from=builder /app/packages/bu-tpi/package.json ./packages/bu-tpi/package.json
# Copy compiled dojolm-scanner
COPY --from=builder /app/packages/dojolm-scanner/dist ./packages/dojolm-scanner/dist
COPY --from=builder /app/packages/dojolm-scanner/package.json ./packages/dojolm-scanner/package.json
# Copy compiled dojolm-mcp (spawned on-demand by web API)
COPY --from=builder /app/packages/dojolm-mcp/dist ./packages/dojolm-mcp/dist
COPY --from=builder /app/packages/dojolm-mcp/package.json ./packages/dojolm-mcp/package.json
# Copy compiled dojolm-control-mcp (loaded in-process by lib/sensei McpToolSource when SENSEI_TOOL_SOURCE=mcp)
COPY --from=builder /app/packages/dojolm-control-mcp/dist ./packages/dojolm-control-mcp/dist
COPY --from=builder /app/packages/dojolm-control-mcp/package.json ./packages/dojolm-control-mcp/package.json

# Create data directory for JSON file storage (mount point)
RUN mkdir -p /app/data && chown dojolm:dojolm /app/data

# Ensure runtime user can read all copied assets. Some source dirs in the
# repo have restrictive perms (e.g. `public/branding` was 0700) which carry
# over to COPY and make `scandir` fail when the standalone server starts.
RUN chmod -R og+rX /app/packages /app/secure-standalone-server.cjs /app/migrations && \
    chown -R dojolm:dojolm /app/packages /app/secure-standalone-server.cjs /app/migrations

USER dojolm

EXPOSE 42001

# Secure wrapper proxies to the standalone server and blocks TRACE/TRACK.
CMD ["node", "secure-standalone-server.cjs"]
