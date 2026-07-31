// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/catalog — Gap 13.5 / 13.7 primitives.
 */
export {
  TechniqueCatalog,
} from './technique-catalog.js';
export type {
  TechniqueEntry,
  TechniqueFilter,
} from './technique-catalog.js';

export {
  buildBypassMatrix,
  UNRANKED_THRESHOLD,
} from './bypass-rate.js';
export type {
  BypassSubmission,
  BypassCell,
  BypassMatrix,
} from './bypass-rate.js';
