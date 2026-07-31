// SPDX-License-Identifier: Apache-2.0
export {
  FilterRail,
  FilterField,
  type FilterRailProps,
  type FilterFieldProps,
} from './FilterRail';
export { Grid, type GridProps, type GridRow } from './Grid';
// A.5 — re-export the codex archetype's drawer under a distinct alias
// so the top-level design-system barrel (`src/design/index.ts`) can
// `export *` both the canonical `Drawer` from `./primitives` AND the
// codex archetype variant from `./codex` without colliding on the
// `Drawer` / `DrawerProps` symbol. Direct importers of
// `@/design/codex/Drawer` keep their `import { Drawer } from
// '@/design/codex/Drawer'` path unchanged — the alias only affects the
// top-level barrel surface.
export {
  Drawer as CodexDrawer,
  type DrawerProps as CodexDrawerProps,
} from './Drawer';
export {
  PaperEntry,
  type PaperEntryProps,
  type PaperEntryProvenanceField,
} from './PaperEntry';
export { TechniqueCard, type TechniqueCardProps } from './TechniqueCard';
