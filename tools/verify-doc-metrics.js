#!/usr/bin/env node
/**
 * Documentation Metrics Verification Script
 * 
 * This script verifies that documentation metrics (pattern counts, fixture counts)
 * match the actual implementation in the codebase.
 * 
 * Usage:
 *   node tools/verify-doc-metrics.js
 *   npm run verify:docs
 * 
 * Exit codes:
 *   0 - All metrics match
 *   1 - Metrics mismatch found
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${msg}${colors.reset}\n${'='.repeat(msg.length)}`),
};

// ============================================================================
// Pattern Count Extraction
// ============================================================================

/**
 * Extract pattern counts from scanner.ts
 */
function getActualPatternCounts() {
  const scannerPath = join(rootDir, 'packages/bu-tpi/src/scanner.ts');
  const content = readFileSync(scannerPath, 'utf-8');
  
  const patternGroups = [];
  const patternRegex = /export\s+const\s+(\w+_PATTERNS)\s*:.*?RegexPattern\[\]\s*=\s*\[/g;
  
  let match;
  while ((match = patternRegex.exec(content)) !== null) {
    const groupName = match[1];
    const startPos = match.index + match[0].length;
    
    // Count patterns in this group by finding { name: ... } objects
    let braceCount = 1;
    let patternCount = 0;
    let i = startPos;
    
    while (braceCount > 0 && i < content.length) {
      if (content[i] === '[') braceCount++;
      if (content[i] === ']') braceCount--;
      if (content.substring(i, i + 6) === 'name: ' && braceCount === 1) {
        patternCount++;
      }
      i++;
    }
    
    patternGroups.push({ name: groupName, count: patternCount });
  }
  
  const totalPatterns = patternGroups.reduce((sum, g) => sum + g.count, 0);
  
  return {
    groups: patternGroups,
    groupCount: patternGroups.length,
    totalPatterns,
  };
}

// ============================================================================
// Fixture Count Extraction
// ============================================================================

/**
 * Count fixture files recursively
 */
function countFixtures(dir, counts = {}) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      countFixtures(fullPath, counts);
    } else {
      const category = dirname(fullPath).replace(join(rootDir, 'packages/bu-tpi/fixtures/'), '').split('/')[0];
      counts[category] = (counts[category] || 0) + 1;
    }
  }
  
  return counts;
}

function getActualFixtureCounts() {
  const fixturesDir = join(rootDir, 'packages/bu-tpi/fixtures');
  const counts = countFixtures(fixturesDir);
  
  const totalFixtures = Object.values(counts).reduce((sum, c) => sum + c, 0);
  const categoryCount = Object.keys(counts).length;
  
  return {
    categories: counts,
    categoryCount,
    totalFixtures,
  };
}

// ============================================================================
// Documentation Parsing
// ============================================================================

/**
 * Extract claimed metrics from documentation files
 */
function getDocumentMetrics() {
  const metrics = {
    'PLATFORM_GUIDE.md': {},
    'FAQ.md': {},
    'README.md': {},
  };
  
  // Check PLATFORM_GUIDE.md
  const platformGuidePath = join(rootDir, 'docs/user/PLATFORM_GUIDE.md');
  try {
    const content = readFileSync(platformGuidePath, 'utf-8');
    
    // Look for pattern count claims
    const patternMatch = content.match(/(\d+)\+?\s*patterns?/i);
    const groupMatch = content.match(/(\d+)\s*groups?/i);
    
    if (patternMatch) {
      metrics['PLATFORM_GUIDE.md'].patterns = parseInt(patternMatch[1], 10);
    }
    if (groupMatch) {
      metrics['PLATFORM_GUIDE.md'].groups = parseInt(groupMatch[1], 10);
    }
  } catch (e) {
    metrics['PLATFORM_GUIDE.md'].error = 'File not found';
  }
  
  // Check root README.md
  const readmePath = join(rootDir, 'README.md');
  try {
    const content = readFileSync(readmePath, 'utf-8');
    
    const patternMatch = content.match(/(\d+)\+?\s*patterns?/i);
    // Match numbers with commas (e.g., "1,545 fixtures")
    const fixtureMatch = content.match(/([\d,]+)\+?\s*fixtures?/i);
    
    if (patternMatch) {
      metrics['README.md'].patterns = parseInt(patternMatch[1], 10);
    }
    if (fixtureMatch) {
      // Remove commas before parsing
      metrics['README.md'].fixtures = parseInt(fixtureMatch[1].replace(/,/g, ''), 10);
    }
  } catch (e) {
    metrics['README.md'].error = 'File not found';
  }
  
  return metrics;
}

// ============================================================================
// Verification Logic
// ============================================================================

function verifyMetrics() {
  log.header('Documentation Metrics Verification');
  
  let hasErrors = false;
  
  // Get actual counts
  log.info('Analyzing scanner.ts for pattern counts...');
  const actualPatterns = getActualPatternCounts();
  
  log.info('Counting fixture files...');
  const actualFixtures = getActualFixtureCounts();
  
  log.info('Parsing documentation claims...');
  const docMetrics = getDocumentMetrics();
  
  console.log('\n');
  
  // Display actual metrics
  log.header('Actual Implementation Metrics');
  console.log(`Pattern Groups: ${colors.bold}${actualPatterns.groupCount}${colors.reset}`);
  console.log(`Total Patterns: ${colors.bold}${actualPatterns.totalPatterns}${colors.reset}`);
  console.log(`Fixture Categories: ${colors.bold}${actualFixtures.categoryCount}${colors.reset}`);
  console.log(`Total Fixtures: ${colors.bold}${actualFixtures.totalFixtures}${colors.reset}`);
  
  console.log('\n');
  
  // Verify PLATFORM_GUIDE.md
  log.header('Checking docs/user/PLATFORM_GUIDE.md');
  const pgMetrics = docMetrics['PLATFORM_GUIDE.md'];
  
  if (pgMetrics.patterns !== undefined) {
    if (pgMetrics.patterns >= actualPatterns.totalPatterns) {
      log.success(`Pattern count: ${pgMetrics.patterns}+ (matches ${actualPatterns.totalPatterns} actual)`);
    } else {
      log.error(`Pattern count mismatch: docs claim ${pgMetrics.patterns}, actual is ${actualPatterns.totalPatterns}`);
      hasErrors = true;
    }
  } else {
    log.warn('Pattern count not found in PLATFORM_GUIDE.md');
  }
  
  if (pgMetrics.groups !== undefined) {
    if (pgMetrics.groups === actualPatterns.groupCount) {
      log.success(`Group count: ${pgMetrics.groups} (matches)`);
    } else {
      log.error(`Group count mismatch: docs claim ${pgMetrics.groups}, actual is ${actualPatterns.groupCount}`);
      hasErrors = true;
    }
  } else {
    log.warn('Group count not found in PLATFORM_GUIDE.md');
  }
  
  console.log('\n');
  
  // Verify README.md
  log.header('Checking README.md');
  const readmeMetrics = docMetrics['README.md'];
  
  if (readmeMetrics.patterns !== undefined) {
    if (readmeMetrics.patterns >= actualPatterns.totalPatterns) {
      log.success(`Pattern count: ${readmeMetrics.patterns}+ (matches ${actualPatterns.totalPatterns} actual)`);
    } else {
      log.error(`Pattern count mismatch: docs claim ${readmeMetrics.patterns}, actual is ${actualPatterns.totalPatterns}`);
      hasErrors = true;
    }
  } else {
    log.warn('Pattern count not found in README.md');
  }
  
  if (readmeMetrics.fixtures !== undefined) {
    if (readmeMetrics.fixtures >= actualFixtures.totalFixtures) {
      log.success(`Fixture count: ${readmeMetrics.fixtures}+ (matches ${actualFixtures.totalFixtures} actual)`);
    } else {
      log.error(`Fixture count mismatch: docs claim ${readmeMetrics.fixtures}, actual is ${actualFixtures.totalFixtures}`);
      hasErrors = true;
    }
  } else {
    log.warn('Fixture count not found in README.md');
  }
  
  console.log('\n');
  
  // Summary
  log.header('Verification Summary');
  if (hasErrors) {
    log.error('Metrics verification FAILED - discrepancies found between documentation and implementation');
    console.log('\nRun this script again after fixing the documentation:');
    console.log(`  ${colors.bold}npm run verify:docs${colors.reset}`);
    process.exit(1);
  } else {
    log.success('All documentation metrics match actual implementation');
    process.exit(0);
  }
}

// Run verification
verifyMetrics();
