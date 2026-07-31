// SPDX-License-Identifier: Apache-2.0
/**
 * HomeClient — client surface for `/`.
 *
 * YR.5 collapsed the legacy `(shell)/page.tsx` activeTab dispatcher (which
 * branched over ~14 in-`/` modules driven by the `?tab=<id>` query string).
 * Every module now owns a top-level `/admin/<module>` route, and the
 * server-side dispatcher in `(shell)/page.tsx` 307-redirects any inbound
 * `?tab=<id>` URL to its canonical destination before the React tree
 * mounts. As a result this client surface only renders the dashboard:
 *
 *   - AuthGate redirects unauthenticated visitors to `/login`
 *   - Providers wraps NavigationContext + ScannerContext etc. so the
 *     dashboard's per-module insights stay alive (the in-memory
 *     activeTab is no longer URL-driven, but downstream code may still
 *     read it)
 *   - CommandDashboard is the canvas-01 surface
 *   - ScreenReaderAnnouncer fires a polite announcement for the
 *     dashboard landing
 *
 * YR.16 (G-075): the Sensei drawer mount moved out of HomeClient and into
 * `(shell)/shell-chrome.tsx` so the floating ◯ + the TopBar Sparkles icon
 * are reachable from every admin shell route, not just `/`. HomeClient no
 * longer hosts the drawer.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useNavigation } from "@/lib/NavigationContext";
import { NAV_ITEMS } from "@/lib/constants";
import { CommandDashboard } from "@/components/command/CommandDashboard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/** Screen reader announcer for module navigation changes (Story 5.3). */
function ScreenReaderAnnouncer() {
  const { activeTab } = useNavigation();
  const activeLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? activeTab;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {`Viewing ${activeLabel}`}
    </div>
  );
}

/**
 * FINDING-001 fix: redirect unauthenticated users to /login.
 *
 * E0.S11 (2026-05-08) — F-1-028 retire follow-up. The previous
 * placeholder used `bg-background` + `border-primary` Tailwind utilities,
 * which the audit cited as the unstyled-placeholder surface. The frame
 * now routes brand expression through the `.dojo-auth-loading` class in
 * `design/styles/system.css` (token-driven background + torii spinner +
 * kanji 道 watermark + `prefers-reduced-motion` override).
 *
 * Geometry preserved: full-screen flex-center container + spinner. Only
 * the visual identity changed. `aria-label` lets the loading state be
 * announced by assistive tech (WCAG 4.1.3).
 */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  if (loading)
    return (
      <div
        className="dojo-auth-loading"
        role="status"
        aria-live="polite"
        aria-label="Loading"
        data-testid="auth-gate-loading"
      >
        <div className="dojo-auth-loading-spinner" aria-hidden="true" />
      </div>
    );
  if (!user) return null;
  return <>{children}</>;
}

export function HomeClient() {
  // W21 FOLD-IN — `<Providers>` now mounts at `(shell)/layout.tsx` so the
  // chrome (TopBar / CommandPaletteController / ActivityLogDrawerController)
  // sits inside NavigationContext etc. Per-page wrap dropped to avoid
  // double-wrapping which would create duplicate provider instances.
  return (
    <AuthGate>
      <div className="motion-safe:animate-fade-in">
        <ScreenReaderAnnouncer />
        <ErrorBoundary
          fallbackTitle="Dashboard Error"
          fallbackDescription="Unable to load dashboard. Please try again."
        >
          <CommandDashboard />
        </ErrorBoundary>
      </div>
    </AuthGate>
  );
}
