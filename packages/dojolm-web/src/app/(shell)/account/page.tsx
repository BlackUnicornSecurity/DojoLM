// SPDX-License-Identifier: Apache-2.0
/**
 * /account — the signed-in operator's profile, password, and sessions.
 *
 * P2b (NR-account): renders the flat reference surface (Profile /
 * Change-password / Active-sessions, `wave-g/Account v2.html`) via the
 * shared `UnifiedAccountSurface`. The former default — the GDPR/DSR
 * self-service view (`AccountClient.tsx`, E6.S5 / F-8-019) — has no
 * reference counterpart on this route; it is retired from the default
 * view but NOT deleted. Its relocation target (dedicated route or a
 * secondary link) is an operator/compliance decision — fix spec §4.
 *
 * Server-rendered. Reads the session cookie + redirects to /login when
 * absent — account controls are a session-user-only flow.
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { validateSession, type SessionUser } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { AccountSecurityPanel } from "./AccountSecurityPanel";
import { UnifiedAccountSurface } from "./UnifiedAccountSurface";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account · DojoLM",
};

const SESSION_COOKIE_NAME = "tpi_session";
// Mirrors the existing demo-mode "no session" header used by the members
// page so the e2e suite can exercise the redirect path without minting a
// real session.
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

export default async function AccountPage() {
  const session = await currentSession();
  if (!session) {
    // No session = no subject to query. Bounce to the central login
    // surface; /account/* is a single-page surface so the redirect carries
    // no return-to query (parity with /admin gates).
    redirect("/login");
  }

  return <UnifiedAccountSurface securityPanel={<AccountSecurityPanel />} />;
}
