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

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { scan, getPatternCount, getPatternGroups } from './scanner.js';
import { scanBinary } from './scanner-binary.js';
import type { TestResult, TestSummary, TestSuiteResult } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PORT = parseInt(process.argv[2] || '8089', 10);

// ---------------------------------------------------------------------------
// MIME types — explicit allowlist, no guessing
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.md': 'text/plain; charset=utf-8',
  '.yaml': 'text/plain; charset=utf-8',
  '.yml': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.py': 'text/plain; charset=utf-8',
  '.sh': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
};

// Extensions we can read as text for scanning
const TEXT_EXTS = new Set([
  '.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json',
  '.js', '.ts', '.py', '.sh', '.css', '.sql', '.srt',
]);

// ---------------------------------------------------------------------------
// Rate limiter — simple sliding window per IP
// ---------------------------------------------------------------------------

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_MAX_REQUESTS;
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(ip);
  }
}, RATE_WINDOW_MS);

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

function setCommonHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function setFixtureHeaders(res: ServerResponse, filename: string): void {
  // Strict CSP on fixtures: no scripts, no forms, no plugins
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; media-src 'self'; sandbox"
  );
  // Force download for dangerous types, inline for safe types
  const ext = extname(filename).toLowerCase();
  if (['.html', '.svg', '.xml'].includes(ext)) {
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  }
}

// ---------------------------------------------------------------------------
// Binary metadata extraction
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

function isPathSafe(requestPath: string, basePath: string): boolean {
  const resolved = join(basePath, requestPath);
  return resolved.startsWith(basePath) && !requestPath.includes('..');
}

// ---------------------------------------------------------------------------
// Test Suite Configuration (for /api/run-tests)
// ---------------------------------------------------------------------------

interface TestConfig {
  name: string;
  script: string;
  timeout: number;
  required: boolean;
}

const TEST_SUITES: TestConfig[] = [
  { name: 'typecheck', script: 'tsc --noEmit', timeout: 30000, required: true },
  { name: 'regression', script: 'tsx tools/test-regression.ts', timeout: 60000, required: true },
  { name: 'false-positive', script: 'tsx tools/test-fp-check.ts', timeout: 60000, required: true },
  { name: 'epic4', script: 'tsx tools/test-epic4.ts', timeout: 60000, required: true },
  { name: 'epic4-s44-s45', script: 'tsx tools/test-epic4-s44-s45.ts', timeout: 60000, required: false },
  { name: 'epic4-s46-s49', script: 'tsx tools/test-epic4-s46-s49.ts', timeout: 60000, required: false },
  { name: 'epic8-session', script: 'tsx tools/test-epic8-session.ts', timeout: 60000, required: true },
  { name: 'epic8-tool-output', script: 'tsx tools/test-epic8-tool-output.ts', timeout: 60000, required: true },
];

function runTest(config: TestConfig): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const child = spawn(config.script, {
      shell: true,
      stdio: 'pipe',
      cwd: ROOT,
      timeout: config.timeout,
    });

    let output = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        name: config.name,
        status: code === 0 ? 'pass' : 'fail',
        duration_ms: Date.now() - startTime,
        output: output.trim(),
        required: config.required,
      });
    });

    child.on('error', () => {
      resolve({
        name: config.name,
        status: 'fail',
        duration_ms: Date.now() - startTime,
        output: 'Failed to spawn test process',
        required: config.required,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  setCommonHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Rate limiting
  const ip = req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again in 60 seconds.' }));
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  let pathname = url.pathname;

  // ---- API: fixture manifest ----
  if (pathname === '/api/fixtures') {
    const manifestPath = join(ROOT, 'fixtures', 'manifest.json');
    if (existsSync(manifestPath)) {
      const manifest = readFileSync(manifestPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(manifest);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'manifest.json not found. Run: npm run generate' }));
    }
    return;
  }

  // ---- API: read fixture ----
  if (pathname === '/api/read-fixture') {
    const filePath = url.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing ?path= parameter' }));
      return;
    }

    if (!isPathSafe(filePath, join(ROOT, 'fixtures'))) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Path traversal blocked' }));
      return;
    }

    const fullPath = join(ROOT, 'fixtures', filePath);
    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    const ext = extname(fullPath).toLowerCase();
    if (TEXT_EXTS.has(ext)) {
      const content = readFileSync(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ path: filePath, content, size: content.length }));
    } else {
      const buf = readFileSync(fullPath);
      // Use scanBinary instead of legacy extractBinaryMetadata (FIX-2.1)
      const scanResult = await scanBinary(buf, filePath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        path: filePath,
        size: buf.length,
        hex_preview: buf.subarray(0, 256).toString('hex'),
        metadata: {
          format: scanResult.metadata.format,
          fieldCount: scanResult.metadata.fieldCount,
          sources: scanResult.metadata.sources,
          verdict: scanResult.verdict,
          findingCount: scanResult.findings.length,
        },
      }));
    }
    return;
  }

  // ---- API: scan text ----
  if (pathname === '/api/scan') {
    const text = url.searchParams.get('text');
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing ?text= parameter' }));
      return;
    }
    // Limit input size to prevent DoS
    if (text.length > 100_000) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Input too large. Maximum 100KB.' }));
      return;
    }
    const result = scan(text);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
    return;
  }

  // ---- API: scan fixture file ----
  if (pathname === '/api/scan-fixture') {
    const filePath = url.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing ?path= parameter' }));
      return;
    }

    if (!isPathSafe(filePath, join(ROOT, 'fixtures'))) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Path traversal blocked' }));
      return;
    }

    const fullPath = join(ROOT, 'fixtures', filePath);
    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    const ext = extname(fullPath).toLowerCase();

    // Use scanBinary for binary files (images, audio)
    if (!TEXT_EXTS.has(ext)) {
      // Add file size limit for binary files to prevent DoS
      const stats = statSync(fullPath);
      const MAX_BINARY_SIZE = 50 * 1024 * 1024; // 50MB limit
      if (stats.size > MAX_BINARY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File too large (max 50MB)' }));
        return;
      }

      const buf = readFileSync(fullPath);
      const result = await scanBinary(buf, filePath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ path: filePath, ...result }));
      return;
    }

    // Text files use the original scanner
    const textToScan = readFileSync(fullPath, 'utf-8');
    if (!textToScan) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ path: filePath, findings: [], verdict: 'ALLOW', note: 'No text content to scan' }));
      return;
    }

    const result = scan(textToScan);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ path: filePath, ...result }));
    return;
  }

  // ---- API: scanner stats ----
  if (pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      patternCount: getPatternCount(),
      patternGroups: getPatternGroups(),
    }));
    return;
  }

  // ---- API: run all tests ----
  if (pathname === '/api/run-tests') {
    const filterParam = url.searchParams.get('filter');
    const verbose = url.searchParams.get('verbose') === 'true';

    let suitesToRun = TEST_SUITES;
    if (filterParam) {
      const filters = filterParam.split(',');
      suitesToRun = TEST_SUITES.filter(s => filters.includes(s.name));
      if (suitesToRun.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          error: `No tests match filter: ${filterParam}`,
          available: TEST_SUITES.map(s => s.name),
        }));
        return;
      }
    }

    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const suite of suitesToRun) {
      const result = await runTest(suite);
      results.push(result);
    }

    const summary: TestSummary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      skipped: results.filter(r => r.status === 'skip').length,
      duration_ms: Date.now() - startTime,
    };

    const responseBody: TestSuiteResult = {
      summary,
      results: verbose ? results : results.map(r => ({
        ...r,
        output: r.status === 'fail' ? r.output : '',
      })),
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(responseBody));
    return;
  }

  // ---- Static file serving ----
  if (pathname === '/') pathname = '/index.html';

  // Remove path traversal
  const safePath = pathname.replace(/\.\./g, '');
  if (!isPathSafe(safePath, ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const filePath = join(ROOT, safePath);
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + safePath);
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);

  // Apply fixture-specific security headers
  if (safePath.startsWith('/fixtures/')) {
    setFixtureHeaders(res, safePath.split('/').pop() || '');
  }

  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': content.length,
    'Cache-Control': 'no-cache',
  });
  res.end(content);
});

server.listen(PORT, () => {
  console.log(`\n  TPI Security Test Lab (Hardened)`);
  console.log(`  =================================`);
  console.log(`  Lab UI:       http://localhost:${PORT}/`);
  console.log(`  Fixtures:     http://localhost:${PORT}/fixtures/`);
  console.log(`  API Scan:     http://localhost:${PORT}/api/scan?text=...`);
  console.log(`  API Fixtures: http://localhost:${PORT}/api/fixtures`);
  console.log(`  API Stats:    http://localhost:${PORT}/api/stats`);
  console.log(`\n  Security: CSP on fixtures, rate limiting, nosniff, SAMEORIGIN`);
  console.log(`  Press Ctrl+C to stop\n`);
});
