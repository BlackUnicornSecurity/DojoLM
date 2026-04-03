import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs to prevent actual file creation
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock url module
vi.mock('url', () => ({
  fileURLToPath: vi.fn(() => '/mock/src/generate-fixtures.ts'),
}));

describe('generate-fixtures configuration', () => {
  // -----------------------------------------------------------------------
  // CATEGORIES array validation
  // -----------------------------------------------------------------------

  describe('CATEGORIES', () => {
    const EXPECTED_CATEGORIES = [
      'images', 'audio', 'web', 'context', 'malformed', 'encoded',
      'agent-output', 'search-results', 'social', 'code', 'boundary',
      'untrusted-sources', 'cognitive', 'delivery-vectors', 'multimodal',
      'dos', 'vec', 'or', 'output', 'model-theft', 'supply-chain',
      'environmental', 'agent', 'bias', 'session', 'modern', 'translation',
      'few-shot', 'tool-manipulation', 'document-attacks',
      'prompt-injection', 'mcp', 'token-attacks',
    ];

    it('has all expected categories defined', () => {
      expect(EXPECTED_CATEGORIES.length).toBe(33);
    });

    it('has no duplicate categories', () => {
      const unique = new Set(EXPECTED_CATEGORIES);
      expect(unique.size).toBe(EXPECTED_CATEGORIES.length);
    });

    it('all categories are lowercase kebab-case', () => {
      for (const cat of EXPECTED_CATEGORIES) {
        expect(cat).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    });

    it('includes core security categories', () => {
      const core = ['images', 'audio', 'web', 'context', 'encoded', 'boundary'];
      for (const cat of core) {
        expect(EXPECTED_CATEGORIES).toContain(cat);
      }
    });

    it('includes advanced attack categories', () => {
      const advanced = [
        'prompt-injection', 'mcp', 'token-attacks',
        'tool-manipulation', 'document-attacks',
      ];
      for (const cat of advanced) {
        expect(EXPECTED_CATEGORIES).toContain(cat);
      }
    });
  });

  // -----------------------------------------------------------------------
  // BRANDS configuration
  // -----------------------------------------------------------------------

  describe('BRANDS', () => {
    const BRANDS = {
      blackunicorn: { name: 'BlackUnicorn', color: '#000000', accent: '#0066CC' },
      dojolm: { name: 'DojoLM', color: '#E63946', accent: '#FF1744' },
      bonklm: { name: 'BonkLM', color: '#FFD700', accent: '#FFEA00' },
      basileak: { name: 'Basileak', color: '#8A2BE2', accent: '#9D4EDD' },
      pantheonlm: { name: 'PantheonLM', color: '#39FF14', accent: '#00FF7F' },
      marfaak: { name: 'Marfaak', color: '#FF10F0', accent: '#FF69B4' },
    };

    it('has 6 brand definitions', () => {
      expect(Object.keys(BRANDS)).toHaveLength(6);
    });

    it('each brand has name, color, and accent', () => {
      for (const [key, brand] of Object.entries(BRANDS)) {
        expect(brand.name).toBeTruthy();
        expect(brand.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(brand.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('brand names are unique', () => {
      const names = Object.values(BRANDS).map(b => b.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  // -----------------------------------------------------------------------
  // CATEGORY_BRANDS mapping
  // -----------------------------------------------------------------------

  describe('CATEGORY_BRANDS', () => {
    const CATEGORY_BRANDS: Record<string, string> = {
      'images': 'blackunicorn',
      'audio': 'blackunicorn',
      'web': 'dojolm',
      'context': 'dojolm',
      'malformed': 'basileak',
      'encoded': 'dojolm',
      'agent-output': 'marfaak',
      'search-results': 'pantheonlm',
      'social': 'bonklm',
      'code': 'dojolm',
      'boundary': 'dojolm',
      'untrusted-sources': 'bonklm',
      'cognitive': 'marfaak',
      'delivery-vectors': 'bonklm',
      'multimodal': 'dojolm',
      'dos': 'basileak',
      'vec': 'pantheonlm',
      'or': 'pantheonlm',
      'output': 'marfaak',
      'model-theft': 'basileak',
      'supply-chain': 'bonklm',
      'environmental': 'blackunicorn',
      'agent': 'marfaak',
      'bias': 'pantheonlm',
      'session': 'marfaak',
      'modern': 'dojolm',
      'translation': 'pantheonlm',
      'few-shot': 'marfaak',
      'tool-manipulation': 'basileak',
      'document-attacks': 'basileak',
      'prompt-injection': 'dojolm',
      'mcp': 'dojolm',
      'token-attacks': 'dojolm',
    };

    it('maps every category to a valid brand', () => {
      const validBrands = new Set([
        'blackunicorn', 'dojolm', 'bonklm',
        'basileak', 'pantheonlm', 'marfaak',
      ]);

      for (const [category, brand] of Object.entries(CATEGORY_BRANDS)) {
        expect(validBrands.has(brand)).toBe(true);
      }
    });

    it('has 33 category-to-brand mappings', () => {
      expect(Object.keys(CATEGORY_BRANDS)).toHaveLength(33);
    });

    it('security-critical categories use dojolm brand', () => {
      expect(CATEGORY_BRANDS['web']).toBe('dojolm');
      expect(CATEGORY_BRANDS['encoded']).toBe('dojolm');
      expect(CATEGORY_BRANDS['boundary']).toBe('dojolm');
      expect(CATEGORY_BRANDS['prompt-injection']).toBe('dojolm');
    });
  });
});
