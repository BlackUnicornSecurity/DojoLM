# KATANA Validation — Reproducible Environment (K6.2)
#
# Cross-environment validation container for consistent results.
# ISO 17025 Clause: 7.2.2
#
# Usage:
#   docker build -t katana-validation -f packages/bu-tpi/src/validation/ci/Dockerfile .
#   docker run --env-file .env.katana katana-validation
#
FROM node:20-alpine

# Security: run as non-root
RUN addgroup -S katana && adduser -S katana -G katana

WORKDIR /app

# Install OS-level dependencies for native modules (if any)
RUN apk add --no-cache git

# Copy workspace root package files for dependency resolution
COPY package.json package-lock.json ./

# Copy bu-tpi package
COPY packages/bu-tpi/ packages/bu-tpi/

# Install dependencies (ci mode for reproducible installs)
RUN npm ci --ignore-scripts --workspace=packages/bu-tpi

# Build bu-tpi
RUN npm run build --workspace=packages/bu-tpi

# Switch to non-root user
USER katana

# Environment variables (secrets provided at runtime via --env-file or -e)
# KATANA_HMAC_KEY, KATANA_SIGNING_KEY, KATANA_VERIFY_KEY must be set at runtime
ENV NODE_ENV=production
ENV KATANA_ENV_LABEL=docker-alpine-node20

# Health check: verify the CLI is available
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD npx katana --version || exit 1

# Default: run full validation
CMD ["npx", "katana", "validate", "--modules", "all", "--output", "json"]
