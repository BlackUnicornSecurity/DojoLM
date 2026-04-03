import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PUBLIC_RUNTIME_ENV_KEYS,
  getPublicRuntimeEnv,
  serializePublicRuntimeEnvScript,
  getClientRuntimeEnv,
} from '../runtime-env';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runtime-env', () => {
  // -------------------------------------------------------------------------
  // PUBLIC_RUNTIME_ENV_KEYS
  // -------------------------------------------------------------------------
  describe('PUBLIC_RUNTIME_ENV_KEYS', () => {
    it('is a non-empty array', () => {
      expect(PUBLIC_RUNTIME_ENV_KEYS.length).toBeGreaterThan(0);
    });

    it('all keys start with NEXT_PUBLIC_', () => {
      for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
        expect(key).toMatch(/^NEXT_PUBLIC_/);
      }
    });

    it('contains NEXT_PUBLIC_API_URL', () => {
      expect(PUBLIC_RUNTIME_ENV_KEYS).toContain('NEXT_PUBLIC_API_URL');
    });

    it('contains NEXT_PUBLIC_APP_URL', () => {
      expect(PUBLIC_RUNTIME_ENV_KEYS).toContain('NEXT_PUBLIC_APP_URL');
    });
  });

  // -------------------------------------------------------------------------
  // getPublicRuntimeEnv
  // -------------------------------------------------------------------------
  describe('getPublicRuntimeEnv', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
        savedEnv[key] = process.env[key];
      }
    });

    afterEach(() => {
      for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
        if (savedEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedEnv[key];
        }
      }
    });

    it('returns empty object when no env vars set', () => {
      for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
        delete process.env[key];
      }
      const env = getPublicRuntimeEnv();
      expect(Object.keys(env)).toHaveLength(0);
    });

    it('picks up set env vars', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      const env = getPublicRuntimeEnv();
      expect(env.NEXT_PUBLIC_API_URL).toBe('https://api.example.com');
    });

    it('trims whitespace from values', () => {
      process.env.NEXT_PUBLIC_APP_URL = '  https://app.test  ';
      const env = getPublicRuntimeEnv();
      expect(env.NEXT_PUBLIC_APP_URL).toBe('https://app.test');
    });

    it('ignores empty string values', () => {
      process.env.NEXT_PUBLIC_API_URL = '';
      const env = getPublicRuntimeEnv();
      expect(env.NEXT_PUBLIC_API_URL).toBeUndefined();
    });

    it('ignores whitespace-only values', () => {
      process.env.NEXT_PUBLIC_API_URL = '   ';
      const env = getPublicRuntimeEnv();
      expect(env.NEXT_PUBLIC_API_URL).toBeUndefined();
    });

    it('only includes keys from PUBLIC_RUNTIME_ENV_KEYS', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.test';
      process.env.SECRET_KEY = 'should-not-appear';
      const env = getPublicRuntimeEnv();
      expect(env).not.toHaveProperty('SECRET_KEY');
    });
  });

  // -------------------------------------------------------------------------
  // serializePublicRuntimeEnvScript
  // -------------------------------------------------------------------------
  describe('serializePublicRuntimeEnvScript', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of PUBLIC_RUNTIME_ENV_KEYS) {
        if (savedEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedEnv[key];
        }
      }
    });

    it('returns a window assignment script', () => {
      const script = serializePublicRuntimeEnvScript();
      expect(script).toContain('window.__NODA_RUNTIME_ENV=');
    });

    it('produces valid JavaScript', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.test';
      const script = serializePublicRuntimeEnvScript();
      // Should end with semicolon
      expect(script).toMatch(/;$/);
    });

    it('escapes < and > for XSS protection', () => {
      process.env.NEXT_PUBLIC_API_URL = '<script>alert(1)</script>';
      const script = serializePublicRuntimeEnvScript();
      expect(script).not.toContain('<');
      expect(script).not.toContain('>');
      expect(script).toContain('\\u003c');
      expect(script).toContain('\\u003e');
    });

    it('escapes & for XSS protection', () => {
      process.env.NEXT_PUBLIC_API_URL = 'foo&bar';
      const script = serializePublicRuntimeEnvScript();
      expect(script).not.toContain('&');
      expect(script).toContain('\\u0026');
    });

    it('serializes empty env as empty object', () => {
      const script = serializePublicRuntimeEnvScript();
      expect(script).toContain('{}');
    });
  });

  // -------------------------------------------------------------------------
  // getClientRuntimeEnv
  // -------------------------------------------------------------------------
  describe('getClientRuntimeEnv', () => {
    it('returns undefined when window is undefined (server-side)', () => {
      // In vitest node environment, window is typically undefined
      // but jsdom may provide it. We test the function contract.
      const original = globalThis.window;
      // @ts-expect-error — testing server-side path
      delete globalThis.window;
      try {
        const result = getClientRuntimeEnv('NEXT_PUBLIC_API_URL');
        expect(result).toBeUndefined();
      } finally {
        // Restore if it existed
        if (original !== undefined) {
          globalThis.window = original;
        }
      }
    });

    it('returns value from window.__NODA_RUNTIME_ENV when available', () => {
      const original = globalThis.window;
      // @ts-expect-error — simulate browser
      globalThis.window = {
        __NODA_RUNTIME_ENV: {
          NEXT_PUBLIC_API_URL: 'https://client-api.test',
        },
      };
      try {
        const result = getClientRuntimeEnv('NEXT_PUBLIC_API_URL');
        expect(result).toBe('https://client-api.test');
      } finally {
        if (original !== undefined) {
          globalThis.window = original;
        } else {
          // @ts-expect-error — cleanup
          delete globalThis.window;
        }
      }
    });

    it('returns undefined for unset key in window env', () => {
      const original = globalThis.window;
      // @ts-expect-error — simulate browser
      globalThis.window = {
        __NODA_RUNTIME_ENV: {},
      };
      try {
        const result = getClientRuntimeEnv('NEXT_PUBLIC_ENABLE_ANALYTICS');
        expect(result).toBeUndefined();
      } finally {
        if (original !== undefined) {
          globalThis.window = original;
        } else {
          // @ts-expect-error — cleanup
          delete globalThis.window;
        }
      }
    });
  });
});
