// SPDX-License-Identifier: Apache-2.0
/**
 * /members/sign-in — Epic 4B.1 S4B.1.4 member sign-in.
 *
 * Server prelude: reads `MEMBERS_UI_ENABLED` at request time and
 * redirects to `/members` (where the placeholder renders) when the
 * flag is off. When on, renders the client-only `<SignInForm />` so
 * the form itself does not import from `bu-tpi/flags` (rule §13).
 *
 * Public route — no auth required. A signed-in member who lands here
 * is bounced to `/members` to avoid the double-mint surface.
 */

import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultFlagReader } from "bu-tpi/flags";
import { validateSession } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "tpi_session";
const MEMBERS_FLAG_OVERRIDE_HEADER = "x-members-ui-enabled";
const PUBLIC_BETA_FLAG_OVERRIDE_HEADER = "x-members-public-beta-enabled";
const DEMO_NO_SESSION_HEADER = "x-dojo-demo-no-session";

async function isFlagEnabled(): Promise<boolean> {
  if (isDemoMode()) {
    const hdr = (await headers()).get(MEMBERS_FLAG_OVERRIDE_HEADER);
    if (hdr === "0" || hdr === "false") return false;
    if (hdr === "1" || hdr === "true") return true;
  }
  return defaultFlagReader().isEnabled("MEMBERS_UI_ENABLED");
}

// E4B.7 S4B.7.4 — public-beta flag resolved at request time and
// passed as a `publicBetaEnabled` prop into the client form. The
// client itself never reads flags (rule §13).
async function isPublicBetaEnabled(): Promise<boolean> {
  if (isDemoMode()) {
    const hdr = (await headers()).get(PUBLIC_BETA_FLAG_OVERRIDE_HEADER);
    if (hdr === "0" || hdr === "false") return false;
    if (hdr === "1" || hdr === "true") return true;
  }
  return defaultFlagReader().isEnabled("MEMBERS_PUBLIC_BETA_ENABLED");
}

async function alreadySignedIn(): Promise<boolean> {
  if (isDemoMode()) {
    // Demo-mode test hook mirroring the /members page — lets e2e specs
    // render the sign-in form without a real session.
    const hdrs = await headers();
    if (hdrs.get(DEMO_NO_SESSION_HEADER) === "1") return false;
    return true;
  }
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return Boolean(existing && validateSession(existing));
}

export default async function MembersSignInPage() {
  if (!(await isFlagEnabled())) {
    redirect("/members");
  }
  if (await alreadySignedIn()) {
    redirect("/members");
  }

  const publicBetaEnabled = await isPublicBetaEnabled();
  return (
    <div className="member-gate-stage" data-testid="members-sign-in">
      <MemberSignInCard publicBetaEnabled={publicBetaEnabled} />
    </div>
  );
}

function MemberSignInCard({
  publicBetaEnabled,
}: {
  readonly publicBetaEnabled: boolean;
}) {
  return (
    <section className="gate-card" aria-labelledby="members-sign-in-heading">
      <div className="gate-brand" data-testid="members-sign-in-brand-hero">
        <span
          className="gate-mark"
          lang="ja"
          aria-hidden="true"
          data-testid="members-sign-in-brand-mark"
        >
          道
        </span>
        <span className="gate-wordmark">DojoLM</span>
        <span className="gate-kick">Yamabushi · Members</span>
      </div>
      <h1 id="members-sign-in-heading" data-testid="members-sign-in-heading">
        Sign in with your invite
      </h1>
      <p className="sub">
        Paste the invite code from your admin and the email the invite was sent
        to — we&apos;ll send a one-time magic link.
      </p>
      <SignInForm publicBetaEnabled={publicBetaEnabled} />
      <div className="gate-links">
        <Link href="/login">Admin? Sign in to the console →</Link>
      </div>
    </section>
  );
}
