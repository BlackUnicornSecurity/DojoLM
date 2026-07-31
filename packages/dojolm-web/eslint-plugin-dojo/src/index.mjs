// SPDX-License-Identifier: Apache-2.0
/**
 * eslint-plugin-dojo
 *
 * Internal ESLint plugin for the DojoLM **token-discipline** vocabulary
 * across `packages/dojolm-web/src/design/**`. Sister to `stylelint-dojo`
 * (which targets `.css` files); this plugin targets `.tsx`.
 *
 * Rules:
 *   - dojo/forbid-tailwind-in-design-tsx (E1.S5) — reject Tailwind
 *     utilities in design surfaces.
 *   - dojo/forbid-mono-in-color-context (E1.S6) — reject font-family
 *     tokens (--mono / --sans / --serif) used as color values in
 *     JSX inline styles.
 *   - dojo/no-kanji-in-data-iteration (E1.S10) — reject CJK Unified
 *     Ideographs (U+4E00-U+9FFF) inside Array.prototype.map / forEach
 *     / filter callbacks that return JSX (G4 enforcement; retires
 *     F-1-012). NOTE: plan §E1.S10 names this a "Stylelint" rule;
 *     Stylelint cannot parse TSX, so the rule lives here in ESLint
 *     where the JSX-AST walk is feasible. The acceptance criteria
 *     are framework-neutral.
 *
 * Wired in `packages/dojolm-web/eslint.config.mjs` via
 *   plugins: { dojo: dojoPlugin }
 *
 * Future rules plug in by adding to the `rules` map below; see
 * README.md for the authoring template.
 */
import forbidTailwindInDesignTsx from './rules/forbid-tailwind-in-design-tsx/index.mjs';
import forbidMonoInColorContext from './rules/forbid-mono-in-color-context/index.mjs';
import noKanjiInDataIteration from './rules/no-kanji-in-data-iteration/index.mjs';

export default {
  meta: {
    name: 'eslint-plugin-dojo',
    version: '0.1.0',
  },
  rules: {
    'forbid-tailwind-in-design-tsx': forbidTailwindInDesignTsx,
    'forbid-mono-in-color-context': forbidMonoInColorContext,
    'no-kanji-in-data-iteration': noKanjiInDataIteration,
  },
};
