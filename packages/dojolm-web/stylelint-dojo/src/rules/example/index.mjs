// SPDX-License-Identifier: Apache-2.0
/**
 * dojo/example — Epic 1, Story E1.S1 (foundation, no-op)
 *
 * This rule is intentionally a no-op. It exists to prove that:
 *   1. The `stylelint-dojo` plugin loads correctly when listed in
 *      `.stylelintrc.json`'s `plugins` array.
 *   2. The `dojo/*` rule namespace registers and can be enabled in the
 *      `rules` block (`"dojo/example": true`) without throwing.
 *
 * Future stories (E1.S2 `no-hardcoded-colors-in-design`, E1.S3
 * `no-phantom-tokens`, E1.S4 `no-cross-vocabulary-leakage`) will add real
 * rules alongside this one. The shape below is the canonical template for
 * those rules:
 *
 *   - `ruleName`        — fully-qualified rule id (always `dojo/<slug>`)
 *   - `messages`        — built via `stylelint.utils.ruleMessages(...)`; keys
 *                         here are exposed in test assertions as
 *                         `messages.<key>`
 *   - `meta.url`        — link to docs (rule-specific README); Stylelint
 *                         surfaces this in its CLI output
 *   - `ruleFunction`    — `(primary, secondaryOptions, context) => (root, result) => { … }`
 *                         The outer factory receives Stylelint config; the
 *                         inner closure walks the PostCSS AST and calls
 *                         `stylelint.utils.report(...)` on violations.
 *
 * For the no-op rule we accept any `primary` value (typically `true`) and
 * walk nothing — we only validate the option shape so that misconfigured
 * `.stylelintrc.json` entries surface useful errors during E1.S2..S4
 * development.
 */
import stylelint from 'stylelint';

const ruleName = 'dojo/example';

const messages = stylelint.utils.ruleMessages(ruleName, {
  example: () => 'no-op rule loaded',
});

const meta = {
  url: 'https://github.com/BlackUnicornSecurity/DojoLM/blob/main/packages/dojolm-web/stylelint-dojo/README.md',
};

const ruleFunction = (primary) => (root, result) => {
  // Validate the rule's primary option. The no-op rule accepts boolean only;
  // a misconfigured value (e.g. an array) should surface a clear invalid-option
  // warning rather than fail silently. This follows Stylelint's
  // `validateOptions` convention so E1.S2..S4 rules can copy the pattern.
  const validOptions = stylelint.utils.validateOptions(result, ruleName, {
    actual: primary,
    possible: [true, false],
  });

  if (!validOptions) {
    return;
  }

  // Intentionally no AST traversal. The rule's only job in E1.S1 is to
  // register without throwing.
};

export default {
  ruleName,
  messages,
  meta,
  ruleFunction,
};
