// SPDX-License-Identifier: Apache-2.0
/**
 * /members/seasons — Epic 4B.4 S4B.4.4.
 *
 * Server-rendered prelude that mirrors the E4B.1/E4B.2/E4B.3 flag +
 * session pattern:
 *
 *   - flag-off                -> 302 redirect to `/members`. The
 *                                flag-off placeholder lives ONLY on
 *                                the root `/members` page.
 *   - flag-on + no session    -> 302 redirect to `/members/sign-in`.
 *                                Defense-in-depth backstop for
 *                                demo-mode / test-mode flows; the
 *                                RBAC middleware normally handles
 *                                this at the edge.
 *   - flag-on + member/admin  -> renders the SeasonsClient shell.
 *
 * The demo-mode test hook (`x-members-ui-enabled`,
 * `x-dojo-demo-no-session`) exactly mirrors the E4B.1..E4B.3 pattern
 * so `mockMemberSession()` in `e2e/helpers/e8-fixtures.ts` drives
 * this surface without a fixture fork.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultFlagReader } from "bu-tpi/flags";
import { validateSession, type SessionUser } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { SeasonsClient } from "./SeasonsClient";

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

export default async function MembersSeasonsPage() {
  const enabled = await isFlagEnabled();
  if (!enabled) {
    redirect("/members");
  }

  const session = await currentSession();
  if (!session) {
    redirect("/members/sign-in");
  }

  if (session.role !== "member" && session.role !== "admin") {
    redirect("/members/sign-in");
  }

  return (
    <div data-testid="members-seasons-root">
      <SeasonsClient />
    </div>
  );
}
