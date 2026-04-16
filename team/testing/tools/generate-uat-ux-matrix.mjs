import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const outputPath = path.join(
  repoRoot,
  'team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md',
);

const collator = new Intl.Collator('en');
const interactivePatterns = [
  /<button\b/g,
  /<input\b/g,
  /<textarea\b/g,
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
  /\bCheckbox\b/g,
  /\bSwitch\b/g,
  /\bToggle\b/g,
];
const skipDirs = new Set(['.git', '.next', '.turbo', 'coverage', 'dist', 'node_modules', 'out']);

const moduleFileMap = {
  dashboard: 'packages/dojolm-web/src/components/dashboard/NODADashboard.tsx',
  scanner: 'packages/dojolm-web/src/app/page.tsx',
  buki: 'packages/dojolm-web/src/components/buki/PayloadLab.tsx',
  jutsu: 'packages/dojolm-web/src/components/llm/ModelLab.tsx',
  guard: 'packages/dojolm-web/src/components/guard/GuardDashboard.tsx',
  compliance: 'packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx',
  adversarial: 'packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx',
  arena: 'packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx',
  'ronin-hub': 'packages/dojolm-web/src/components/ronin/RoninHub.tsx',
  sengoku: 'packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx',
  kotoba: 'packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx',
  admin: 'packages/dojolm-web/src/components/admin/AdminPanel.tsx',
};
const moduleTokenMap = {
  dashboard: ['dashboard', 'system health', 'quick actions'],
  scanner: ['haiku scanner', 'scanner', 'scan input'],
  buki: ['buki', 'payload lab', 'fixture explorer', 'payloads', 'generator', 'fuzzer'],
  jutsu: ['model lab', 'jutsu', 'models', 'compare', 'custom'],
  guard: ['hattori guard', 'guard mode', 'audit log'],
  compliance: ['bushido book', 'compliance', 'owasp', 'nist'],
  adversarial: ['atemi lab', 'attack tools', 'adversarial'],
  strategic: ['the kumite', 'strategic hub', 'family tree'],
  'ronin-hub': ['ronin hub', 'ronin'],
  sengoku: ['sengoku'],
  kotoba: ['kotoba'],
  admin: ['admin', 'system health', 'api keys'],
};
const layoutSurfaceFiles = [
  'packages/dojolm-web/src/components/layout/Sidebar.tsx',
  'packages/dojolm-web/src/components/layout/MobileNav.tsx',
  'packages/dojolm-web/src/components/layout/PageToolbar.tsx',
  'packages/dojolm-web/src/components/layout/NotificationsPanel.tsx',
  'packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx',
  'packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx',
  'packages/dojolm-web/src/components/sensei/SenseiChat.tsx',
  'packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx',
  'packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx',
];
const pageSurfaceFiles = [
  'packages/dojolm-web/src/app/page.tsx',
  'packages/dojolm-web/src/app/layout.tsx',
  'packages/dojolm-web/src/app/login/page.tsx',
  'packages/dojolm-web/src/app/style-guide/page.tsx',
  'packages/dojolm-web/src/app/error.tsx',
  'packages/dojolm-web/src/app/not-found.tsx',
];
const playwrightConfigPath = 'packages/dojolm-web/playwright.config.ts';
const navigationSpecPath = 'packages/dojolm-web/e2e/navigation.spec.ts';
const sharedPrimitiveFiles = new Set([
  'packages/dojolm-web/src/components/ui/badge.tsx',
  'packages/dojolm-web/src/components/ui/button.tsx',
  'packages/dojolm-web/src/components/ui/card.tsx',
  'packages/dojolm-web/src/components/ui/checkbox.tsx',
  'packages/dojolm-web/src/components/ui/dialog.tsx',
  'packages/dojolm-web/src/components/ui/input.tsx',
  'packages/dojolm-web/src/components/ui/label.tsx',
  'packages/dojolm-web/src/components/ui/progress.tsx',
  'packages/dojolm-web/src/components/ui/scroll-area.tsx',
  'packages/dojolm-web/src/components/ui/select.tsx',
  'packages/dojolm-web/src/components/ui/separator.tsx',
  'packages/dojolm-web/src/components/ui/skeleton.tsx',
  'packages/dojolm-web/src/components/ui/table.tsx',
  'packages/dojolm-web/src/components/ui/tabs.tsx',
  'packages/dojolm-web/src/components/ui/textarea.tsx',
]);
const controlPatternDefs = [
  { kind: 'button', pattern: /<(button|Button)\b([^>]*)>([\s\S]*?)<\/\1>/g },
  { kind: 'link', pattern: /<(Link|a)\b([^>]*)>([\s\S]*?)<\/\1>/g },
  { kind: 'input', pattern: /<(input|Input)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g },
  { kind: 'textarea', pattern: /<(textarea|Textarea)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g },
  { kind: 'checkbox', pattern: /<(Checkbox)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g },
  { kind: 'switch', pattern: /<(Switch)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g },
  { kind: 'toggle', pattern: /<(Toggle)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g },
  { kind: 'tab-trigger', pattern: /<(TabsTrigger)\b([^>]*)>([\s\S]*?)<\/\1>/g },
  { kind: 'dialog-trigger', pattern: /<(DialogTrigger)\b([^>]*)>([\s\S]*?)<\/\1>/g },
  { kind: 'accordion-trigger', pattern: /<(AccordionTrigger)\b([^>]*)>([\s\S]*?)<\/\1>/g },
  { kind: 'select-trigger', pattern: /<(SelectTrigger)\b([^>]*)>([\s\S]*?)<\/\1>/g },
  { kind: 'menu-action', pattern: /<(DropdownMenuTrigger|DropdownMenuItem)\b([^>]*)>([\s\S]*?)<\/\1>/g },
];
const directProofNoise = new Set([
  'all',
  'app',
  'button',
  'buttons',
  'close',
  'dashboard',
  'default',
  'edit',
  'home',
  'input',
  'link',
  'main',
  'menu',
  'module',
  'more',
  'navigation',
  'next',
  'open',
  'page',
  'previous',
  'save',
  'select',
  'submit',
  'tab',
  'tabs',
  'toggle',
  'view',
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function repoRelative(fullPath) {
  return normalizePath(path.relative(repoRoot, fullPath));
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
      } else {
        files.push(fullPath);
      }
    }
  }

  return files.sort((left, right) => collator.compare(repoRelative(left), repoRelative(right)));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;|&#38;/g, '&')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&lt;|&#60;/g, '<')
    .replace(/&gt;|&#62;/g, '>');
}

function normalizeProofPhrase(value) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/\\[wWdDsS]/g, ' ')
    .replace(/\\[.*+?^${}()|[\]\\]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRegexAlternatives(value) {
  const chunks = decodeHtmlEntities(value)
    .split('|')
    .map((chunk) =>
      chunk
        .replace(/\\b/g, ' ')
        .replace(/\\s\+/g, ' ')
        .replace(/\\d\+/g, ' ')
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  return unique(chunks);
}

function extractDirectProofPhrases(content) {
  const rawValues = [];
  const stringPatterns = [
    /getByRole\(\s*['"`][^'"`]+['"`]\s*,\s*\{[^}]*\bname:\s*['"`]([^'"`]+)['"`]/g,
    /getByLabel\(\s*['"`]([^'"`]+)['"`]/g,
    /getByPlaceholder\(\s*['"`]([^'"`]+)['"`]/g,
    /getByTestId\(\s*['"`]([^'"`]+)['"`]/g,
    /aria-label=["'`]([^"'`]+)["'`]/g,
  ];
  const regexPatterns = [
    /getByRole\(\s*['"`][^'"`]+['"`]\s*,\s*\{[^}]*\bname:\s*\/([^/]+)\/[gimsuy]*/g,
    /getByLabel\(\s*\/([^/]+)\/[gimsuy]*/g,
    /getByPlaceholder\(\s*\/([^/]+)\/[gimsuy]*/g,
  ];

  for (const pattern of stringPatterns) {
    rawValues.push(...extractMatches(content, pattern));
  }

  for (const pattern of regexPatterns) {
    for (const entry of extractMatches(content, pattern)) {
      rawValues.push(...extractRegexAlternatives(entry));
    }
  }

  return unique(
    rawValues
      .map((value) => normalizeProofPhrase(value))
      .filter((value) => value.length >= 4)
      .filter((value) => !directProofNoise.has(value)),
  );
}

function countMatches(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function interactiveCount(content) {
  return interactivePatterns.reduce((total, pattern) => total + countMatches(content, pattern), 0);
}

function extractMatches(content, pattern) {
  const results = [];
  for (const match of content.matchAll(pattern)) {
    const value = match[1];
    if (value) {
      results.push(value.trim());
    }
  }
  return unique(results);
}

function extractQuotedLabels(content) {
  return unique([
    ...extractMatches(content, /title=\s*["'`]([^"'`]+)["'`]/g),
    ...extractMatches(content, /aria-label=\s*["'`]([^"'`]+)["'`]/g),
    ...extractMatches(content, /label:\s*["'`]([^"'`]+)["'`]/g),
    ...extractMatches(content, /fallbackTitle=\s*["'`]([^"'`]+)["'`]/g),
  ]).filter((value) => /[A-Za-z]/.test(value));
}

function lineNumberAt(content, index = 0) {
  return content.slice(0, index).split('\n').length;
}

function extractAttributeValue(attributes, name) {
  const match = attributes.match(new RegExp(`${name}\\s*=\\s*["'\`]([^"'\\\`]+)["'\`]`));
  return match ? match[1].trim() : '';
}

function normalizeControlText(value) {
  let text = value
    .replace(/\{\s*['"`]([^'"`]+)['"`]\s*\}/g, ' $1 ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

  while (/\{[^{}]*\}/.test(text)) {
    text = text.replace(/\{[^{}]*\}/g, ' ');
  }

  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeJsxCode(value) {
  return /className=|onClick=|aria-|disabled=|role=|set[A-Z][A-Za-z]+|handle[A-Z][A-Za-z]+|=>|\|\||&&|\(\)|\{\s*$/.test(
    value,
  );
}

function extractTrailingHumanLabel(value) {
  const match = value.match(/([A-Za-z][A-Za-z0-9&+/' -]{1,48})$/);
  if (!match) {
    return '';
  }

  const candidate = match[1].trim();
  if (!candidate || looksLikeJsxCode(candidate)) {
    return '';
  }

  return candidate;
}

function truncate(value, limit = 80) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}...`;
}

function resolveControlLabel(attributes, body, tagName) {
  const rawCombined = `${attributes} ${body}`;
  const attributeCandidates = [
    'aria-label',
    'title',
    'label',
    'placeholder',
    'value',
  ];

  for (const candidate of attributeCandidates) {
    const value =
      extractAttributeValue(attributes, candidate) ||
      extractAttributeValue(rawCombined, candidate);
    if (value && /[A-Za-z]/.test(value)) {
      const normalized = truncate(value);
      if (!looksLikeJsxCode(normalized)) {
        return normalized;
      }
    }
  }

  const bodyText = normalizeControlText(body);
  if (bodyText && /[A-Za-z]/.test(bodyText) && !looksLikeJsxCode(bodyText)) {
    return truncate(bodyText);
  }

  const fallbackLabel = extractTrailingHumanLabel(normalizeControlText(rawCombined));
  if (fallbackLabel) {
    return truncate(fallbackLabel);
  }

  if (tagName === 'Link' || tagName === 'a') {
    const href = extractAttributeValue(attributes, 'href');
    if (href) {
      return truncate(href);
    }
  }

  return 'UNLABELED';
}

function summarizeList(values, limit = 4) {
  const cleaned = unique(values);
  if (cleaned.length === 0) {
    return '--';
  }
  if (cleaned.length <= limit) {
    return cleaned.join(', ');
  }
  return `${cleaned.slice(0, limit).join(', ')} +${cleaned.length - limit}`;
}

function escapeCell(value) {
  return String(value ?? '--')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
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

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function extractNavItems() {
  const content = readText('packages/dojolm-web/src/lib/constants.ts');
  const blockMatch = content.match(/export const NAV_ITEMS = \[(.*?)\] as const/s);
  if (!blockMatch) {
    return [];
  }

  const items = [];
  const itemPattern =
    /{\s*id:\s*'([^']+)'.*?label:\s*'([^']+)'.*?description:\s*'([^']+)'.*?(?:group:\s*'([^']+)' as NavGroup,)?\s*}/gs;

  for (const match of blockMatch[1].matchAll(itemPattern)) {
    items.push({
      id: match[1],
      label: match[2],
      description: match[3],
      group: match[4] || '--',
      file: moduleFileMap[match[1]] ?? '--',
      tokens: unique([match[2], match[1], ...(moduleTokenMap[match[1]] ?? [])]),
    });
  }

  return items;
}

function loadSpecs() {
  return walk('packages/dojolm-web/e2e')
    .filter((fullPath) => fullPath.endsWith('.ts'))
    .map((fullPath) => {
      const relativePath = repoRelative(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const suite = extractMatches(content, /test\.describe\(\s*['"`]([^'"`]+)['"`]/g)[0] ?? path.basename(relativePath);
      const testCount = (content.match(/\btest\(/g) ?? []).length;
      return {
        relativePath,
        basename: path.basename(relativePath),
        suite,
        content,
        lower: content.toLowerCase(),
        testCount,
        directProofPhrases: extractDirectProofPhrases(content),
      };
    });
}

function buildSpecRefs(specs, tokens) {
  const normalizedTokens = unique(
    tokens
      .flatMap((token) => [token, token.toLowerCase()])
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length >= 4),
  );

  return specs
    .filter((spec) => normalizedTokens.some((token) => spec.lower.includes(token)))
    .map((spec) => spec.basename)
    .sort(collator.compare);
}

function isVisualHybrid(content, relativePath) {
  return /recharts|Radar|Heatmap|Gauge|Trend|Graph|Tree|svg|chart/i.test(content + relativePath);
}

function isDeviceHybrid(content, relativePath) {
  return /audio|video|upload|download|file input|FileReader|Blob/i.test(content + relativePath);
}

function recommendedRunner(content, relativePath) {
  const visual = isVisualHybrid(content, relativePath);
  const device = isDeviceHybrid(content, relativePath);

  if (visual && device) {
    return 'Playwright + manual visual/device';
  }
  if (visual) {
    return 'Playwright + manual visual';
  }
  if (device) {
    return 'Playwright + manual device';
  }
  return 'Playwright';
}

function requiredCoverage(category, relativePath) {
  if (category === 'module') {
    return 'load, primary journey, error/empty, keyboard, mobile';
  }
  if (category === 'page') {
    return 'load, primary CTA or recovery, responsive, nav/back path';
  }
  if (category === 'layout') {
    return 'navigation, focus management, responsive, open/close states';
  }
  if (category === 'widget') {
    return 'render, CTA/open, empty/error, responsive';
  }
  if (/Sensei/.test(relativePath)) {
    return 'open/close, prompt flow, keyboard, streaming/tool states';
  }
  return 'interaction path, keyboard, visual states';
}

function surfaceStatus(specRefs, runner) {
  if (specRefs.length > 0) {
    return runner.startsWith('Playwright') ? 'heuristic playwright reference' : 'heuristic manual reference';
  }
  if (runner.startsWith('Playwright')) {
    return 'playwright gap';
  }
  return 'manual gap';
}

function buildModuleSurfaces(specs) {
  return extractNavItems().map((item) => {
    const content = item.file !== '--' && fs.existsSync(path.join(repoRoot, item.file))
      ? readText(item.file)
      : '';
    const specRefs = buildSpecRefs(specs, [...item.tokens, item.label, item.id, path.basename(item.file, '.tsx')]);
    const runner = recommendedRunner(content, item.file);
    return {
      category: 'module',
      label: item.label,
      area: item.group,
      file: item.file,
      interactive: interactiveCount(content),
      specRefs,
      runner,
      status: surfaceStatus(specRefs, runner),
      required: requiredCoverage('module', item.file),
      notes: item.description,
    };
  });
}

function buildPageSurfaces(specs) {
  const labels = {
    'packages/dojolm-web/src/app/page.tsx': 'dashboard-root:/',
    'packages/dojolm-web/src/app/layout.tsx': 'app-shell:/',
    'packages/dojolm-web/src/app/login/page.tsx': '/login',
    'packages/dojolm-web/src/app/style-guide/page.tsx': '/style-guide',
    'packages/dojolm-web/src/app/error.tsx': 'boundary:error',
    'packages/dojolm-web/src/app/not-found.tsx': 'boundary:404',
  };
  const tokenMap = {
    'packages/dojolm-web/src/app/page.tsx': ['dashboard', 'system health'],
    'packages/dojolm-web/src/app/layout.tsx': ['main navigation', 'sensei'],
    'packages/dojolm-web/src/app/login/page.tsx': ['login', 'sign in'],
    'packages/dojolm-web/src/app/style-guide/page.tsx': ['style guide'],
    'packages/dojolm-web/src/app/error.tsx': ['try again', 'dashboard error'],
    'packages/dojolm-web/src/app/not-found.tsx': ['return to dashboard', 'not found'],
  };

  return pageSurfaceFiles.map((file) => {
    const content = readText(file);
    const specRefs = buildSpecRefs(specs, [labels[file], ...(tokenMap[file] ?? [])]);
    const runner = recommendedRunner(content, file);
    return {
      category: 'page',
      label: labels[file],
      area: file.includes('/app/') ? 'app' : '--',
      file,
      interactive: interactiveCount(content),
      specRefs,
      runner,
      status: surfaceStatus(specRefs, runner),
      required: requiredCoverage('page', file),
      notes: file.endsWith('page.tsx') ? 'standalone route' : 'shell/boundary',
    };
  });
}

function buildLayoutSurfaces(specs) {
  const tokenMap = {
    'packages/dojolm-web/src/components/layout/Sidebar.tsx': ['sidebar', 'main navigation', 'sensei', 'activity'],
    'packages/dojolm-web/src/components/layout/MobileNav.tsx': ['mobile navigation', 'more navigation options', 'more'],
    'packages/dojolm-web/src/components/layout/PageToolbar.tsx': ['toolbar', 'search'],
    'packages/dojolm-web/src/components/layout/NotificationsPanel.tsx': ['notification', 'bell'],
    'packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx': ['customize', 'widget'],
    'packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx': ['sensei', 'assistant'],
    'packages/dojolm-web/src/components/sensei/SenseiChat.tsx': ['chat'],
    'packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx': ['suggestion'],
    'packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx': ['tool result'],
  };

  return layoutSurfaceFiles.map((file) => {
    const content = readText(file);
    const specRefs = buildSpecRefs(specs, [path.basename(file, '.tsx'), ...(tokenMap[file] ?? [])]);
    const runner = recommendedRunner(content, file);
    return {
      category: 'layout',
      label: path.basename(file, '.tsx'),
      area: file.includes('/sensei/') ? 'sensei' : 'layout',
      file,
      interactive: interactiveCount(content),
      specRefs,
      runner,
      status: surfaceStatus(specRefs, runner),
      required: requiredCoverage('layout', file),
      notes: file.includes('/sensei/') ? 'global assistant UX' : 'global navigation/toolbar UX',
    };
  });
}

function buildWidgetSurfaces(specs) {
  return walk('packages/dojolm-web/src/components/dashboard/widgets')
    .filter((fullPath) => fullPath.endsWith('.tsx'))
    .map((fullPath) => {
      const file = repoRelative(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const tokens = [
        path.basename(file, '.tsx'),
        ...extractQuotedLabels(content),
      ];
      const specRefs = buildSpecRefs(specs, tokens);
      const runner = recommendedRunner(content, file);
      return {
        category: 'widget',
        label: path.basename(file, '.tsx'),
        area: 'dashboard',
        file,
        interactive: interactiveCount(content),
        specRefs,
        runner,
        status: surfaceStatus(specRefs, runner),
        required: requiredCoverage('widget', file),
        notes: summarizeList(extractQuotedLabels(content), 3),
      };
    });
}

function buildInteractiveComponents(specs, excludedFiles) {
  return walk('packages/dojolm-web/src/components')
    .filter((fullPath) => fullPath.endsWith('.tsx'))
    .map((fullPath) => repoRelative(fullPath))
    .filter((file) => !file.includes('/__tests__/'))
    .filter((file) => !excludedFiles.has(file))
    .map((file) => {
      const content = readText(file);
      return {
        category: 'component',
        label: path.basename(file, '.tsx'),
        area: file.slice('packages/dojolm-web/src/components/'.length).split('/')[0] || 'components',
        file,
        content,
        interactive: interactiveCount(content),
        labels: extractQuotedLabels(content),
      };
    })
    .filter((surface) => surface.interactive > 0)
    .map((surface) => {
      const specRefs = buildSpecRefs(specs, [surface.label, ...surface.labels]);
      const runner = recommendedRunner(surface.content, surface.file);
      return {
        category: 'component',
        label: surface.label,
        area: surface.area,
        file: surface.file,
        interactive: surface.interactive,
        specRefs,
        runner,
        status: surfaceStatus(specRefs, runner),
        required: requiredCoverage('component', surface.file),
        notes: summarizeList(surface.labels, 3),
      };
    })
    .sort((left, right) => collator.compare(left.file, right.file));
}

function buildControlSourceSurfaces({
  moduleSurfaces,
  pageSurfaces,
  layoutSurfaces,
  widgetSurfaces,
  interactiveComponents,
}) {
  const ordered = [
    ...pageSurfaces,
    ...layoutSurfaces,
    ...widgetSurfaces,
    ...interactiveComponents,
    ...moduleSurfaces,
  ];
  const seenFiles = new Set();
  const controlSurfaces = [];

  for (const surface of ordered) {
    if (
      surface.file === '--' ||
      sharedPrimitiveFiles.has(surface.file) ||
      seenFiles.has(surface.file)
    ) {
      continue;
    }

    seenFiles.add(surface.file);
    controlSurfaces.push(surface);
  }

  return controlSurfaces.sort((left, right) => collator.compare(left.file, right.file));
}

function labelEligibleForDirectProof(label) {
  const normalized = normalizeProofPhrase(label);
  if (!normalized || normalized.length < 4) {
    return false;
  }
  if (directProofNoise.has(normalized)) {
    return false;
  }
  return true;
}

function matchesDirectProofPhrase(label, phrase) {
  if (!label || !phrase) {
    return false;
  }

  if (phrase === label) {
    return true;
  }

  const labelWords = label.split(' ').filter(Boolean);
  const phraseWords = phrase.split(' ').filter(Boolean);
  const significantLabelWords = labelWords.filter((word) => word.length >= 4);
  const significantPhraseWords = phraseWords.filter((word) => word.length >= 4);

  if (significantLabelWords.length <= 1 || significantPhraseWords.length <= 1) {
    return false;
  }

  const sharedWordCount = significantLabelWords.filter((word) =>
    significantPhraseWords.includes(word),
  ).length;
  if (sharedWordCount >= 2) {
    return true;
  }

  return phrase.includes(label) || label.includes(phrase);
}

function findDirectProofRefs(label, specs) {
  const normalizedLabel = normalizeProofPhrase(label);
  if (!labelEligibleForDirectProof(normalizedLabel)) {
    return [];
  }

  return specs
    .filter((spec) =>
      spec.directProofPhrases.some((phrase) => matchesDirectProofPhrase(normalizedLabel, phrase)),
    )
    .map((spec) => spec.basename)
    .sort(collator.compare);
}

function buildControlInventory(controlSurfaces, specs) {
  const controls = [];

  for (const surface of controlSurfaces) {
    const content = readText(surface.file);
    const surfaceControls = new Map();

    for (const definition of controlPatternDefs) {
      for (const match of content.matchAll(definition.pattern)) {
        const tagName = match[1];
        const attributes = match[2] ?? '';
        const body = match[3] ?? '';
        const line = lineNumberAt(content, match.index ?? 0);
        const label = resolveControlLabel(attributes, body, tagName);
        const dedupeKey = `${tagName}|${label}|${line}`;

        if (surfaceControls.has(dedupeKey)) {
          continue;
        }

        surfaceControls.set(dedupeKey, {
          surface: surface.label,
          category: surface.category,
          control: definition.kind,
          label,
          line,
          specRefs: surface.specRefs,
          directProofRefs: [],
          runner: surface.runner,
          status:
            label === 'UNLABELED'
              ? 'manual label audit'
              : surface.specRefs.length > 0
                ? 'inherits heuristic surface reference'
                : surface.runner.startsWith('Playwright')
                  ? 'playwright gap'
                  : 'manual gap',
          file: surface.file,
        });
      }
    }

    controls.push(...surfaceControls.values());
  }

  for (const control of controls) {
    if (control.label === 'UNLABELED') {
      continue;
    }

    control.directProofRefs = findDirectProofRefs(control.label, specs);
    if (control.directProofRefs.length > 0) {
      control.status = 'direct control proof';
      continue;
    }

    control.status =
      control.specRefs.length > 0
        ? 'inherits heuristic surface reference'
        : control.runner.startsWith('Playwright')
          ? 'playwright gap'
          : 'manual gap';
  }

  controls.sort((left, right) => {
    if (left.file !== right.file) {
      return collator.compare(left.file, right.file);
    }
    if (left.line !== right.line) {
      return left.line - right.line;
    }
    return collator.compare(left.label, right.label);
  });

  return {
    controls,
    namedControls: controls.filter((control) => control.label !== 'UNLABELED'),
    unlabeledControls: controls.filter((control) => control.label === 'UNLABELED'),
  };
}

function summarizeControlCategoryRows(controls) {
  const byCategory = new Map();

  for (const control of controls) {
    const current = byCategory.get(control.category) ?? {
      category: control.category,
      total: 0,
      directProof: 0,
      inherited: 0,
      playwrightGap: 0,
      manualGap: 0,
      manualLabelAudit: 0,
    };

    current.total += 1;
    if (control.status === 'direct control proof') {
      current.directProof += 1;
    } else if (control.status === 'inherits heuristic surface reference') {
      current.inherited += 1;
    } else if (control.status === 'playwright gap') {
      current.playwrightGap += 1;
    } else if (control.status === 'manual gap') {
      current.manualGap += 1;
    } else if (control.status === 'manual label audit') {
      current.manualLabelAudit += 1;
    }

    byCategory.set(control.category, current);
  }

  return [...byCategory.values()].sort((left, right) => collator.compare(left.category, right.category));
}

function summarizeControlStatusCounts(controls) {
  return {
    directProof: controls.filter((control) => control.status === 'direct control proof').length,
    inherited: controls.filter((control) => control.status === 'inherits heuristic surface reference').length,
    manualLabelAudit: controls.filter((control) => control.status === 'manual label audit').length,
    playwrightGap: controls.filter((control) => control.status === 'playwright gap').length,
    manualGap: controls.filter((control) => control.status === 'manual gap').length,
  };
}

function summarizeCategoryRows(surfaces) {
  const byCategory = new Map();
  for (const surface of surfaces) {
    const current = byCategory.get(surface.category) ?? {
      category: surface.category,
      total: 0,
      covered: 0,
      gaps: 0,
    };
    current.total += 1;
    if (surface.specRefs.length > 0) {
      current.covered += 1;
    } else {
      current.gaps += 1;
    }
    byCategory.set(surface.category, current);
  }
  return [...byCategory.values()];
}

function buildSharedModuleFileRows(moduleSurfaces) {
  const byFile = new Map();

  for (const surface of moduleSurfaces) {
    if (surface.file === '--') {
      continue;
    }

    const current = byFile.get(surface.file) ?? {
      file: surface.file,
      labels: [],
      areas: [],
      specRefs: [],
      runners: [],
      interactive: 0,
    };

    current.labels.push(surface.label);
    current.areas.push(surface.area);
    current.specRefs.push(...surface.specRefs);
    current.runners.push(surface.runner);
    current.interactive += surface.interactive;

    byFile.set(surface.file, current);
  }

  return [...byFile.values()]
    .filter((entry) => unique(entry.labels).length > 1)
    .map((entry) => ({
      ...entry,
      labels: unique(entry.labels).sort(collator.compare),
      areas: unique(entry.areas).sort(collator.compare),
      specRefs: unique(entry.specRefs).sort(collator.compare),
      runners: unique(entry.runners).sort(collator.compare),
    }))
    .sort((left, right) => collator.compare(left.file, right.file));
}

function loadPlaywrightConfigSummary() {
  if (!fs.existsSync(path.join(repoRoot, playwrightConfigPath))) {
    return {
      file: playwrightConfigPath,
      projectCount: 0,
      projectNames: [],
      mobileProjectCount: 0,
      status: 'missing config',
      action: 'restore Playwright config before claiming browser coverage',
    };
  }

  const content = readText(playwrightConfigPath);
  const projectNames = extractMatches(content, /name:\s*['"`]([^'"`]+)['"`]/g);
  const deviceNames = extractMatches(content, /devices\[['"`]([^'"`]+)['"`]\]/g);
  const mobilePattern = /mobile|iphone|ipad|pixel|android|tablet/i;
  const namedMobileProjects = projectNames.filter((value) => mobilePattern.test(value));
  const deviceMobileProjects = deviceNames.filter((value) => mobilePattern.test(value));
  const mobileProjectCount = Math.max(namedMobileProjects.length, deviceMobileProjects.length);

  return {
    file: playwrightConfigPath,
    projectCount: projectNames.length,
    projectNames,
    mobileProjectCount,
    status: mobileProjectCount > 0 ? 'desktop+mobile configured' : 'desktop-only config gap',
    action: mobileProjectCount > 0
      ? 'keep desktop/mobile projects aligned with UX policy'
      : 'add at least one mobile Playwright project before claiming full UX automation coverage',
  };
}

function loadNavigationSpecSummary(expectedNavCount) {
  if (!fs.existsSync(path.join(repoRoot, navigationSpecPath))) {
    return {
      file: navigationSpecPath,
      declaredModules: 0,
      expectedModules: expectedNavCount,
      declaredNames: [],
      missingNames: [],
      unexpectedNames: [],
      status: 'missing spec',
      action: 'restore navigation spec coverage for current nav inventory',
    };
  }

  const content = readText(navigationSpecPath);
  const declaredNames = extractMatches(content, /{\s*name:\s*['"`]([^'"`]+)['"`]/g);
  const expectedNames = extractNavItems().map((item) => item.label);
  const missingNames = expectedNames.filter((name) => !declaredNames.includes(name));
  const unexpectedNames = declaredNames.filter((name) => !expectedNames.includes(name));
  const declaredModules = declaredNames.length;
  const inSync =
    declaredModules === expectedNavCount &&
    missingNames.length === 0 &&
    unexpectedNames.length === 0;

  return {
    file: navigationSpecPath,
    declaredModules,
    expectedModules: expectedNavCount,
    declaredNames,
    missingNames,
    unexpectedNames,
    status: inSync
      ? 'in sync'
      : `mismatch (${declaredModules}/${expectedNavCount}; missing ${missingNames.length}; unexpected ${unexpectedNames.length})`,
    action: inSync
      ? 'keep navigation suite aligned with NAV_ITEMS changes'
      : 'update navigation coverage to the full current module inventory and exact labels',
  };
}

function buildGapRegister(surfaces) {
  const categoryWeight = {
    module: 100,
    page: 90,
    layout: 80,
    widget: 70,
    component: 50,
  };

  return surfaces
    .filter((surface) => surface.specRefs.length === 0)
    .sort((left, right) => {
      const leftScore = (categoryWeight[left.category] ?? 0) + left.interactive;
      const rightScore = (categoryWeight[right.category] ?? 0) + right.interactive;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return collator.compare(left.file, right.file);
    })
    .slice(0, 80);
}

function renderSurfaceTable(surfaces, headers) {
  return buildTable(
    headers,
    surfaces.map((surface) => [
      surface.label,
      surface.area,
      surface.interactive,
      summarizeList(surface.specRefs, 3),
      surface.runner,
      surface.status,
      surface.required,
      `\`${surface.file}\``,
    ]),
  );
}

function renderControlTable(controls) {
  return buildTable(
    ['Surface', 'Category', 'Control', 'Label', 'Line', 'Direct Proof Refs', 'Spec References', 'Status', 'File'],
    controls.map((control) => [
      control.surface,
      control.category,
      control.control,
      control.label === 'UNLABELED' ? 'manual audit required' : control.label,
      control.line,
      summarizeList(control.directProofRefs, 3),
      summarizeList(control.specRefs, 3),
      control.status,
      `\`${control.file}\``,
    ]),
  );
}

function main() {
  const specs = loadSpecs();
  const moduleSurfaces = buildModuleSurfaces(specs);
  const pageSurfaces = buildPageSurfaces(specs);
  const layoutSurfaces = buildLayoutSurfaces(specs);
  const widgetSurfaces = buildWidgetSurfaces(specs);
  const playwrightConfig = loadPlaywrightConfigSummary();
  const navigationSpec = loadNavigationSpecSummary(moduleSurfaces.length);
  const excludedFiles = new Set([
    ...layoutSurfaceFiles,
    ...widgetSurfaces.map((surface) => surface.file),
    ...moduleSurfaces.map((surface) => surface.file).filter((file) => file !== '--'),
  ]);
  const interactiveComponents = buildInteractiveComponents(specs, excludedFiles);
  const allSurfaces = [
    ...moduleSurfaces,
    ...pageSurfaces,
    ...layoutSurfaces,
    ...widgetSurfaces,
    ...interactiveComponents,
  ];
  const controlSurfaces = buildControlSourceSurfaces({
    moduleSurfaces,
    pageSurfaces,
    layoutSurfaces,
    widgetSurfaces,
    interactiveComponents,
  });
  const controlInventory = buildControlInventory(controlSurfaces, specs);
  const summaryRows = summarizeCategoryRows(allSurfaces);
  const controlSummaryRows = summarizeControlCategoryRows(controlInventory.controls);
  const controlStatusCounts = summarizeControlStatusCounts(controlInventory.controls);
  const sharedModuleFiles = buildSharedModuleFileRows(moduleSurfaces);
  const gaps = buildGapRegister(allSurfaces);

  const lines = [];
  lines.push('# UAT / UX Coverage Matrix (Generated)');
  lines.push('');
  lines.push(`Generated on ${new Date().toISOString()}.`);
  lines.push('');
  lines.push('This file inventories the current user-facing DojoLM surface area for UAT and UX planning.');
  lines.push('Playwright is the default runner whenever the surface is automatable in-browser.');
  lines.push('Spec references are heuristic planning signals based on current Playwright suite text, not proof that every listed control or path is directly asserted.');
  lines.push('');
  lines.push('## Audit Signals');
  lines.push('');
  lines.push(
    buildTable(
      ['Metric', 'Value'],
      [
        ['Nav modules tracked', moduleSurfaces.length],
        ['Standalone app surfaces tracked', pageSurfaces.length],
        ['Global UX/layout surfaces tracked', layoutSurfaces.length],
        ['Dashboard widgets tracked', widgetSurfaces.length],
        ['Interactive components tracked', interactiveComponents.length],
        ['Actionable controls tracked', controlInventory.controls.length],
        ['Controls with explicit labels', controlInventory.namedControls.length],
        ['Controls needing manual label audit', controlInventory.unlabeledControls.length],
        ['Controls with direct control-to-test proof', controlStatusCounts.directProof],
        ['Controls inheriting parent-surface references', controlStatusCounts.inherited],
        ['Control Playwright gaps', controlStatusCounts.playwrightGap],
        ['Shared module render files', sharedModuleFiles.length],
        ['Playwright specs in repo', specs.length],
        ['Playwright projects configured', playwrightConfig.projectCount],
        ['Mobile Playwright projects configured', playwrightConfig.mobileProjectCount],
        ['Navigation spec modules declared', navigationSpec.declaredModules],
        ['Playwright config status', playwrightConfig.status],
        ['Navigation inventory parity', navigationSpec.status],
      ],
    ),
  );
  lines.push('');
  lines.push('## Runner Policy');
  lines.push('');
  lines.push('| Surface Type | Default Runner | Notes |');
  lines.push('| --- | --- | --- |');
  lines.push('| Modules / routes / nav | Playwright | Desktop + mobile + keyboard paths are required. |');
  lines.push('| Widgets / drawers / dialogs / forms | Playwright | Include empty, error, and responsive states. |');
  lines.push('| Charts / graphs / visual summaries | Playwright + manual visual | Playwright for behavior; manual pass for visual correctness. |');
  lines.push('| File/audio/video/device-sensitive UX | Playwright + manual device | Automate the browser path and supplement with manual device validation. |');
  lines.push('');
  lines.push('## Execution Controls');
  lines.push('');
  lines.push(
    buildTable(
      ['Control', 'Current Status', 'Evidence', 'Required Action'],
      [
        [
          'Surface inventory freshness',
          'pass',
          `\`${repoRelative(outputPath)}\``,
          'regenerate this file whenever app navigation, pages, widgets, or interactive components change',
        ],
        [
          'Playwright config breadth',
          playwrightConfig.status,
          `\`${playwrightConfig.file}\` (${summarizeList(playwrightConfig.projectNames, 3)})`,
          playwrightConfig.action,
        ],
        [
          'Navigation spec parity',
          navigationSpec.status,
          `\`${navigationSpec.file}\` (${navigationSpec.declaredModules}/${navigationSpec.expectedModules} modules; missing ${summarizeList(navigationSpec.missingNames, 2)}; unexpected ${summarizeList(navigationSpec.unexpectedNames, 2)})`,
          navigationSpec.action,
        ],
        [
          'Actionable control naming',
          controlInventory.unlabeledControls.length === 0
            ? 'all tracked controls named'
            : `${controlInventory.unlabeledControls.length} controls need manual label audit`,
          `\`${repoRelative(outputPath)}\` actionable-control inventory`,
          controlInventory.unlabeledControls.length === 0
            ? 'keep accessible names stable when editing controls'
            : 'review icon-only or expression-only controls and add accessible names or QA notes before release sign-off',
        ],
        [
          'Control-level proof layer',
          controlStatusCounts.directProof > 0
            ? `${controlStatusCounts.directProof} direct proof link(s) detected`
            : 'implemented (no direct proof links detected in current suite)',
          `\`${repoRelative(outputPath)}\` actionable-control inventory`,
          controlStatusCounts.directProof > 0
            ? 'expand explicit selector assertions to reduce inherited-only control coverage'
            : 'add more explicit getByRole/getByLabel selector assertions for control-level proof',
        ],
        [
          'Shared module render files',
          sharedModuleFiles.length === 0
            ? 'none'
            : `${sharedModuleFiles.length} files serve multiple module labels`,
          sharedModuleFiles.length === 0
            ? '--'
            : summarizeList(
                sharedModuleFiles.map((entry) => `${path.basename(entry.file)}: ${entry.labels.join(', ')}`),
                2,
              ),
          sharedModuleFiles.length === 0
            ? 'keep module-to-file ownership stable'
            : 'record per-label evidence for every shared-file module and do not let sibling references piggyback',
        ],
      ],
    ),
  );
  lines.push('');
  lines.push('## Shared Module Render Files');
  lines.push('');
  if (sharedModuleFiles.length === 0) {
    lines.push('No shared render files detected across tracked module root surfaces.');
  } else {
    lines.push(
      buildTable(
        ['File', 'Module Labels', 'Groups', 'Interactive', 'Spec References', 'Required Audit'],
        sharedModuleFiles.map((entry) => [
          `\`${entry.file}\``,
          entry.labels.join(', '),
          entry.areas.join(', '),
          entry.interactive,
          summarizeList(entry.specRefs, 3),
          'capture per-label evidence; do not treat sibling references as interchangeable proof',
        ]),
      ),
    );
  }
  lines.push('');
  lines.push('## Current Playwright Inventory');
  lines.push('');
  lines.push(
    buildTable(
      ['Spec', 'Suite', 'Tests', 'Primary Focus'],
      specs.map((spec) => [
        `\`${spec.relativePath}\``,
        spec.suite,
        spec.testCount,
        summarizeList(
          [spec.basename.replace('.spec.ts', ''), spec.suite],
          2,
        ),
      ]),
    ),
  );
  lines.push('');
  lines.push('## Coverage Summary');
  lines.push('');
  lines.push(
    buildTable(
      ['Category', 'Tracked', 'Currently Heuristically Referenced', 'Playwright Gaps'],
      summaryRows.map((row) => [row.category, row.total, row.covered, row.gaps]),
    ),
  );
  lines.push('');
  lines.push('## Actionable Control Summary');
  lines.push('');
  lines.push('Control inventory is file-based to avoid duplicate rows when multiple module labels share one rendering surface.');
  lines.push('Control inventory is static-source derived and can miss controls created only through runtime data, portals, or third-party widgets.');
  lines.push('Control rows include direct-proof links when explicit selector phrases in Playwright specs match control labels.');
  lines.push('Direct-proof links are heuristic and should be paired with run evidence for release sign-off.');
  lines.push('');
  lines.push(
    buildTable(
      ['Source Category', 'Controls Tracked', 'Direct Proof Links', 'Inherited Parent-Surface References', 'Playwright Gaps', 'Manual Gaps', 'Manual Label Audit'],
      controlSummaryRows.map((row) => [
        row.category,
        row.total,
        row.directProof,
        row.inherited,
        row.playwrightGap,
        row.manualGap,
        row.manualLabelAudit,
      ]),
    ),
  );
  lines.push('');
  lines.push('## Actionable Control Inventory');
  lines.push('');
  lines.push('<details>');
  lines.push(`<summary>Actionable control inventory (${controlInventory.controls.length} controls)</summary>`);
  lines.push('');
  lines.push(renderControlTable(controlInventory.controls));
  lines.push('');
  lines.push('</details>');
  lines.push('');
  lines.push('## Manual Label Audit Queue');
  lines.push('');
  if (controlInventory.unlabeledControls.length === 0) {
    lines.push('No unlabeled actionable controls detected in the tracked file-based inventory.');
  } else {
    lines.push('<details>');
    lines.push(`<summary>Controls requiring manual label audit (${controlInventory.unlabeledControls.length})</summary>`);
    lines.push('');
    lines.push(renderControlTable(controlInventory.unlabeledControls));
    lines.push('');
    lines.push('</details>');
  }
  lines.push('');
  lines.push('## Priority Gap Register');
  lines.push('');
  lines.push(
    buildTable(
      ['Surface', 'Category', 'Interactive', 'Recommended Runner', 'Required Coverage', 'File'],
      gaps.map((surface) => [
        surface.label,
        surface.category,
        surface.interactive,
        surface.runner,
        surface.required,
        `\`${surface.file}\``,
      ]),
    ),
  );
  lines.push('');
  lines.push('## Module Journeys');
  lines.push('');
  lines.push(
    renderSurfaceTable(
      moduleSurfaces,
      ['Module', 'Group', 'Interactive', 'Spec References', 'Runner', 'Status', 'Required Coverage', 'File'],
    ),
  );
  lines.push('');
  lines.push('## Standalone App Surfaces');
  lines.push('');
  lines.push(
    renderSurfaceTable(
      pageSurfaces,
      ['Surface', 'Area', 'Interactive', 'Spec References', 'Runner', 'Status', 'Required Coverage', 'File'],
    ),
  );
  lines.push('');
  lines.push('## Layout And Global UX');
  lines.push('');
  lines.push(
    renderSurfaceTable(
      layoutSurfaces,
      ['Surface', 'Area', 'Interactive', 'Spec References', 'Runner', 'Status', 'Required Coverage', 'File'],
    ),
  );
  lines.push('');
  lines.push('## Dashboard Widgets');
  lines.push('');
  lines.push(
    renderSurfaceTable(
      widgetSurfaces,
      ['Widget', 'Area', 'Interactive', 'Spec References', 'Runner', 'Status', 'Required Coverage', 'File'],
    ),
  );
  lines.push('');
  lines.push('## Interactive Components');
  lines.push('');
  lines.push('<details>');
  lines.push(`<summary>Interactive component inventory (${interactiveComponents.length} surfaces)</summary>`);
  lines.push('');
  lines.push(
    renderSurfaceTable(
      interactiveComponents,
      ['Component', 'Area', 'Interactive', 'Spec References', 'Runner', 'Status', 'Required Coverage', 'File'],
    ),
  );
  lines.push('');
  lines.push('</details>');

  ensureDirectory(outputPath);
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${repoRelative(outputPath)}`);
  console.log(`Tracked ${allSurfaces.length} UAT/UX surfaces with ${specs.length} Playwright specs.`);
  console.log(`Tracked ${controlInventory.controls.length} actionable controls (${controlInventory.unlabeledControls.length} need manual label audit).`);
  console.log(`Flagged ${gaps.length} prioritized Playwright gaps.`);
}

main();
