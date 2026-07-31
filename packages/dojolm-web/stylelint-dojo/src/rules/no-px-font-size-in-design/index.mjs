// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/no-px-font-size-in-design — Epic 7, Story E7.S2
 *
 * Type-scale gate for `src/design/**` stylesheets. Per
 * `audit/REMEDIATION-PLAN.md` §E7.S2 acceptance:
 *
 *   "grep -rnE 'font-size:\s*[0-9]+px' packages/dojolm-web/src
 *    returns 0 in `src/design/`; rem scale defined in `tokens.css`."
 *
 * This rule catches future regressions: any `font-size` declaration
 * whose value contains a `<N>px` token (integer OR decimal) is flagged.
 * Designers must use a `--text-*` token from `tokens.css` instead so
 * the type ramp stays accessibility-friendly (rem honors browser zoom +
 * user-overridden default font-size; px does not).
 *
 * Allowed values:
 *   - `var(--text-xs)`, `var(--text-base)`, …, `var(--text-watermark)`
 *     (the canonical ramp).
 *   - `var(--anything)` other custom-property reference. The rule does
 *     not validate the token name itself — phantom-token discipline is
 *     the job of sister rule `dojo/no-phantom-tokens`. This rule only
 *     blocks raw px literals.
 *   - rem / em / % / unitless / `inherit` / `smaller` / `larger` /
 *     `medium` / `clamp(…)` etc. Anything that is NOT a px literal.
 *
 * Rejected values:
 *   - `font-size: 12px` (any integer)
 *   - `font-size: 12.5px` (decimal — also catches half-px values that
 *     slipped past the integer-only acceptance grep).
 *   - `font-size: 0px` (degenerate but flagged for symmetry).
 *   - `font: 12px/1.4 sans-serif` (shorthand — see SHORTHAND_FONT_RE
 *     comment below; we only flag `font-size`, not `font` shorthand,
 *     to avoid false-positives on legitimate token-driven shorthands.
 *     Practice has been to use `font-size` separately in this codebase).
 *
 * Scope: wired into `.stylelintrc.json` under `overrides[]` so Stylelint
 * only invokes it on `src/design/**\/*.css`. The TSX inline-style case
 * is intentionally deferred to ESLint (sister-rule scope, future story).
 *
 * Sister rules in this plugin:
 *   - `dojo/no-phantom-tokens` (E1.S3) — undeclared `var(--…)` refs.
 *   - `dojo/no-hardcoded-colors-in-design` (E1.S2) — hex / rgb literals.
 *   - `dojo/no-cross-vocabulary-leakage` (E1.S4) — Layer-1 vs Layer-3 mix.
 *
 * Findings retired:
 *   - F-5-003 (P1) — px font-size leakage in src/design/styles/**.
 *   - F-1-030 (P1) — type-scale drift across design CSS.
 */
import stylelint from 'stylelint';
import valueParser from 'postcss-value-parser';

const ruleName = 'dojo/no-px-font-size-in-design';

const messages = stylelint.utils.ruleMessages(ruleName, {
  pxLiteral: (literal) =>
    `Unexpected px font-size literal "${literal}". Use a CSS custom property from src/design/styles/tokens.css instead (e.g. var(--text-base) for 13px, var(--text-2xl) for 16px). px values do not honor user accessibility zoom; rem does. [dojo/no-px-font-size-in-design]`,
});

const meta = {
  url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/stylelint-dojo/src/rules/no-px-font-size-in-design/README.md',
};

// Match `<digits>px` or `<digits>.<digits>px` as a numeric literal node.
// value-parser surfaces the px value as a single `word` node (e.g.
// "12px", "12.5px"). The regex is anchored to the whole word so we
// don't accidentally flag `12pxlike` (which would be invalid CSS but
// surfaces as a different node anyway).
const PX_FONT_SIZE_RE = /^\d+(?:\.\d+)?px$/i;

const ruleFunction = (primary, _secondaryOptions, _context) => (root, result) => {
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });

  if (!validOptions || primary === false) {
    return;
  }

  root.walkDecls((decl) => {
    // Only inspect `font-size` declarations. We deliberately skip the
    // `font` shorthand to avoid false-positives on edge-cases like
    // `font: italic small-caps 700 12px/1.4 var(--mono)`. The codebase
    // pattern is to set font-size separately, so this is a tight scope
    // by design. If a future regression emerges in `font` shorthand,
    // we can extend.
    if (decl.prop.toLowerCase() !== 'font-size') {
      return;
    }

    const parsed = valueParser(decl.value);

    parsed.walk((node) => {
      // value-parser surfaces numeric values as `word` nodes (no
      // dedicated number type). A px literal like `12px` arrives as
      // word.value = "12px". We test against the anchored regex.
      if (node.type === 'word' && PX_FONT_SIZE_RE.test(node.value)) {
        stylelint.utils.report({
          message: messages.pxLiteral(node.value),
          node: decl,
          result,
          ruleName,
          word: node.value,
        });
      }
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
