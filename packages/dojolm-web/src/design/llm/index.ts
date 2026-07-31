// SPDX-License-Identifier: Apache-2.0
/**
 * LLM design-system surface — E4.S9.
 *
 * Single barrel for the model picker primitive + its pure helpers
 * (`groupOptions`, `filterOptions`, `recentlyUsedHeading`). The
 * helpers are exported so the parent test suites can assert against
 * them without importing the rendered component.
 */

export {
  ModelPicker,
  groupOptions,
  filterOptions,
  recentlyUsedHeading,
} from './ModelPicker';
export type { ModelPickerOption, ModelPickerProps } from './ModelPicker';
