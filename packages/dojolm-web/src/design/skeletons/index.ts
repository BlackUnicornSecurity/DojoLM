// SPDX-License-Identifier: Apache-2.0
// A.2 pre-composed module skeletons — one per Phase-3 deep-redesign
// module. Each composes the LoadingSkeleton atoms (./primitives) to
// match its module's populated layout dimensions so the loading →
// populated crossfade lands with zero layout shift.
export { BushidoSkeleton, type BushidoSkeletonProps } from './BushidoSkeleton';
export { BukiSkeleton, type BukiSkeletonProps } from './BukiSkeleton';
export { AtemiSkeleton, type AtemiSkeletonProps } from './AtemiSkeleton';
export { JutsuSkeleton, type JutsuSkeletonProps } from './JutsuSkeleton';
export { RoninSkeleton, type RoninSkeletonProps } from './RoninSkeleton';
export { DashboardSkeleton, type DashboardSkeletonProps } from './DashboardSkeleton';
export { AdminIndexSkeleton, type AdminIndexSkeletonProps } from './AdminIndexSkeleton';
// HAGANE E3.S1 — route-group loading fallback for modules without a
// bespoke A.2 skeleton.
export {
  GenericModuleSkeleton,
  type GenericModuleSkeletonProps,
} from './GenericModuleSkeleton';
