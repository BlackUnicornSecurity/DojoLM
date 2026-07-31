// SPDX-License-Identifier: Apache-2.0
/**
 * eslint-plugin-bu-tpi
 *
 * Local ESLint plugin hosting the YR.13.0 anti-recurrence gates:
 *   - no-catch-swallow-in-e2e (G-A4)  : silent .catch(()=>{}) in e2e specs
 *   - no-dead-button         (G-A2)  : <button> without onClick/disabled/form/Link
 *   - explicit-data-source   (G-A3)  : hardcoded literals in production JSX
 *
 * Wired in eslint.config.mjs via `plugins: { 'bu-tpi': buTpiPlugin }`.
 */
import noCatchSwallowInE2e from './rules/no-catch-swallow-in-e2e.mjs';
import noDeadButton from './rules/no-dead-button.mjs';
import explicitDataSource from './rules/explicit-data-source.mjs';

export default {
  meta: {
    name: 'eslint-plugin-bu-tpi',
    version: '0.1.0',
  },
  rules: {
    'no-catch-swallow-in-e2e': noCatchSwallowInE2e,
    'no-dead-button': noDeadButton,
    'explicit-data-source': explicitDataSource,
  },
};
