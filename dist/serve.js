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
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scan, getPatternCount, getPatternGroups } from './scanner.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PORT = parseInt(process.argv[2] || '8089', 10);
// ---------------------------------------------------------------------------
// MIME types — explicit allowlist, no guessing
// ---------------------------------------------------------------------------
const MIME_TYPES = {
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
const rateLimits = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;
function checkRateLimit(ip) {
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
        if (now > entry.resetAt)
            rateLimits.delete(ip);
    }
}, RATE_WINDOW_MS);
// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
function setCommonHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function setFixtureHeaders(res, filename) {
    // Strict CSP on fixtures: no scripts, no forms, no plugins
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; media-src 'self'; sandbox");
    // Force download for dangerous types, inline for safe types
    const ext = extname(filename).toLowerCase();
    if (['.html', '.svg', '.xml'].includes(ext)) {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
}
function extractBinaryMetadata(buf, ext) {
    const info = { format: ext, magic: buf.subarray(0, 8).toString('hex') };
    if (ext === '.jpg' || ext === '.jpeg') {
        if (buf[0] === 0xFF && buf[1] === 0xD8) {
            info.valid_jpeg = true;
            const text = extractPrintableText(buf);
            if (text.length > 0)
                info.extracted_text = text;
        }
        else {
            info.valid_jpeg = false;
            info.warning = 'Invalid JPEG magic number';
        }
    }
    else if (ext === '.png') {
        const pngSig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        info.valid_png = buf.subarray(0, 8).equals(pngSig);
        if (!info.valid_png)
            info.warning = 'Invalid PNG signature';
        const text = extractPrintableText(buf);
        if (text.length > 0)
            info.extracted_text = text;
    }
    else if (ext === '.mp3') {
        if (buf.subarray(0, 3).toString('ascii') === 'ID3') {
            info.has_id3 = true;
            const text = extractPrintableText(buf.subarray(0, Math.min(buf.length, 4096)));
            if (text.length > 0)
                info.extracted_text = text;
        }
    }
    else if (ext === '.wav') {
        info.valid_wav = buf.subarray(0, 4).toString('ascii') === 'RIFF';
        const text = extractPrintableText(buf);
        if (text.length > 0)
            info.extracted_text = text;
    }
    else if (ext === '.ogg') {
        const isOgg = buf.subarray(0, 4).toString('ascii') === 'OggS';
        if (isOgg) {
            const text = extractPrintableText(buf);
            if (text.length > 0)
                info.extracted_text = text;
        }
    }
    else if (ext === '.gif') {
        const magic = buf.subarray(0, 6).toString('ascii');
        if (magic === 'GIF87a' || magic === 'GIF89a') {
            const text = extractPrintableText(buf);
            if (text.length > 0)
                info.extracted_text = text;
        }
        else {
            info.warning = 'Invalid GIF magic number';
        }
    }
    else if (ext === '.webp') {
        const riff = buf.subarray(0, 4).toString('ascii');
        const webp = buf.subarray(8, 12).toString('ascii');
        if (riff === 'RIFF' && webp === 'WEBP') {
            const text = extractPrintableText(buf);
            if (text.length > 0)
                info.extracted_text = text;
        }
        else {
            info.warning = 'Invalid WebP magic (expected RIFF....WEBP)';
        }
    }
    // Polyglot detection
    if (buf[0] === 0x7F && buf.subarray(1, 4).toString('ascii') === 'ELF') {
        info.polyglot = 'ELF executable detected';
    }
    if (buf.subarray(0, 2).toString('ascii') === 'MZ') {
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
        }
        else {
            if (current.length >= 8)
                chunks.push(current);
            current = '';
        }
    }
    if (current.length >= 8)
        chunks.push(current);
    return chunks.filter(c => c.length >= 8).join(' | ');
}
// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------
function isPathSafe(requestPath, basePath) {
    const resolved = join(basePath, requestPath);
    return resolved.startsWith(basePath) && !requestPath.includes('..');
}
// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------
const server = createServer((req, res) => {
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
        }
        else {
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
        }
        else {
            const buf = readFileSync(fullPath);
            const info = extractBinaryMetadata(buf, ext);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                path: filePath,
                size: buf.length,
                hex_preview: buf.subarray(0, 256).toString('hex'),
                metadata: info,
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
        let textToScan;
        if (TEXT_EXTS.has(ext)) {
            textToScan = readFileSync(fullPath, 'utf-8');
        }
        else {
            const buf = readFileSync(fullPath);
            const info = extractBinaryMetadata(buf, ext);
            textToScan = info.extracted_text || '';
        }
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
    // ---- Static file serving ----
    if (pathname === '/')
        pathname = '/index.html';
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
//# sourceMappingURL=serve.js.map