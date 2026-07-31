// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/email-sender.ts
 * Purpose: MEMBER-EMAIL — interface + factory for the magic-link
 *          email sender adapter. Epic 4B.1 S4B.1.2 shipped a dev-only
 *          log sink; this module introduces the production-sender
 *          shape and the `MEMBER_EMAIL_BACKEND` env selector.
 *
 * E6.S10 (2026-05-09) — multipart/alternative HTML upgrade. Retires:
 *   - F-8-015 (P2): magic-link email plain-text only / no branding.
 *     Now ships text/plain + text/html alternatives, the HTML body
 *     carries the Yamabushi torii-red brand mark with inline-styled
 *     brand-token color values, and a "Why am I getting this?" footer
 *     plus the explicit 10-min TTL / single-use / never-asks-password
 *     copy. NO tracking pixel, NO external CSS, NO read-receipt.
 *   - F-8-016 (P3): from-address has no validation surface. The
 *     `validateFromAddressHost(from, baseUrl)` helper rejects an
 *     SMTP_FROM whose host suffix does not match the configured
 *     baseUrl host so a misconfigured operator cannot ship invites
 *     out of `team@evil.com` against a `dojo.example.internal` install.
 *
 * Token-safety (R-T1/R-T3):
 *   - The raw token crosses a single trust boundary: route.ts mints
 *     it, passes it in-memory to `sendMagicLink()`, the adapter
 *     formats the URL, invokes the transport, and the reference goes
 *     out of scope. Adapters MUST NOT log the raw token (not even a
 *     prefix — the log-sink's 6-char prefix is logged by route.ts,
 *     not by the adapter).
 *   - The store keeps only the SHA-256 hash (see magic-link-store.ts).
 *   - Transport failures bubble up so the POST handler returns 500
 *     without consuming the invite. Retries are at the operator layer
 *     (they ask admin to rotate the invite); the adapter never queues.
 *
 * Selection:
 *   MEMBER_EMAIL_BACKEND = 'log'  (default) — dev-log sink.
 *   MEMBER_EMAIL_BACKEND = 'smtp'          — nodemailer SMTP transport.
 *
 * Any selected backend that cannot be constructed (missing env for
 * smtp) MUST throw from `resolveMemberEmailSender()` so the route
 * short-circuits to 503. We do NOT silently fall back to the log
 * sender in production — that would reduce the auth model to
 * "anyone who knows the invite code and email".
 */

export interface SendMagicLinkInput {
  /** Invitee's email address (RFC 5321, already validated upstream). */
  readonly email: string;
  /** Raw magic-link token (64-char hex). In-memory only; never log. */
  readonly rawToken: string;
  /** The human-readable invite handle shown in the greeting. */
  readonly inviteHandle: string;
  /** Absolute URL for the magic-link redeem endpoint (no `?token=` yet). */
  readonly baseUrl: string;
  /** Remaining TTL in minutes (informational — displayed in body). */
  readonly ttlMinutes: number;
}

export interface MemberEmailSender {
  /** Stable identifier for audit/log: 'email' (smtp) | 'dev' (log). */
  readonly mode: 'email' | 'dev';
  sendMagicLink(input: SendMagicLinkInput): Promise<void>;
}

export type MemberEmailBackend = 'log' | 'smtp';

function readBackend(env: NodeJS.ProcessEnv): MemberEmailBackend {
  const raw = env.MEMBER_EMAIL_BACKEND?.trim().toLowerCase();
  if (raw === 'smtp') return 'smtp';
  if (raw === 'log' || !raw) return 'log';
  // Unknown value — fail fast rather than silently downgrading.
  throw new Error(
    `MEMBER_EMAIL_BACKEND has unsupported value: ${raw}. Expected 'log' or 'smtp'.`,
  );
}

/**
 * Resolve the configured sender. Throws when the selected backend
 * cannot be constructed — callers (route.ts POST) translate the
 * throw into a 503 response.
 *
 * The factory is a function, not a module-level constant, so tests
 * can stub env per case without worrying about import caching.
 */
export async function resolveMemberEmailSender(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MemberEmailSender> {
  const backend = readBackend(env);
  if (backend === 'log') {
    // Operational footgun guard: if the operator forgot to set the
    // env in a production deploy, the log sender echoes rawToken in
    // the 202 body. Hard-throwing is too aggressive (internal builds
    // may deliberately pick log); a single boot-time warning lets
    // logs surface the misconfiguration without breaking the app.
    if (env.NODE_ENV === 'production' && !warnedProdLogBackend) {
      console.warn(
        '[email-sender] MEMBER_EMAIL_BACKEND=log in NODE_ENV=production — rawToken will echo in 202 body. Set MEMBER_EMAIL_BACKEND=smtp for prod.',
      );
      warnedProdLogBackend = true;
    }
    const { createLogSender } = await import('./email-sender-log');
    return createLogSender();
  }
  const { createSmtpSender } = await import('./email-sender-smtp');
  return createSmtpSender(env);
}

let warnedProdLogBackend = false;

/**
 * Brand color values mirrored from `src/design/styles/tokens.css`.
 * Email clients do not reliably resolve CSS custom properties or
 * external stylesheets, so the tokens are pinned as inline hex
 * literals here. Keep these in lock-step with `tokens.css`.
 */
export const BRAND_TORII = '#CC3A2F';
export const BRAND_TORII_DEEP = '#8B1E16';
export const BRAND_BG_1 = '#0A0A11';
export const BRAND_BG_2 = '#10111A';
export const BRAND_FG = '#ECEEF2';
export const BRAND_FG_DIM = '#9BA3B3';
export const BRAND_FG_MUTE = '#5E6472';

/** Lightweight HTML escape for inline interpolation (defense-in-depth). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the HTML alternative for the magic-link email. Inline-style
 * only — no <link rel="stylesheet">, no <style> block, no external
 * resources, no tracking pixels (explicit ban — F-8-015 spec).
 *
 * The "brand mark" is a pure-CSS torii silhouette (not an external
 * image) so the recipient never makes a network request to render
 * the email. This also dodges the read-receipt-via-image-load anti-
 * pattern entirely.
 */
function renderMagicLinkHtml(input: SendMagicLinkInput, url: string): string {
  const handle = escapeHtml(input.inviteHandle);
  const safeUrl = escapeHtml(url);
  const ttl = String(input.ttlMinutes);
  const tableStyle = [
    `background-color:${BRAND_BG_1}`,
    `color:${BRAND_FG}`,
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`,
    'width:100%',
    'max-width:560px',
    'margin:0 auto',
    'padding:24px',
    'border-collapse:collapse',
  ].join(';');
  const cardStyle = [
    `background-color:${BRAND_BG_2}`,
    `border:1px solid ${BRAND_TORII_DEEP}`,
    'border-radius:12px',
    'padding:24px',
  ].join(';');
  const buttonStyle = [
    'display:inline-block',
    `background-color:${BRAND_TORII}`,
    `color:${BRAND_FG}`,
    'padding:12px 24px',
    'border-radius:8px',
    'text-decoration:none',
    'font-weight:600',
    'margin:16px 0',
  ].join(';');
  const footerStyle = [
    `color:${BRAND_FG_MUTE}`,
    'font-size:12px',
    'line-height:1.5',
    'margin-top:24px',
    `border-top:1px solid ${BRAND_FG_MUTE}`,
    'padding-top:16px',
  ].join(';');
  const dimStyle = `color:${BRAND_FG_DIM};font-size:14px;line-height:1.5;margin:8px 0`;
  const brandMark = [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" data-testid="magic-link-brand-mark" style="margin:0 auto 16px;border-collapse:collapse">`,
    `<tr><td colspan="3" style="background-color:${BRAND_TORII};height:6px;width:120px"></td></tr>`,
    `<tr><td style="height:8px"></td><td style="height:8px"></td><td style="height:8px"></td></tr>`,
    `<tr><td colspan="3" style="background-color:${BRAND_TORII_DEEP};height:4px"></td></tr>`,
    `<tr>`,
    `<td style="background-color:${BRAND_TORII};width:12px;height:48px"></td>`,
    `<td style="width:96px"></td>`,
    `<td style="background-color:${BRAND_TORII};width:12px;height:48px"></td>`,
    `</tr>`,
    `</table>`,
    `<p style="text-align:center;color:${BRAND_TORII};font-weight:600;letter-spacing:0.08em;margin:0 0 8px;font-size:12px;text-transform:uppercase">Yamabushi &middot; BU-TPI</p>`,
  ].join('');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>Your BU-TPI sign-in link</title>`,
    '</head>',
    `<body style="margin:0;padding:0;background-color:${BRAND_BG_1}">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${tableStyle}">`,
    '<tr><td>',
    brandMark,
    `<div style="${cardStyle}">`,
    `<h1 style="color:${BRAND_FG};font-size:20px;margin:0 0 12px">Hi ${handle},</h1>`,
    `<p style="${dimStyle}">You (or someone using your invite) requested a sign-in link for the BU-TPI members area.</p>`,
    `<p style="text-align:center;margin:16px 0"><a href="${safeUrl}" style="${buttonStyle}" data-testid="magic-link-button">Sign in to BU-TPI</a></p>`,
    `<p style="${dimStyle}">Or paste this link into your browser:</p>`,
    `<p style="${dimStyle};word-break:break-all;font-family:Menlo,Consolas,monospace;font-size:12px">${safeUrl}</p>`,
    `<ul style="${dimStyle};padding-left:20px;margin:16px 0">`,
    `<li>This link expires in <strong>${ttl} minutes</strong>.</li>`,
    `<li>The link can be used <strong>once</strong> &mdash; after that it is dead.</li>`,
    `<li>BU-TPI will <strong>never</strong> ask you for your password by email.</li>`,
    `</ul>`,
    `</div>`,
    `<div style="${footerStyle}" data-testid="magic-link-why-footer">`,
    `<p style="margin:0 0 8px"><strong style="color:${BRAND_FG_DIM}">Why am I getting this?</strong></p>`,
    `<p style="margin:0">An admin issued you a BU-TPI members invite tied to this email address. If you did not request this, you can safely ignore the message &mdash; the link expires on its own and no account will be created.</p>`,
    `<p style="margin:8px 0 0">Privacy &middot; Terms &middot; Accessibility &middot; Cookies</p>`,
    `</div>`,
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}

/**
 * Format the magic-link email body. Adapters share the same copy
 * and tests can assert on content without duplicating the string.
 * Handle is displayed as-is (admin-controlled scalar, not free-form
 * user input — see invite-store validation).
 *
 * Returns BOTH a plain-text body and an HTML alternative so SMTP
 * adapters can ship a multipart/alternative payload (E6.S10 / F-8-015).
 */
export function formatMagicLinkBody(input: SendMagicLinkInput): {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly url: string;
} {
  const url = `${input.baseUrl}?token=${encodeURIComponent(input.rawToken)}`;
  const subject = 'Your BU-TPI members sign-in link';
  const text = [
    `Hi ${input.inviteHandle},`,
    '',
    'You (or someone using your invite) requested a sign-in link for',
    'the BU-TPI members area.',
    '',
    `This link expires in ${input.ttlMinutes} minutes and can be used`,
    'once. After that it is dead.',
    '',
    'BU-TPI will NEVER ask you for your password by email.',
    '',
    url,
    '',
    'Why am I getting this?',
    '  An admin issued you a BU-TPI members invite tied to this',
    '  email address. If you did not request this, ignore this',
    '  message — the link expires on its own and no account will',
    '  be created.',
    '',
    '— Yamabushi · BU-TPI',
    '  Privacy · Terms · Accessibility · Cookie',
  ].join('\n');
  const html = renderMagicLinkHtml(input, url);
  return { subject, text, html, url };
}

// ---------------------------------------------------------------------------
// E6.S10 — F-8-016: from-address baseUrl-host validation
// ---------------------------------------------------------------------------

/**
 * Extract the host portion of an RFC-5321 From: header. Accepts both
 * the bare-address form (`team@dojo.example.internal`) and the display-
 * name form (`BU-TPI <team@dojo.example.internal>`).
 */
export function extractFromAddressHost(from: string): string | null {
  const trimmed = from.trim();
  const angle = /<([^<>\s]+@[^<>\s]+)>\s*$/.exec(trimmed);
  const candidate = angle ? angle[1] : trimmed;
  const at = candidate.lastIndexOf('@');
  if (at < 0 || at === candidate.length - 1) return null;
  const host = candidate.slice(at + 1).trim().toLowerCase();
  if (!host || host.includes(' ')) return null;
  return host;
}

/**
 * Extract the host portion of the configured baseUrl. Throws if the
 * URL is not a valid http/https origin so a malformed env fails
 * loudly at startup.
 */
export function extractBaseUrlHost(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`baseUrl must be http(s); got: ${url.protocol}`);
  }
  return url.hostname.toLowerCase();
}

/**
 * Validate that the SMTP From: address host matches the configured
 * baseUrl host. The from host MUST EQUAL the baseUrl host or be a
 * subdomain of it.
 *
 * Throws `Error` with a clear message naming both halves so operators
 * can read the misconfiguration straight from the log.
 */
export function validateFromAddressHost(
  from: string,
  baseUrl: string,
): void {
  const fromHost = extractFromAddressHost(from);
  if (!fromHost) {
    throw new Error(
      `SMTP_FROM must contain a valid email address; got: ${from}`,
    );
  }
  const baseHost = extractBaseUrlHost(baseUrl);
  if (fromHost === baseHost) return;
  if (fromHost.endsWith(`.${baseHost}`)) return;
  throw new Error(
    `from-address host does not match baseUrl host: from='${fromHost}' baseUrl='${baseHost}'. ` +
      `Set SMTP_FROM to an address whose host equals or is a subdomain of the configured TPI_APP_URL/NEXT_PUBLIC_APP_URL host.`,
  );
}
