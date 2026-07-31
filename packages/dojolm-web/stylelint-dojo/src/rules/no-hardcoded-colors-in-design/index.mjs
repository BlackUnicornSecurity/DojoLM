// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/no-hardcoded-colors-in-design — Epic 1, Story E1.S2
 *
 * Token-discipline gate for `src/design/**` stylesheets. Per
 * `audit/REMEDIATION-PLAN.md` §E1.S2, this rule rejects any of the
 * following color literals appearing in a CSS declaration value:
 *
 *   - hex literal: `#fff`, `#ffffff`, `#ffffffff`
 *   - functional color form with all-literal channels: `rgb(...)`,
 *     `rgba(...)`, `hsl(...)`, `hsla(...)`
 *
 * The rule does NOT fire on:
 *
 *   - `var(--token)` references — the whole point of token discipline
 *   - keyword colors `transparent` / `currentColor` (per spec
 *     allowlist) and the cascade keywords `inherit`/`initial`/`unset`
 *   - `rgba(var(--torii-rgb), 0.18)` and friends — the established
 *     project pattern of token-driven alpha-composites (verified at
 *     `packages/dojolm-web/src/design/styles/tokens.css:26`, used 50+
 *     times). When ANY channel of an `rgb*()`/`hsl*()` is a `var(...)`
 *     reference we treat the value as token-driven and let it pass.
 *     Only when ALL channels are literal numbers do we flag.
 *
 * Scope: this rule is wired into `.stylelintrc.json` under
 * `overrides[]` so Stylelint only invokes it on
 * `src/design/**\/*.css` and `src/design/**\/*.tsx` per the spec
 * acceptance. The TSX inline-style case (`style={{ color: '#…' }}`)
 * is intentionally deferred to ESLint sister-rule E1.S5 — Stylelint
 * does not parse JSX expressions, so a TSX file that compiles cleanly
 * here only means there is no `<style>{`...`}</style>` template-literal
 * leakage; the JSX prop case is out of scope.
 *
 * Sister rules in this plugin: `dojo/no-phantom-tokens` (E1.S3),
 * `dojo/no-cross-vocabulary-leakage` (E1.S4).
 */
import stylelint from 'stylelint';
import valueParser from 'postcss-value-parser';

const ruleName = 'dojo/no-hardcoded-colors-in-design';

const messages = stylelint.utils.ruleMessages(ruleName, {
  hexLiteral: (literal) =>
    `Unexpected hex color literal "${literal}". Use a CSS custom property from src/design/styles/tokens.css instead (e.g. var(--torii)). [dojo/no-hardcoded-colors-in-design]`,
  rgbLiteral: (literal) =>
    `Unexpected ${literal.startsWith('rgba') ? 'rgba()' : 'rgb()'} literal "${literal}". Use a token-driven form like rgba(var(--torii-rgb), <alpha>) or a hex/var token. [dojo/no-hardcoded-colors-in-design]`,
  hslLiteral: (literal) =>
    `Unexpected ${literal.startsWith('hsla') ? 'hsla()' : 'hsl()'} literal "${literal}". Use a CSS custom property from src/design/styles/tokens.css instead. [dojo/no-hardcoded-colors-in-design]`,
});

const meta = {
  url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/stylelint-dojo/src/rules/no-hardcoded-colors-in-design/README.md',
};

// Hex pattern: #RGB, #RRGGBB, #RGBA, #RRGGBBAA. Anchored so we don't
// accidentally match `#someid` selector fragments (postcss-value-parser
// already strips selector context — value-parser only sees declaration
// values — so this is purely a defensive anchor).
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

// Function names that, when ALL channels are literal numbers (no
// var(...) reference), constitute a hardcoded color.
const COLOR_FUNCS = new Set(['rgb', 'rgba', 'hsl', 'hsla']);

// Property names whose values would never be a color even if a hex-like
// token slipped through (e.g. `content: "#ff0000"`). value-parser
// reports `string` nodes for quoted strings, so this list is just
// belt-and-braces.
const NON_COLOR_PROPERTIES = new Set([
  'content',
  // CSS counter / list-style strings; left here for future-proofing if
  // a designer ever sets `list-style: '#01'` etc.
]);

/**
 * Walk a value-parser AST under a function node and return true iff at
 * least one descendant is a `var(--…)` reference. This is the "token
 * channel" escape hatch for `rgba(var(--torii-rgb), 0.18)`.
 */
function functionContainsVarReference(funcNode) {
  let found = false;
  const walk = (nodes) => {
    if (found || !nodes) return;
    for (const child of nodes) {
      if (child.type === 'function' && child.value === 'var') {
        found = true;
        return;
      }
      if (child.type === 'function' && child.nodes) {
        walk(child.nodes);
      }
    }
  };
  walk(funcNode.nodes);
  return found;
}

/**
 * Reconstruct the raw text of a function node (e.g. `rgb(204, 58, 47)`)
 * for inclusion in the warning message, since value-parser nodes do
 * not carry a precomputed `.raw` field for function bodies.
 */
function stringifyFunction(funcNode) {
  return valueParser.stringify(funcNode);
}

const ruleFunction = (primary, _secondaryOptions, _context) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });

  if (!validOptions || primary === false) {
    return;
  }

  root.walkDecls((decl) => {
    if (NON_COLOR_PROPERTIES.has(decl.prop.toLowerCase())) {
      return;
    }

    // Skip CSS custom-property declarations — those ARE the tokens
    // (e.g. `--bg: #06060B;` in tokens.css). Token-definition files
    // are also separately carved out via `.stylelintrc.json`'s
    // `excludedFiles`, but this in-rule guard means the rule is
    // self-consistent even if applied without the override (e.g. in
    // someone's local repro): a hex inside `--token: <value>` is a
    // token VALUE, not a violation. Consumers must still reference
    // tokens via `var(--token)` outside `:root` — and any literal
    // hex in a non-custom-property declaration anywhere in scope is
    // still flagged.
    if (decl.prop.startsWith('--')) {
      return;
    }

    const parsed = valueParser(decl.value);

    parsed.walk((node) => {
      // ---- Hex literals ----
      // value-parser surfaces hex colors as `word` nodes whose value
      // starts with `#`. Anything else with a `#` (e.g. URL fragments)
      // would be inside a `function: url(...)` or a `string`, both of
      // which we skip below.
      if (node.type === 'word' && node.value.startsWith('#')) {
        if (HEX_RE.test(node.value)) {
          stylelint.utils.report({
            message: messages.hexLiteral(node.value),
            node: decl,
            result,
            ruleName,
            word: node.value,
          });
        }
        return;
      }

      // ---- Functional color literals ----
      if (node.type === 'function' && COLOR_FUNCS.has(node.value.toLowerCase())) {
        // Allow token-driven channels: at least one var(--…) inside.
        if (functionContainsVarReference(node)) {
          // Returning `false` from a value-parser walk callback skips
          // descendants — important here so we don't double-flag a
          // nested rgb(...) inside an outer function.
          return false;
        }
        const raw = stringifyFunction(node);
        const fn = node.value.toLowerCase();
        const messageFn =
          fn === 'rgb' || fn === 'rgba' ? messages.rgbLiteral : messages.hslLiteral;
        stylelint.utils.report({
          message: messageFn(raw),
          node: decl,
          result,
          ruleName,
          word: raw,
        });
        // Skip walking into the function's children; we've already
        // decided the function as a whole is a violation, and any
        // nested numeric `word` nodes are not independent violations.
        return false;
      }

      // ---- Strings, comments, divs, spaces, generic words ----
      // Pass through. `string` nodes (e.g. `content: "#abc"`) are
      // explicitly NOT colors. Keywords like `transparent` /
      // `currentColor` / `inherit` arrive as `word` nodes that don't
      // start with `#` and aren't function calls, so they pass.
      return undefined;
    });
  });
};

export default {
  ruleName,
  messages,
  meta,
  ruleFunction,
};
