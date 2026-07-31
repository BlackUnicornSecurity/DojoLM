// SPDX-License-Identifier: Apache-2.0
"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AvatarMenu,
  Rail,
  RAIL,
  MEMBER_RAIL,
  TopBar,
  Kamae,
  SessionExpiredCard,
  SessionExpiringSoonBanner,
  LegalFooter,
} from "@/design";
// F-QA-040 — sub-path import (per design-barrel darwin-perf discipline) for the
// pure rail flag-filter; the server layout resolves ATEMI_ENABLED and threads
// it down as `atemiEnabled` since this client component can't read server env.
import {
  railActiveForSections,
  railSectionsForFlags,
} from "@/design/shell/Rail";
import { useSessionExpiryWarning } from "@/lib/auth/use-session-expiry-warning";
import { GlobalBanners } from "@/design/shell/GlobalBanners";
import { ModelSwitcher } from "@/design/shell/ModelSwitcher";
import { RailDrawerController } from "@/design/shell/RailDrawerController";
import { I as Icons } from "@/design/shell/icons";
import { SenseiDrawer } from "@/components/sensei/SenseiDrawer";
import { ActiveModelProvider } from "@/lib/stores/active-model-context";
import { getRailHref, NAV_ID_TO_URL } from "@/lib/navigation/admin-routes";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useAuth } from "@/lib/auth/AuthContext";
import { SESSION_EXPIRED_EVENT } from "@/lib/fetch-with-auth";
import type { NavId } from "@/lib/constants";
import { resolveRouteConfig } from "./route-config";
import {
  ROUTE_NAMING,
  getRouteBreadcrumbs,
  getRouteNamingForPath,
} from "@/lib/navigation/route-naming";

const ROUTE_TIPS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(ROUTE_NAMING).map(([id, naming]) => [id, naming.gloss]),
  ),
);

function railTips(): Readonly<Record<string, string>> {
  return ROUTE_TIPS;
}

// YR.9.1 — same-origin paths that legitimately render without an
// authenticated session. The session-expired takeover stays muted on
// these routes so the operator can complete the sign-in / invite
// flow without a redirect loop.
const PUBLIC_SHELL_PATHS: ReadonlySet<string> = new Set([
  "/members/sign-in",
  "/members/request-invite",
]);

// YR.9.1 — when the takeover wants to bounce the operator back to the
// page they hit, the path must pass the same-origin allow-list in
// SessionExpiredCard. Anything outside that allow-list (e.g. the root
// dashboard `/`) is fine, but we still want to skip the bounce on the
// dashboard to avoid the awkward "?next=/" suffix.
function returnToFromPath(pathname: string): string | undefined {
  if (pathname === "/" || pathname === "/login") return undefined;
  if (PUBLIC_SHELL_PATHS.has(pathname)) return undefined;
  return pathname;
}

function pickSignInHref(pathname: string): string {
  // Use a segment-bounded check (`/members` exact OR `/members/...`) so a
  // hypothetical route like `/membersfake` does not accidentally route
  // through the magic-link sign-in flow.
  const isMembersScope =
    pathname === "/members" || pathname.startsWith("/members/");
  return isMembersScope ? "/members/sign-in" : "/login";
}

export type ShellNavVariant = "admin" | "member";

export interface ShellChromeProps {
  readonly children: ReactNode;
  /**
   * Selects the Rail section set. When omitted, the current pathname chooses
   * the member Rail for `/members` and descendants, and the admin Rail for all
   * other shell routes. Explicit values remain useful in isolated previews.
   */
  readonly navVariant?: ShellNavVariant;
  /**
   * F-QA-040 — whether the Atemi surface is enabled (`ATEMI_ENABLED`). The
   * server shell layout resolves the flag and passes it here so the client
   * Rail can drop the `atemi` entry when off. Defaults to `true` so the many
   * canvas-preview / test call-sites that omit it keep the full Rail.
   */
  readonly atemiEnabled?: boolean;
  /**
   * v2 conformity (Phase 2.1) — whether the runtime is in demo mode. The
   * server shell layout resolves `getFeatureMode()` and threads it here so
   * the design `.app-foot` line can carry the "demo data" disclosure only
   * when it is true (the corpus prototypes always render it because they
   * ARE demo data). Defaults false so canvas/test call-sites stay honest.
   */
  readonly demoMode?: boolean;
}

// YR.5.1 — every Rail click resolves to a canonical destination via the
// closed Record<NavId, string> map in `lib/navigation/admin-routes`. The
// legacy `/?tab=<id>` fallback is gone — every nav id either lands on `/`
// (dashboard) or on `/admin/<module>` directly. Adding a new NavId to
// `lib/constants.NAV_ITEMS` requires an entry in NAV_ID_TO_URL or the
// project does not compile. The `getRailHref` helper is colocated with
// the closed map and unit-tested in `lib/navigation/__tests__/`.

// YR.15 (DP-009 / G-013) — derive the admin Rail badge count from a
// real source instead of the hardcoded `'12'`. `/api/admin/members/
// invite-requests?status=pending` is admin-gated, so the fetch is
// gated to the admin shell variant + the `'admin'` role; non-admin
// callers would receive a 403 and the badge falls back to a hidden
// state. The total is capped at 99 to keep the chip compact.
const INVITE_REQUESTS_BADGE_CAP = 99;

interface InviteRequestsPendingResponse {
  readonly total?: unknown;
}

function useAdminPendingBadge(enabled: boolean): string | null | undefined {
  // Pass-1 LOW-1 fix: initialize to `null` (hidden) instead of `undefined`
  // so ShellChrome never paints the static `'12'` fixture badge for a
  // single render frame on mount. `undefined` retains its meaning as the
  // "host did not pass an override" sentinel for canvas-preview Rail
  // call-sites that omit the prop entirely.
  const [override, setOverride] = useState<string | null | undefined>(null);

  useEffect(() => {
    if (!enabled) {
      // Member-role users (or pre-auth states) on the admin shell
      // shouldn't see the admin pending count — and we deliberately
      // skip the fetch to avoid spamming 403s against the admin-only
      // endpoint. `null` tells Rail to hide the badge entirely so the
      // member doesn't see a stale fixture either.
      setOverride(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // The route returns `total` as the true count of all matching
        // rows (not the paginated slice). `limit=1` keeps the response
        // body small — we only need the count, not the rows.
        const res = await fetch(
          "/api/admin/members/invite-requests?status=pending&limit=1",
          {
            cache: "no-store",
          },
        );
        if (cancelled) return;
        if (!res.ok) {
          // Non-2xx (most likely 401 / 403 in member-role sessions or
          // 503 when the MEMBERS_UI_ENABLED flag is off). Hide the
          // badge instead of leaving the static fixture in place.
          setOverride(null);
          return;
        }
        const body = (await res.json()) as InviteRequestsPendingResponse;
        if (cancelled) return;
        if (
          typeof body.total !== "number" ||
          !Number.isFinite(body.total) ||
          body.total < 0
        ) {
          setOverride(null);
          return;
        }
        if (body.total === 0) {
          setOverride(null);
          return;
        }
        setOverride(
          body.total > INVITE_REQUESTS_BADGE_CAP
            ? `${INVITE_REQUESTS_BADGE_CAP}+`
            : String(Math.trunc(body.total)),
        );
      } catch {
        if (!cancelled) setOverride(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return override;
}

// YR.16 (G-075) — Reverse projection from URL → NavId so the lifted
// SenseiDrawer mount can derive its `activeModule` prop from the active
// pathname. Mirrors the longest-prefix strategy `resolveRouteConfig` uses
// against ROUTE_CONFIG. Routes that don't appear in NAV_ID_TO_URL (e.g.
// `/members/*` member surfaces) fall back to `'dashboard'` since Sensei
// has no member-scoped tooling yet.
const URL_TO_NAV_ID: ReadonlyMap<string, NavId> = (() => {
  const m = new Map<string, NavId>();
  for (const [navId, url] of Object.entries(NAV_ID_TO_URL)) {
    m.set(url, navId as NavId);
  }
  return m;
})();

function resolveSenseiActiveModule(pathname: string): NavId {
  if (pathname === "/" || pathname === "") return "dashboard";
  let bestMatch: { url: string; navId: NavId } | null = null;
  for (const [url, navId] of URL_TO_NAV_ID) {
    if (url === "/") continue;
    if (pathname === url || pathname.startsWith(url + "/")) {
      if (bestMatch === null || url.length > bestMatch.url.length) {
        bestMatch = { url, navId };
      }
    }
  }
  return bestMatch?.navId ?? "dashboard";
}

// YR.15 (DP-007 / G-070) — derive the avatar's initials from the
// authenticated user's username. Falls back to "MA" so canvas previews
// and tests that don't thread useAuth keep their pre-existing visual.
//
// Pass-1 MED-2 fold-in: a username consisting entirely of separator
// chars (e.g. `'.'`, `'..'`, `'_-'`) collapsed to an empty `parts`
// array but the previous `trimmed.slice(0, 2)` fallback still surfaced
// the separator. Now we treat pure-separator usernames as "no real
// initials" and fall back to `'MA'`.
function deriveInitials(username: string | null | undefined): string {
  if (!username) return "MA";
  const trimmed = username.trim();
  if (trimmed.length === 0) return "MA";
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "MA";
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  return parts[0]!.slice(0, 2).toUpperCase();
}

// Client-side shell chrome. Pulls pathname via usePathname() to derive the
// Rail active-id, breadcrumb trail, and kanji glyph. Renders Kamae only on
// Command surfaces per guardrails §5.
//
// YR.5 retired the `/?tab=<id>` shell tab system: every Rail click now
// targets a top-level route (either `/` for dashboard or `/admin/<module>`
// per NAV_ID_TO_URL). ShellChrome reads the route config from the pathname
// alone — no more URL search-param lookup, no more TAB_CONFIG fallback.
// The server-side dispatcher in `(shell)/page.tsx` 307-redirects any
// inbound `?tab=<id>` URL to its canonical `/admin/<module>` destination
// before the React tree mounts, so a stale bookmark still resolves to
// the right surface.
//
// The pathname selects the member Rail for /members/* unless a preview or test
// explicitly supplies `navVariant`. One parent ShellChrome therefore owns the
// complete shell on every route (E1.S2).
export function ShellChrome({
  children,
  navVariant,
  atemiEnabled = true,
  demoMode = false,
}: ShellChromeProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const cfg = resolveRouteConfig(pathname);
  const naming = getRouteNamingForPath(pathname);
  const { user, loading, logout } = useAuth();
  const memberOwnedAccount = pathname === "/account" && user?.role === "member";
  const effectiveNavVariant: ShellNavVariant =
    navVariant ??
    (pathname === "/members" ||
    pathname.startsWith("/members/") ||
    memberOwnedAccount
      ? "member"
      : "admin");
  // F-QA-040 — drop the flag-gated `atemi` rail item when ATEMI_ENABLED is off.
  // No-op (same reference) when the flag is on, so the default chrome stays
  // byte-identical for callers that don't thread the flag.
  const sections = railSectionsForFlags(
    effectiveNavVariant === "member" ? MEMBER_RAIL : RAIL,
    atemiEnabled,
  );
  const activeRailId = railActiveForSections(cfg.active, sections);

  // YR.9.2 — reactive offline indicator. Defaults to `true` on SSR /
  // first paint so we never flash "offline" on a healthy connection.
  const isOnline = useOnlineStatus();

  // YR.9.1 — session-expired takeover. The AuthContext provider is
  // mounted at app/providers.tsx, so every shell route gets a hook
  // value. While `loading` is true (initial /api/auth/me fetch in
  // flight) we show nothing — the underlying page handles its own
  // skeleton. Once loading resolves with `user === null` and the
  // current route is not on the public allow-list, we mount the
  // takeover overlay above the page chrome.
  //
  // E9.S3 (F-7-006) — also surface the takeover when `fetchWithAuth`
  // emits a session-expired window event. The cookie may have expired
  // (or the server invalidated the session) without us having yet
  // re-fetched `/api/auth/me`, so AuthContext.user is still set even
  // though every authenticated mutation now 401s. The listener flips a
  // local `forcedExpired` flag that joins the existing `user === null`
  // path — so the takeover is rendered ABOVE the existing children
  // (which keeps form state mounted, satisfying the mid-task-form-
  // preserved acceptance clause).
  const [forcedExpired, setForcedExpired] = useState(false);

  // F-8-008 (Wave 3hh) — proactive expiring-soon banner. Polls
  // `AuthContext.expiresAt` every 30s; surfaces at 10-min remaining
  // (imminent) and escalates to urgent at 5-min remaining. Stays muted
  // on public allow-list paths (sign-in / request-invite) and when no
  // session is in hand. Distinct from SessionExpiredCard below, which
  // is the after-the-fact takeover.
  const expiryWarning = useSessionExpiryWarning();
  const [expiringSoonDismissed, setExpiringSoonDismissed] = useState(false);

  // Reset dismissed flag when the state escalates to urgent (operator
  // must see the urgent ping even if they dismissed the imminent one)
  // OR when the warning state clears back to idle (session was
  // extended via refresh).
  useEffect(() => {
    if (expiryWarning.state === "urgent" || expiryWarning.state === "idle") {
      setExpiringSoonDismissed(false);
    }
  }, [expiryWarning.state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onAuthExpired() {
      setForcedExpired(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onAuthExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onAuthExpired);
    };
  }, []);

  // Drop the forced flag once the route lands on a public allow-list
  // surface (sign-in, request-invite). Without this, navigating to
  // /members/sign-in after a 401 would surface a redundant takeover.
  useEffect(() => {
    if (PUBLIC_SHELL_PATHS.has(pathname)) {
      setForcedExpired(false);
    }
  }, [pathname]);

  // E9.S3 round-2 (V5 Wave 3w QA): clear the forced flag when AuthContext
  // resolves a fresh authenticated user. Without this, after the operator
  // reauthenticates (e.g. via the SessionExpiredCard CTA → /login → back
  // to the original route), the takeover overlay would persist because
  // forcedExpired remained `true` and the new route is not on
  // PUBLIC_SHELL_PATHS. The user-truthy transition is the canonical
  // "session is fresh again" signal — also fires resetSessionExpiredSignal
  // on the emitter side via AuthContext so future 401s can re-arm.
  useEffect(() => {
    if (!loading && user) {
      setForcedExpired(false);
    }
  }, [loading, user]);

  const sessionExpired =
    (!loading && user === null && !PUBLIC_SHELL_PATHS.has(pathname)) ||
    (forcedExpired && !PUBLIC_SHELL_PATHS.has(pathname));

  // YR.15 — only fetch the invite-requests count when the admin shell
  // is rendered AND the resolved user actually has the admin role.
  // Member-role users on `/` (which uses the admin shell) would
  // otherwise spam 403s against the gated endpoint. Pass-1 MED-3 fold-
  // in: include `!loading` so the gate is immune to a future AuthContext
  // refactor that resolves `user` before flipping `loading` to false.
  const adminBadgeEnabled =
    !loading && effectiveNavVariant === "admin" && user?.role === "admin";
  const adminBadgeOverride = useAdminPendingBadge(adminBadgeEnabled);

  // YR.15 — sign-out flow. The AuthContext.logout() call POSTs to
  // /api/auth/logout (which destroys the SQLite session row + clears
  // the cookie set) BEFORE we navigate to /login, so a stolen session
  // token cannot survive the click.
  const handleSignOut = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  const avatarSlot = user ? (
    <AvatarMenu
      initials={deriveInitials(user.username)}
      username={user.username}
      onSignOut={handleSignOut}
    />
  ) : undefined;

  // YR.16 (G-075) — Sensei drawer derived `activeModule` + onNavigate.
  // The drawer is mounted at the shell level so the floating ◯ + the
  // re-enabled TopBar Sparkles button work from every shell route. The
  // member-shell variant suppresses the mount entirely (no admin tooling
  // available; drawer surface area is admin-context).
  const senseiActiveModule = useMemo(
    () => resolveSenseiActiveModule(pathname),
    [pathname],
  );
  const senseiOnNavigate = useCallback(
    (id: NavId) => {
      router.push(NAV_ID_TO_URL[id]);
    },
    [router],
  );
  // Pass-1 security-review MED-2 fold-in + pass-2 code-review MED fold-in:
  // gate the lifted SenseiDrawer mount on `user?.role === 'admin'` AND
  // `!loading` in addition to navVariant + session. Member-role users
  // would otherwise reach 403-only Sensei surface area. The `!loading`
  // guard mirrors `adminBadgeEnabled` byte-for-byte and immunises the
  // mount against a future AuthContext refactor that resolves `user`
  // before flipping `loading` to false.
  const showSensei =
    !loading &&
    effectiveNavVariant === "admin" &&
    !sessionExpired &&
    user?.role === "admin";
  // v2 conformity (Phase 2.1 + plan 4.3): the design `.app-foot` renders on
  // every admin shell surface — the command archetype included (the corpus
  // dashboard carries it). Member chrome keeps its own footers.
  const showProductFooter = effectiveNavVariant !== "member";
  const showMemberLegalFooter = PUBLIC_SHELL_PATHS.has(pathname);

  return (
    <ActiveModelProvider>
      <div
        className="dojo-ds-v3"
        data-skin="v2"
        data-shell-variant={effectiveNavVariant}
        data-kamae-scope
        data-vibe="confident"
        data-kanji="on"
        data-density="balanced"
      >
        <div className="app">
          <Rail
            active={activeRailId}
            sections={sections}
            onItemClick={(id) => router.push(getRailHref(id))}
            tips={railTips()}
            adminBadgeOverride={adminBadgeOverride}
          />
          <div className="main">
            {/* E7.S1 — narrow-viewport Rail drawer. The controller owns
              the open-state and the off-canvas dialog mount; the
              TopBar trigger is rendered into the controller's render
              prop so triggerRef is attached to the live button (focus
              restoration on close, WCAG 2.4.3). The static <Rail>
              above is hidden at ≤1024px via the v2 shell media block; the
              hamburger trigger button is hidden above 1024px via the
              .topbar-rail-trigger CSS rule. The drawer hosts the SAME
              <Rail> via composition (not duplication) so the IA
              stays single-sourced in `Rail.tsx`. */}
            <RailDrawerController
              active={activeRailId}
              sections={sections}
              onItemClick={(id) => router.push(getRailHref(id))}
              adminBadgeOverride={adminBadgeOverride}
            >
              {({ open, triggerRef, isOpen }) => (
                <TopBar
                  crumbs={getRouteBreadcrumbs(pathname, cfg.crumbs)}
                  // Crumb section marker = the SINGLE design glyph (道 工 武 …),
                  // mirroring Rail's kanjiGlyph ?? kanji[0] rule — the full
                  // codename (武器/工房) is nav-line chrome, not crumb chrome.
                  // Member chrome is the exception: the design crumbs every
                  // member sub-page with the SECTION kanji 会員 (wave-c/e/h),
                  // while rail marks stay per-page.
                  jp={
                    effectiveNavVariant === "member"
                      ? "会員"
                      : naming
                        ? (naming.kanjiGlyph ?? naming.kanji?.[0] ?? null)
                        : cfg.jp
                  }
                  envChips={cfg.envChips ? [...cfg.envChips] : []}
                  // S7 — nav-group context chip (design .ctx-chip). Derived
                  // from the active route's navGroup; suppressed on home/tier-1
                  // (Command Center) and non-admin chrome to match the design.
                  context={
                    effectiveNavVariant === "admin" &&
                    naming &&
                    naming.navGroup !== "home"
                      ? naming.navGroup.charAt(0).toUpperCase() +
                        naming.navGroup.slice(1)
                      : undefined
                  }
                  showSearch={effectiveNavVariant === "admin"}
                  showEnvChip={effectiveNavVariant === "admin"}
                  showUtilities={effectiveNavVariant === "admin"}
                  showUtilityOverflowCue={effectiveNavVariant === "admin"}
                  isOffline={!isOnline}
                  showKillSwitchBadge={effectiveNavVariant === "admin"}
                  avatarSlot={avatarSlot}
                  modelSwitcherSlot={
                    effectiveNavVariant === "admin" && user ? (
                      <ModelSwitcher />
                    ) : null
                  }
                  railDrawerTriggerSlot={
                    <button
                      ref={triggerRef}
                      type="button"
                      className="topbar-rail-trigger"
                      aria-label="Open navigation menu"
                      aria-haspopup="dialog"
                      aria-expanded={isOpen}
                      title="Open navigation menu"
                      data-testid="topbar-rail-trigger"
                      onClick={open}
                    >
                      {Icons.menu}
                    </button>
                  }
                />
              )}
            </RailDrawerController>
            {/* YR.16 / G-074 — global system banners. Mounted above the page
              landmark so the alert tone is visible on every shell-adopted
              route without re-mounting per page. Member shell suppresses
              all three banners per ticket scope. */}
            <GlobalBanners variant={effectiveNavVariant} />
            {/* F-8-008 (Wave 3hh) — proactive session-expiring-soon banner.
              Surfaces 10/5 minutes before the cookie dies so operators can
              save their work and re-authenticate before the SessionExpiredCard
              takeover lands. Muted on public allow-list paths and once
              dismissed (imminent band only; urgent band always shows). */}
            {!PUBLIC_SHELL_PATHS.has(pathname) &&
              !sessionExpired &&
              !expiringSoonDismissed && (
                <SessionExpiringSoonBanner
                  state={expiryWarning.state}
                  minutesRemaining={expiryWarning.minutesRemaining}
                  signInHref={pickSignInHref(pathname)}
                  onDismiss={() => setExpiringSoonDismissed(true)}
                />
              )}
            {/* The shell owns the one main landmark on every shell route.
              tabIndex=-1 makes the skip-link destination programmatically
              focusable without adding it to the normal Tab order. */}
            <main
              id="main-content"
              className={`page${showProductFooter ? " page--with-product-footer" : ""}`}
              tabIndex={-1}
            >
              {children}
              {cfg.archetype === "command" && cfg.kamae !== false && (
                <Kamae storageKey="dojolm.kamae.global" />
              )}
            </main>
            {/* Contentinfo landmarks stay siblings of the route main. */}
            {showProductFooter && (
              <footer
                className="shell-product-footer"
                aria-label="BlackUnicorn product footer"
              >
                {/* Phase 2.1 — design `.app-foot` (wave-a/app-shell.css:154)
                    replaces the retired torii-tinted brand chip: plain mono
                    line, cyan pip, zero red. "demo data" appears only when
                    the runtime really is demo (honesty over verbatim). */}
                <div className="app-foot" data-testid="shell-app-foot">
                  <span className="cy" aria-hidden="true" />
                  BlackUnicorn family · DojoLM
                  {demoMode ? " · demo data" : ""}
                </div>
              </footer>
            )}
            {showMemberLegalFooter && <LegalFooter />}
          </div>
        </div>
        {showSensei && (
          // YR.16 (G-075 / DP-005) — globally-mounted Sensei drawer. The
          // floating ◯ button stays visible on every shell route; the
          // TopBar Sparkles icon dispatches `sensei-toggle` (handled by
          // `useSensei`) so admins can reach the drawer from the chrome
          // header on any module page.
          <SenseiDrawer
            activeModule={senseiActiveModule}
            onNavigate={senseiOnNavigate}
          />
        )}
        {/* TICKET-X-602 / DP-006 closeout (pass-1 fold-in MED #1) — the
          ActivityLogDrawerController is now mounted INSIDE TopBar.tsx as
          a render-prop host around the activity-button trigger. This
          fixes the focus-return path: the trigger lives inside the
          controller's render-prop scope so `triggerRef.current` is
          actually attached to the trigger button (WCAG 2.4.3 / 2.1.1).
          The previous `{() => null}` mount here left `triggerRef`
          permanently null — focus restoration was silently dead. */}
        {sessionExpired && (
          <SessionExpiredCard
            signInHref={pickSignInHref(pathname)}
            returnTo={returnToFromPath(pathname)}
          />
        )}
      </div>
    </ActiveModelProvider>
  );
}
