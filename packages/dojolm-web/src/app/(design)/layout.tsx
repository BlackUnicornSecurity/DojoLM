// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';

import { NavigationProvider } from '@/lib/NavigationContext';
import { ActivityProvider } from '@/lib/contexts/ActivityContext';

// Design-system route group. Reserved for canvas preview pages (canvas/01..05).
// The .dojo-ds-v3 scope class contains the element-selector rules in tokens.css
// (html/body, button, a, scrollbar, prefers-reduced-motion) so they don't leak
// into legacy routes once Next.js has injected the CSS into the document after
// the canvas is first visited. Fonts load from the root layout so the literal
// family names in tokens.css resolve.
//
// WO-1 rebaseline 2026-07-07 — TICKET-X-602 moved the CommandPalette /
// ActivityLogDrawer controllers INSIDE TopBar.tsx, so every canvas that
// previews TopBar now consumes useNavigation() + useActivityState() and
// crashed to the root error boundary outside the (shell) provider stack.
// Mount exactly the two contexts those controllers need — both are
// local-state-only (no fetches), so canvas previews stay deterministic.
// If TopBar gains a new context consumer, add its provider here OR
// switch to the consolidated @/lib/Providers (see the sibling mount in
// (shell)/layout.tsx) — otherwise the canvases crash again at runtime.
export default function DesignLayout({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <ActivityProvider>
        <div className="dojo-ds-v3">{children}</div>
      </ActivityProvider>
    </NavigationProvider>
  );
}
