// SPDX-License-Identifier: Apache-2.0
/**
 * /members/bounty — Epic 4B.5 S4B.5.3.
 *
 * Server prelude mirrors the shape of `/members/seasons/page.tsx` — the
 * flag-gate, session-gate, role-gate tripod — but keeps the flag-off
 * branch IN-PLACE rather than redirecting to `/members`. The sub-epic
 * prompt demands a dedicated `members-bounty-coming-soon` testid so the
 * Playwright spec can assert on the bounty-specific affordance without
 * relying on the shared root `members-coming-soon`.
 *
 * The `x-members-ui-enabled` / `x-dojo-demo-no-session` demo-mode
 * headers match the siblings 1:1 so `mockMemberSession()` in
 * `e2e/helpers/e8-fixtures.ts` drives this surface without a fixture
 * fork.
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultFlagReader } from "bu-tpi/flags";
import { validateSession, type SessionUser } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { BountyClient } from "./BountyClient";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "tpi_session";
const MEMBERS_FLAG_OVERRIDE_HEADER = "x-members-ui-enabled";
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

export default async function MembersBountyPage() {
  const enabled = await isFlagEnabled();
  if (!enabled) {
    return (
      <div data-testid="members-bounty-coming-soon">
        <div className="panel">
          <h1 style={{ margin: 0 }}>Coming soon.</h1>
          <p>Bounty surfaces unlock at private-beta launch.</p>
        </div>
      </div>
    );
  }

  const session = await currentSession();
  if (!session) redirect("/members/sign-in");
  if (session.role !== "member" && session.role !== "admin") {
    redirect("/members/sign-in");
  }

  return (
    <div data-testid="members-bounty-root">
      <BountyClient />
    </div>
  );
}
