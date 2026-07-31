// SPDX-License-Identifier: Apache-2.0
/**
 * NewCaseForm — inline case-create form for /admin/tatami.
 *
 * A controlled form (title / hypothesis / severity / comma-separated
 * tags) that hands a structured payload to the parent via `onSubmit`.
 * The parent owns the POST + error surfacing; this component is purely
 * presentational + local-state, so it stays test-light and reusable. The
 * `busy` prop disables the submit while the parent's POST is in flight.
 */

"use client";

import { useState } from "react";

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export interface NewCasePayload {
  readonly title: string;
  readonly hypothesis: string;
  readonly severity: string;
  readonly tags: readonly string[];
}

export function NewCaseForm({
  onSubmit,
  onCancel,
  busy,
}: {
  onSubmit: (payload: NewCasePayload) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [tags, setTags] = useState("");

  function submit(): void {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onSubmit({
      title: trimmedTitle,
      hypothesis: hypothesis.trim(),
      severity,
      tags: parsedTags,
    });
  }

  return (
    <div
      data-testid="tatami-new-case-form"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        marginBottom: 12,
        padding: "var(--space-3)",
        border: "1px solid var(--b-1)",
        borderRadius: 6,
      }}
    >
      <label
        style={{ fontSize: 12, color: "var(--fg-mute)" }}
        htmlFor="tatami-case-title"
      >
        Title
      </label>
      <input
        id="tatami-case-title"
        type="text"
        autoComplete="off"
        data-testid="tatami-case-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ padding: "4px 6px" }}
      />

      <label
        style={{ fontSize: 12, color: "var(--fg-mute)" }}
        htmlFor="tatami-case-hypothesis"
      >
        Hypothesis
      </label>
      <textarea
        id="tatami-case-hypothesis"
        data-testid="tatami-case-hypothesis"
        value={hypothesis}
        onChange={(e) => setHypothesis(e.target.value)}
        rows={3}
        style={{ padding: "4px 6px", resize: "vertical" }}
      />

      <label
        style={{ fontSize: 12, color: "var(--fg-mute)" }}
        htmlFor="tatami-case-severity"
      >
        Severity
      </label>
      <select
        id="tatami-case-severity"
        data-testid="tatami-case-severity"
        value={severity}
        onChange={(e) => setSeverity(e.target.value)}
        style={{ padding: "4px 6px" }}
      >
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label
        style={{ fontSize: 12, color: "var(--fg-mute)" }}
        htmlFor="tatami-case-tags"
      >
        Tags (comma-separated)
      </label>
      <input
        id="tatami-case-tags"
        type="text"
        autoComplete="off"
        data-testid="tatami-case-tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="injection, exfiltration"
        style={{ padding: "4px 6px" }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button
          type="button"
          className="btn"
          data-testid="tatami-case-cancel"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn"
          data-testid="tatami-case-submit"
          disabled={busy || title.trim().length === 0}
          onClick={submit}
        >
          {busy ? "Creating…" : "Create case"}
        </button>
      </div>
    </div>
  );
}
