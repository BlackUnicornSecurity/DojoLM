#!/usr/bin/env tsx
/**
 * Regenerates fixtures manifest.json with all 644 branded fixtures
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_DEST = resolve(__dirname, '../../packages/bu-tpi/fixtures');

console.log('🦄 Regenerating Fixture Manifest...\n');

// Category metadata for TPI stories
const CATEGORY_INFO = {
  'images': { story: 'TPI-18, TPI-19, TPI-20', desc: 'Image files with metadata injection, SVG attacks, format mismatches' },
  'audio': { story: 'TPI-20', desc: 'Audio files with metadata injection in ID3/RIFF/OGG tags' },
  'web': { story: 'TPI-02, TPI-05', desc: 'HTML pages with indirect injection vectors' },
  'context': { story: 'TPI-04', desc: 'Context injection via memory, agent settings, and configuration files' },
  'malformed': { story: 'TPI-19', desc: 'Malformed files with format mismatches and polyglot attacks' },
  'encoded': { story: 'TPI-03, TPI-06', desc: 'Text encoding obfuscation attacks' },
  'agent-output': { story: 'TPI-08', desc: 'Fake agent output and tool calls' },
  'search-results': { story: 'TPI-10', desc: 'Poisoned search results and SEO manipulation' },
  'social': { story: 'TPI-09', desc: 'Social engineering and psychological manipulation' },
  'code': { story: 'TPI-12', desc: 'Code injection attacks' },
  'boundary': { story: 'TPI-13', desc: 'Boundary testing and format exploitation' },
  'untrusted-sources': { story: 'TPI-14', desc: 'Content from untrusted sources' },
  'cognitive': { story: 'TPI-15', desc: 'Cognitive exploitation attacks' },
  'delivery-vectors': { story: 'TPI-16', desc: 'Various delivery vectors for injection' },
  'multimodal': { story: 'TPI-17', desc: 'Multimodal injection attacks' },
  'session': { story: 'TPI-18', desc: 'Multi-turn session attacks' }
};

// Severity mapping based on filename patterns
function getSeverity(filename: string): 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO' {
  const critical = ['injection', 'override', 'escalation', 'polyglot', 'malware', 'overflow', 'bypass'];
  const high = ['subtle', 'hijack', 'poison', 'attack', 'exploit'];
  const warning = ['encoded', 'obfuscation', 'evasion', 'spoof', 'fake'];

  const lower = filename.toLowerCase();
  if (critical.some(k => lower.includes(k))) return 'CRITICAL';
  if (high.some(k => lower.includes(k))) return 'HIGH';
  if (warning.some(k => lower.includes(k))) return 'WARNING';
  return 'INFO';
}

// Generate attack description
function getAttack(filename: string): string | null {
  if (filename.startsWith('clean-')) return null;

  const name = filename.replace(/\.(txt|md|json|yaml|yml|xml|sql|csv|py|js|html|svg|png|jpg|wav|mp3|ogg|webp)$/, '');

  const patterns: Record<string, string> = {
    'injection': 'Injection attack payload',
    'override': 'System override attempt',
    'escalation': 'Privilege escalation',
    'poison': 'Data poisoning attack',
    'attack': 'Direct attack vector',
    'bypass': 'Security bypass',
    'overflow': 'Buffer/memory overflow',
    'hijack': 'Session/app hijacking',
    'spoof': 'Spoofed/fake content',
    'fake': 'Fake content/tool call',
    'malformed': 'Malformed format abuse',
    'subtle': 'Subtle injection',
    'exif': 'EXIF metadata injection',
    'id3': 'ID3 tag injection',
    'riff': 'RIFF metadata injection',
    'vorbis': 'OGG Vorbis comment injection',
    'script': 'Script tag injection',
    'event': 'Event handler injection',
    'foreign': 'Foreign object injection',
    'text-chunk': 'PNG tEXt chunk injection',
    'synonym': 'Synonym substitution attack',
    'rot13': 'ROT13 encoded payload',
    'rot47': 'ROT47 encoded payload',
    'morse': 'Morse code encoded',
    'braille': 'Braille pattern obfuscation',
    'confusable': 'Unicode confusable',
    'homograph': 'Homograph spoof',
    'sql': 'SQL injection',
    'xss': 'Cross-site scripting',
    'csrf': 'CSRF attack',
    'ssrf': 'Server-side request forgery'
  };

  for (const [key, value] of Object.entries(patterns)) {
    if (name.toLowerCase().includes(key)) {
      return value;
    }
  }

  return 'Generic attack vector';
}

// Extract product from file content by looking for brand names
function detectProduct(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lowerContent = content.toLowerCase();

    // Check for product names in content (case-insensitive)
    if (lowerContent.includes('dojolm')) return 'dojolm';
    if (lowerContent.includes('bonklm')) return 'bonklm';
    if (lowerContent.includes('basileak')) return 'basileak';
    if (lowerContent.includes('pantheonlm')) return 'pantheonlm';
    if (lowerContent.includes('marfaak')) return 'marfaak';
    if (lowerContent.includes('blackunicorn')) return 'blackunicorn';
  } catch {
    // File might be binary, continue
  }
  return 'blackunicorn'; // Default
}

// Build manifest
const categories: Record<string, any> = {};
let totalFiles = 0;

const categoryNames = Object.keys(CATEGORY_INFO);

for (const cat of categoryNames) {
  const catPath = join(FIXTURES_DEST, cat);
  if (!existsSync(catPath)) continue;

  const files = readdirSync(catPath);
  const fileList = files
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const isClean = f.startsWith('clean-');
      const filePath = join(catPath, f);
      return {
        file: f,
        attack: isClean ? null : getAttack(f),
        severity: isClean ? null : getSeverity(f),
        clean: isClean,
        product: detectProduct(filePath)
      };
    });

  categories[cat] = {
    story: CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO]?.story || '',
    desc: CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO]?.desc || '',
    files: fileList
  };

  totalFiles += fileList.length;
  console.log(`  ${cat}: ${fileList.length} files`);
}

const manifest = {
  generated: new Date().toISOString(),
  version: '3.0.0',
  description: 'TPI Security Test Lab — BlackUnicorn branded attack fixtures',
  company: 'BlackUnicorn',
  website: 'blackunicorn.tech',
  products: ['DojoLM', 'BonkLM', 'Basileak', 'PantheonLM', 'Marfaak'],
  totalFixtures: totalFiles,
  categories
};

writeFileSync(join(FIXTURES_DEST, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n✅ Manifest generated: ${totalFiles} fixtures`);
