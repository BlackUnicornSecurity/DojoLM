// SPDX-License-Identifier: Apache-2.0
/**
 * SenseiBrainPicker — Sensei Rework (Pillar B, step 9) Jutsu control.
 *
 * A compact, NEUTRAL picker that pins the dedicated "Sensei brain" — the
 * model that drives the in-app Sensei assistant — by PATCHing the
 * `sensei_model.config_id` admin setting. It is deliberately NOT a primary
 * CTA: the Jutsu surface keeps a single torii-red CTA ("Add Model"), so this
 * is a plain `wb-field` select.
 *
 * Two facts the target-model grid can't supply, so the picker fetches them
 * itself:
 *   - the candidate list via `?senseiOnly=true&includeBrain=true` — the ≤40B
 *     target cap is LIFTED here (the brain may be a large model);
 *   - the current pin via the `/api/admin/settings` snapshot
 *     (`sensei_model_config_id`), so the select reflects what is pinned.
 *
 * Selecting "— None" clears the pin (the chat resolver falls through to the
 * first enabled model). The write is optimistic; a failed PATCH rolls the
 * selection back and surfaces an inline message.
 */
"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { readCsrfToken } from "@/lib/csrf-cookie";

interface BrainModel {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
}

type SaveState = "idle" | "saving" | "error";

function parseModels(body: unknown): BrainModel[] {
  if (!Array.isArray(body)) return [];
  const out: BrainModel[] = [];
  for (const raw of body) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id === "string" && typeof r.name === "string") {
      out.push({
        id: r.id,
        name: r.name,
        provider: typeof r.provider === "string" ? r.provider : "unknown",
      });
    }
  }
  return out;
}

export function SenseiBrainPicker(): ReactElement {
  const [models, setModels] = useState<readonly BrainModel[]>([]);
  const [brainId, setBrainId] = useState<string>(""); // '' === none / auto
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<SaveState>("idle");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Raw `fetch` (+ `credentials: 'same-origin'`), matching the host
        // JutsuClient's own grid fetch: `/admin/jutsu` is already server-side
        // admin-gated (`resolveYr4PagePrelude`), so the client-side
        // `canAccessProtectedApi` gate the Sensei DRAWER uses is redundant
        // here. Keep this consistent with JutsuClient, not the drawer.
        const [modelsRes, settingsRes] = await Promise.all([
          fetch("/api/llm/models?senseiOnly=true&includeBrain=true", {
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch("/api/admin/settings", {
            cache: "no-store",
            credentials: "same-origin",
          }).catch(() => null),
        ]);
        if (cancelled) return;

        const body: unknown = await modelsRes.json().catch(() => null);
        const list = modelsRes.ok ? parseModels(body) : [];

        let current = "";
        if (settingsRes && settingsRes.ok) {
          const snap: unknown = await settingsRes.json().catch(() => null);
          const raw = (snap as Record<string, unknown> | null)
            ?.sensei_model_config_id;
          if (typeof raw === "string") current = raw;
        }

        if (!cancelled) {
          setModels(list);
          setBrainId(current);
        }
      } catch {
        // Leave the picker empty; the select still renders the None option.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = useCallback(
    async (value: string) => {
      const prev = brainId;
      setBrainId(value); // optimistic
      setSave("saving");
      try {
        const csrf = readCsrfToken();
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "x-csrf-token": csrf } : {}),
          },
          // Empty string clears the pin (route's clear branch); a config id
          // goes through the exists+enabled gate. The ≤40B cap is not applied.
          body: JSON.stringify({ key: "sensei_model.config_id", value }),
        });
        if (!res.ok) {
          setBrainId(prev);
          setSave("error");
          return;
        }
        setSave("idle");
      } catch {
        setBrainId(prev);
        setSave("error");
      }
    },
    [brainId],
  );

  const hint =
    save === "error"
      ? "Could not save. Try again."
      : save === "saving"
        ? "Saving…"
        : "The model that powers the Sensei assistant.";

  // Design wave-g3 "Models v2.html" `.asst-bar`: title + helper stacked on
  // the left, the select on the right, inside the bordered assistant panel
  // (JutsuClient wraps this in `.panel > .panel-body`). The helper line
  // doubles as the optimistic-save status feedback.
  return (
    <div className="asst-bar" data-testid="jutsu-sensei-brain-picker">
      <div className="lead">
        <div className="t">Assistant model</div>
        <div
          id="jutsu-sensei-brain-hint"
          className="s"
          role={save === "error" ? "alert" : undefined}
          aria-live="polite"
        >
          {hint}
        </div>
      </div>
      <select
        className="wb-input"
        data-testid="jutsu-sensei-brain-select"
        value={brainId}
        disabled={loading || save === "saving"}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="jutsu-sensei-brain-hint"
        aria-label="Assistant model"
      >
        <option value="">None — auto-select the first enabled model</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {m.provider}
          </option>
        ))}
      </select>
    </div>
  );
}
