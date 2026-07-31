// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useRef, useState } from "react";

type Vibe = "subtle" | "confident" | "bold";
type Kanji = "on" | "off";
type Density = "spacious" | "balanced" | "dense";

const VIBES: readonly Vibe[] = ["subtle", "confident", "bold"];
const KANJIS: readonly Kanji[] = ["on", "off"];
const DENSITIES: readonly Density[] = ["spacious", "balanced", "dense"];

const isVibe = (v: unknown): v is Vibe => VIBES.includes(v as Vibe);
const isKanji = (v: unknown): v is Kanji => KANJIS.includes(v as Kanji);
const isDensity = (v: unknown): v is Density =>
  DENSITIES.includes(v as Density);

export interface KamaeProps {
  storageKey?: string;
}

// Playable preferences panel. Writes data-vibe / data-kanji / data-density to
// the nearest [data-kamae-scope] ancestor and persists to localStorage.
export function Kamae({ storageKey = "dojolm.kamae" }: KamaeProps) {
  const rootRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const [vibe, setVibe] = useState<Vibe>("confident");
  const [kanji, setKanji] = useState<Kanji>("on");
  const [density, setDensity] = useState<Density>("balanced");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const s: unknown = JSON.parse(raw);
      if (!s || typeof s !== "object") return;
      const rec = s as Record<string, unknown>;
      // Narrow each field against its union allowlist before applying — the
      // values flow to scope.setAttribute('data-vibe', ...) etc. and cross-
      // origin extensions / stored-XSS elsewhere could seed arbitrary strings.
      if (isVibe(rec.vibe)) setVibe(rec.vibe);
      if (isKanji(rec.kanji)) setKanji(rec.kanji);
      if (isDensity(rec.density)) setDensity(rec.density);
      if (typeof rec.open === "boolean") setOpen(rec.open);
    } catch {
      // ignore malformed storage
    }
  }, [storageKey]);

  // E7.S10-followup round-2 (V5 W3cc QA): F-5-019 mobile-collapse via CSS
  // `.kamae { display: none }` at ≤768px hides the panel when `open=true`
  // but the user has no way to surface the .kamae-reopen rail because the
  // component conditionally renders <div.kamae> (open=true branch). Detect
  // mobile viewport via window.matchMedia and force-collapse to reopen
  // rail. SSR-safe: matchMedia gated on typeof window check.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      if (mq.matches) setOpen(false);
    };
    apply();
    if ("addEventListener" in mq) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const scope = el.closest("[data-kamae-scope]") ?? el.ownerDocument.body;
    scope.setAttribute("data-vibe", vibe);
    scope.setAttribute("data-kanji", kanji);
    scope.setAttribute("data-density", density);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ vibe, kanji, density, open }),
      );
    } catch {
      // ignore
    }
  }, [vibe, kanji, density, open, storageKey]);

  if (!open) {
    return (
      <button
        className="kamae-reopen"
        aria-label={`Open Kamae · Stance — ${vibe} · kanji ${kanji} · ${density}`}
        onClick={() => setOpen(true)}
        ref={(el) => {
          rootRef.current = el;
        }}
      >
        <span className="kamae-reopen-mark" lang="ja">
          構
        </span>
        <span className="kamae-reopen-label">
          <b>Kamae · Stance</b>
          {/* Plain-language surface-preferences gloss (Command Center
              v2.html:240) — sentence-case, not mono-caps state codes. */}
          <span
            className="kamae-reopen-state"
            data-state={`${vibe} · kanji ${kanji} · ${density}`}
            aria-hidden="true"
          >
            — surface preferences: {density} rhythm · {vibe} intensity · glyphs{" "}
            {kanji}
          </span>
        </span>
        <span className="kamae-reopen-cta">Adjust</span>
      </button>
    );
  }

  return (
    <div
      className="kamae"
      ref={(el) => {
        rootRef.current = el;
      }}
    >
      <button
        className="kamae-close"
        onClick={() => setOpen(false)}
        aria-label="Close Kamae panel"
        title="Close · settings remain active"
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="kamae-head">
        <div className="kamae-head-top">
          <div className="kamae-kmark" lang="ja">
            構
          </div>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="kamae-title">Kamae · Stance</h3>
            <div className="kamae-sub">Dojo preferences · live preview</div>
          </div>
        </div>
        <p className="kamae-desc">
          Tune the posture of this surface. Changes apply live.
        </p>
        <div className="kamae-persist">
          <span
            className="chip jade"
            style={{ padding: "3px 7px", fontSize: 11 }}
          >
            <span className="dot" />
            SAVED
          </span>
        </div>
      </div>

      <div className="kamae-groups">
        {/* Group 1 — Vibe */}
        <div className="kamae-group">
          <div className="kamae-group-label">
            <span className="idx">1</span>Vibe · visual energy
          </div>
          <div className="kamae-tiles">
            {/* TICKET-E1-S10-FOLLOWUP: Kamae is the design-system kanji
                preference visualizer; the per-tile kanji glyph (低/中/高
                for vibe; 疎/均/密 for density) IS the visual signal of
                this control. The G4 budget is intentionally exceeded
                inside the Kamae preview itself. Follow-up: lift these
                glyphs out of the map and render as 3 hand-authored
                static <span>s, or accept the suppression. */}
            {(["subtle", "confident", "bold"] as const).map((v) => (
              <div
                key={v}
                data-vibe={v}
                className={`ktile ${vibe === v ? "active" : ""}`}
                onClick={() => setVibe(v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setVibe(v);
                  }
                }}
              >
                <div className="ktile-preview">
                  <div className="rsun-rays" />
                  <div className="rsun" />
                </div>
                <div className="ktile-label">
                  <b>{v[0].toUpperCase() + v.slice(1)}</b>
                  <span>
                    {v === "subtle"
                      ? "low"
                      : v === "confident"
                        ? "medium"
                        : "high"}{" "}
                    · intensity
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group 2 — Kanji */}
        <div className="kamae-group">
          <div className="kamae-group-label">
            <span className="idx">2</span>Kanji glyphs
          </div>
          <div className="kamae-tiles two">
            <div
              className={`ktile ${kanji === "on" ? "active" : ""}`}
              onClick={() => setKanji("on")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setKanji("on");
                }
              }}
            >
              <div className="kglyph on" lang="ja">
                <span>俳</span>
                <span>武</span>
                <span>術</span>
              </div>
              <div className="ktile-label">
                <b>On</b>
                <span>Serif · red accent</span>
              </div>
            </div>
            <div
              className={`ktile ${kanji === "off" ? "active" : ""}`}
              onClick={() => setKanji("off")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setKanji("off");
                }
              }}
            >
              <div className="kglyph off">
                <span>HAI</span>
                <span>BUK</span>
                <span>JTS</span>
              </div>
              <div className="ktile-label">
                <b>Off</b>
                <span>Mono · plain labels</span>
              </div>
            </div>
          </div>
        </div>

        {/* Group 3 — Density */}
        <div className="kamae-group">
          <div className="kamae-group-label">
            <span className="idx">3</span>Density
          </div>
          <div className="kamae-tiles">
            {/* TICKET-E1-S10-FOLLOWUP — see Group 1 above for rationale. */}
            {(["spacious", "balanced", "dense"] as const).map((d) => (
              <div
                key={d}
                className={`ktile ${density === d ? "active" : ""}`}
                onClick={() => setDensity(d)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDensity(d);
                  }
                }}
              >
                <div className="kdens" data-density={d}>
                  <div className="kdens-bar" />
                  <div className="kdens-bar" />
                  <div className="kdens-bar" />
                </div>
                <div className="ktile-label">
                  <b>{d[0].toUpperCase() + d.slice(1)}</b>
                  <span>
                    {d === "spacious"
                      ? "open"
                      : d === "balanced"
                        ? "even"
                        : "tight"}{" "}
                    · rhythm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
