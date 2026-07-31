// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/no-phantom-tokens — Epic 1, Story E1.S3
 *
 * Token-discipline gate that rejects `var(--name)` references whose
 * `--name` does not appear in the project's authoritative token sources.
 * Per `audit/REMEDIATION-PLAN.md` §E1.S3 acceptance: "load token-set
 * from `tokens.css` + `brand-tokens.css` at lint time; reject any
 * `var(--name)` not in set."
 *
 * Token sources (loaded once at module init):
 *   1. `packages/dojolm-web/src/design/styles/tokens.css` — primary
 *      design vocabulary (Layer-3, dojo-ds-v3 scope).
 *   2. `packages/dojolm-web/src/app/globals.css` — global :root tokens
 *      (DojoLM legacy + Tailwind @theme inline pull-throughs).
 *   3. `packages/dojolm-web/src/app/brand-tokens.css` — Black Unicorn
 *      shared brand foundation (Layer-1, cross-product).
 *
 * Additional allowlist (compile-time, not file-derived):
 *   - `--font-sans` / `--font-mono` / `--font-editorial` / `--font-jp` —
 *     declared by `next/font` at build time in `src/app/layout.tsx` via the
 *     `variable:` option. These
 *     CSS custom properties exist at runtime even though no .css file
 *     declares them; allowlisting prevents false positives.
 *   - `--background` / `--foreground` etc. are already in globals.css
 *     so they don't need extra allowlisting.
 *
 * Per-file allowlist (collected on each lint pass):
 *   - Any `--*` declaration *inside the file being linted* is also
 *     valid for in-file `var(--*)` references. A file may legitimately
 *     declare its own scoped tokens (e.g. component-local CSS modules,
 *     pattern-stylesheet ad-hoc utilities).
 *
 * `var(--name, fallback)` syntax:
 *   - Only the `--name` is checked. Fallback values (the second arg)
 *     are out-of-scope here — they're literal CSS values, and any
 *     hardcoded color literals in fallbacks are caught by the sister
 *     rule `dojo/no-hardcoded-colors-in-design` (E1.S2).
 *
 * Sister rules in this plugin:
 *   - `dojo/no-hardcoded-colors-in-design` (E1.S2) — hex / rgb literals.
 *   - `dojo/no-cross-vocabulary-leakage` (E1.S4) — Layer-1 vs Layer-3 mix.
 *
 * Findings retired:
 *   - F-1-003 (P1) — phantom `--serif-jp` fires in src/design/styles/system.css.
 *   - Other phantom tokens (F-1-002 `--text-default/--card-bg/--border-subtle`,
 *     F-1-015 `--mono` mis-used) live in TSX inline-styles and are out
 *     of Stylelint's scope; ESLint sister-rules would catch them.
 *   - F-1-018 / F-1-029 are file-organisation findings, not phantom-token
 *     findings. The rule flags genuine phantoms in CSS as a complement.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import stylelint from "stylelint";
import valueParser from "postcss-value-parser";

const ruleName = "dojo/no-phantom-tokens";

const messages = stylelint.utils.ruleMessages(ruleName, {
  phantom: (tokenName) =>
    `Unexpected phantom token reference "var(${tokenName})". The custom property ${tokenName} is not declared in any token source (tokens.css / globals.css / brand-tokens.css). Either add it to a token source or use an existing token. [dojo/no-phantom-tokens]`,
});

const meta = {
  url: "https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/stylelint-dojo/src/rules/no-phantom-tokens/README.md",
};

// Resolve token-source paths relative to this file. The rule lives at
// `packages/dojolm-web/stylelint-dojo/src/rules/no-phantom-tokens/index.mjs`
// so the dojolm-web package root is 4 levels up.
const __dirname = dirname(fileURLToPath(import.meta.url));
const DOJOLM_WEB_ROOT = resolve(__dirname, "../../../.."); // -> packages/dojolm-web

const TOKEN_SOURCES = [
  resolve(DOJOLM_WEB_ROOT, "src/design/styles/tokens.css"),
  resolve(DOJOLM_WEB_ROOT, "src/app/globals.css"),
  resolve(DOJOLM_WEB_ROOT, "src/app/brand-tokens.css"),
];

/**
 * Compile-time allowlist for tokens that exist at runtime but are NOT
 * declared in any .css file we can statically read.
 *
 *   - `--font-sans` / `--font-mono` / `--font-editorial` / `--font-jp`:
 *     emitted by `next/font` at build time via `variable:` config in
 *     src/app/layout.tsx. (The first two also
 *     happen to be declared in globals.css — kept here for defence
 *     in depth in case someone removes the duplicate declaration.)
 *
 * Runtime-injected CSS variables (set by React inline-style props):
 *   - `--pct`: MiniGauge primitive (src/design/primitives/MiniGauge.tsx)
 *     sets `style={{ '--pct': clamped }}` so the conic-gradient in
 *     primitives.css can read the dynamic percentage. The CSS uses
 *     `var(--pct, 0)` defensively. This is the React idiom for passing
 *     a dynamic numeric to CSS without proliferating utility classes;
 *     accepted project pattern.
 *
 * Add to this list ONLY when:
 *   1. The token is set by JavaScript at runtime (inline style or
 *      direct setProperty), AND
 *   2. The corresponding TSX file is documented above.
 *
 * Anything that is genuinely missing from the design vocabulary
 * SHOULD be added to one of the .css token sources, not allowlisted
 * here. The point of this rule is to fail loud when tokens drift.
 */
const COMPILE_TIME_ALLOWLIST = new Set([
  "--font-sans",
  "--font-mono",
  "--font-editorial",
  "--font-jp",
  "--pct",
]);

/**
 * Parse a CSS file and extract every `--*` declaration name.
 * Returns a Set<string> of names with leading `--`.
 *
 * Errors loading individual sources are non-fatal: we log a warning to
 * stderr and continue with whatever we have. This keeps the rule
 * usable in partial-checkout scenarios (e.g. running stylelint inside
 * a stripped CI image where one of the auxiliary files might be
 * missing).
 */
function extractTokensFromFile(filePath) {
  const tokens = new Set();
  let css;
  try {
    css = readFileSync(filePath, "utf8");
  } catch (err) {
    // ENOENT is the only path we expect; surface anything else.
    if (err.code !== "ENOENT") {
      console.warn(
        `[dojo/no-phantom-tokens] could not read ${filePath}: ${err.message}`,
      );
    }
    return tokens;
  }
  let parsed;
  try {
    parsed = postcss.parse(css);
  } catch (err) {
    console.warn(
      `[dojo/no-phantom-tokens] could not parse ${filePath}: ${err.message}`,
    );
    return tokens;
  }
  parsed.walkDecls(/^--/, (decl) => {
    tokens.add(decl.prop);
  });
  return tokens;
}

/**
 * Build the global token allowlist by reading each TOKEN_SOURCES file
 * and unioning their `--*` declarations with the COMPILE_TIME_ALLOWLIST.
 *
 * Computed lazily (once) so test code can stub TOKEN_SOURCES if needed
 * and so we don't pay the file-read cost when the rule is disabled
 * (`primary === false`).
 */
let CACHED_TOKEN_SET = null;

function getGlobalTokenSet() {
  if (CACHED_TOKEN_SET !== null) {
    return CACHED_TOKEN_SET;
  }
  const set = new Set(COMPILE_TIME_ALLOWLIST);
  for (const source of TOKEN_SOURCES) {
    for (const name of extractTokensFromFile(source)) {
      set.add(name);
    }
  }
  CACHED_TOKEN_SET = set;
  return set;
}

/**
 * Public test-only escape hatch — vitest can call this to invalidate
 * the cache between runs (e.g. when asserting that a fresh extraction
 * happens). Also useful when running the rule inside a long-lived
 * Stylelint daemon if/when that becomes a thing.
 */
export function _resetTokenSetCacheForTests() {
  CACHED_TOKEN_SET = null;
}

/**
 * Collect every `--*` declaration *inside the file currently being
 * linted*. These names are valid in addition to the global allowlist
 * for any `var(--name)` reference in the same file.
 *
 * Cheaper than re-extracting from disk — we already have the parsed
 * PostCSS root in hand.
 */
function collectFileLocalTokens(root) {
  const tokens = new Set();
  root.walkDecls(/^--/, (decl) => {
    tokens.add(decl.prop);
  });
  return tokens;
}

/**
 * AST-walk a value-parser tree and yield each `var(--name, ...)`
 * function node, capturing the `--name` argument as a string.
 *
 * Returns an array of { tokenName, valueNode } so the caller can
 * report on the decl + identify the precise word.
 */
function findVarReferences(parsedValue) {
  const refs = [];
  parsedValue.walk((node) => {
    if (node.type === "function" && node.value.toLowerCase() === "var") {
      // First non-space, non-div child node is the token name.
      // postcss-value-parser surfaces it as a `word` node whose value
      // starts with `--`. Anything else (e.g. a malformed var() with
      // a literal first arg) we skip — Stylelint won't tolerate the
      // upstream syntax error and it's not our rule's job to catch
      // invalid CSS.
      const firstNamedChild = node.nodes.find(
        (child) => child.type !== "space" && child.type !== "div",
      );
      if (
        firstNamedChild &&
        firstNamedChild.type === "word" &&
        firstNamedChild.value.startsWith("--")
      ) {
        refs.push({
          tokenName: firstNamedChild.value,
          valueNode: firstNamedChild,
        });
      }
    }
  });
  return refs;
}

const ruleFunction =
  (primary, _secondaryOptions, _context) => (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true, false],
    });

    if (!validOptions || primary === false) {
      return;
    }

    const globalTokens = getGlobalTokenSet();
    const fileLocalTokens = collectFileLocalTokens(root);

    root.walkDecls((decl) => {
      // Skip CSS custom-property declarations — the value of a token
      // declaration may legitimately reference another token (e.g.
      // `--band-protect: var(--torii);` in tokens.css line 70). The
      // var() inside a `--*` decl is still walked and validated.
      //
      // We do NOT skip the whole decl — we still want to flag any
      // phantom var() references inside its value. (Defensive: if a
      // typo lands in a token-definition file, we want the rule to fire.)

      if (!decl.value || !decl.value.includes("var(")) {
        return;
      }

      let parsed;
      try {
        parsed = valueParser(decl.value);
      } catch {
        return; // value-parser is permissive; this is belt-and-braces.
      }

      for (const ref of findVarReferences(parsed)) {
        const { tokenName } = ref;
        if (globalTokens.has(tokenName) || fileLocalTokens.has(tokenName)) {
          continue;
        }
        stylelint.utils.report({
          message: messages.phantom(tokenName),
          node: decl,
          result,
          ruleName,
          word: tokenName,
        });
      }
    });
  };

const noPhantomTokensRule = {
  ruleName,
  messages,
  meta,
  ruleFunction,
};

export default noPhantomTokensRule;
