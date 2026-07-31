// SPDX-License-Identifier: Apache-2.0
/**
 * /members/request-invite — Epic 4B.7 S4B.7.4 server prelude.
 *
 * Two-flag gate:
 *   - MEMBERS_UI_ENABLED off → redirect to `/members` (same closed-
 *     cohort placeholder path every other /members/* page uses when
 *     the master flag is off).
 *   - MEMBERS_PUBLIC_BETA_ENABLED off (but MEMBERS_UI_ENABLED on) →
 *     render a `<SystemBanner tone="info">` with fixed copy. NOT a
 *     redirect — the banner is the intended UX when public-beta is
 *     paused. The `members-request-invite-disabled-banner` testid is
 *     the Playwright anchor for the flag-off path.
 *   - Both flags on → render the client form via `<RequestInviteForm />`.
 *
 * A cookie-bound `tpi_csrf` nonce is minted here on GET render so the
 * client's POST has the double-submit pair available. The cookie is
 * `SameSite=Strict` + origin-bound; a cross-site origin cannot read
 * it and therefore cannot forge the matching header. Rule §11.
 */

import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultFlagReader } from "bu-tpi/flags";
import { isDemoMode } from "@/lib/demo";
import { RequestInviteForm } from "./RequestInviteForm";

// E9.S5 / F-2-213 — token-driven form styling so the page no longer
// renders bare HTML inputs and inline style={{}} blocks. Loaded here
// (not the shell layout) because the surface is bounded to /members/
// request-invite. Pattern stylesheets in the design layer are imported
// once at the page module that owns the surface; loading via the
// route ensures Next.js scopes the CSS chunk to this entry-point.
import "@/design/styles/patterns/request-invite.css";

export const dynamic = "force-dynamic";

const MEMBERS_FLAG_OVERRIDE_HEADER = "x-members-ui-enabled";
const PUBLIC_BETA_FLAG_OVERRIDE_HEADER = "x-members-public-beta-enabled";

async function isFlagEnabled(
  flag: "MEMBERS_UI_ENABLED" | "MEMBERS_PUBLIC_BETA_ENABLED",
): Promise<boolean> {
  if (isDemoMode()) {
    const hdrs = await headers();
    const override =
      flag === "MEMBERS_UI_ENABLED"
        ? hdrs.get(MEMBERS_FLAG_OVERRIDE_HEADER)
        : hdrs.get(PUBLIC_BETA_FLAG_OVERRIDE_HEADER);
    if (override === "0" || override === "false") return false;
    if (override === "1" || override === "true") return true;
  }
  return defaultFlagReader().isEnabled(flag);
}

// Note on CSRF cookie minting (S4B.7.4):
//   The unauthenticated POST at /api/members/request-invite uses a
//   cookie-bound double-submit nonce (rule §11). Next 15+ Server
//   Components cannot set cookies, so the cookie-mint lives in the
//   client-only `RequestInviteForm` component (via document.cookie =
//   ...; SameSite=Strict). The security-critical property is the
//   SameSite=Strict attribute — a cross-site origin cannot read or
//   send the cookie and therefore cannot forge the double-submit
//   header, regardless of whether the server or the client wrote
//   the cookie.

export default async function MembersRequestInvitePage() {
  const membersUiEnabled = await isFlagEnabled("MEMBERS_UI_ENABLED");
  if (!membersUiEnabled) {
    // Members is fully dark — redirect to the /members placeholder
    // (same path every other /members/* page uses when the master
    // flag is off).
    redirect("/members");
  }
  const publicBetaEnabled = await isFlagEnabled("MEMBERS_PUBLIC_BETA_ENABLED");
  return (
    <div
      className="member-gate-stage"
      data-testid="members-request-invite-root"
    >
      <section className="gate-card" aria-labelledby="request-invite-heading">
        <MemberGateBrand />
        <h1 id="request-invite-heading">Request an invite</h1>
        {publicBetaEnabled ? <InviteRequestContent /> : <PublicBetaPaused />}
      </section>
    </div>
  );
}

function InviteRequestContent() {
  return (
    <>
      <p className="sub">
        Tell us why you want to help. An owner reviews every request before
        issuing an invite.
      </p>
      <RequestInviteForm />
      <SignInLink />
    </>
  );
}

function PublicBetaPaused() {
  return (
    <>
      <div
        className="gate-info"
        role="status"
        data-testid="members-request-invite-disabled-banner"
      >
        <span className="dot" aria-hidden="true" />
        <span>
          The public beta isn&apos;t open yet — invites go out in waves as
          seasons spin up. Check back soon.
        </span>
      </div>
      <SignInLink />
    </>
  );
}

function SignInLink() {
  return (
    <div className="gate-links">
      <Link href="/members/sign-in">Have a code? Sign in →</Link>
    </div>
  );
}

function MemberGateBrand() {
  return (
    <div className="gate-brand">
      <span className="gate-mark" lang="ja" aria-hidden="true">
        道
      </span>
      <span className="gate-wordmark">DojoLM</span>
      <span className="gate-kick">Yamabushi · Members</span>
    </div>
  );
}
