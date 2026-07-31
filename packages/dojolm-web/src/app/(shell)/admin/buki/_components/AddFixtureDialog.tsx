// SPDX-License-Identifier: Apache-2.0
/**
 * AddFixtureDialog — modal form for creating a SAGE seed-corpus
 * fixture via POST /api/buki/sage/seeds. Phase 2 Q1 follow-up
 * (PR-3 of the Buki Phase 2 wave; closes the disabled-stub "Add
 * Fixture" CTA that landed in E-A4 Phase B).
 *
 * Uses the native `<dialog>` element for built-in focus-trap + Escape
 * dismissal + Backdrop click handling — avoids a JS-side modal
 * primitive (no A.6 Dialog primitive shipped yet) and keeps the
 * surface small enough to land in one PR.
 *
 * Form fields (mirror the server-side POST validator in
 * `/api/buki/sage/seeds/route.ts`):
 *   - name (required, ≤ 200 chars) — seed display name
 *   - content (required, ≤ 8000 chars) — the actual prompt payload
 *   - category (required, closed `SeedCategory` 20-value enum)
 *   - criticity (closed `SageCriticity` 5-value enum, defaults to MEDIUM)
 *   - description (optional, ≤ 2000 chars)
 *   - tags (optional, comma-separated, ≤ 16 tags ≤ 64 chars each)
 *
 * Validation runs client-side BEFORE the POST (clear errors inline),
 * but the server-side route still enforces the closed-enum gate +
 * length caps + auth — defence-in-depth.
 *
 * On 201 success: invoke `onSeedAdded(seed)` with the server response
 * (carries the server-computed `aivss` field per PR #843) so the
 * parent can prepend to local state without a refetch round-trip.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  SAGE_CRITICITY_LEVELS,
  SEED_CATEGORIES,
  type SageCriticity,
  type SeedCategory,
} from "@/lib/sage/fixtures";
import { readCsrfToken } from "@/lib/csrf-cookie";
import { sanitizeSeed } from "./sanitize";
import type { SeedRecord } from "./types";

interface AddFixtureDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSeedAdded: (seed: SeedRecord) => void;
}

// Component-internal builder shape — mutated during validate() then
// committed via setErrors. NOT exposed across the component boundary,
// so the readonly contract that types.ts uses for SeedRecord et al.
// doesn't apply here.
interface FormErrors {
  name?: string;
  content?: string;
  category?: string;
  submit?: string;
}

const NAME_LIMIT = 200;
const CONTENT_LIMIT = 8_000;
const DESCRIPTION_LIMIT = 2_000;
const TAG_LIMIT_COUNT = 16;
const TAG_LIMIT_LEN = 64;

function parseTags(raw: string): readonly string[] {
  if (raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, TAG_LIMIT_COUNT)
    .map((t) => t.slice(0, TAG_LIMIT_LEN));
}

function isSeedCategory(value: string): value is SeedCategory {
  return (SEED_CATEGORIES as readonly string[]).includes(value);
}

function isSageCriticity(value: string): value is SageCriticity {
  return (SAGE_CRITICITY_LEVELS as readonly string[]).includes(value);
}

export function AddFixtureDialog({
  open,
  onClose,
  onSeedAdded,
}: AddFixtureDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("injection");
  const [criticity, setCriticity] = useState<SageCriticity>("MEDIUM");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Open/close the native <dialog> in response to the `open` prop.
  // `showModal()` triggers the browser's built-in focus-trap +
  // Escape-dismissal + backdrop overlay.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Reset form state when the dialog closes so a re-open starts fresh.
  useEffect(() => {
    if (!open) {
      setName("");
      setContent("");
      setCategory("injection");
      setCriticity("MEDIUM");
      setDescription("");
      setTagsRaw("");
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  // Native <dialog> emits a `close` event when Escape or backdrop
  // dismisses — propagate that to the parent so `open` stays in sync.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => {
      if (open) onClose();
    };
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [open, onClose]);

  function validate(): FormErrors {
    const next: FormErrors = {};
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (trimmedName.length === 0) next.name = "Name is required.";
    else if (trimmedName.length > NAME_LIMIT)
      next.name = `Name must be ≤ ${NAME_LIMIT} characters.`;
    if (trimmedContent.length === 0) next.content = "Content is required.";
    else if (trimmedContent.length > CONTENT_LIMIT)
      next.content = `Content must be ≤ ${CONTENT_LIMIT} characters.`;
    if (!isSeedCategory(category))
      next.category = "Category must be one of the SAGE seed categories.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Architect HIGH-1 — mirror the Jutsu/Ronin admin-POST CSRF
      // pattern (`readCsrfToken()` from the double-submit cookie).
      // Header is omitted entirely when no token is present so the
      // server's error message stays "CSRF token missing/invalid"
      // rather than degrading to a generic "Unauthorized".
      const csrf = readCsrfToken();
      const res = await fetch("/api/buki/sage/seeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf !== null ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          content: content.trim(),
          category,
          criticity,
          description: description.trim(),
          tags: parseTags(tagsRaw),
        }),
      });
      // Adversarial MED-1 / architect MED-1 — type the parsed body as
      // `unknown` and run `body.seed` through the same `sanitizeSeed`
      // trust boundary that the GET path uses. Defends against shape
      // drift between server SeedRecord (has `content` / `createdAt` /
      // `tags`) and the client SeedRecord (doesn't), and against any
      // future server bug returning a partial shape.
      const body = (await res.json().catch(() => ({}))) as {
        seed?: unknown;
        error?: string;
      };
      if (!res.ok) {
        setErrors({
          submit:
            typeof body.error === "string"
              ? body.error
              : `Failed to create fixture (HTTP ${res.status}).`,
        });
        return;
      }
      const safe = sanitizeSeed(body.seed);
      if (safe === null) {
        setErrors({
          submit: "Server returned an unexpected seed shape.",
        });
        return;
      }
      onSeedAdded(safe);
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // TODO(A.6) — migrate to the canonical Dialog primitive once it
    // ships per the A.6 Dialog primitive spec.
    // Until then native `<dialog>` is the documented interim (built-in
    // focus-trap + Escape dismissal + backdrop) and avoids the
    // darwin-perf @/design barrel cascade entirely.
    <dialog
      ref={dialogRef}
      data-testid="buki-add-fixture-dialog"
      aria-labelledby="buki-add-fixture-dialog-title"
      style={{
        padding: 0,
        border: "1px solid var(--b-1, #222)",
        borderRadius: 12,
        background: "var(--bg-1, #0d0d10)",
        color: "var(--fg, #eee)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        minWidth: 480,
        maxWidth: 640,
        width: "90vw",
      }}
    >
      <form
        // NO `method="dialog"` — that attribute lets the browser close the
        // <dialog> AND dispatch a `close` event on every submit-button
        // click BEFORE the React `onSubmit` handler runs. The result on
        // compliant browsers is: dialog closes instantly, no POST, no
        // validation, e.preventDefault() has no effect because the native
        // form/dialog integration already ate the event. jsdom doesn't
        // implement that integration so tests pass without it — adversarial
        // review HIGH-1. We drive close imperatively via onClose() instead.
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            id="buki-add-fixture-dialog-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 700 }}
          >
            Add SAGE seed fixture
          </h2>
          <button
            type="button"
            data-testid="buki-add-fixture-dialog-close"
            aria-label="Close dialog"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--fg-mute)",
              fontSize: 20,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Name <span style={{ color: "var(--torii-lg)" }}>*</span>
          </span>
          <input
            type="text"
            autoComplete="off"
            data-testid="buki-add-fixture-name"
            value={name}
            maxLength={NAME_LIMIT}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            required
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--b-1)",
              background: "var(--bg-2)",
              color: "var(--fg)",
              fontSize: 13,
            }}
          />
          {errors.name !== undefined && (
            <span
              role="alert"
              data-testid="buki-add-fixture-name-error"
              style={{ fontSize: 11, color: "var(--torii-lg)" }}
            >
              {errors.name}
            </span>
          )}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Content <span style={{ color: "var(--torii-lg)" }}>*</span>
          </span>
          <textarea
            data-testid="buki-add-fixture-content"
            value={content}
            maxLength={CONTENT_LIMIT}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            required
            rows={5}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--b-1)",
              background: "var(--bg-2)",
              color: "var(--fg)",
              fontSize: 13,
              fontFamily: "var(--mono)",
              resize: "vertical",
            }}
          />
          {errors.content !== undefined && (
            <span
              role="alert"
              data-testid="buki-add-fixture-content-error"
              style={{ fontSize: 11, color: "var(--torii-lg)" }}
            >
              {errors.content}
            </span>
          )}
        </label>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Category <span style={{ color: "var(--torii-lg)" }}>*</span>
            </span>
            <select
              data-testid="buki-add-fixture-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
              required
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--b-1)",
                background: "var(--bg-2)",
                color: "var(--fg)",
                fontSize: 13,
              }}
            >
              {SEED_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category !== undefined && (
              <span
                role="alert"
                data-testid="buki-add-fixture-category-error"
                style={{ fontSize: 11, color: "var(--torii-lg)" }}
              >
                {errors.category}
              </span>
            )}
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Criticity</span>
            <select
              data-testid="buki-add-fixture-criticity"
              value={criticity}
              onChange={(e) => {
                const v = e.target.value;
                if (isSageCriticity(v)) setCriticity(v);
              }}
              disabled={submitting}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--b-1)",
                background: "var(--bg-2)",
                color: "var(--fg)",
                fontSize: 13,
              }}
            >
              {SAGE_CRITICITY_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Description</span>
          <textarea
            data-testid="buki-add-fixture-description"
            value={description}
            maxLength={DESCRIPTION_LIMIT}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={2}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--b-1)",
              background: "var(--bg-2)",
              color: "var(--fg)",
              fontSize: 13,
              resize: "vertical",
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Tags{" "}
            <span
              style={{ fontSize: 11, fontWeight: 400, color: "var(--fg-mute)" }}
            >
              (comma-separated, max {TAG_LIMIT_COUNT} tags · each ≤{" "}
              {TAG_LIMIT_LEN} chars)
            </span>
          </span>
          <input
            type="text"
            autoComplete="off"
            data-testid="buki-add-fixture-tags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            disabled={submitting}
            placeholder="e.g. jailbreak, classic, common"
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--b-1)",
              background: "var(--bg-2)",
              color: "var(--fg)",
              fontSize: 13,
            }}
          />
        </label>

        {errors.submit !== undefined && (
          <div
            role="alert"
            data-testid="buki-add-fixture-submit-error"
            className="yr4-banner tone-red"
            style={{ padding: 10, borderRadius: 6, fontSize: 13 }}
          >
            {errors.submit}
          </div>
        )}

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            data-testid="buki-add-fixture-cancel"
            onClick={onClose}
            disabled={submitting}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="buki-add-fixture-submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? "Adding…" : "Add fixture"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
