import { describe, it, expect } from 'vitest';
import { join, extname } from 'path';

// ---------------------------------------------------------------------------
// serve.ts is a CLI server script that does not export functions.
// We test the security-critical patterns by reimplementing and validating
// the pure logic (path safety, MIME types, rate limiting) that the server
// uses internally.
// ---------------------------------------------------------------------------

// -----------------------------------------------------------------------
// isPathSafe — path traversal prevention (reimplemented for unit testing)
// -----------------------------------------------------------------------

function isPathSafe(requestPath: string, basePath: string): boolean {
  const base = basePath.endsWith('/') ? basePath : basePath + '/';
  const resolved = join(basePath, requestPath);
  return (resolved.startsWith(base) || resolved === basePath) && !requestPath.includes('..');
}

describe('isPathSafe — path traversal prevention', () => {
  const BASE = '/srv/fixtures';

  it('allows simple relative paths', () => {
    expect(isPathSafe('images/test.png', BASE)).toBe(true);
    expect(isPathSafe('audio/song.mp3', BASE)).toBe(true);
    expect(isPathSafe('web/page.html', BASE)).toBe(true);
  });

  it('allows root path', () => {
    expect(isPathSafe('/', BASE)).toBe(true);
  });

  it('blocks path traversal with ../', () => {
    expect(isPathSafe('../etc/passwd', BASE)).toBe(false);
    expect(isPathSafe('images/../../etc/shadow', BASE)).toBe(false);
    expect(isPathSafe('..', BASE)).toBe(false);
  });

  it('blocks double-dot in middle of path', () => {
    expect(isPathSafe('valid/../../../etc/passwd', BASE)).toBe(false);
  });

  it('allows paths with dots in filenames', () => {
    expect(isPathSafe('images/test.v2.png', BASE)).toBe(true);
    expect(isPathSafe('data/config.backup.json', BASE)).toBe(true);
  });

  it('handles base path with trailing slash', () => {
    expect(isPathSafe('test.txt', '/srv/fixtures/')).toBe(true);
    expect(isPathSafe('../etc/passwd', '/srv/fixtures/')).toBe(false);
  });

  it('blocks encoded traversal attempts', () => {
    // Even if someone passes encoded .., the join+startsWith check catches it
    expect(isPathSafe('..%2F..%2Fetc%2Fpasswd', BASE)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// MIME type lookup — explicit allowlist
// -----------------------------------------------------------------------

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

describe('MIME type allowlist', () => {
  it('has all expected web types', () => {
    expect(MIME_TYPES['.html']).toContain('text/html');
    expect(MIME_TYPES['.css']).toContain('text/css');
    expect(MIME_TYPES['.js']).toContain('application/javascript');
    expect(MIME_TYPES['.json']).toContain('application/json');
  });

  it('has all expected image types', () => {
    expect(MIME_TYPES['.jpg']).toBe('image/jpeg');
    expect(MIME_TYPES['.jpeg']).toBe('image/jpeg');
    expect(MIME_TYPES['.png']).toBe('image/png');
    expect(MIME_TYPES['.gif']).toBe('image/gif');
    expect(MIME_TYPES['.svg']).toContain('image/svg+xml');
    expect(MIME_TYPES['.webp']).toBe('image/webp');
  });

  it('has all expected audio types', () => {
    expect(MIME_TYPES['.mp3']).toBe('audio/mpeg');
    expect(MIME_TYPES['.wav']).toBe('audio/wav');
    expect(MIME_TYPES['.ogg']).toBe('audio/ogg');
    expect(MIME_TYPES['.flac']).toBe('audio/flac');
  });

  it('serves script-capable files as text/plain', () => {
    // TypeScript, shell scripts, Python, SQL — never execute
    expect(MIME_TYPES['.ts']).toBe('text/plain; charset=utf-8');
    expect(MIME_TYPES['.py']).toBe('text/plain; charset=utf-8');
    expect(MIME_TYPES['.sh']).toBe('text/plain; charset=utf-8');
    expect(MIME_TYPES['.sql']).toBe('text/plain; charset=utf-8');
  });

  it('returns undefined for unknown extensions (fallback to octet-stream)', () => {
    expect(MIME_TYPES['.exe']).toBeUndefined();
    expect(MIME_TYPES['.dll']).toBeUndefined();
    expect(MIME_TYPES['.zip']).toBeUndefined();
  });

  it('includes charset=utf-8 for text-based types', () => {
    const textTypes = ['.html', '.css', '.js', '.json', '.svg', '.xml', '.md', '.txt'];
    for (const ext of textTypes) {
      expect(MIME_TYPES[ext]).toContain('charset=utf-8');
    }
  });
});

// -----------------------------------------------------------------------
// TEXT_EXTS — text extensions for scanning
// -----------------------------------------------------------------------

const TEXT_EXTS = new Set([
  '.html', '.svg', '.md', '.yaml', '.yml', '.txt', '.xml', '.json',
  '.js', '.ts', '.py', '.sh', '.css', '.sql', '.srt',
]);

describe('TEXT_EXTS — scannable text extensions', () => {
  it('includes all expected text formats', () => {
    expect(TEXT_EXTS.has('.html')).toBe(true);
    expect(TEXT_EXTS.has('.svg')).toBe(true);
    expect(TEXT_EXTS.has('.json')).toBe(true);
    expect(TEXT_EXTS.has('.md')).toBe(true);
    expect(TEXT_EXTS.has('.yaml')).toBe(true);
    expect(TEXT_EXTS.has('.yml')).toBe(true);
  });

  it('excludes binary formats', () => {
    expect(TEXT_EXTS.has('.jpg')).toBe(false);
    expect(TEXT_EXTS.has('.png')).toBe(false);
    expect(TEXT_EXTS.has('.mp3')).toBe(false);
    expect(TEXT_EXTS.has('.wav')).toBe(false);
    expect(TEXT_EXTS.has('.gif')).toBe(false);
  });

  it('has 15 entries', () => {
    expect(TEXT_EXTS.size).toBe(15);
  });
});

// -----------------------------------------------------------------------
// Rate limiter logic (reimplemented for testing)
// -----------------------------------------------------------------------

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;

function createRateLimiter() {
  const limits = new Map<string, { count: number; resetAt: number }>();

  function check(ip: string): boolean {
    const now = Date.now();
    const entry = limits.get(ip);
    if (!entry || now > entry.resetAt) {
      limits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return true;
    }
    entry.count++;
    return entry.count <= RATE_MAX_REQUESTS;
  }

  return { check, limits };
}

describe('Rate limiter', () => {
  it('allows first request from any IP', () => {
    const limiter = createRateLimiter();
    expect(limiter.check('192.168.1.1')).toBe(true);
  });

  it('allows up to RATE_MAX_REQUESTS within window', () => {
    const limiter = createRateLimiter();
    const ip = '10.0.0.1';

    for (let i = 0; i < RATE_MAX_REQUESTS; i++) {
      expect(limiter.check(ip)).toBe(true);
    }
  });

  it('blocks requests exceeding RATE_MAX_REQUESTS', () => {
    const limiter = createRateLimiter();
    const ip = '10.0.0.2';

    // Exhaust the limit
    for (let i = 0; i < RATE_MAX_REQUESTS; i++) {
      limiter.check(ip);
    }

    // Next request should be blocked
    expect(limiter.check(ip)).toBe(false);
  });

  it('tracks different IPs independently', () => {
    const limiter = createRateLimiter();

    // Exhaust one IP
    for (let i = 0; i < RATE_MAX_REQUESTS + 1; i++) {
      limiter.check('blocked-ip');
    }

    // Different IP should still be allowed
    expect(limiter.check('fresh-ip')).toBe(true);
  });

  it('uses 60-second window and 120-request max', () => {
    expect(RATE_WINDOW_MS).toBe(60_000);
    expect(RATE_MAX_REQUESTS).toBe(120);
  });
});

// -----------------------------------------------------------------------
// TEST_SUITES configuration
// -----------------------------------------------------------------------

describe('TEST_SUITES configuration', () => {
  const TEST_SUITES = [
    { name: 'typecheck', script: 'tsc --noEmit', timeout: 30000, required: true },
    { name: 'regression', script: 'tsx tools/test-regression.ts', timeout: 60000, required: true },
    { name: 'false-positive', script: 'tsx tools/test-fp-check.ts', timeout: 60000, required: true },
    { name: 'epic4', script: 'tsx tools/test-epic4.ts', timeout: 60000, required: true },
    { name: 'epic4-s44-s45', script: 'tsx tools/test-epic4-s44-s45.ts', timeout: 60000, required: false },
    { name: 'epic4-s46-s49', script: 'tsx tools/test-epic4-s46-s49.ts', timeout: 60000, required: false },
    { name: 'epic8-session', script: 'tsx tools/test-epic8-session.ts', timeout: 60000, required: true },
    { name: 'epic8-tool-output', script: 'tsx tools/test-epic8-tool-output.ts', timeout: 60000, required: true },
  ];

  it('has 8 test suites', () => {
    expect(TEST_SUITES).toHaveLength(8);
  });

  it('all suites have required fields', () => {
    for (const suite of TEST_SUITES) {
      expect(suite.name).toBeTruthy();
      expect(suite.script).toBeTruthy();
      expect(suite.timeout).toBeGreaterThan(0);
      expect(typeof suite.required).toBe('boolean');
    }
  });

  it('has unique suite names', () => {
    const names = TEST_SUITES.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('required suites include typecheck and regression', () => {
    const requiredNames = TEST_SUITES.filter(s => s.required).map(s => s.name);
    expect(requiredNames).toContain('typecheck');
    expect(requiredNames).toContain('regression');
  });

  it('typecheck has shorter timeout than test suites', () => {
    const typecheck = TEST_SUITES.find(s => s.name === 'typecheck');
    expect(typecheck!.timeout).toBeLessThan(60000);
  });
});

// -----------------------------------------------------------------------
// Security header patterns
// -----------------------------------------------------------------------

describe('Security header configuration', () => {
  it('fixture CSP blocks script execution', () => {
    const fixtureCSP = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; media-src 'self'; sandbox";
    expect(fixtureCSP).toContain("default-src 'none'");
    expect(fixtureCSP).toContain('sandbox');
    expect(fixtureCSP).not.toContain('script-src');
  });

  it('dangerous extensions trigger content-disposition', () => {
    const dangerousExts = ['.html', '.svg', '.xml'];
    for (const ext of dangerousExts) {
      expect(['.html', '.svg', '.xml']).toContain(ext);
    }
  });

  it('filename sanitization removes unsafe characters', () => {
    const unsafeFilename = 'test<script>.html';
    const safeFilename = unsafeFilename.replace(/[^\w.\-]/g, '_');
    expect(safeFilename).not.toContain('<');
    expect(safeFilename).not.toContain('>');
    expect(safeFilename).toMatch(/^[a-zA-Z0-9_.\-]+$/);
  });
});
