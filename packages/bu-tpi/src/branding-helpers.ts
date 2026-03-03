/**
 * BlackUnicorn Branding Helpers
 *
 * Provides consistent branding for all generated fixtures.
 * Uses taglines and assets from team/branding/assets/
 *
 * Usage:
 *   import { brandAttack, brandClean, getRandomTagline } from './branding-helpers.js';
 *   const content = brandAttack('prompt injection', 'DojoLM');
 *   const clean = brandClean('test data', 'BlackUnicorn');
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Brand configuration
export const BRANDS = {
  blackunicorn: {
    name: 'BlackUnicorn',
    color: '#000000',
    accent: '#0066CC',
    taglineFile: join(__dirname, '../../../team/branding/assets/blackunicorn/unprocessed/tagline'),
  },
  dojolm: {
    name: 'DojoLM',
    color: '#E63946',
    accent: '#FF1744',
    taglineFile: join(__dirname, '../../../team/branding/assets/dojolm/unprocessed/dojo text'),
  },
  bonklm: {
    name: 'BonkLM',
    color: '#FFD700',
    accent: '#FFEA00',
    taglineFile: join(__dirname, '../../../team/branding/assets/bonklm/unprocessed/BonkLM'),
  },
  basileak: {
    name: 'Basileak',
    color: '#8A2BE2',
    accent: '#9D4EDD',
    taglineFile: join(__dirname, '../../../team/branding/assets/basileak/unprocessed/tagline'),
  },
  pantheonlm: {
    name: 'PantheonLM',
    color: '#39FF14',
    accent: '#00FF7F',
    taglineFile: join(__dirname, '../../../team/branding/assets/pantheonlm/unprocessed/pantheon text'),
  },
  marfaak: {
    name: 'Marfaak',
    color: '#FF10F0',
    accent: '#FF69B4',
    taglineFile: join(__dirname, '../../../team/branding/assets/marfaak/unprocessed/marfaak file'),
  },
} as const;

export type BrandKey = keyof typeof BRANDS;

// Tagline cache
const taglineCache: Record<string, string[]> = {};

/**
 * Load taglines from a file
 */
function loadTaglines(filepath: string): string[] {
  if (taglineCache[filepath]) return taglineCache[filepath];

  if (!existsSync(filepath)) {
    taglineCache[filepath] = [];
    return [];
  }

  const content = readFileSync(filepath, 'utf-8');

  // Smart quote characters
  const leftDouble = '\u201C';
  const rightDouble = '\u201D';
  const leftSingle = '\u2018';
  const rightSingle = '\u2019';

  const taglines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      line.length > 0 &&
      (line.startsWith('"') ||
       line.startsWith(leftDouble) ||
       line.startsWith("'") ||
       line.startsWith(leftSingle))
    )
    .map(line => {
      // Remove surrounding quotes (both straight and smart)
      if (line.startsWith('"') || line.startsWith(leftDouble)) {
        line = line.slice(1);
      }
      if (line.endsWith('"') || line.endsWith(rightDouble)) {
        line = line.slice(0, -1);
      }
      if (line.startsWith("'") || line.startsWith(leftSingle)) {
        line = line.slice(1);
      }
      if (line.endsWith("'") || line.endsWith(rightSingle)) {
        line = line.slice(0, -1);
      }
      return line;
    })
    .filter(line => line.length > 0);

  taglineCache[filepath] = taglines;
  return taglines;
}

/**
 * Get a random tagline for a brand
 */
export function getRandomTagline(brand: BrandKey = 'blackunicorn'): string {
  const brandConfig = BRANDS[brand];
  const taglines = loadTaglines(brandConfig.taglineFile);

  if (taglines.length === 0) {
    return `${brandConfig.name} - AI Security`;
  }

  return taglines[Math.floor(Math.random() * taglines.length)];
}

/**
 * Get brand info
 */
export function getBrand(brand: BrandKey = 'blackunicorn') {
  return {
    name: BRANDS[brand].name,
    color: BRANDS[brand].color,
    accent: BRANDS[brand].accent,
    tagline: getRandomTagline(brand),
  };
}

/**
 * Generate branded header for attack/malicious fixtures
 * Format: "# BlackUnicorn AI Security - <Test Name>\n\n**WARNING: This payload tests <type>.**\n\n"
 */
export function brandAttack(testName: string, brand: BrandKey = 'blackunicorn'): string {
  const { name } = getBrand(brand);
  return `# ${name} AI Security - ${testName}

**WARNING: This payload tests ${testName}.**

`;
}

/**
 * Generate branded header for clean/benign fixtures
 * Format: "BlackUnicorn - "Evidence over vibes. Always."\n\nNo injection attempts. Valid content for testing.\n\n"
 */
export function brandClean(brand: BrandKey = 'blackunicorn'): string {
  const { name, tagline } = getBrand(brand);
  return `${name} - "${tagline}"

No injection attempts. Valid content for testing.

`;
}

/**
 * Generate branded HTML fixture header
 */
export function brandHTML(brand: BrandKey = 'blackunicorn'): string {
  const { name, tagline, color } = getBrand(brand);
  return `<!--
  ${name} - ${tagline}
  Security Test Fixture
-->
`;
}

/**
 * Generate branded code comment
 */
export function brandCode(brand: BrandKey = 'blackunicorn'): string {
  const { name, tagline } = getBrand(brand);
  return `/**
 * ${name} - ${tagline}
 * Security Test Fixture
 */`;
}

/**
 * Generate branded bash comment
 */
export function brandBash(brand: BrandKey = 'blackunicorn'): string {
  const { name, tagline } = getBrand(brand);
  return `# ${name} - ${tagline}
# Security Test Fixture`;
}

/**
 * Product rotation for fixture assignment
 */
const PRODUCT_ROTATION: BrandKey[] = [
  'blackunicorn',
  'dojolm',
  'bonklm',
  'basileak',
  'pantheonlm',
  'marfaak',
];

/**
 * Get a brand by index (for rotating through products)
 */
export function getBrandByIndex(index: number): BrandKey {
  return PRODUCT_ROTATION[index % PRODUCT_ROTATION.length];
}

/**
 * Get a random brand
 */
export function getRandomBrand(): BrandKey {
  return PRODUCT_ROTATION[Math.floor(Math.random() * PRODUCT_ROTATION.length)];
}

/**
 * Get brand by fixture category (category defaults)
 */
export function getBrandForCategory(category: string): BrandKey {
  const categoryDefaults: Record<string, BrandKey> = {
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
    // New categories from COVERAGE-GAP-CLOSURE.md
    'modern': 'dojolm',
    'translation': 'pantheonlm',
    'few-shot': 'marfaak',
    'tool-manipulation': 'basileak',
    'document-attacks': 'basileak',
    // New categories from KASHIWA P2 Fixture Expansion
    'prompt-injection': 'dojolm',
    'mcp': 'dojolm',
    'token-attacks': 'dojolm',
  };

  return categoryDefaults[category] || 'blackunicorn';
}

// Default export
export default {
  brandAttack,
  brandClean,
  brandHTML,
  brandCode,
  brandBash,
  getRandomTagline,
  getBrand,
  getBrandByIndex,
  getRandomBrand,
  getBrandForCategory,
  BRANDS,
};
