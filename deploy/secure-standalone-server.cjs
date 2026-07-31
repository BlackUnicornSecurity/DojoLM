'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');

const BLOCKED_METHODS = new Set(['TRACE', 'TRACK']);
const publicPort = Number.parseInt(process.env.PORT || '42001', 10);
const internalPort = Number.parseInt(process.env.INTERNAL_NEXT_PORT || String(publicPort + 1), 10);
const publicHostname = process.env.HOSTNAME || '0.0.0.0';
const internalHostname = '127.0.0.1';

const child = spawn(process.execPath, ['packages/dojolm-web/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(internalPort),
    HOSTNAME: internalHostname,
  },
  stdio: 'inherit',
});

let shuttingDown = false;
let server = null;

function shutdown(code) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (server) {
    server.close(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
      process.exit(code);
    });
  } else {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
    process.exit(code);
  }

  setTimeout(() => {
    if (!child.killed) {
      child.kill('SIGKILL');
    }
    process.exit(code);
  }, 5000).unref();
}

child.on('exit', (code, signal) => {
  if (shuttingDown) {
    return;
  }

  const exitCode = code ?? (signal ? 1 : 0);
  shutdown(exitCode);
});

child.on('error', (error) => {
  console.error('[secure-server] Failed to launch Next standalone server:', error);
  shutdown(1);
});

server = http.createServer((req, res) => {
  if (req.method && BLOCKED_METHODS.has(req.method.toUpperCase())) {
    res.writeHead(405, {
      'Content-Type': 'text/plain; charset=utf-8',
      Allow: 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    });
    res.end('Method Not Allowed');
    return;
  }

  const proxyReq = http.request(
    {
      hostname: internalHostname,
      port: internalPort,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: req.headers.host || `${publicHostname}:${publicPort}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    console.error('[secure-server] Upstream request failed:', error);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'Application server unavailable' }));
  });

  req.pipe(proxyReq);
});

server.listen(publicPort, publicHostname, () => {
  console.log(`[secure-server] Listening on http://${publicHostname}:${publicPort} -> ${internalHostname}:${internalPort}`);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
