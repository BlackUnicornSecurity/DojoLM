// SPDX-License-Identifier: Apache-2.0
/**
 * File: /app/forbidden/page.tsx
 * Purpose: 403 forbidden surface — destination for role-guard redirects
 * when a non-privileged operator lands on an admin-gated route.
 *
 * Epic 7 S7.2: paired with the Epic 6 RBAC guard — when the guard
 * decides a route is off-limits, it redirects here instead of silently
 * rendering an empty shell. The page carries a role-needed chip so the
 * operator can request the right access via the runbook.
 *
 * The exact role required is read from ?role=<value> query string. The
 * parameter is rendered back verbatim, so the page must defensively
 * strip anything that isn't a role identifier (A–Z, a–z, 0–9, dash,
 * underscore, dot). Anything else falls back to a generic message.
 *
 * E4.S11 (retires F-7-028 P2): the "Sign in again" CTA threads a
 * sanitized `?next=<originating-path>` through to /login so an operator
 * with two roles (admin + member) re-authenticating in the elevated role
 * lands back on the page they came from. The plan-spec also lists
 * `?returnTo=` as the wire name; we accept both and prefer `next` (which
 * matches the existing /login + SessionExpiredCard convention).
 *
 * R-T1 / open-redirect: `next` / `returnTo` flow through
 * `sanitizeReturnTo` (lib/safe-redirect.ts) which rejects everything
 * except a same-origin path that starts with a single `/`. Hostile
 * inputs (`https://attacker.com`, `//evil.example`, `javascript:…`) all
 * fall through to the `/` fallback, so the worst the CTA can do is
 * land the operator on the dashboard.
 */

import Link from "next/link";

import "@/design/styles/tokens.css";
import "@/design/styles/primitives.css";
import "@/design/styles/system.css";
import { LegalFooter } from "@/design";
import { sanitizeReturnTo } from "@/lib/safe-redirect";

const ROLE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

function sanitizeRole(raw: string | string[] | undefined): string | null {
  if (typeof raw !== "string") return null;
  if (!ROLE_RE.test(raw)) return null;
  return raw;
}

/**
 * Build the "Sign in again" CTA href.
 *
 * - When the validated `next` is the dashboard (`/`), no query suffix
 *   is appended — `/login` already lands users on `/` post-auth, so the
 *   redundant `?next=%2F` would be cosmetic noise (and breaks one of
 *   our snapshot baselines).
 * - When `next` is any other validated same-origin path, encode it and
 *   append as `?next=<encoded>`. /login post-auth then router.replace()s
 *   to that path.
 * - Hostile inputs are rejected upstream by `sanitizeReturnTo`, so by
 *   the time we reach this builder the path is known-safe.
 */
function buildLoginHref(validatedNext: string): string {
  if (validatedNext === "/") return "/login";
  return `/login?next=${encodeURIComponent(validatedNext)}`;
}

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const role = sanitizeRole(params.role);
  // Accept both `next` (codebase convention, matches RBAC middleware
  // emission + /login + SessionExpiredCard) AND `returnTo` (plan-spec
  // E4.S11 wording). Prefer `next` when both are present so the
  // middleware-emitted value wins over a hand-crafted query.
  const rawNext =
    typeof params.next === "string" ? params.next : params.returnTo;
  const validatedNext = sanitizeReturnTo(rawNext, "/");
  const loginHref = buildLoginHref(validatedNext);
  return (
    <div className="dojo-ds-v3" data-skin="v2">
      <main
        id="main-content"
        tabIndex={-1}
        className="sys-fullpage"
        aria-labelledby="forbidden-heading"
        data-testid="forbidden-page"
      >
        <div className="sys-fullpage-inner">
          <section
            className="err-card"
            role="alert"
            aria-label="Access restricted"
          >
            <div className="ek">403 · Access restricted</div>
            <h1 id="forbidden-heading">
              You don&apos;t have access to this surface
            </h1>
            <p>
              Your account doesn&apos;t hold the elevated role this page
              requires. Ask an owner to raise your role, then sign in again to
              refresh your session.
            </p>
            <div className="act">
              <Link
                href="/"
                data-testid="forbidden-home"
                className="btn btn-ghost btn-sm"
              >
                Return to Command Center
              </Link>
            </div>
            <details>
              <summary>Details</summary>
              <p data-testid="forbidden-role-detail">
                Role required: {role ?? "elevated"}. Your session is still
                signed in — access opens as soon as the role change lands.
              </p>
              <div className="act">
                <Link
                  href={loginHref}
                  data-testid="forbidden-signin"
                  className="btn btn-ghost btn-sm"
                >
                  Sign in again
                </Link>
              </div>
            </details>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
