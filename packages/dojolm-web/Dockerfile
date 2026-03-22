# DojoLM Web - Production Docker Image
# Must be built from MONOREPO ROOT: docker build -f packages/dojolm-web/Dockerfile .

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package.json package-lock.json ./

# Copy workspace packages needed for build
COPY packages/bu-tpi/ ./packages/bu-tpi/
COPY packages/dojolm-scanner/ ./packages/dojolm-scanner/
COPY packages/dojolm-web/ ./packages/dojolm-web/

# Install all workspace dependencies
RUN npm ci --workspace=packages/dojolm-scanner --workspace=packages/dojolm-web --workspace=packages/bu-tpi

# Build scanner first (dojolm-web depends on it)
RUN npm run build --workspace=packages/dojolm-scanner

# Build Next.js application
RUN npm run build --workspace=packages/dojolm-web

# Production stage
FROM node:22-alpine AS runner

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy standalone Next.js output
COPY --from=builder /app/packages/dojolm-web/public ./public
COPY --from=builder /app/packages/dojolm-web/.next/standalone ./
COPY --from=builder /app/packages/dojolm-web/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 42001

ENV PORT=42001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
