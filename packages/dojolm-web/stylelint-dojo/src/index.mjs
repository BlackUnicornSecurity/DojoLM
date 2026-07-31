// SPDX-License-Identifier: Apache-2.0
/**
 * stylelint-dojo
 *
 * Internal Stylelint plugin hosting the Epic 1 (Token Discipline) rules.
 * Per `audit/REMEDIATION-PLAN.md` E1.S1, this scaffold registers a single
 * no-op rule (`dojo/example`) so that:
 *   - the plugin loads cleanly inside `.stylelintrc.json`
 *   - the namespace `dojo/*` is reserved before E1.S2..E1.S4 add real rules
 *
 * Stylelint v16/v17 requires that a plugin module's default export be either
 * a single `createPlugin(ruleName, ruleFunction)` result or an array of such
 * results. We export an array so future stories can simply append new
 * `createPlugin(...)` entries without restructuring the entry point.
 *
 * See `README.md` (next to this file) for the rule-authoring template that
 * E1.S2..E1.S4 authors should follow.
 */
import stylelint from 'stylelint';
import exampleRule from './rules/example/index.mjs';
import noHardcodedColorsInDesignRule from './rules/no-hardcoded-colors-in-design/index.mjs';
import noPhantomTokensRule from './rules/no-phantom-tokens/index.mjs';
import noCrossVocabularyLeakageRule from './rules/no-cross-vocabulary-leakage/index.mjs';
import noPxFontSizeInDesignRule from './rules/no-px-font-size-in-design/index.mjs';

const { createPlugin } = stylelint;

export default [
  createPlugin(exampleRule.ruleName, exampleRule.ruleFunction),
  createPlugin(noHardcodedColorsInDesignRule.ruleName, noHardcodedColorsInDesignRule.ruleFunction),
  createPlugin(noPhantomTokensRule.ruleName, noPhantomTokensRule.ruleFunction),
  createPlugin(noCrossVocabularyLeakageRule.ruleName, noCrossVocabularyLeakageRule.ruleFunction),
  createPlugin(noPxFontSizeInDesignRule.ruleName, noPxFontSizeInDesignRule.ruleFunction),
];
