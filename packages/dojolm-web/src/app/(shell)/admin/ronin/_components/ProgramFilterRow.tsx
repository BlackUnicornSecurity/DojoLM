// SPDX-License-Identifier: Apache-2.0
/**
 * ProgramFilterRow — text search + platform + status + subscribed
 * toggle for the Ronin Bounty programs grid.
 *
 * Extracted from `RoninAdminClient.tsx` per the >800 LOC split (PR #3).
 * Pure presentational — all state lives on the orchestrator; this
 * component just wires the controlled inputs.
 *
 * Closed-enum narrowing predicates (`isPlatformFilter`,
 * `isStatusFilter`) live alongside this component since they are
 * specific to the filter contract.
 */

import type { ReactElement } from "react";
import type { PlatformFilter, StatusFilter } from "./types";

function isPlatformFilter(value: unknown): value is PlatformFilter {
  return (
    value === "all" ||
    value === "hackerone" ||
    value === "bugcrowd" ||
    value === "huntr" ||
    value === "0din"
  );
}

function isStatusFilter(value: unknown): value is StatusFilter {
  return (
    value === "all" ||
    value === "active" ||
    value === "paused" ||
    value === "upcoming" ||
    value === "closed"
  );
}

export interface ProgramFilterRowProps {
  readonly search: string;
  readonly platform: PlatformFilter;
  readonly status: StatusFilter;
  readonly subscribedOnly: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onPlatformChange: (value: PlatformFilter) => void;
  readonly onStatusChange: (value: StatusFilter) => void;
  readonly onSubscribedOnlyChange: (value: boolean) => void;
}

export function ProgramFilterRow({
  search,
  platform,
  status,
  subscribedOnly,
  onSearchChange,
  onPlatformChange,
  onStatusChange,
  onSubscribedOnlyChange,
}: ProgramFilterRowProps): ReactElement {
  return (
    <div
      className="ronin-program-filter-row"
      data-testid="ronin-program-filter-row"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <input
        type="search"
        autoComplete="off"
        data-testid="ronin-program-search"
        aria-label="Search bounty programs"
        placeholder="Search programs…"
        value={search}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        style={{ flex: "1 1 160px", minWidth: 0 }}
      />
      <select
        data-testid="ronin-program-platform-filter"
        aria-label="Filter by platform"
        value={platform}
        onChange={(e) => {
          const next = e.currentTarget.value;
          if (isPlatformFilter(next)) onPlatformChange(next);
        }}
      >
        <option value="all">All platforms</option>
        <option value="hackerone">HackerOne</option>
        <option value="bugcrowd">Bugcrowd</option>
        <option value="huntr">huntr</option>
        <option value="0din">0din</option>
      </select>
      <select
        data-testid="ronin-program-status-filter"
        aria-label="Filter by status"
        value={status}
        onChange={(e) => {
          const next = e.currentTarget.value;
          if (isStatusFilter(next)) onStatusChange(next);
        }}
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="upcoming">Upcoming</option>
        <option value="closed">Closed</option>
      </select>
      <label
        data-testid="ronin-program-subscribed-toggle"
        title="Show only programs you've subscribed to."
        style={{
          display: "inline-flex",
          gap: 6,
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          aria-label="Subscribed only"
          data-testid="ronin-program-subscribed-checkbox"
          checked={subscribedOnly}
          onChange={(e) => onSubscribedOnlyChange(e.currentTarget.checked)}
        />
        <span className="wb-hint" style={{ fontSize: 11 }}>
          Subscribed
        </span>
      </label>
    </div>
  );
}
