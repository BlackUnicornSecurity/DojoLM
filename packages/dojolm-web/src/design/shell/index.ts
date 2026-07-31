// SPDX-License-Identifier: Apache-2.0
export { I, type IconName } from './icons';
export { Rail, RAIL, MEMBER_RAIL, type RailItem, type RailProps, type RailSection } from './Rail';
// E6.S4 — the metadata-shape interface formerly named `EnvChip` was renamed
// `EnvChipSpec` to free the component name. The runtime `<EnvChip>` component
// (PROD / STAGING / DEV chip on TopBar) lives at `design/system/EnvChip` and
// is re-exported through `design/system`. No external consumer of the
// previous `EnvChip` interface name was found in the repo at the time of the
// rename (`grep -rn "import.*EnvChip" src` returned nothing); if a stale
// import surfaces, switch it to `EnvChipSpec`.
export {
  TopBar,
  type TopBarProps,
  type EnvChipSpec,
  type TopBarArchetype,
} from './TopBar';
export { AvatarMenu, type AvatarMenuProps } from './AvatarMenu';
export { PageHead, type PageHeadProps } from './PageHead';
export { Panel, type PanelProps, type PanelVariant } from './Panel';
// P2a — the two shared primitives the P2 content rebuilds compose with.
export { RefBlock, type RefBlockProps } from './RefBlock';
export { Steps, type StepsProps, type StepsItem } from './Steps';
export { Metric, type MetricProps, type MetricTone, type MetricDelta } from './Metric';
export { ActivityLogDrawer, type ActivityLogDrawerProps } from './ActivityLogDrawer';
export {
  ActivityLogDrawerController,
  type ActivityLogDrawerControllerProps,
  ACTIVITY_DRAWER_OPEN_EVENT,
} from './ActivityLogDrawerController';
// E7.S1 — narrow-viewport Rail drawer (off-canvas hamburger ≤768px).
export { RailDrawer, type RailDrawerProps } from './RailDrawer';
export {
  RailDrawerController,
  type RailDrawerControllerProps,
  RAIL_DRAWER_OPEN_EVENT,
} from './RailDrawerController';
