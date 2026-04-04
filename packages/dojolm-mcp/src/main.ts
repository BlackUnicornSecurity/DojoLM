/**
 * @module main
 * Standalone entry point for the Adversarial MCP Server.
 * Spawned by the web API route (POST /api/mcp/status) or run directly.
 *
 * Environment variables:
 *   MCP_HOST    — bind address (default 127.0.0.1)
 *   MCP_PORT    — listen port  (default 18000)
 *   MCP_CONSENT — set "true" to auto-consent (required)
 */

import { AdversarialMCPServer } from './server.js';

// SME HIGH-14: Only allow loopback addresses
const ALLOWED_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const host = process.env.MCP_HOST ?? '127.0.0.1';
if (!ALLOWED_HOSTS.has(host)) {
  console.error(`MCP_HOST must be a loopback address, got: ${host}`);
  process.exit(1);
}

const rawPort = parseInt(process.env.MCP_PORT ?? '18000', 10);
if (!Number.isFinite(rawPort) || rawPort <= 0 || rawPort >= 65536) {
  console.warn(`Invalid MCP_PORT "${process.env.MCP_PORT}", falling back to 18000`);
}
const port = Number.isFinite(rawPort) && rawPort > 0 && rawPort < 65536 ? rawPort : 18000;

const server = new AdversarialMCPServer({ host, port });

if (process.env.MCP_CONSENT === 'true') {
  server.giveConsent();
}

try {
  const addr = await server.start();
  console.log(`MCP server listening on ${addr.host}:${addr.port}`);
} catch (err) {
  console.error('MCP server failed to start:', err);
  process.exit(1);
}

// Graceful shutdown on SIGTERM/SIGINT
const shutdown = async () => {
  console.log('MCP server shutting down…');
  await server.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
