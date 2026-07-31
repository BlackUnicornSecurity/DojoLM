// SPDX-License-Identifier: Apache-2.0
/**
 * /members/seasons/archive/[slug] — Epic 4B.4 S4B.4.5.
 *
 * Server-rendered prelude that mirrors the E4B.1..E4B.3 flag +
 * session pattern, with an additional slug regex gate:
 *
 *   - flag-off                        -> 302 redirect to `/members`.
 *   - flag-on + no session            -> 302 redirect to `/members/sign-in`.
 *   - flag-on + session + bad slug    -> 404 via `notFound()`. The
 *                                         slug is validated BEFORE
 *                                         the client loads, so an
 *                                         adversarial URL cannot
 *                                         reach `ArchiveClient`.
 *   - flag-on + session + good slug   -> renders the ArchiveClient
 *                                         shell. The server registry
 *                                         membership check (slug in
 *                                         `MemberSeasonsSource`)
 *                                         happens on the API side —
 *                                         if it fails, the client
 *                                         surfaces the not-found
 *                                         state.
 *
 * Double-gate discipline (rule §9): the regex runs in the RSC
 * prelude AND on the API. If the API's registry says unknown, the
 * client renders the `members-archive-not-found` testid inside the
 * shell (the RSC-level `notFound()` fires only for malformed slugs).
 */

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { defaultFlagReader } from "bu-tpi/flags";
import { validateSession, type SessionUser } from "@/lib/auth/session";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { ArchiveClient } from "./ArchiveClient";

export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAME = "tpi_session";
const MEMBERS_FLAG_OVERRIDE_HEADER = "x-members-ui-enabled";
const DEMO_NO_SESSION_HEADER = "x-dojo-demo-no-session";
const SLUG_RE = /^[A-Za-z0-9-]{1,32}$/;

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

export default async function MembersArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  const { slug } = await params;
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
    notFound();
  }

  return (
    <div data-testid="members-archive-root">
      <ArchiveClient slug={slug} />
    </div>
  );
}
