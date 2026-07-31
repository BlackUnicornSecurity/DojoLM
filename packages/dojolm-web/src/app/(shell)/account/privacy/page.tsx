// SPDX-License-Identifier: Apache-2.0
/**
 * /account/privacy — the GDPR/CCPA data-subject-request self-service surface
 * (`AccountClient`, E6.S5 / F-8-019: export, erasure, and your-activity).
 *
 * P2b flattened /account to the designed Profile/Password/Sessions surface,
 * which has no reference counterpart for the DSR controls. Rather than drop a
 * compliance-critical capability (DA KALITAS 2026-07-16, red-team MEDIUM), the
 * DSR surface lives here on its own route, linked from /account. The final
 * placement (this route vs. a /legal/dsr home) remains an operator/compliance
 * refinement — but the capability is never unreachable.
 *
 * Server-rendered; session-gated identically to /account.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { validateSession, type SessionUser } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { AccountClient } from "../AccountClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy & data requests · DojoLM",
};

const SESSION_COOKIE_NAME = "tpi_session";
const DEMO_NO_SESSION_HEADER = "x-dojo-demo-no-session";

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

export default async function AccountPrivacyPage() {
  const session = await currentSession();
  if (!session) redirect("/login");

  return (
    <AccountClient
      userId={session.id}
      username={session.username}
      displayName={session.displayName ?? session.username}
    />
  );
}
