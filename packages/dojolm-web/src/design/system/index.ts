// SPDX-License-Identifier: Apache-2.0
export { SystemBanner } from './SystemBanner';
export type {
  SystemBannerProps,
  SystemBannerTone,
  SystemBannerPosition,
  SystemBannerAction,
} from './SystemBanner';
export { ConfirmPhraseModal } from './ConfirmPhraseModal';
export type { ConfirmPhraseModalProps } from './ConfirmPhraseModal';
export { TwoPersonApprovalModal } from './TwoPersonApprovalModal';
export type { TwoPersonApprovalModalProps } from './TwoPersonApprovalModal';
export { PendingApprovalsPanel } from './PendingApprovalsPanel';
export type { PendingApprovalsPanelProps, PendingApprovalRow } from './PendingApprovalsPanel';
export { EmptyState } from './EmptyState';
export type {
  EmptyStateProps,
  EmptyStateEmptyProps,
  EmptyStateLoadingProps,
  EmptyStateErrorProps,
  EmptyStateDisabledProps,
  EmptyStateFilterNarrowedProps,
  EmptyStateSearchNarrowedProps,
} from './EmptyState';
export type {
  EmptyStateAction,
  EmptyStateModule,
  EmptyStateSize,
  EmptyStateState,
  EmptyStateTint,
  EmptyStateTone,
} from './EmptyState.types';
export {
  MODULE_DEFAULTS as EMPTY_STATE_MODULE_DEFAULTS,
  STATE_COPY as EMPTY_STATE_STATE_COPY,
  DISABLED_DEFAULT_CTA as EMPTY_STATE_DISABLED_DEFAULT_CTA,
  resolveCopy as resolveEmptyStateCopy,
} from './empty-state-copy';
export type { EmptyStateCopy } from './empty-state-copy';
export { GraphPlaceholder, type GraphPlaceholderProps } from './GraphPlaceholder';
export { SessionExpiredCard } from './SessionExpiredCard';
export type { SessionExpiredCardProps } from './SessionExpiredCard';
// F-8-008 (Wave 3hh) — proactive expiring-soon banner. Surfaces 5-10 min
// before the cookie dies, distinct from the after-the-fact takeover above.
export { SessionExpiringSoonBanner } from './SessionExpiringSoonBanner';
export type { SessionExpiringSoonBannerProps } from './SessionExpiringSoonBanner';
// F-8-009 (Wave 3hh) — visible "Draft saved" indicator paired with the
// `useAdminFormDraft` sessionStorage hook on long-form admin surfaces.
export { DraftSavedIndicator } from './DraftSavedIndicator';
export type { DraftSavedIndicatorProps } from './DraftSavedIndicator';
export { PermissionDeniedPanel } from './PermissionDeniedPanel';
export type { PermissionDeniedPanelProps } from './PermissionDeniedPanel';
export { ConsolidatedReportButton } from './ConsolidatedReportButton';
export type {
  ConsolidatedReportButtonProps,
  ConsolidatedReportFormat,
  ConsolidatedReportScope,
} from './ConsolidatedReportButton';
export {
  DashboardCustomizer,
  useDashboardWidgetState,
  readWidgetState,
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABEL,
  DEFAULT_WIDGET_STATE,
} from './DashboardCustomizer';
export type {
  DashboardCustomizerProps,
  DashboardWidgetId,
  DashboardWidgetState,
} from './DashboardCustomizer';
// E0.S11 — minimal stub for consumer-bar criterion 16. Swap-ready for E6.S1.
export { LegalFooter } from './LegalFooter';
export type { LegalFooterProps } from './LegalFooter';
// E5.S6 — last-fetched indicator + countdown ring (foundation primitive).
// Consumed by E5.S1, E5.S2, and E0.S8 phase 2 (kill-switch ARMED chip).
export {
  FreshnessChip,
  formatFreshness,
  computeRingRatio,
} from './FreshnessChip';
export type { FreshnessChipProps } from './FreshnessChip';
// E6.S4 — TopBar runtime-environment chip (retires F-8-007 P1).
// Reads NEXT_PUBLIC_APP_ENV → PROD red / STAGING gold / DEV jade with
// build-SHA tooltip via NEXT_PUBLIC_GIT_SHA.
export {
  EnvChip,
  ENV_CHIP_CLASS,
  ENV_CHIP_LABEL,
  resolveEnvKind,
  resolveEnvLabel,
  formatBuildShaTooltip,
} from './EnvChip';
export type { EnvChipProps, EnvKind } from './EnvChip';
// E9.S7 — accessible required-field marker (visible asterisk +
// sr-only "required") that pairs with `aria-required="true"` on the
// input. Retires F-6-010 P1 (and F-4-020 P2 part) by giving every
// `required` form a screen-reader-perceivable annotation rather than
// a sighted-only asterisk convention.
export { RequiredAsterisk } from './RequiredAsterisk';
// E4.S10 — async-trigger inline spinner glyph. Retires F-2-212 P2
// (race button no spinner) by giving every async-trigger surface a
// shared 14×14 rotating-ring primitive that sits to the LEFT of the
// button label (label stays visible) so the operator sees feedback
// instantly + the click is unambiguous.
export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';
