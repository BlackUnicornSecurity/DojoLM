// SPDX-License-Identifier: Apache-2.0
/**
 * /members — member post-auth home (E5.S8 / retires F-3-002 P0).
 *
 * Server-rendered. Reads `MEMBERS_UI_ENABLED` via `defaultFlagReader()`
 * at request time (never cached at module scope — decision #11 lets a
 * self-hosted operator flip the flag without a process restart).
 *
 * Rendering matrix:
 *   - flag-off                → centered "Coming soon" placeholder
 *   - flag-on + no session    → 302 redirect to /members/sign-in
 *   - flag-on + member session → members home: welcome panel + a 3-card
 *                                 scent grid linking to leaderboard /
 *                                 seasons / bounty (all shipped). The
 *                                 prior "queued for the next E4B sub-
 *                                 epics" placeholder is retired — it
 *                                 lied about shipped state and dropped
 *                                 members on a dead-end home.
 *
 * The shell chrome (Rail + TopBar) wraps this page via the parent
 * `(shell)/members/layout.tsx` — the chrome renders even on flag-off so
 * the placeholder matches the dojo aesthetic rather than looking like
 * an outage page.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultFlagReader } from "bu-tpi/flags";
import { EmptyState } from "@/design";
import { BrandFooterChip } from "@/design/shell/BrandFooterChip";
import { validateSession, type SessionUser } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { MEMBER_PRELAUNCH_FACTS } from "@/lib/demo/demo-facts";
import { MembersScentGrid } from "./MembersScentGrid";
import "@/design/styles/patterns/members-home.css";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "tpi_session";
// Demo-mode test hook: e2e specs flip the flag per-request so both
// flag-on and flag-off paths are exercisable in a single server run.
// Ignored outside demo mode — production traffic reads env only.
const MEMBERS_FLAG_OVERRIDE_HEADER = "x-members-ui-enabled";
// Mirrors the existing x-dojo-demo-mode gate in src/middleware/rbac.ts:
// a demo-mode request without this header still returns DEMO_USER for
// the members page, matching the "always admin" demo behaviour; with
// `x-dojo-demo-no-session: 1` the page treats the caller as signed-out
// so the sign-in redirect fires.
const DEMO_NO_SESSION_HEADER = "x-dojo-demo-no-session";

async function isFlagEnabled(): Promise<boolean> {
  if (isDemoMode()) {
    const hdr = (await headers()).get(MEMBERS_FLAG_OVERRIDE_HEADER);
    if (hdr === "0" || hdr === "false") return false;
    if (hdr === "1" || hdr === "true") return true;
  }
  return defaultFlagReader().isEnabled("MEMBERS_UI_ENABLED");
}

async function currentSession(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const hdrs = await headers();
    if (hdrs.get(DEMO_NO_SESSION_HEADER) === "1") return null;
    return DEMO_USER;
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSession(token);
}

export default async function MembersHomePage() {
  const enabled = await isFlagEnabled();

  if (!enabled) {
    // YR.0.4 (2026-04-26) — flag-off placeholder migrated to design-system
    // <EmptyState>. The bare `.panel` div + inline-px h1 retired.
    return (
      <div data-testid="members-coming-soon">
        <h1 className="dojo-sr-only">Members</h1>
        <EmptyState
          module="enso"
          state="empty"
          title="Coming soon."
          sub="Member access opens at private-beta launch."
          testId="members-coming-soon-state"
          cta={{ label: "Return to dashboard", href: "/" }}
        />
      </div>
    );
  }

  const session = await currentSession();
  if (!session) {
    redirect("/members/sign-in");
  }

  if (session.role !== "member" && session.role !== "admin") {
    // Members and admins are the only roles with `/members` visibility.
    // Anything else 302s to the public sign-in so a misconfigured
    // operator sees the clean failure mode instead of a half-rendered
    // member surface.
    redirect("/members/sign-in");
  }

  // P2d D1 (2026-07-17) — the boxed welcome <Panel> is retired for the
  // corpus open tier-2 header (kicker + H1 + gloss); the member name lands
  // in the H1.
  //
  // Defense-in-depth: sanitize + cap the session string before it lands in
  // the heading. Strips C0/C1 control characters, zero-width / bidi-
  // override codepoints (mirrors `CONTROL_CHAR_REJECTION` in
  // InvitesClient.tsx); then truncates at 64 codepoints (not UTF-16 code
  // units) so emoji + grapheme clusters survive the cap intact. React's
  // default escaping already covers XSS — this layer protects against
  // visual-spoofing + screen-reader truncation of malformed session data
  // (audit pass 1: code H-1 + security M-1).
  const UNSAFE_CHARS =
    /[\u0000-\u001f\u007f-\u009f\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/g;
  const rawDisplayName = (session.displayName ?? session.username).replace(
    UNSAFE_CHARS,
    "",
  );
  const codePoints = Array.from(rawDisplayName);
  const displayName =
    codePoints.length > 64 ? codePoints.slice(0, 64).join("") : rawDisplayName;
  return (
    <div data-testid="members-home">
      {/* P2d D1 — corpus wave-c tier-2 header (page-kick → H1 → gloss), open
          on the page background. The route-naming entry carries no kanji for
          /members, so the kicker renders locally (LeaderboardClient pattern).
          Copy verbatim from wave-c "Members Home v2.html"; only the member
          name is data. */}
      <div className="page-head">
        <div className="col" style={{ minWidth: 0 }}>
          <div className="page-kick">
            <span className="kj" lang="ja" aria-hidden="true">
              会員
            </span>
            <span>Members · home</span>
          </div>
          <h1>Welcome to the stadium, {displayName}</h1>
          <p className="lede">
            Seasons, standings, and bounty for invited members — the public
            side of the dojo.
          </p>
        </div>
      </div>
      {/* Corpus wave-c `.home-note` — §4.4 info tone welcome line. The
          * season name sources from the D-07 fact set, never hardcoded. */}
      <div className="home-note" data-testid="members-home-note">
        <span className="dot" aria-hidden="true" />
        <span>
          <b>You&rsquo;re in early.</b> {MEMBER_PRELAUNCH_FACTS.seasonName},
          the leaderboard, and bounty payouts open at private-beta launch —
          you&rsquo;ll get an email when doors open. Your invite already
          reserves your seat.
        </span>
      </div>
      {/* P2d D4 — corpus wave-c zone-title framing the directory grid. */}
      <div className="zone-title">
        <h2>What lives here</h2>
        <span className="sub">Four surfaces, all unlocking at launch</span>
      </div>
      <MembersScentGrid />
      {/* Design wave-c "Members Home v2.html":91 — every member `.content`
          closes with the `.app-foot` brand line. Member chrome has no shell
          product footer, so each page mounts its own. */}
      <BrandFooterChip />
    </div>
  );
}
