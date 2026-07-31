// SPDX-License-Identifier: Apache-2.0
export * from './shell';
export * from './primitives';
export * from './kamae';
export * from './command';
export * from './workbench';
export * from './arena';
export * from './codex';
export * from './ritual';
export * from './system';
export * from './scanner';
export * from './admin';
export * from './dashboard';
export * from './adversarial';
// E4.S9 — combobox-style model picker (search + group + recently-used).
// Lives outside `system` because it ships its own helpers (groupOptions,
// filterOptions) that are exercised by unit tests.
export * from './llm';
// A.2 — pre-composed module skeletons. Atoms ship from `./primitives`
// via the Skeleton namespace + individual named exports; this barrel
// exposes the seven module-level compositions (BushidoSkeleton, etc).
export * from './skeletons';
// Tatami (Epic 3) — OSS embedded evidence-cockpit shell. Presentational
// only; imports no `tatami-vault` (EE). Chrome CSS is loaded by the
// `(shell)` layout.
export * from './tatami';
