// SPDX-License-Identifier: Apache-2.0
// Length-cap helpers — used by every primitive that accepts API-supplied
// strings AND by YR.4 module-page composers that need to cap before
// passing to a primitive (e.g. AttackRow's `title` prop). Re-exporting
// from the design-system barrel so callers don't reach through to the
// `_caps.ts` private module.
export { cap, capOpt } from "./_caps";
export { PageCard, type PageCardProps } from "./PageCard";
export {
  KpiStrip,
  KPI_STRIP_MAX_ITEMS,
  KPI_STRIP_MIN_ITEMS,
  type KpiStripDelta,
  type KpiStripItem,
  type KpiStripProps,
  type KpiStripTone,
} from "./KpiStrip";
export { DemoDataBadge, type DemoDataBadgeProps } from "./DemoDataBadge";
export {
  KillSwitchStatusBadge,
  type KillSwitchStatusBadgeProps,
} from "./KillSwitchStatusBadge";
export { Spark, type SparkProps } from "./Spark";
export { MiniBars, type MiniBarsProps } from "./MiniBars";
export { KV, type KVProps, type KVRow } from "./KV";
export { BarRow, type BarRowProps, type BarRowTone } from "./BarRow";
export {
  Ribbon,
  type RibbonProps,
  type RibbonSegment,
  type RibbonSegmentKind,
} from "./Ribbon";
export {
  MiniGauge,
  type MiniGaugeProps,
  type MiniGaugeTone,
} from "./MiniGauge";
export { Code, type CodeProps } from "./Code";
export {
  CountPill,
  type CountPillProps,
  type CountPillTone,
} from "./CountPill";
export { PillTabs, type PillTabsProps, type PillTabItem } from "./PillTabs";
export {
  SegmentedSubTabs,
  externalSegmentedPanelProps,
  SEGMENTED_SUB_TABS_MIN_ITEMS,
  SEGMENTED_SUB_TABS_MAX_ITEMS,
  type SegmentedSubTabItem,
  type SegmentedSubTabsProps,
  type SegmentedSubTabsMode,
  type SegmentedSubTabsDensity,
  type SegmentedSubTabsSize,
  type SegmentedSubTabsTransition,
  type SegmentedSubTabTone,
  type SegmentedSubTabBadge,
  type SegmentedSubTabBadgeTone,
} from "./SegmentedSubTabs";
export { ThreadRow, type ThreadRowProps } from "./ThreadRow";
export { SevStrip, type SevStripProps, type SevStripLevel } from "./SevStrip";
export {
  SeverityBar,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  confidenceTier,
  type SeverityBarProps,
  type SeverityBarVariant,
  type SeverityBarSize,
  type StackedSeverityBarProps,
  type ConfidenceSeverityBarProps,
  type FourLevelSeverityBarProps,
  type StackedCounts,
  type FourLevelCounts,
  type ConfidenceThresholds,
  type ConfidenceTier,
} from "./SeverityBar";
export {
  ModuleOnboarding,
  ROW_DEEP_LINKS_MIN_STEPS,
  ROW_DEEP_LINKS_MAX_STEPS,
  STEPS_MIN_STEPS,
  STEPS_MAX_STEPS,
  CAROUSEL_MIN_PAGES,
  CAROUSEL_MAX_PAGES,
  type ModuleOnboardingProps,
  type ModuleOnboardingVariant,
  type RowDeepLinksOnboardingProps,
  type StepsOnboardingProps,
  type CarouselOnboardingProps,
  type ModuleOnboardingRowDeepLinkStep,
  type ModuleOnboardingStep,
  type ModuleOnboardingPage,
} from "./ModuleOnboarding";
export {
  ModeSelector,
  MODE_SELECTOR_RICH_MIN,
  MODE_SELECTOR_RICH_MAX,
  MODE_SELECTOR_COMPACT_LEN,
  MODE_SELECTOR_DENSE_MIN,
  MODE_SELECTOR_DENSE_MAX,
  type ModeSelectorProps,
  type ModeSelectorItem,
  type ModeSelectorVariant,
  type ModeSelectorTone,
} from "./ModeSelector";
export {
  FrameworksCard,
  FRAMEWORKS_CARD_MAX_ROWS,
  type FrameworksCardProps,
  type FrameworkRow,
  type FrameworkStatus,
} from "./FrameworksCard";
export {
  SignOffList,
  SIGNOFF_LIST_MAX_ROWS,
  type SignOffListProps,
  type SignOffApprover,
  type SignOffStatus,
} from "./SignOffList";
export {
  ActivityBand,
  ACTIVITY_BAND_MAX_BUCKETS,
  type ActivityBandProps,
  type ActivityBucket,
  type ActivityBandTone,
} from "./ActivityBand";
export {
  DiffBlock,
  DIFF_BLOCK_MAX_LINES,
  type DiffBlockProps,
  type DiffLine,
  type DiffLineKind,
} from "./DiffBlock";
export {
  GoldenDiff,
  type GoldenDiffProps,
  type GoldenDiffStatus,
} from "./GoldenDiff";
export {
  HattoriGuardModes,
  HATTORI_GUARD_MODES_MAX,
  type HattoriGuardModesProps,
  type HattoriMode,
  type HattoriModeDef,
} from "./HattoriGuardModes";
export {
  type ServiceCoverageRow,
  type ServiceCoverageCell,
} from "./ServiceCoverageGrid";
export {
  DriftLane,
  DRIFT_LANE_MAX_EVENTS,
  type DriftLaneProps,
  type DriftEvent,
  type DriftSeverity,
} from "./DriftLane";
// YR.6 subset C-1 — module-specific primitives. Each exports MAX_*
// constants for downstream array-cap discipline.
export {
  CpnRow,
  CPN_ROW_MAX_CADENCE,
  type CpnRowProps,
  type CpnRowStatus,
} from "./CpnRow";
export {
  SwapCandidate,
  SWAP_CANDIDATE_MAX_METRICS,
  type SwapCandidateProps,
  type SwapMetric,
  type SwapDeltaTone,
} from "./SwapCandidate";
export {
  ScoreCard,
  type ScoreCardProps,
  type ScoreCardTrend,
  type ScoreCardTone,
} from "./ScoreCard";
export {
  HunterLeader,
  HUNTER_LEADERBOARD_MAX_ROWS,
  type HunterLeaderProps,
  type HunterLeaderTag,
  type Belt,
} from "./HunterLeader";
export {
  BountyList,
  BOUNTY_LIST_MAX_ENTRIES,
  type BountyListProps,
  type BountyEntry,
  type BountyStatus,
} from "./BountyList";
export {
  PostureTile,
  type PostureTileProps,
  type PostureLabel,
} from "./PostureTile";
// YR.6 subset C-2 — Atemi/Amaterasu/Kotoba/Sengoku module primitives.
// Each exports MAX_* constants for downstream array-cap discipline.
export {
  DnaTree,
  DNA_TREE_MAX_ROOTS,
  DNA_TREE_MAX_CHILDREN,
  DNA_TREE_MAX_DEPTH,
  type DnaTreeProps,
  type DnaTreeNode,
  type DnaTreeStatus,
} from "./DnaTree";
export {
  DnaGraph,
  DNA_GRAPH_MAX_NODES,
  DNA_GRAPH_MAX_EDGES,
  type DnaGraphProps,
  type DnaGraphNode,
  type DnaGraphEdge,
  type DnaGraphNodeStatus,
} from "./DnaGraph";
export {
  TokenizedPrompt,
  TOKENIZED_PROMPT_MAX_TOKENS,
  type TokenizedPromptProps,
  type TokenizedPromptToken,
  type TokenizedPromptTone,
} from "./TokenizedPrompt";
export {
  VersionList,
  VERSION_LIST_MAX_ENTRIES,
  type VersionListProps,
  type VersionListEntry,
} from "./VersionList";
export {
  SchedulerList,
  SCHEDULER_LIST_MAX_ENTRIES,
  type SchedulerListProps,
  type SchedulerListEntry,
  type SchedulerListStatus,
} from "./SchedulerList";
// YR.6 subset C-3 — final 4 primitives closing out YR.6 (Kagami /
// Buki·Jutsu·Ronin·Mitsuke·Scanner / cross). Each TSX primitive
// exports MAX_* constants for downstream array-cap discipline.
// YR.6.22 (MCard tinted variants) is CSS-only; no new TSX export.
export {
  GoldenSuiteCard,
  GOLDEN_SUITE_CARD_MAX_TILES,
  type GoldenSuiteCardProps,
  type GoldenSuiteStatus,
  type GoldenSuiteTile,
  type GoldenSuiteTileTone,
} from "./GoldenSuiteCard";
export {
  AttackRow,
  type AttackRowProps,
  type AttackRowItem,
  type AttackRowStatus,
} from "./AttackRow";
export {
  RibbonSegmentBar,
  RIBBON_SEGMENT_BAR_MAX_SEGS,
  type RibbonSegmentBarProps,
  type RibbonSegmentBarSegment,
  type RibbonSegmentTone,
} from "./RibbonSegmentBar";

// A.2 — LoadingSkeleton primitive (5 atoms via Skeleton namespace + named
// exports). Pre-composed module skeletons live in src/design/skeletons/.
export {
  Skeleton,
  SkeletonBox,
  SkeletonLine,
  SkeletonLines,
  SkeletonCircle,
  SkeletonTable,
  SkeletonHost,
  __skeletonHostResetWarningsForTest,
  type SkeletonBoxProps,
  type SkeletonLineProps,
  type SkeletonLinesProps,
  type SkeletonCircleProps,
  type SkeletonTableProps,
  type SkeletonHostProps,
} from "./LoadingSkeleton";

// A.3 — Toast primitive + Provider + hook (UI coherence Phase 1 W2).
// Provider mounts the queue + viewport. Hook reads context; falls back
// to no-op + dev warning when no Provider mounted (root-layout mount is
// Phase 2). Toast itself is the single-chip presentational component.
export {
  Toast,
  TOAST_ROLE_BY_TONE,
  TOAST_LIVE_BY_TONE,
  type ToastTone,
  type ToastData,
  type ToastAction,
} from "./Toast";
export {
  ToastProvider,
  TOAST_MAX_VISIBLE,
  TOAST_DEDUP_WINDOW_MS,
  TOAST_DEFAULT_DURATION_MS,
  TOAST_DEFAULT_DURATION_BY_TONE,
  type ToastProviderProps,
  type ToastPosition,
  type ToastOptions,
  type ToastHandle,
  type ToastApi,
} from "./ToastProvider";
export { useToast } from "./useToast";

// C.5 spec-aligned generic DisclosureAccordion (E-A15 Bushido Coverage
// tab demotion + future cross-module use).
export {
  DisclosureAccordion,
  __resetDisclosureWarnings,
} from "./DisclosureAccordion";
export type {
  DisclosureAccordionProps,
  DisclosureAccordionVariant,
  DisclosureAccordionSection,
  SingleDisclosureProps,
  GroupedDisclosureProps,
} from "./DisclosureAccordion";

// A.5 — Drawer / Sheet anchor primitive (UI Coherence Phase 1 W2).
// Canonical off-canvas drawer consolidating ActivityLogDrawer +
// SenseiDrawer + AddProviderDrawer chrome into one variant-axis
// primitive. Variants: default 420 / form 600 / wide 820. Native
// <dialog> with `useDrawerFocusTrap` jsdom parity. Mobile (≤768px)
// collapses to full-width (full-screen modal degradation). See the
// A.5 Drawer/Sheet primitive spec for acceptance criteria.
export { Drawer } from "./Drawer";
export type {
  DrawerProps,
  DrawerVariant,
  DrawerPosition,
  DrawerAriaLive,
  DrawerTitleAs,
  DrawerFooterPrimaryAction,
  DrawerFooterSecondaryAction,
  DrawerFormFooter,
} from "./Drawer";

// TICKET-DROPDOWN-UNIFY — native-`<select>`-backed combobox with
// custom chrome that matches the ModelPicker visual. The CSS-only
// `.wb-select` upgrade in workbench.css this PR ships unifies the
// chrome across every legacy callsite without touching them; this
// primitive provides the long-term API for new code.
export { Select, SELECT_OPTION_LABEL_MAX } from "./Select";
export type { SelectOption, SelectProps } from "./Select";
