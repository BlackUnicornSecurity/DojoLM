// SPDX-License-Identifier: Apache-2.0
/**
 * Shared coverage-matrix data types. The v2-skin P2d rebuild replaced the
 * flat `<ServiceCoverageGrid>` renderer with the grouped, surface-scoped
 * `admin/hattori/_components/CoverageMatrix`; that presenter reuses these
 * types so the data contract stays single-sourced (DA KALITAS 2026-07-16,
 * architect MEDIUM — dead render component removed, types retained).
 */
export type ServiceCoverageCell = "ok" | "gap" | "na";

export interface ServiceCoverageRow {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Service / module name (e.g. `"billing-agent"`). */
  readonly service: string;
  /** Cell states aligned with the column headers. */
  readonly cells: readonly ServiceCoverageCell[];
}
