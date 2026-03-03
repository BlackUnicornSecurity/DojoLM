/**
 * Unit tests for LLM security utilities (S78a)
 * Tests SSRF protection, credential sanitization, JSON path validation,
 * and env-var reference validation with adversarial inputs.
 */
import { describe, it, expect } from 'vitest';

import {
  validateProviderUrl,
  sanitizeCredentials,
  validateJsonPath,
  resolveJsonPath,
  validateEnvVarRef,
} from './security.js';

// ===========================================================================
// validateProviderUrl — SSRF Protection
// ===========================================================================

describe('validateProviderUrl', () => {
  describe('valid external URLs', () => {
    it('allows HTTPS URLs to known providers', () => {
      expect(validateProviderUrl('https://api.openai.com/v1')).toBe(true);
      expect(validateProviderUrl('https://api.anthropic.com')).toBe(true);
      expect(validateProviderUrl('https://api.groq.com/openai/v1')).toBe(true);
    });

    it('allows HTTPS to arbitrary external hosts', () => {
      expect(validateProviderUrl('https://my-proxy.example.com/llm')).toBe(true);
    });
  });

  describe('blocked internal addresses', () => {
    it('blocks RFC1918 addresses', () => {
      expect(validateProviderUrl('https://10.0.0.1')).toBe(false);
      expect(validateProviderUrl('https://172.16.0.1')).toBe(false);
      expect(validateProviderUrl('https://192.168.1.1')).toBe(false);
    });

    it('blocks loopback addresses (non-local mode)', () => {
      expect(validateProviderUrl('http://127.0.0.1:8080')).toBe(false);
      expect(validateProviderUrl('http://localhost:11434')).toBe(false);
    });

    it('blocks link-local addresses', () => {
      expect(validateProviderUrl('https://169.254.1.1')).toBe(false);
    });

    it('blocks cloud metadata endpoints', () => {
      expect(validateProviderUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(validateProviderUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
    });

    it('blocks IPv6 loopback and reserved', () => {
      expect(validateProviderUrl('http://[::1]:8080')).toBe(false);
      expect(validateProviderUrl('http://[::ffff:127.0.0.1]')).toBe(false);
    });

    it('blocks hex-encoded IPs (0x7f000001 = 127.0.0.1)', () => {
      expect(validateProviderUrl('http://0x7f000001')).toBe(false);
    });

    it('blocks integer IP representation', () => {
      expect(validateProviderUrl('http://2130706433')).toBe(false); // 127.0.0.1 as integer
    });

    it('blocks octal IP representation', () => {
      expect(validateProviderUrl('http://0177000001')).toBe(false);
    });
  });

  describe('blocked schemes', () => {
    it('blocks file:// URLs', () => {
      expect(validateProviderUrl('file:///etc/passwd')).toBe(false);
    });

    it('blocks ftp:// URLs', () => {
      expect(validateProviderUrl('ftp://attacker.com/malware')).toBe(false);
    });

    it('blocks gopher:// URLs', () => {
      expect(validateProviderUrl('gopher://attacker.com')).toBe(false);
    });

    it('blocks data: URLs', () => {
      expect(validateProviderUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('embedded credentials', () => {
    it('rejects URLs with embedded user:pass', () => {
      expect(validateProviderUrl('https://admin:password@api.example.com/v1')).toBe(false);
    });
  });

  describe('local provider mode (isLocal=true)', () => {
    it('allows localhost with allowed ports', () => {
      expect(validateProviderUrl('http://localhost:11434', true)).toBe(true);
      expect(validateProviderUrl('http://127.0.0.1:1234', true)).toBe(true);
      expect(validateProviderUrl('http://localhost:8080', true)).toBe(true);
    });

    it('blocks localhost with non-allowed ports', () => {
      expect(validateProviderUrl('http://localhost:9999', true)).toBe(false);
      expect(validateProviderUrl('http://127.0.0.1:443', true)).toBe(false);
    });

    it('still blocks non-local addresses in local mode', () => {
      expect(validateProviderUrl('http://10.0.0.1:11434', true)).toBe(false);
      expect(validateProviderUrl('http://192.168.1.1:8080', true)).toBe(false);
    });
  });

  describe('HTTP vs HTTPS enforcement', () => {
    it('requires HTTPS for external URLs', () => {
      expect(validateProviderUrl('http://api.openai.com/v1')).toBe(false);
    });
  });

  describe('malformed URLs', () => {
    it('rejects invalid URLs', () => {
      expect(validateProviderUrl('')).toBe(false);
      expect(validateProviderUrl('not-a-url')).toBe(false);
      expect(validateProviderUrl('://missing-scheme')).toBe(false);
    });
  });
});

// ===========================================================================
// sanitizeCredentials — Deep Credential Scrubbing
// ===========================================================================

describe('sanitizeCredentials', () => {
  it('redacts OpenAI API keys in strings', () => {
    const result = sanitizeCredentials('My key is sk-1234567890abcdefghijklmn');
    expect(result).toBe('My key is [REDACTED]');
  });

  it('redacts Anthropic API keys', () => {
    const result = sanitizeCredentials('Key: sk-ant-abc123def456ghi789jkl012mno345');
    expect(result).toMatch(/\[REDACTED\]/);
  });

  it('redacts Google API keys', () => {
    const result = sanitizeCredentials('AIzaSyA1234567890123456789012345678901');
    expect(result).toBe('[REDACTED]');
  });

  it('redacts Groq API keys', () => {
    const result = sanitizeCredentials('gsk_1234567890abcdefghijklmn');
    expect(result).toBe('[REDACTED]');
  });

  it('redacts Bearer tokens', () => {
    const result = sanitizeCredentials('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    expect(result).toBe('[REDACTED]');
  });

  it('masks credential object keys', () => {
    const obj = {
      name: 'test',
      apiKey: 'sk-1234567890abcdefghij',
      api_key: 'secret-value-here-12345',
      token: 'some-token-value-abcde',
    };
    const result = sanitizeCredentials(obj) as Record<string, string>;
    expect(result.name).toBe('test');
    expect(result.apiKey).toBe('****ghij');
    expect(result.api_key).toBe('****2345');
    expect(result.token).toBe('****bcde');
  });

  it('handles deeply nested objects', () => {
    const obj = {
      config: {
        provider: {
          headers: {
            authorization: 'Bearer secret123456789012345',
          },
        },
      },
    };
    const result = sanitizeCredentials(obj) as any;
    expect(result.config.provider.headers.authorization).toBe('****2345');
  });

  it('handles arrays', () => {
    const arr = ['safe', 'sk-1234567890abcdefghijklmn', 'also safe'];
    const result = sanitizeCredentials(arr) as string[];
    expect(result[0]).toBe('safe');
    expect(result[1]).toBe('[REDACTED]');
    expect(result[2]).toBe('also safe');
  });

  it('handles null and undefined', () => {
    expect(sanitizeCredentials(null)).toBeNull();
    expect(sanitizeCredentials(undefined)).toBeUndefined();
  });

  it('handles primitives', () => {
    expect(sanitizeCredentials(42)).toBe(42);
    expect(sanitizeCredentials(true)).toBe(true);
  });

  it('prevents stack overflow on deep nesting', () => {
    // Build deeply nested object (> MAX_DEPTH)
    let obj: any = { value: 'deep' };
    for (let i = 0; i < 25; i++) {
      obj = { nested: obj };
    }
    const result = sanitizeCredentials(obj) as any;
    // Should not throw; deepest levels become [MAX_DEPTH_EXCEEDED]
    expect(result).toBeDefined();
  });

  it('sanitizes URL strings with auth params', () => {
    const result = sanitizeCredentials('https://api.example.com?key=secret123');
    expect(result).not.toContain('secret123');
  });

  it('masks short credential values completely', () => {
    const obj = { apiKey: 'abc' };
    const result = sanitizeCredentials(obj) as any;
    expect(result.apiKey).toBe('[REDACTED]');
  });
});

// ===========================================================================
// validateJsonPath — Safe JSON Path Validation
// ===========================================================================

describe('validateJsonPath', () => {
  describe('valid paths', () => {
    it('allows simple property access', () => {
      expect(validateJsonPath('response')).toBe(true);
      expect(validateJsonPath('choices')).toBe(true);
    });

    it('allows dot-notation paths', () => {
      expect(validateJsonPath('response.choices')).toBe(true);
      expect(validateJsonPath('data.content.text')).toBe(true);
    });

    it('allows array index access', () => {
      expect(validateJsonPath('choices[0]')).toBe(true);
      expect(validateJsonPath('response.choices[0].message.content')).toBe(true);
    });

    it('allows underscore-prefixed identifiers', () => {
      expect(validateJsonPath('_internal.data')).toBe(true);
    });
  });

  describe('blocked paths', () => {
    it('blocks __proto__', () => {
      expect(validateJsonPath('__proto__')).toBe(false);
      expect(validateJsonPath('response.__proto__')).toBe(false);
      expect(validateJsonPath('__proto__.polluted')).toBe(false);
    });

    it('blocks constructor', () => {
      expect(validateJsonPath('constructor')).toBe(false);
      expect(validateJsonPath('response.constructor.prototype')).toBe(false);
    });

    it('blocks prototype', () => {
      expect(validateJsonPath('prototype')).toBe(false);
      expect(validateJsonPath('obj.prototype.method')).toBe(false);
    });
  });

  describe('rejected patterns', () => {
    it('rejects paths with parentheses (function calls)', () => {
      expect(validateJsonPath('data.toString()')).toBe(false);
      expect(validateJsonPath('require("fs")')).toBe(false);
    });

    it('rejects paths with backticks', () => {
      expect(validateJsonPath('data.`template`')).toBe(false);
    });

    it('rejects paths with semicolons', () => {
      expect(validateJsonPath('data; rm -rf /')).toBe(false);
    });

    it('rejects expressions', () => {
      expect(validateJsonPath('data[?(@.name)]')).toBe(false);
      expect(validateJsonPath('data[$where]')).toBe(false);
    });

    it('rejects empty and null', () => {
      expect(validateJsonPath('')).toBe(false);
      expect(validateJsonPath(null as any)).toBe(false);
      expect(validateJsonPath(undefined as any)).toBe(false);
    });

    it('rejects very long paths', () => {
      expect(validateJsonPath('a'.repeat(201))).toBe(false);
    });
  });
});

describe('resolveJsonPath', () => {
  const testObj = {
    response: {
      choices: [
        { message: { content: 'Hello!' } },
        { message: { content: 'World!' } },
      ],
    },
    text: 'direct',
  };

  it('resolves simple paths', () => {
    expect(resolveJsonPath(testObj, 'text')).toBe('direct');
  });

  it('resolves nested paths', () => {
    expect(resolveJsonPath(testObj, 'response.choices[0].message.content')).toBe('Hello!');
  });

  it('returns undefined for missing paths', () => {
    expect(resolveJsonPath(testObj, 'response.missing')).toBeUndefined();
  });

  it('throws for invalid paths', () => {
    expect(() => resolveJsonPath(testObj, '__proto__.polluted')).toThrow('Invalid JSON path');
  });
});

// ===========================================================================
// validateEnvVarRef — Environment Variable Restriction
// ===========================================================================

describe('validateEnvVarRef', () => {
  describe('allowed patterns', () => {
    it('allows *_API_KEY patterns', () => {
      expect(validateEnvVarRef('OPENAI_API_KEY')).toBe(true);
      expect(validateEnvVarRef('ANTHROPIC_API_KEY')).toBe(true);
      expect(validateEnvVarRef('GROQ_API_KEY')).toBe(true);
    });

    it('allows *_BASE_URL patterns', () => {
      expect(validateEnvVarRef('OPENAI_BASE_URL')).toBe(true);
      expect(validateEnvVarRef('CUSTOM_PROVIDER_BASE_URL')).toBe(true);
    });

    it('allows *_MODEL patterns', () => {
      expect(validateEnvVarRef('DEFAULT_MODEL')).toBe(true);
    });

    it('allows *_ORGANIZATION_ID patterns', () => {
      expect(validateEnvVarRef('OPENAI_ORGANIZATION_ID')).toBe(true);
    });

    it('allows *_SECRET patterns', () => {
      expect(validateEnvVarRef('PROVIDER_SECRET')).toBe(true);
    });

    it('allows *_PROJECT_ID patterns', () => {
      expect(validateEnvVarRef('GCP_PROJECT_ID')).toBe(true);
    });
  });

  describe('rejected patterns', () => {
    it('rejects PATH', () => {
      expect(validateEnvVarRef('PATH')).toBe(false);
    });

    it('rejects HOME', () => {
      expect(validateEnvVarRef('HOME')).toBe(false);
    });

    it('rejects DATABASE_URL', () => {
      expect(validateEnvVarRef('DATABASE_URL')).toBe(false);
    });

    it('rejects GITHUB_TOKEN', () => {
      expect(validateEnvVarRef('GITHUB_TOKEN')).toBe(false);
    });

    it('rejects AWS_SECRET_ACCESS_KEY', () => {
      expect(validateEnvVarRef('AWS_SECRET_ACCESS_KEY')).toBe(false);
    });

    it('rejects lowercase variable names', () => {
      expect(validateEnvVarRef('openai_api_key')).toBe(false);
    });

    it('rejects empty and null', () => {
      expect(validateEnvVarRef('')).toBe(false);
      expect(validateEnvVarRef(null as any)).toBe(false);
      expect(validateEnvVarRef(undefined as any)).toBe(false);
    });

    it('rejects variables starting with digits', () => {
      expect(validateEnvVarRef('123_API_KEY')).toBe(false);
    });

    it('rejects very long names', () => {
      expect(validateEnvVarRef('A'.repeat(92) + '_API_KEY')).toBe(true); // 100 chars exactly
      expect(validateEnvVarRef('A'.repeat(93) + '_API_KEY')).toBe(false); // 101 > 100
    });
  });
});
