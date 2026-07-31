// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/no-cross-vocabulary-leakage — Epic 1, Story E1.S4
 *
 * Token-discipline gate that flags any single CSS file that references
 * tokens from BOTH layers of the project's parallel cascades. Per
 * `audit/REMEDIATION-PLAN.md` §E1.S4 acceptance: "lint flags any file
 * mixing `--bg-primary` (Layer-1 brand) and `--bg` (Layer-3 design)
 * vocabularies."
 *
 * F-1-004 (P1) "Two parallel token systems collide; no shared
 * vocabulary across 30 ui/ + 145 design/ files" — the project
 * has TWO orthogonal token vocabularies that do not overlap and do
 * not alias each other:
 *
 *   - Layer 1 (brand) — packages/dojolm-web/src/app/brand-tokens.css
 *     Names like `--bg-primary`, `--text-primary`, `--space-N`,
 *     `--text-base`, `--radius-card`, `--font-body`, `--border`,
 *     `--color-success`, `--bu-cyan`, `--brand-*`. Cross-product
 *     vocabulary (BU-WEB / DojoLM / future products).
 *
 *   - Layer 3 (design) — packages/dojolm-web/src/design/styles/tokens.css
 *     Names like `--bg`, `--bg-1..5`, `--fg`, `--fg-dim`, `--fg-mute`,
 *     `--torii`, `--torii-lg`, `--steel`, `--violet`, `--cyan`,
 *     `--jade`, `--gold`, `--b-0..3`, `--r-sm..2xl`, `--sans`,
 *     `--mono`. DojoLM design-system canonical vocabulary.
 *
 * The two vocabularies are intentionally orthogonal — modifying
 * `--text-primary` (Layer-1) does NOT change anything in
 * `src/design/`, and modifying `--fg` (Layer-3) does NOT change
 * anything in shadcn `ui/` chrome. F-1-004 calls out that
 * setup-wizard `CreateAdminStep.tsx` straddles both vocabularies in
 * one component — that is the exact pattern this rule catches.
 *
 * Per spec, "aliases" are excluded: when a file's PURPOSE is to
 * bridge one layer to the other (e.g. `--bg-2: var(--bg-secondary)`
 * lives in tokens.css to alias Layer-3 `--bg-2` to Layer-1
 * `--bg-secondary`), the rule must not fire. We implement two
 * complementary alias exclusions:
 *
 *   1. Source-of-truth file allowlist (path-based): the two layer
 *      origin files THEMSELVES (tokens.css + brand-tokens.css)
 *      legitimately reference each other to declare aliases. Skip
 *      them entirely.
 *   2. Per-file alias-only heuristic: if a file uses only ONE layer's
 *      tokens DIRECTLY (i.e. as a value reference) and references
 *      tokens from the OTHER layer ONLY inside `--*` declaration
 *      values (i.e. exporting an alias decl), it counts as alias
 *      bridge usage and passes.
 *
 * Sister rules in this plugin:
 *   - `dojo/no-hardcoded-colors-in-design` (E1.S2) — hex literals.
 *   - `dojo/no-phantom-tokens` (E1.S3) — undeclared `var(--name)`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import stylelint from 'stylelint';
import valueParser from 'postcss-value-parser';

const ruleName = 'dojo/no-cross-vocabulary-leakage';

const messages = stylelint.utils.ruleMessages(ruleName, {
  mixed: (l1Sample, l3Sample) =>
    `Cross-vocabulary leakage: this file mixes Layer-1 brand tokens (e.g. var(${l1Sample})) with Layer-3 design tokens (e.g. var(${l3Sample})). Pick one vocabulary per file. Bridge legitimately via aliases declared in src/design/styles/tokens.css or src/app/brand-tokens.css. [dojo/no-cross-vocabulary-leakage]`,
});

const meta = {
  url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/stylelint-dojo/src/rules/no-cross-vocabulary-leakage/README.md',
};

// Resolve token-source paths relative to this file. The rule lives at
// `packages/dojolm-web/stylelint-dojo/src/rules/no-cross-vocabulary-leakage/index.mjs`
// so the dojolm-web package root is 4 levels up.
const __dirname = dirname(fileURLToPath(import.meta.url));
const DOJOLM_WEB_ROOT = resolve(__dirname, '../../../..'); // -> packages/dojolm-web

const LAYER_1_SOURCE = resolve(DOJOLM_WEB_ROOT, 'src/app/brand-tokens.css');
const LAYER_3_SOURCE = resolve(DOJOLM_WEB_ROOT, 'src/design/styles/tokens.css');

// Source-of-truth files that legitimately reference both layers (because
// they DECLARE the aliases that bridge them). Path-allowlisted: the rule
// short-circuits to a no-op when invoked on these files.
const SOURCE_OF_TRUTH_PATHS = new Set([
  normalize(LAYER_1_SOURCE),
  normalize(LAYER_3_SOURCE),
]);

/**
 * Parse a CSS file and extract every `--*` declaration name.
 * Returns a Set<string> of names with leading `--`.
 *
 * Errors loading individual sources are non-fatal: we log a warning to
 * stderr and continue with whatever we have. This keeps the rule
 * usable in partial-checkout scenarios.
 */
function extractTokensFromFile(filePath) {
  const tokens = new Set();
  let css;
  try {
    css = readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // eslint-disable-next-line no-console
      console.warn(
        `[${ruleName}] could not read ${filePath}: ${err.message}`,
      );
    }
    return tokens;
  }
  let parsed;
  try {
    parsed = postcss.parse(css);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[${ruleName}] could not parse ${filePath}: ${err.message}`,
    );
    return tokens;
  }
  parsed.walkDecls(/^--/, (decl) => {
    tokens.add(decl.prop);
  });
  return tokens;
}

/**
 * Build the two layer token sets by reading each source file once.
 * Computed lazily so test code can reset and so we don't pay file-read
 * cost when the rule is disabled (`primary === false`).
 */
let CACHED_LAYER_1 = null;
let CACHED_LAYER_3 = null;

function getLayerTokenSets() {
  if (CACHED_LAYER_1 !== null && CACHED_LAYER_3 !== null) {
    return { layer1: CACHED_LAYER_1, layer3: CACHED_LAYER_3 };
  }
  CACHED_LAYER_1 = extractTokensFromFile(LAYER_1_SOURCE);
  CACHED_LAYER_3 = extractTokensFromFile(LAYER_3_SOURCE);
  return { layer1: CACHED_LAYER_1, layer3: CACHED_LAYER_3 };
}

/**
 * Public test-only escape hatch — vitest can call this to invalidate
 * the caches between runs.
 */
export function _resetLayerCacheForTests() {
  CACHED_LAYER_1 = null;
  CACHED_LAYER_3 = null;
}

/**
 * AST-walk a value-parser tree and yield each `var(--name, ...)`
 * function node, capturing the `--name` argument as a string.
 */
function findVarReferences(parsedValue) {
  const refs = [];
  parsedValue.walk((node) => {
    if (node.type === 'function' && node.value.toLowerCase() === 'var') {
      const firstNamedChild = node.nodes.find(
        (child) => child.type !== 'space' && child.type !== 'div',
      );
      if (firstNamedChild && firstNamedChild.type === 'word'
        && firstNamedChild.value.startsWith('--')) {
        refs.push({
          tokenName: firstNamedChild.value,
          valueNode: firstNamedChild,
        });
      }
    }
  });
  return refs;
}

/**
 * Classify the layer of a single token name. Returns:
 *   - 'layer1' if name is in Layer-1 (brand) only
 *   - 'layer3' if name is in Layer-3 (design) only
 *   - null if name is in neither (or in both — name collisions are
 *     not classifiable as a single layer; treat as cross-cutting and
 *     don't count toward leakage)
 */
function classify(tokenName, layer1, layer3) {
  const inL1 = layer1.has(tokenName);
  const inL3 = layer3.has(tokenName);
  if (inL1 && !inL3) return 'layer1';
  if (inL3 && !inL1) return 'layer3';
  return null;
}

/**
 * Determine whether the file under lint is a source-of-truth file that
 * SHOULD be allowed to reference both layers (because it declares the
 * aliases). Path-based allowlist. Stylelint exposes the file path via
 * the second arg to the rule function (`result.opts.from` for
 * stylelint.lint({ files }) callers, or the postcss `root.source.input.file`
 * for the equivalent root-based path which is more reliable in the
 * unit-test pipeline).
 */
function isSourceOfTruthFile(root) {
  const filePath = root.source && root.source.input && root.source.input.file;
  if (!filePath) return false;
  return SOURCE_OF_TRUTH_PATHS.has(normalize(filePath));
}

const ruleFunction = (primary, _secondaryOptions, _context) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });

  if (!validOptions || primary === false) {
    return;
  }

  // Path-allowlist short-circuit: the source-of-truth files DECLARE
  // the aliases that bridge the two layers, so they MUST be allowed
  // to reference both vocabularies. Skip without analysis.
  if (isSourceOfTruthFile(root)) {
    return;
  }

  const { layer1, layer3 } = getLayerTokenSets();

  // Two pass-bins:
  //   - directRefs: var() references that appear OUTSIDE a --* decl.
  //     These are the file's "real" usage — the value pulled into a
  //     painted property. Mixing two layers HERE is the leakage we
  //     want to flag.
  //   - aliasOnlyRefs: var() references that appear INSIDE a --* decl
  //     value. These are alias declarations; the file is exporting a
  //     bridge token. Per spec "excluding aliases", these don't count
  //     toward leakage.
  //
  // We track ONE sample tokenName per layer for each bin so the
  // diagnostic message can name names. Sample is also used as the
  // 'word' on the report so editors can highlight the offender.
  let l1DirectSample = null;
  let l3DirectSample = null;
  let l1DirectNode = null;
  let l3DirectNode = null;

  root.walkDecls((decl) => {
    if (!decl.value || !decl.value.includes('var(')) {
      return;
    }

    let parsed;
    try {
      parsed = valueParser(decl.value);
    } catch {
      return;
    }

    const isAliasDecl = decl.prop.startsWith('--');

    for (const ref of findVarReferences(parsed)) {
      const layer = classify(ref.tokenName, layer1, layer3);
      if (layer === null) {
        continue; // unclassified (globals.css token, font runtime var, etc.)
      }
      if (isAliasDecl) {
        // alias-bridge use; per spec "excluding aliases", do not count.
        continue;
      }
      // Direct usage outside a --* decl.
      if (layer === 'layer1' && l1DirectSample === null) {
        l1DirectSample = ref.tokenName;
        l1DirectNode = decl;
      } else if (layer === 'layer3' && l3DirectSample === null) {
        l3DirectSample = ref.tokenName;
        l3DirectNode = decl;
      }
    }
  });

  if (l1DirectSample !== null && l3DirectSample !== null) {
    // File has direct uses of BOTH layers — report once per layer with
    // the layer's first-seen offender as the highlighted word. Reporting
    // on both nodes (rather than one) gives the operator both ends of
    // the leak in their editor's problem list.
    stylelint.utils.report({
      message: messages.mixed(l1DirectSample, l3DirectSample),
      node: l1DirectNode,
      result,
      ruleName,
      word: l1DirectSample,
    });
    stylelint.utils.report({
      message: messages.mixed(l1DirectSample, l3DirectSample),
      node: l3DirectNode,
      result,
      ruleName,
      word: l3DirectSample,
    });
  }
};

export default {
  ruleName,
  messages,
  meta,
  ruleFunction,
};
