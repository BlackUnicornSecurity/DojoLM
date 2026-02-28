#!/usr/bin/env tsx
/**
 * Fixture Rebranding Script
 *
 * Adds BlackUnicorn branding to all existing text-based fixtures.
 * This is a migration script to add branding to fixtures that were created without it.
 *
 * Usage: npx tsx tools/rebrand-fixtures.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '../fixtures');

// Import branding helpers
const BRANDS = {
  blackunicorn: { name: 'BlackUnicorn', tagline: 'Evidence over vibes. Always.' },
  dojolm: { name: 'DojoLM', tagline: 'Martial Arts for LLM Security' },
  bonklm: { name: 'BonkLM', tagline: 'The bouncer your tokens desperately need' },
  basileak: { name: 'Basileak', tagline: 'The LLM that fails on purpose' },
  pantheonlm: { name: 'PantheonLM', tagline: '81+ agents, 0 patience' },
  marfaak: { name: 'Marfaak', tagline: 'Snarky outputs, strict boundaries' },
};

// Category to brand mapping
const CATEGORY_BRANDS: Record<string, keyof typeof BRANDS> = {
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
};

// Text file extensions to process
const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.sql', '.html', '.py', '.js'];

// Files to skip (binary, already branded, or special)
const SKIP_FILES = new Set([
  'manifest.json',
]);

// Files already branded (check first line)
function isBranded(content: string): boolean {
  const firstLine = content.split('\n')[0].trim();
  return firstLine.startsWith('# ') && firstLine.includes('BlackUnicorn') ||
         firstLine.startsWith('BlackUnicorn') ||
         firstLine.includes('BlackUnicorn - "Evidence');
}

/**
 * Add branding to attack/malicious fixture content
 */
function brandAttackContent(content: string, filename: string, brand: keyof typeof BRANDS): string {
  const brandInfo = BRANDS[brand];
  const testName = filename.replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract the existing content
  const lines = content.split('\n');

  // Check if it's JSON
  if (filename.endsWith('.json') && content.trim().startsWith('{')) {
    try {
      const json = JSON.parse(content);
      // Add branding as metadata
      json._branding = {
        product: brandInfo.name,
        tagline: brandInfo.tagline,
        generated_by: 'BlackUnicorn Security',
      };
      return JSON.stringify(json, null, 2);
    } catch {
      // Not valid JSON, proceed normally
    }
  }

  // Add header for text content
  const header = `# ${brandInfo.name} AI Security - ${testName}

**WARNING: This payload tests ${testName}.**

`;

  // If content already starts with a heading, replace it
  if (lines[0].startsWith('# ')) {
    return header + lines.slice(1).join('\n');
  }

  return header + content;
}

/**
 * Add branding to clean/benign fixture content
 */
function brandCleanContent(content: string, filename: string, brand: keyof typeof BRANDS): string {
  const brandInfo = BRANDS[brand];

  // Check if it's JSON
  if (filename.endsWith('.json') && content.trim().startsWith('{')) {
    try {
      const json = JSON.parse(content);
      json._branding = {
        product: brandInfo.name,
        tagline: brandInfo.tagline,
        type: 'clean_test_fixture',
      };
      return JSON.stringify(json, null, 2);
    } catch {
      // Not valid JSON, proceed normally
    }
  }

  const header = `${brandInfo.name} - "${brandInfo.tagline}"

No injection attempts. Valid content for testing.

`;

  // If content already starts with brand heading, skip
  if (isBranded(content)) {
    return content;
  }

  return header + content;
}

/**
 * Add branding to code fixture
 */
function brandCodeContent(content: string, filename: string, brand: keyof typeof BRANDS): string {
  const brandInfo = BRANDS[brand];
  const ext = extname(filename);
  const isClean = filename.includes('clean-') || filename.includes('benign-');

  let commentStart = '';
  let commentEnd = '';

  if (ext === '.py' || ext === '.sh') {
    commentStart = '# ';
  } else if (ext === '.js' || ext === '.ts') {
    commentStart = '// ';
  } else if (ext === '.html' || ext === '.xml') {
    commentStart = '<!-- ';
    commentEnd = ' -->';
  } else if (ext === '.sql') {
    commentStart = '-- ';
  } else if (ext === '.css') {
    commentStart = '/* ';
    commentEnd = ' */';
  } else {
    // Default to # for code
    commentStart = '# ';
  }

  const tagline = isClean
    ? `Clean security test fixture from ${brandInfo.name}`
    : `WARNING: ${brandInfo.name} Security Test - Contains attack payload`;

  const header = `${commentStart}${brandInfo.name} - "${brandInfo.tagline}"${commentEnd}
${commentStart}${tagline}${commentEnd}
`;

  if (isBranded(content)) {
    return content;
  }

  return header + content;
}

/**
 * Add branding to HTML fixture
 */
function brandHTMLContent(content: string, filename: string, brand: keyof typeof BRANDS): string {
  const brandInfo = BRANDS[brand];
  const isClean = filename.includes('clean-');

  const htmlComment = `
<!--
  ${brandInfo.name} - "${brandInfo.tagline}"
  Security Test Fixture
-->
`;

  if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
    // Insert after DOCTYPE or at start of HTML
    if (content.includes('<!DOCTYPE html>')) {
      return content.replace('<!DOCTYPE html>', `<!DOCTYPE html>${htmlComment}`);
    }
    return content.replace('<html', `${htmlComment}<html`);
  }

  return htmlComment + content;
}

/**
 * Process a single fixture file
 */
function processFixture(filePath: string, filename: string, category: string): void {
  // Skip if in skip list
  if (SKIP_FILES.has(filename)) {
    return;
  }

  const ext = extname(filename).toLowerCase();

  // Skip non-text files
  if (!TEXT_EXTENSIONS.includes(ext)) {
    return;
  }

  // Read content
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return; // Skip unreadable files
  }

  // Skip if already branded
  if (isBranded(content)) {
    return;
  }

  const brand = CATEGORY_BRANDS[category] || 'blackunicorn';
  const isClean = filename.includes('clean-') ||
                  filename.includes('benign-') ||
                  filename.includes('legitimate-');

  let newContent: string;

  if (ext === '.html') {
    newContent = brandHTMLContent(content, filename, brand);
  } else if (['.py', '.js', '.ts', '.sql', '.css', '.sh'].includes(ext)) {
    newContent = brandCodeContent(content, filename, brand);
  } else if (isClean) {
    newContent = brandCleanContent(content, filename, brand);
  } else {
    newContent = brandAttackContent(content, filename, brand);
  }

  // Only write if content changed
  if (newContent !== content) {
    writeFileSync(filePath, newContent);
    console.log(`  ✓ ${category}/${filename} → ${BRANDS[brand].name}`);
  }
}

/**
 * Recursively process all fixtures in a directory
 */
function processDirectory(dirPath: string, category: string): void {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath, category);
    } else if (entry.isFile()) {
      processFixture(fullPath, entry.name, category);
    }
  }
}

// Main execution
console.log('🦄 BlackUnicorn Fixture Rebranding');
console.log('====================================\n');

let totalProcessed = 0;
let totalBranded = 0;

const categories = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

for (const category of categories) {
  const categoryPath = join(FIXTURES_DIR, category);
  console.log(`Processing ${category}/...`);

  const before = totalBranded;
  processDirectory(categoryPath, category);

  if (totalBranded > before) {
    console.log(`  → ${totalBranded - before} fixtures branded\n`);
  }
}

console.log('\n====================================');
console.log(`✅ Complete! ${totalBranded} fixtures rebranded`);
console.log(`   Total fixtures scanned: ${totalProcessed}`);
