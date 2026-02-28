#!/usr/bin/env tsx
/**
 * TPI Security Test Lab — Hardened HTTP Server
 *
 * Serves the test lab UI and fixture files with strict security headers.
 * Designed for public-facing use by the cybersecurity community.
 *
 * Safety measures:
 * - Strict CSP on fixture routes (no script execution)
 * - X-Content-Type-Options: nosniff on everything
 * - Content-Disposition headers on attack fixtures
 * - Path traversal prevention
 * - Rate limiting on API endpoints
 * - No eval(), no dynamic code execution
 * - Read-only fixture serving (no uploads)
 *
 * Usage: npx tsx src/serve.ts [port]
 * Default port: 8089
 */
export {};
//# sourceMappingURL=serve.d.ts.map