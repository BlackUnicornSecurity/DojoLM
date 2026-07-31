// SPDX-License-Identifier: Apache-2.0
/**
 * design/tatami — OSS (Apache-2.0) presentational shell for the Tatami
 * evidence cockpit. Imports no `tatami-vault` (EE) surface. The chrome CSS
 * (`../styles/patterns/tatami-rail.css`) is loaded eagerly by the `(shell)`
 * layout alongside the other pattern stylesheets.
 */
export { TatamiRail } from './TatamiRail';
export type {
  TatamiRailProps,
  TatamiRailMode,
  TatamiRailTabId,
  TatamiRailTab,
} from './TatamiRail';
export {
  MaturityBadge,
  TrustBadge,
  ReplaySafetyBadge,
  ReproducibilityBadge,
  TatamiProofBadges,
} from './TatamiBadges';
export type { TatamiBadgeFields } from './TatamiBadges';
export { TatamiReceiptActions } from './TatamiReceiptActions';
export type { TatamiReceiptActionsProps, TatamiReceiptFormat } from './TatamiReceiptActions';
