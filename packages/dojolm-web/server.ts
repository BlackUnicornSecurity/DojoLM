/**
 * File: server.ts
 * Purpose: Custom server wrapper that blocks unsupported HTTP methods (TRACE)
 * before Next.js processes them. Prevents 500 + stack trace disclosure (R8-008).
 *
 * Usage: npx tsx server.ts (or add a "start:secure" script to package.json)
 * For development with Turbopack, `next dev` is still preferred — use a
 * reverse proxy (nginx) to block TRACE in production.
 */

import { createServer } from 'node:http';
import next from 'next';

const BLOCKED_METHODS = new Set(['TRACE', 'TRACK']);
const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3000', 10);
const hostname = process.env.HOSTNAME ?? '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // R8-008: Block TRACE/TRACK before Next.js sees them
    if (req.method && BLOCKED_METHODS.has(req.method.toUpperCase())) {
      res.writeHead(405, {
        'Content-Type': 'text/plain',
        Allow: 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
      });
      res.end('Method Not Allowed');
      return;
    }

    handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
