// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/design/shell/Panel";
import { cap } from "@/design/primitives/_caps";

type IntelligenceType = "cve" | "ai-incident" | "kev" | "epss" | "atlas";

const INTEL_TYPE_LABEL: Record<IntelligenceType, string> = {
  cve: "CVE",
  "ai-incident": "AI incident",
  kev: "KEV",
  epss: "EPSS",
  atlas: "ATLAS",
};

const VALID_INTEL_TYPES: ReadonlySet<IntelligenceType> = new Set([
  "cve",
  "ai-incident",
  "kev",
  "epss",
  "atlas",
]);

const MAX_INTEL_DISPLAYED = 50;

interface IntelEntryLite {
  readonly id: string;
  readonly type: IntelligenceType;
  readonly title: string;
  readonly summary: string;
  readonly severity: string;
  readonly publishedAt: string;
}

function isIntelligenceType(value: unknown): value is IntelligenceType {
  return (
    typeof value === "string" &&
    VALID_INTEL_TYPES.has(value as IntelligenceType)
  );
}

function sanitizeIntel(raw: unknown): IntelEntryLite | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.title !== "string") {
    return null;
  }
  if (!isIntelligenceType(record.type)) return null;

  return {
    id: cap(record.id, 64),
    type: record.type,
    title: cap(record.title, 200),
    summary: cap(typeof record.summary === "string" ? record.summary : "", 360),
    severity: cap(
      typeof record.severity === "string" ? record.severity : "INFO",
      16,
    ),
    publishedAt: cap(
      typeof record.publishedAt === "string" ? record.publishedAt : "",
      32,
    ),
  };
}

export function IntelligenceTab() {
  const [entries, setEntries] = useState<readonly IntelEntryLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/ronin/intelligence?limit=50", {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as {
          entries?: readonly unknown[];
        };
        if (cancelled) return;
        if (!response.ok) {
          setError("Intelligence feed unavailable");
          setEntries([]);
          return;
        }

        const safe: IntelEntryLite[] = [];
        for (const item of body.entries ?? []) {
          const entry = sanitizeIntel(item);
          if (entry && safe.length < MAX_INTEL_DISPLAYED) safe.push(entry);
        }
        setEntries(safe);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel
      title="Intelligence feed"
      sub={
        loading
          ? "Fetching intelligence feed…"
          : error
            ? error
            : `${entries.length} CVE / AI-incident entries`
      }
    >
      {error !== null && (
        <div
          role="alert"
          data-testid="ronin-intel-error"
          className="wb-banner danger"
        >
          {error}
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="wb-hint" data-testid="ronin-intel-empty">
          Intelligence feed is empty.
        </p>
      )}
      {entries.length > 0 && (
        <div
          className="v2-data-scroll"
          role="region"
          aria-label="Ronin intelligence feed table scroll area"
          tabIndex={0}
        >
          <table
            className="wb-table"
            aria-label="Ronin intelligence feed"
            data-testid="ronin-intel-table"
          >
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Summary</th>
                <th>Severity</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} data-testid={`ronin-intel-row-${entry.id}`}>
                  <td>
                    <span
                      aria-label={`Entry type ${INTEL_TYPE_LABEL[entry.type]}`}
                    >
                      {INTEL_TYPE_LABEL[entry.type]}
                    </span>
                  </td>
                  <td>{entry.title}</td>
                  <td style={{ fontSize: 12 }}>{entry.summary}</td>
                  <td>{entry.severity}</td>
                  <td style={{ fontSize: 11 }}>{entry.publishedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
