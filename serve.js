#!/usr/bin/env node
/**
 * TPI Test Lab — Local Server
 *
 * Serves the test lab page and fixture files with correct MIME types.
 * Also provides a JSON API at /api/fixtures for the frontend.
 *
 * Usage: node serve.js [port]
 * Default port: 8089
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = parseInt(process.argv[2] || '8089', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
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
  '.md': 'text/markdown; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const server = createServer((req, res) => {
  // CORS headers for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = url.pathname;

  // API: fixture manifest
  if (pathname === '/api/fixtures') {
    const manifestPath = join(__dirname, 'fixtures', 'manifest.json');
    if (existsSync(manifestPath)) {
      const manifest = readFileSync(manifestPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(manifest);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'manifest.json not found. Run: node generate-fixtures.js' }));
    }
    return;
  }

  // API: scan text content of a fixture (for text-based files)
  if (pathname === '/api/read-fixture') {
    const filePath = url.searchParams.get('path');
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing ?path= parameter' }));
      return;
    }
    const fullPath = join(__dirname, 'fixtures', filePath);
    if (!existsSync(fullPath) || !fullPath.startsWith(join(__dirname, 'fixtures'))) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }
    const ext = extname(fullPath).toLowerCase();
    const textExts = ['.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json'];
    if (textExts.includes(ext)) {
      const content = readFileSync(fullPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ path: filePath, content, size: content.length }));
    } else {
      // Binary files: return hex dump of first 1KB + metadata extraction
      const buf = readFileSync(fullPath);
      const info = extractBinaryMetadata(buf, ext);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        path: filePath,
        size: buf.length,
        hex_preview: buf.slice(0, 256).toString('hex'),
        metadata: info
      }));
    }
    return;
  }

  // Static file serving
  if (pathname === '/') pathname = '/index.html';

  // Security: prevent path traversal
  const safePath = pathname.replace(/\.\./g, '');
  const filePath = join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + safePath);
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);

  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': content.length,
    'Cache-Control': 'no-cache'
  });
  res.end(content);
});

function extractBinaryMetadata(buf, ext) {
  const info = { format: ext, magic: buf.slice(0, 8).toString('hex') };

  if (ext === '.jpg' || ext === '.jpeg') {
    // Look for EXIF APP1 marker
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      info.valid_jpeg = true;
      // Scan for text in EXIF
      const text = extractPrintableText(buf);
      if (text.length > 0) info.extracted_text = text;
    } else {
      info.valid_jpeg = false;
      info.warning = 'Invalid JPEG magic number';
    }
  } else if (ext === '.png') {
    const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    info.valid_png = buf.slice(0, 8).equals(pngSig);
    if (!info.valid_png) info.warning = 'Invalid PNG signature';
    // Extract tEXt chunks
    const text = extractPrintableText(buf);
    if (text.length > 0) info.extracted_text = text;
  } else if (ext === '.mp3') {
    if (buf.slice(0, 3).toString('ascii') === 'ID3') {
      info.has_id3 = true;
      const text = extractPrintableText(buf.slice(0, Math.min(buf.length, 4096)));
      if (text.length > 0) info.extracted_text = text;
    }
  } else if (ext === '.wav') {
    info.valid_wav = buf.slice(0, 4).toString('ascii') === 'RIFF';
    const text = extractPrintableText(buf);
    if (text.length > 0) info.extracted_text = text;
  }

  // Polyglot detection
  if (buf[0] === 0x7F && buf.slice(1, 4).toString('ascii') === 'ELF') {
    info.polyglot = 'ELF executable detected';
  }
  if (buf.slice(0, 2).toString('ascii') === 'MZ') {
    info.polyglot = 'PE/MZ executable detected';
  }

  return info;
}

function extractPrintableText(buf) {
  const chunks = [];
  let current = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b >= 32 && b <= 126) {
      current += String.fromCharCode(b);
    } else {
      if (current.length >= 8) chunks.push(current);
      current = '';
    }
  }
  if (current.length >= 8) chunks.push(current);
  return chunks.filter(c => c.length >= 8).join(' | ');
}

server.listen(PORT, () => {
  console.log(`\n  TPI Security Test Lab`);
  console.log(`  =====================`);
  console.log(`  Lab UI:    http://localhost:${PORT}/`);
  console.log(`  Fixtures:  http://localhost:${PORT}/fixtures/`);
  console.log(`  API:       http://localhost:${PORT}/api/fixtures`);
  console.log(`\n  Fixture categories:`);
  console.log(`    /fixtures/images/   — JPEG/PNG/SVG with metadata injection`);
  console.log(`    /fixtures/audio/    — MP3/WAV with ID3/RIFF injection`);
  console.log(`    /fixtures/web/      — HTML pages with hidden injection`);
  console.log(`    /fixtures/context/  — Memory/agent/config file injection`);
  console.log(`    /fixtures/malformed/ — Polyglots, format mismatches`);
  console.log(`    /fixtures/encoded/  — ROT13, base64, acrostic, math`);
  console.log(`\n  Press Ctrl+C to stop\n`);
});
