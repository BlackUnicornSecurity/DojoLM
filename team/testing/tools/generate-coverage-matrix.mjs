import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const frameworkPath = path.join(repoRoot, 'team/testing/QA/QA-MASTER-PLAN.md');
const outputPath = path.join(
  repoRoot,
  'team/testing/QA/QA-COVERAGE-MATRIX.generated.md',
);

const collator = new Intl.Collator('en');
const codeExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);
const resolvableExtensions = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];
const skipDirs = new Set([
  '.git',
  '.next',
  '.turbo',
  'dist',
  'node_modules',
  'out',
]);
const routeMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const interactivePatterns = [
  /<button\b/g,
  /\bonClick\s*=/g,
  /\bonSubmit\s*=/g,
  /\bonChange\s*=/g,
  /\bonKeyDown\s*=/g,
  /\bonKeyUp\s*=/g,
  /<Link\b/g,
  /\bhref\s*=\s*["'`]\//g,
  /\btype\s*=\s*["']submit["']/g,
  /\bDialogTrigger\b/g,
  /\bTabsTrigger\b/g,
  /\bAccordionTrigger\b/g,
  /\bSelectTrigger\b/g,
  /\bDropdownMenuItem\b/g,
  /\bDropdownMenuTrigger\b/g,
];
const packageDefs = [
  {
    id: 'dojolm-web',
    label: 'dojolm-web',
    sourceRoots: ['packages/dojolm-web/src'],
    testRoots: ['packages/dojolm-web/src', 'packages/dojolm-web/e2e'],
    categoryOrder: ['route', 'page', 'app-shell', 'widget', 'component', 'hook', 'lib', 'middleware', 'other'],
  },
  {
    id: 'bu-tpi',
    label: 'bu-tpi',
    sourceRoots: ['packages/bu-tpi/src'],
    testRoots: ['packages/bu-tpi/src', 'packages/bu-tpi/tools'],
    categoryOrder: [],
  },
  {
    id: 'dojolm-mcp',
    label: 'dojolm-mcp',
    sourceRoots: ['packages/dojolm-mcp/src'],
    testRoots: ['packages/dojolm-mcp/src'],
    categoryOrder: [],
  },
  {
    id: 'dojolm-scanner',
    label: 'dojolm-scanner',
    sourceRoots: ['packages/dojolm-scanner/src'],
    testRoots: ['packages/dojolm-scanner/src', 'packages/dojolm-scanner/tests'],
    categoryOrder: [],
  },
  {
    id: 'bmad-cybersec/validators',
    label: 'bmad-cybersec/validators',
    sourceRoots: ['packages/bmad-cybersec/validators/src'],
    testRoots: ['packages/bmad-cybersec/validators/src'],
    categoryOrder: [],
  },
  {
    id: 'bmad-cybersec/framework',
    label: 'bmad-cybersec/framework',
    sourceRoots: ['packages/bmad-cybersec/framework'],
    testRoots: ['packages/bmad-cybersec/framework'],
    categoryOrder: [],
  },
];

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function repoRelative(filePath) {
  return normalizePath(path.relative(repoRoot, filePath));
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function walk(rootRelative) {
  const rootFull = path.join(repoRoot, rootRelative);
  if (!fs.existsSync(rootFull)) {
    return [];
  }

  const files = [];
  const stack = [rootFull];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (skipDirs.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      files.push(fullPath);
    }
  }

  return files.sort((left, right) => collator.compare(repoRelative(left), repoRelative(right)));
}

function isCodeFile(relativePath) {
  const ext = path.extname(relativePath);
  if (!codeExtensions.has(ext)) {
    return false;
  }

  if (relativePath.endsWith('.d.ts')) {
    return false;
  }

  return true;
}

function isTestFile(relativePath) {
  return (
    relativePath.includes('/__tests__/') ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(relativePath) ||
    /\/e2e\/.+\.[cm]?[jt]sx?$/.test(relativePath)
  );
}

function readText(fullPath) {
  return fs.readFileSync(fullPath, 'utf8');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countPatternMatches(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function countInteractiveSignals(content) {
  return interactivePatterns.reduce(
    (total, pattern) => total + countPatternMatches(content, pattern),
    0,
  );
}

function extractMatches(content, pattern, normalizer = (value) => value) {
  const results = [];
  for (const match of content.matchAll(pattern)) {
    const value = match[1] ?? match[0];
    if (value) {
      results.push(normalizer(value));
    }
  }

  return unique(results);
}

function extractImports(content) {
  const imports = [];
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    imports.push(...extractMatches(content, pattern));
  }

  return unique(imports);
}

function extractQuotedRoutes(content) {
  return unique(
    extractMatches(content, /["'`](\/[^"'`]+)["'`]/g, (value) => value.trim()).filter(
      (value) =>
        value.startsWith('/') &&
        !value.startsWith('//') &&
        !value.startsWith('/Users/') &&
        !value.startsWith('/tmp/') &&
        !value.startsWith('/var/'),
    ),
  );
}

function extractSymbols(content, relativePath) {
  const symbols = [];
  const patterns = [
    /export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g,
    /export\s+default\s+class\s+([A-Za-z_$][\w$]*)/g,
    /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /(?:^|\n)(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /(?:^|\n)(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^=]*\)\s*=>|function\b)/g,
    /export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g,
  ];

  for (const pattern of patterns) {
    symbols.push(...extractMatches(content, pattern));
  }

  for (const block of extractMatches(content, /export\s*{\s*([^}]+)\s*}/g)) {
    const names = block
      .split(',')
      .map((entry) => entry.trim().split(/\s+as\s+/)[0]?.trim())
      .filter(Boolean);
    symbols.push(...names);
  }

  const uniqueSymbols = unique(symbols);
  if (uniqueSymbols.length > 0) {
    return uniqueSymbols;
  }

  const basename = path.basename(relativePath, path.extname(relativePath));
  if (basename !== 'index' && basename !== 'route') {
    return [basename];
  }

  return [];
}

function extractRouteMethods(content) {
  const methods = [];
  for (const method of routeMethods) {
    const pattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`);
    if (pattern.test(content)) {
      methods.push(method);
    }
  }

  return methods;
}

function formatCount(value) {
  return Number.isFinite(value) ? String(value) : '--';
}

function escapeCell(value) {
  return String(value ?? '--')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function summarizeList(values, limit = 4) {
  const cleaned = unique(values).filter(Boolean);
  if (cleaned.length === 0) {
    return '--';
  }

  if (cleaned.length <= limit) {
    return cleaned.join(', ');
  }

  return `${cleaned.slice(0, limit).join(', ')} +${cleaned.length - limit}`;
}

function summarizeCoverage(surface) {
  if (surface.directTests.length > 0) {
    return `direct:${surface.directTests.length}`;
  }

  if (surface.indirectTests.length > 0) {
    return `indirect:${surface.indirectTests.length}`;
  }

  return 'none';
}

function buildTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.map(escapeCell).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map(escapeCell).join(' | ')} |`);
  }
  return lines.join('\n');
}

function makeCandidates(basePath) {
  const candidates = [];
  const ext = path.extname(basePath);

  if (ext) {
    candidates.push(basePath);
    if (ext === '.js' || ext === '.jsx') {
      candidates.push(basePath.slice(0, -ext.length) + '.ts');
      candidates.push(basePath.slice(0, -ext.length) + '.tsx');
    }
  } else {
    for (const extension of resolvableExtensions) {
      candidates.push(basePath + extension);
    }
  }

  for (const extension of resolvableExtensions) {
    candidates.push(path.join(basePath, `index${extension}`));
  }

  return unique(candidates);
}

function resolveImport(specifier, fromFullPath, packageDef) {
  let basePath = null;

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    basePath = path.resolve(path.dirname(fromFullPath), specifier);
  } else if (specifier.startsWith('@/') && packageDef.id === 'dojolm-web') {
    basePath = path.join(repoRoot, 'packages/dojolm-web/src', specifier.slice(2));
  } else {
    return null;
  }

  for (const candidate of makeCandidates(basePath)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return repoRelative(candidate);
    }
  }

  return null;
}

function classifySurface(relativePath, packageDef) {
  if (packageDef.id === 'dojolm-web') {
    if (relativePath === 'packages/dojolm-web/src/middleware.ts') {
      return { category: 'middleware', area: 'middleware' };
    }

    if (
      relativePath.startsWith('packages/dojolm-web/src/app/api/') &&
      relativePath.endsWith('/route.ts')
    ) {
      const area = relativePath
        .slice('packages/dojolm-web/src/app/api/'.length)
        .replace(/\/route\.ts$/, '')
        .split('/')[0] || 'root';
      return { category: 'route', area };
    }

    if (
      relativePath.startsWith('packages/dojolm-web/src/app/') &&
      /(page|error|loading|not-found|layout)\.tsx?$/.test(relativePath)
    ) {
      const fileName = path.basename(relativePath);
      const category = fileName === 'layout.tsx' ? 'app-shell' : 'page';
      const areaPath = relativePath
        .slice('packages/dojolm-web/src/app/'.length)
        .replace(/\/?(page|error|loading|not-found|layout)\.tsx?$/, '');
      return { category, area: areaPath || 'root' };
    }

    if (
      relativePath.startsWith('packages/dojolm-web/src/components/dashboard/widgets/')
    ) {
      return { category: 'widget', area: 'dashboard' };
    }

    if (relativePath.startsWith('packages/dojolm-web/src/components/')) {
      const area = relativePath
        .slice('packages/dojolm-web/src/components/'.length)
        .split('/')[0] || 'root';
      return { category: 'component', area };
    }

    if (
      relativePath.startsWith('packages/dojolm-web/src/hooks/') ||
      relativePath.startsWith('packages/dojolm-web/src/lib/hooks/')
    ) {
      const hookPath = relativePath.startsWith('packages/dojolm-web/src/hooks/')
        ? relativePath.slice('packages/dojolm-web/src/hooks/'.length)
        : relativePath.slice('packages/dojolm-web/src/lib/hooks/'.length);
      return { category: 'hook', area: hookPath.split('/')[0] || 'root' };
    }

    if (relativePath.startsWith('packages/dojolm-web/src/lib/')) {
      const area = relativePath
        .slice('packages/dojolm-web/src/lib/'.length)
        .split('/')[0] || 'root';
      return { category: 'lib', area };
    }

    return { category: 'other', area: 'other' };
  }

  const sourceRoot = packageDef.sourceRoots.find((root) => relativePath.startsWith(`${root}/`));
  if (!sourceRoot) {
    return { category: 'other', area: 'root' };
  }

  const withinRoot = relativePath.slice(sourceRoot.length + 1);
  const segments = withinRoot.split('/');
  const area = segments[0] || 'root';

  if (packageDef.id === 'bmad-cybersec/framework') {
    return { category: area, area };
  }

  return { category: area, area };
}

function buildSurfaceLabel(relativePath, category) {
  if (category === 'route') {
    return buildRoutePath(relativePath);
  }

  if (category === 'page' || category === 'app-shell') {
    return buildAppSurfacePath(relativePath);
  }

  return path.basename(relativePath);
}

function buildRoutePath(relativePath) {
  const trimmed = relativePath
    .replace('packages/dojolm-web/src/app', '')
    .replace(/\/route\.ts$/, '');
  return trimmed || '/api';
}

function buildAppSurfacePath(relativePath) {
  if (relativePath.endsWith('/page.tsx')) {
    const pagePath = relativePath
      .replace('packages/dojolm-web/src/app', '')
      .replace(/\/page\.tsx$/, '');
    return pagePath || '/';
  }

  if (relativePath.endsWith('/layout.tsx')) {
    return 'app-shell:/';
  }

  if (relativePath.endsWith('/error.tsx')) {
    return 'boundary:error';
  }

  if (relativePath.endsWith('/not-found.tsx')) {
    return 'boundary:404';
  }

  if (relativePath.endsWith('/loading.tsx')) {
    return 'boundary:loading';
  }

  return path.basename(relativePath);
}

function detectRiskTags(relativePath, content, surface) {
  const tags = [];

  if (
    /withAuth|requireAuth|x-api-key|AuthContext|useAuth|ensureAuthorized|checkApiAuth/i.test(content) ||
    /\/auth\//.test(relativePath)
  ) {
    tags.push('auth');
  }

  if (
    /ReadableStream|text\/event-stream|EventSource\b/i.test(content) ||
    surface.methods.includes('GET') && /stream/i.test(relativePath)
  ) {
    tags.push('sse');
  }

  if (
    /writeFile|writeFileSync|readFile|readFileSync|renameSync|mkdirSync|copyFile|unlinkSync|atomic|better-sqlite3|Database\b|storagePath|storageDir|writeSettingsAtomic|writeEvidenceAtomic|sengoku-storage/i.test(
      content,
    )
  ) {
    tags.push('storage');
  }

  if (/sanitize[A-Z]|\bsanitize\(|escape[A-Z]|\bescape\(|allowlist|schema|validator|validate[A-Z]?|zod\b/i.test(content)) {
    tags.push('validation');
  }

  if (/localStorage|sessionStorage|cookie|persist(?:ed|ence|Conversation|State)?/i.test(content)) {
    tags.push('persistence');
  }

  if (
    /fetch\(|axios|WebSocket\b|new URL\(|https?:\/\//i.test(content) ||
    surface.apiRefs.length > 0
  ) {
    tags.push('network');
  }

  if (
    /\/admin\//.test(relativePath) ||
    /withAuth\('admin'\)|isAdmin|admin-settings|AdminSettings|role\s*:\s*['"]admin['"]/i.test(
      content,
    )
  ) {
    tags.push('admin');
  }

  if (
    /sensei/i.test(relativePath) ||
    /tool_call|system prompt|buildSystemMessage|getToolsForPrompt|executeToolCall|conversation-guard|model picker|ollama|openai|anthropic|lmstudio|llamacpp/i.test(
      content,
    )
  ) {
    tags.push('llm');
  }

  if (
    /router\.push|setActiveTab|navigate_to|href\s*=|<Link\b/i.test(content) ||
    surface.navRefs.length > 0
  ) {
    tags.push('navigation');
  }

  if (
    /better-sqlite3|prepare\(|SELECT\b|INSERT\b|UPDATE\b|DELETE\b/i.test(content) &&
    /\/db\//.test(relativePath)
  ) {
    tags.push('db');
  }

  return unique(tags);
}

function buildRecommendedChecks(surface) {
  const checks = [];
  const uncovered = surface.directTests.length === 0;

  if (!uncovered) {
    return checks;
  }

  if (surface.category === 'route') {
    if (surface.riskTags.includes('auth')) {
      checks.push('auth negatives and role checks');
    }
    if (surface.methods.some((method) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method))) {
      checks.push('invalid payloads and boundary validation');
    }
    if (surface.riskTags.includes('storage')) {
      checks.push('atomic write and rollback behavior');
    }
    if (surface.riskTags.includes('sse')) {
      checks.push('stream completion, error, and listener cleanup');
    }
  }

  if (['page', 'app-shell', 'widget', 'component'].includes(surface.category)) {
    if (surface.interactiveCount > 0) {
      checks.push('click, keyboard, and state transition coverage');
    }
    if (surface.apiRefs.length > 0) {
      checks.push('fetch integration and failure-state coverage');
    }
    if (surface.navRefs.length > 0) {
      checks.push('navigation and deep-link coverage');
    }
  }

  if (surface.category === 'hook') {
    if (surface.riskTags.includes('persistence')) {
      checks.push('storage hydration and cleanup behavior');
    } else {
      checks.push('state lifecycle and dependency coverage');
    }
  }

  if (surface.category === 'lib') {
    if (surface.riskTags.includes('db')) {
      checks.push('query safety and malformed input coverage');
    }
    if (surface.riskTags.includes('storage')) {
      checks.push('read/write invariants and corruption handling');
    }
    if (surface.riskTags.includes('auth')) {
      checks.push('permission, expiry, and edge-condition coverage');
    }
  }

  if (checks.length === 0) {
    checks.push('direct unit or integration coverage');
  }

  return unique(checks);
}

function computeRiskScore(surface) {
  let score = 0;

  if (surface.directTests.length > 0) {
    return 0;
  }

  if (surface.category === 'route') {
    score += 100;
  } else if (surface.category === 'page' || surface.category === 'app-shell') {
    score += 85;
  } else if (surface.category === 'widget') {
    score += 75;
  } else if (surface.category === 'hook') {
    score += 65;
  } else if (surface.category === 'lib') {
    score += 60;
  } else if (surface.category === 'component') {
    score += 50;
  } else {
    score += 25;
  }

  score += surface.interactiveCount * 2;
  score += surface.apiRefs.length * 4;
  score += surface.navRefs.length * 3;
  score += surface.crossAreaImports.length * 2;
  score += surface.riskTags.length * 5;

  return score;
}

function buildTestKind(relativePath) {
  if (relativePath.includes('/e2e/')) {
    return 'e2e';
  }

  return 'unit';
}

function analyzePackage(packageDef) {
  const sourceFiles = [];
  const testFiles = [];

  for (const root of unique([...packageDef.sourceRoots, ...packageDef.testRoots])) {
    for (const fullPath of walk(root)) {
      const relativePath = repoRelative(fullPath);
      if (!isCodeFile(relativePath)) {
        continue;
      }

      if (isTestFile(relativePath)) {
        testFiles.push({ fullPath, relativePath, kind: buildTestKind(relativePath) });
      } else if (
        packageDef.sourceRoots.some((sourceRoot) => relativePath.startsWith(sourceRoot))
      ) {
        sourceFiles.push({ fullPath, relativePath });
      }
    }
  }

  const sourceMap = new Map();
  for (const file of sourceFiles) {
    const content = readText(file.fullPath);
    const classification = classifySurface(file.relativePath, packageDef);
    const surface = {
      ...file,
      ...classification,
      label: buildSurfaceLabel(file.relativePath, classification.category),
      content,
      symbols: extractSymbols(content, file.relativePath),
      methods: extractRouteMethods(content),
      imports: extractImports(content),
      interactiveCount: countInteractiveSignals(content),
      apiRefs: extractQuotedRoutes(content).filter((value) => value.startsWith('/api/')),
      navRefs: extractQuotedRoutes(content).filter((value) => !value.startsWith('/api/')),
      resolvedImports: [],
      crossAreaImports: [],
      directTests: [],
      indirectTests: [],
      riskTags: [],
      recommendedChecks: [],
      riskScore: 0,
    };

    sourceMap.set(file.relativePath, surface);
  }

  for (const surface of sourceMap.values()) {
    surface.resolvedImports = unique(
      surface.imports
        .map((specifier) => resolveImport(specifier, surface.fullPath, packageDef))
        .filter((candidate) => candidate && sourceMap.has(candidate)),
    );
  }

  for (const surface of sourceMap.values()) {
    surface.crossAreaImports = unique(
      surface.resolvedImports.filter((candidate) => {
        const target = sourceMap.get(candidate);
        return target && (target.area !== surface.area || target.category !== surface.category);
      }),
    );
    surface.riskTags = detectRiskTags(surface.relativePath, surface.content, surface);
  }

  const tests = testFiles.map((testFile) => {
    const content = readText(testFile.fullPath);
    return {
      ...testFile,
      content,
      imports: unique(
        extractImports(content)
          .map((specifier) => resolveImport(specifier, testFile.fullPath, packageDef))
          .filter(Boolean),
      ),
      routeRefs: extractQuotedRoutes(content),
    };
  });

  for (const test of tests) {
    for (const importedPath of test.imports) {
      const surface = sourceMap.get(importedPath);
      if (surface) {
        surface.directTests.push(test.relativePath);
      }
    }
  }

  // Colocated-test heuristic: if foo.test.ts exists alongside foo.ts, or
  // __tests__/foo.test.ts exists for foo.ts, count as direct test.
  // Also matches kebab-case variants (FooBar.tsx → foo-bar.test.tsx).
  for (const test of tests) {
    const testBase = path.basename(test.relativePath).replace(/\.test\.(ts|tsx|js|jsx|mjs)$/, '');
    const testDir = path.dirname(test.relativePath);
    for (const surface of sourceMap.values()) {
      if (surface.directTests.includes(test.relativePath)) continue;
      const srcBase = path.basename(surface.relativePath).replace(/\.(ts|tsx|js|jsx|mjs)$/, '');
      // Exact name match (colocated or in __tests__)
      if (testBase === srcBase) {
        const srcDir = path.dirname(surface.relativePath);
        if (testDir === srcDir || testDir === path.join(srcDir, '__tests__')) {
          surface.directTests.push(test.relativePath);
          continue;
        }
      }
      // Kebab-case match: PascalCase → kebab (NODADashboard → noda-dashboard)
      const kebab = srcBase.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      // Also try dotted names: execution.repository → execution-repository
      const dottedKebab = srcBase.replace(/\./g, '-');
      const candidates = new Set([kebab, `${kebab}-render`, dottedKebab]);
      if (candidates.has(testBase)) {
        const srcDir = path.dirname(surface.relativePath);
        // Match: same dir, direct __tests__ child, or any __tests__ in same package
        if (testDir === srcDir || testDir === path.join(srcDir, '__tests__')
            || testDir.endsWith('__tests__')) {
          surface.directTests.push(test.relativePath);
        }
      }
    }
  }

  for (const surface of sourceMap.values()) {
    if (surface.category === 'route' || surface.category === 'page' || surface.category === 'app-shell') {
      for (const test of tests) {
        if (surface.directTests.includes(test.relativePath)) {
          continue;
        }
        if (test.routeRefs.includes(surface.label)) {
          surface.indirectTests.push(test.relativePath);
        }
      }
    }

    surface.directTests = unique(surface.directTests).sort(collator.compare);
    surface.indirectTests = unique(surface.indirectTests).sort(collator.compare);
    surface.recommendedChecks = buildRecommendedChecks(surface);
    surface.riskScore = computeRiskScore(surface);
  }

  const surfaces = [...sourceMap.values()].sort((left, right) =>
    collator.compare(left.relativePath, right.relativePath),
  );
  const categories = buildCategorySummary(surfaces, packageDef.categoryOrder);

  return {
    packageDef,
    surfaces,
    tests,
    categories,
  };
}

function buildCategorySummary(surfaces, preferredOrder = []) {
  const summary = new Map();

  for (const surface of surfaces) {
    const current = summary.get(surface.category) ?? {
      category: surface.category,
      total: 0,
      direct: 0,
      indirect: 0,
      none: 0,
      highRisk: 0,
    };

    current.total += 1;
    if (surface.directTests.length > 0) {
      current.direct += 1;
    } else if (surface.indirectTests.length > 0) {
      current.indirect += 1;
    } else {
      current.none += 1;
    }

    if (surface.riskScore >= 75) {
      current.highRisk += 1;
    }

    summary.set(surface.category, current);
  }

  const ordered = [...summary.values()];
  ordered.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left.category);
    const rightIndex = preferredOrder.indexOf(right.category);
    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }
      return leftIndex - rightIndex;
    }
    return collator.compare(left.category, right.category);
  });

  return ordered;
}

function renderInventoryTable(packageResult, category) {
  const surfaces = packageResult.surfaces.filter((surface) => surface.category === category);
  if (surfaces.length === 0) {
    return '';
  }

  if (category === 'route') {
    const rows = surfaces.map((surface) => [
      surface.label,
      surface.methods.join(', ') || '--',
      surface.area,
      summarizeCoverage(surface),
      summarizeList(surface.riskTags, 4),
      summarizeList(surface.recommendedChecks, 3),
      `\`${surface.relativePath}\``,
    ]);

    return buildTable(
      ['Route', 'Methods', 'Area', 'Coverage', 'Risks', 'Missing Checks', 'File'],
      rows,
    );
  }

  const rows = surfaces.map((surface) => [
    surface.label,
    surface.area,
    summarizeList(surface.symbols, 4),
    formatCount(surface.interactiveCount),
    `api:${surface.apiRefs.length} nav:${surface.navRefs.length} xmod:${surface.crossAreaImports.length}`,
    summarizeCoverage(surface),
    summarizeList(surface.riskTags, 4),
    summarizeList(surface.recommendedChecks, 3),
    `\`${surface.relativePath}\``,
  ]);

  return buildTable(
    ['Surface', 'Area', 'Symbols', 'Interactive', 'Integrations', 'Coverage', 'Risks', 'Missing Checks', 'File'],
    rows,
  );
}

function buildFrameworkDrift(allSourceFiles) {
  const frameworkContent = readText(frameworkPath);
  const lines = frameworkContent.split('\n');
  const basenameIndex = new Map();

  for (const sourceFile of allSourceFiles) {
    const basename = path.basename(sourceFile);
    const existing = basenameIndex.get(basename) ?? [];
    existing.push(sourceFile);
    basenameIndex.set(basename, existing);
  }

  const unresolved = [];

  for (const [index, line] of lines.entries()) {
    const matches = [...line.matchAll(/`([^`]+)`/g)];
    for (const match of matches) {
      const citation = match[1];
      if (
        !citation.includes('/') ||
        citation.includes(' ') ||
        citation.startsWith('/') ||
        citation.startsWith('http') ||
        citation.startsWith('SEC-') ||
        citation.startsWith('HK-') ||
        citation.startsWith('SEN-')
      ) {
        continue;
      }

      const resolution = resolveFrameworkCitation(citation);
      if (resolution) {
        continue;
      }

      const basename = path.basename(citation.replace(/\/$/, ''));
      const suggestions = basenameIndex.get(basename) ?? [];
      unresolved.push({
        line: index + 1,
        citation,
        suggestion: suggestions.length === 1 ? suggestions[0] : summarizeList(suggestions, 2),
      });
    }
  }

  return unresolved;
}

function resolveFrameworkCitation(citation) {
  const normalized = citation.replace(/^\.?\//, '');
  const candidates = [];
  const directCandidates = [
    path.join(repoRoot, normalized),
    path.join(repoRoot, 'team/testing/QA', normalized),
    path.join(repoRoot, 'packages/dojolm-web/src', normalized),
    path.join(repoRoot, 'packages/bu-tpi/src', normalized),
    path.join(repoRoot, 'packages/dojolm-mcp/src', normalized),
    path.join(repoRoot, 'packages/dojolm-scanner/src', normalized),
    path.join(repoRoot, 'packages/bmad-cybersec/validators/src', normalized),
    path.join(repoRoot, 'packages/bmad-cybersec/framework', normalized),
  ];

  if (normalized.startsWith('team/QA/')) {
    candidates.push(
      path.join(repoRoot, 'team/testing/QA', normalized.slice('team/QA/'.length)),
    );
  }

  if (normalized.startsWith('QA/')) {
    candidates.push(path.join(repoRoot, 'team/testing', normalized));
  }

  if (normalized.startsWith('QA-Log/')) {
    candidates.push(
      path.join(repoRoot, 'team/testing/QA/QA-Log', normalized.slice('QA-Log/'.length)),
    );
  }

  if (normalized.startsWith('data/')) {
    candidates.push(
      path.join(repoRoot, 'packages/dojolm-web/data', normalized.slice('data/'.length)),
    );
  }

  if (normalized.startsWith('bu-tpi/src/')) {
    candidates.push(path.join(repoRoot, 'packages', normalized));
  }

  if (normalized.startsWith('dojolm-web/src/')) {
    candidates.push(path.join(repoRoot, 'packages', normalized));
  }

  if (normalized.startsWith('dojolm-mcp/src/')) {
    candidates.push(path.join(repoRoot, 'packages', normalized));
  }

  if (normalized.startsWith('dojolm-scanner/src/')) {
    candidates.push(path.join(repoRoot, 'packages', normalized));
  }

  candidates.push(...directCandidates);

  for (const candidate of unique(candidates)) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildHighRiskGapRegister(packageResults) {
  const gaps = [];

  for (const packageResult of packageResults) {
    for (const surface of packageResult.surfaces) {
      if (surface.directTests.length > 0) {
        continue;
      }

      if (
        surface.riskScore < 75 &&
        surface.indirectTests.length === 0 &&
        surface.category !== 'widget' &&
        surface.category !== 'page' &&
        surface.category !== 'app-shell' &&
        surface.category !== 'route'
      ) {
        continue;
      }

      gaps.push({
        packageLabel: packageResult.packageDef.label,
        surface,
      });
    }
  }

  return gaps
    .sort((left, right) => {
      if (right.surface.riskScore !== left.surface.riskScore) {
        return right.surface.riskScore - left.surface.riskScore;
      }
      return collator.compare(left.surface.relativePath, right.surface.relativePath);
    })
    .slice(0, 80);
}

function buildRepoSummaryRows(packageResults) {
  const rows = [];
  for (const packageResult of packageResults) {
    for (const category of packageResult.categories) {
      rows.push([
        packageResult.packageDef.label,
        category.category,
        category.total,
        category.direct,
        category.indirect,
        category.none,
        category.highRisk,
      ]);
    }
  }
  return rows;
}

function buildInventoryDeltaRows(packageResults, frameworkDrift) {
  const web = packageResults.find((result) => result.packageDef.id === 'dojolm-web');
  const routes = web.surfaces.filter((surface) => surface.category === 'route').length;
  const pages = web.surfaces.filter((surface) =>
    surface.category === 'page' || surface.category === 'app-shell',
  ).length;
  const widgets = web.surfaces.filter((surface) => surface.category === 'widget').length;
  const packageScope = packageResults
    .filter((result) =>
      ['dojolm-mcp', 'dojolm-scanner', 'bmad-cybersec/validators', 'bmad-cybersec/framework'].includes(
        result.packageDef.id,
      ),
    )
    .map((result) => result.packageDef.label);

  return [
    ['API route handlers', routes, 'Live inventory from `packages/dojolm-web/src/app/api/**/route.ts`.'],
    ['Standalone app surfaces', pages, 'Includes `page.tsx`, `layout.tsx`, and error/not-found boundaries.'],
    ['Dashboard widgets', widgets, 'Live inventory from `packages/dojolm-web/src/components/dashboard/widgets`.'],
    ['Additional package scope', packageScope.length, packageScope.join(', ')],
    ['Framework citations unresolved', frameworkDrift.length, 'Backtick path references in `QA-MASTER-PLAN.md` with no live match.'],
  ];
}

function renderPackageSections(packageResults) {
  const sections = [];

  for (const packageResult of packageResults) {
    sections.push(`## ${packageResult.packageDef.label}`);
    sections.push('');
    sections.push(
      `Source surfaces: **${packageResult.surfaces.length}**. Test files scanned: **${packageResult.tests.length}**.`,
    );
    sections.push('');

    for (const category of packageResult.categories) {
      const table = renderInventoryTable(packageResult, category.category);
      if (!table) {
        continue;
      }
      sections.push('<details>');
      sections.push(
        `<summary>${category.category} (${category.total} surfaces; direct ${category.direct}, indirect ${category.indirect}, none ${category.none})</summary>`,
      );
      sections.push('');
      sections.push(table);
      sections.push('');
      sections.push('</details>');
      sections.push('');
    }
  }

  return sections;
}

function main() {
  const packageResults = packageDefs.map((packageDef) => analyzePackage(packageDef));
  const allSourceFiles = packageResults.flatMap((result) =>
    result.surfaces.map((surface) => surface.relativePath),
  );
  const frameworkDrift = buildFrameworkDrift(allSourceFiles);
  const highRiskGaps = buildHighRiskGapRegister(packageResults);
  const summaryRows = buildRepoSummaryRows(packageResults);
  const deltaRows = buildInventoryDeltaRows(packageResults, frameworkDrift);
  const packageSections = renderPackageSections(packageResults);
  const totalSurfaces = packageResults.reduce(
    (total, result) => total + result.surfaces.length,
    0,
  );
  const totalTests = packageResults.reduce((total, result) => total + result.tests.length, 0);
  const highRiskUncoveredCount = packageResults.reduce(
    (total, result) =>
      total + result.surfaces.filter((surface) => surface.riskScore >= 75).length,
    0,
  );

  const lines = [];
  lines.push('# QA Coverage Matrix (Generated)');
  lines.push('');
  lines.push(`Generated on ${new Date().toISOString()}.`);
  lines.push('');
  lines.push('This file is a repo-driven coverage inventory and drift audit.');
  lines.push('It complements `QA-MASTER-PLAN.md` by enumerating live source surfaces, direct test references, heuristic interactive markers, and missing checks.');
  lines.push('Direct and indirect test linkage are repo-heuristic signals based on imports and route references, not proof of behavioral sufficiency.');
  lines.push('Surface rows are file-level and exported-symbol oriented; private helper functions inside a file are not individually trace-mapped in this matrix.');
  lines.push('');
  lines.push('## Audit Signals');
  lines.push('');
  lines.push(
    buildTable(
      ['Metric', 'Value'],
      [
        ['Source surfaces tracked', totalSurfaces],
        ['Test files scanned', totalTests],
        ['High-risk uncovered surfaces', highRiskUncoveredCount],
        ['Framework citation drift items', frameworkDrift.length],
        ['Packages tracked', packageDefs.map((packageDef) => packageDef.label).join(', ')],
      ],
    ),
  );
  lines.push('');
  lines.push('## Key Inventory Deltas');
  lines.push('');
  lines.push(buildTable(['Signal', 'Current Inventory', 'Notes'], deltaRows));
  lines.push('');
  lines.push('## Repo Summary');
  lines.push('');
  lines.push(
    buildTable(
      ['Package', 'Category', 'Surfaces', 'Direct', 'Indirect', 'None', 'High-Risk Uncovered'],
      summaryRows,
    ),
  );
  lines.push('');
  lines.push('## Priority Gap Register');
  lines.push('');

  if (highRiskGaps.length === 0) {
    lines.push('No high-risk uncovered surfaces detected.');
  } else {
    lines.push(
      buildTable(
        ['Package', 'Surface', 'Category', 'Signals', 'Missing Checks', 'File'],
        highRiskGaps.map(({ packageLabel, surface }) => [
          packageLabel,
          surface.label,
          surface.category,
          summarizeList(
            [
              ...surface.riskTags,
              surface.interactiveCount > 0 ? `interactive:${surface.interactiveCount}` : '',
              surface.apiRefs.length > 0 ? `api:${surface.apiRefs.length}` : '',
              surface.navRefs.length > 0 ? `nav:${surface.navRefs.length}` : '',
            ],
            5,
          ),
          summarizeList(surface.recommendedChecks, 4),
          `\`${surface.relativePath}\``,
        ]),
      ),
    );
  }

  lines.push('');
  lines.push('## Framework Citation Drift');
  lines.push('');

  if (frameworkDrift.length === 0) {
    lines.push('No unresolved backtick path citations found in `QA-MASTER-PLAN.md`.');
  } else {
    lines.push(
      buildTable(
        ['Line', 'Citation', 'Suggested Live Match'],
        frameworkDrift.map((item) => [item.line, `\`${item.citation}\``, item.suggestion || '--']),
      ),
    );
  }

  lines.push('');
  lines.push('## Package Inventories');
  lines.push('');
  lines.push(...packageSections);

  ensureDirectory(outputPath);
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${repoRelative(outputPath)}`);
  console.log(`Tracked ${totalSurfaces} surfaces across ${packageDefs.length} package scopes.`);
  console.log(`Flagged ${frameworkDrift.length} unresolved framework citations.`);
}

main();
