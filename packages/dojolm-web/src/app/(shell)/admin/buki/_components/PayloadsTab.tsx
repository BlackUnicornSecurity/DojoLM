// SPDX-License-Identifier: Apache-2.0
/**
 * PayloadsTab — outer-tab render for /admin/buki Payloads. Extracted
 * from BukiClient.tsx for the PR-2 split.
 *
 * Card grid sourced from `lib/payload-catalog.ts` `PAYLOAD_CATALOG`.
 * Each row carries a deep-link to the scanner with the payload story
 * pre-filled (Case-B URL synthesis for the Buki→Scanner sibling of
 * the Bushido→Atemi monetizable loop). Scanner-side hydration is
 * tracked under E-B4 cross-module-links.
 */

"use client";

import { AttackRow } from "@/design/primitives/AttackRow";
import { cap, capOpt } from "@/design/primitives/_caps";
import { PAYLOAD_CATALOG } from "@/lib/payload-catalog";
import { NAME_MAX, PAYLOAD_DESC_MAX } from "./types";

export function PayloadsTab() {
  return (
    <section
      id="buki-workbench-panel-payloads"
      role="tabpanel"
      aria-labelledby="buki-workbench-panel-payloads-trigger"
      tabIndex={0}
      data-testid="buki-payloads-tab"
    >
      <div className="yr4-thead-attack" aria-hidden="true">
        <span>Title</span>
        <span>Story</span>
        <span>Status</span>
      </div>
      <div className="yr4-data-list" role="list" aria-label="Payload catalog">
        {PAYLOAD_CATALOG.map((p, idx) => {
          // Content-addressed ID using the stable `story` field
          // (TPI-NN scheme owned by `payload-catalog.ts`). Previous
          // positional `payload-${idx}` ID would silently break
          // bookmarked deep-links + any future scanner-side
          // hydration (E-B4) if PAYLOAD_CATALOG ever re-ordered.
          const payloadId = p.story;
          // E-A4 Phase B — Case-B URL synthesis for the
          // Bushido→Atemi monetizable loop's sibling: Buki→Scanner.
          // Scanner-side URL→state hydration is a Phase 2 follow-up
          // (E-B4 cross-module-links). Until then we ship the
          // synthesis side only.
          // TODO(E-B4): swap to CrossLinkButton when helper ships.
          //
          // E-B4 spec note (cross-epic audit 2026-05-19 M-1): the
          // <CrossLinkButton> contract must cover this Buki→Scanner
          // path alongside Atemi's /admin/jutsu deep-link + Bushido's
          // synthesiseTestAtemiHref. All 3 sites share one primitive
          // surface — different target routes, same prop API.
          const scannerHref = `/admin/scanner?payload=${encodeURIComponent(payloadId)}&prefill=true`;
          return (
            <div key={`${p.story}-${idx}`} role="listitem">
              <AttackRow
                item={{
                  id: payloadId,
                  eyebrow: cap(p.story, 32),
                  title: cap(p.title, NAME_MAX),
                  sub: capOpt(`${p.desc} · ${p.example}`, PAYLOAD_DESC_MAX),
                  sev: "med",
                  status: p.status === "current" ? "pass" : "queued",
                }}
              />
              <div style={{ paddingLeft: 8, paddingTop: 4 }}>
                <a
                  href={scannerHref}
                  data-testid={`buki-payload-scanner-link-${idx}`}
                  className="wb-link v2-touch-link"
                  style={{ fontSize: 11 }}
                >
                  Click to load into scanner →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
