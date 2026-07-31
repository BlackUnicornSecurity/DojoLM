// SPDX-License-Identifier: Apache-2.0
/**
 * GlossaryDrawer — HAGANE E4.S3 (audit M5: Japanese module names carry
 * zero in-product explanation; NAV_ITEMS descriptions were authored
 * but never rendered).
 *
 * One row per module: kanji glyph · codename · functional label ·
 * plain-English description · Open link. Content is SINGLE-SOURCED
 * from NAV_ITEMS (no copy fork); hrefs resolve through the canonical
 * NAV_ID_TO_URL map. Opens from the TopBar help affordance and the
 * palette ('open-glossary' → 'glossary-toggle' window event — the
 * ActivityLogDrawer controller pattern).
 */

'use client';

import { useEffect, useState } from 'react';
import { Drawer } from '@/design/codex/Drawer';
import { NAV_ITEMS } from '@/lib/constants';
import { NAV_ID_TO_URL } from '@/lib/navigation/admin-routes';

export const GLOSSARY_TOGGLE_EVENT = 'glossary-toggle';

export function GlossaryDrawerController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    window.addEventListener(GLOSSARY_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(GLOSSARY_TOGGLE_EVENT, onToggle);
  }, []);

  // E6.S1 G-7 catch: an always-mounted closed Drawer leaks its chrome
  // onto every page (full-page capture caught the floating empty panel).
  // Mount only while open — the native <dialog> lifecycle handles the
  // rest on unmount.
  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title="Module glossary"
      sub="What each dojo codename does"
      closeLabel="Close glossary"
    >
      {/* HAGANE remediation R8a — the controller already unmounts the
          whole Drawer while closed (`if (!open) return null` above), so
          the previous inner `{open ? … : null}` gate was dead code. */}
      <div data-testid="glossary-rows">
        {NAV_ITEMS.filter((i) => !('hidden' in i && i.hidden)).map((item) => {
          const href = NAV_ID_TO_URL[item.id];
          return (
            <div
              key={item.id}
              className="drow"
              data-testid={`glossary-row-${item.id}`}
              style={{ alignItems: 'flex-start', gap: 10, padding: '10px 0' }}
            >
              <div style={{ minWidth: 150 }}>
                <b>{item.label}</b>
                {'functionalLabel' in item
                  && item.functionalLabel !== item.label && (
                  <span className="wb-hint"> · {item.functionalLabel}</span>
                )}
              </div>
              <span className="flex1" style={{ fontSize: 13, color: 'var(--fg-dim)' }}>
                {item.description}
              </span>
              {href !== undefined && (
                <a
                  className="btn sm btn-ghost"
                  href={href}
                  data-testid={`glossary-open-${item.id}`}
                >
                  Open →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
