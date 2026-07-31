// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/email-sender-smtp.ts
 * Purpose: MEMBER-EMAIL — production SMTP adapter using nodemailer.
 *          Constructs the transport once per resolve() call (route.ts
 *          resolves lazily per POST — volume is low, invite-issuance
 *          traffic is operator-paced, not end-user paced).
 *
 * Env (all required; missing any → throw):
 *   SMTP_HOST
 *   SMTP_PORT          — numeric string, 1..65535
 *   SMTP_USER
 *   SMTP_PASS
 *   SMTP_FROM          — RFC 5321 From: header (name + address allowed)
 *
 * Optional:
 *   SMTP_SECURE        — 'true' forces TLS on connect (port 465 style);
 *                        default: port-implicit (465 → true, else false)
 *
 * R-T1: The raw token is formatted into the email body but NEVER
 * logged from this module. Transport-level failures bubble as
 * Error; the caller (magic-link POST) returns 500 and does NOT
 * consume the invite.
 */

import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import type { MemberEmailSender, SendMagicLinkInput } from './email-sender';
import {
  formatMagicLinkBody,
  validateFromAddressHost,
} from './email-sender';

export interface SmtpSenderConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
  readonly secure: boolean;
}

/** Thin indirection so tests can inject a pre-built transport. */
export interface CreateSmtpSenderOptions {
  readonly transport?: Transporter;
}

function parsePort(raw: string | undefined): number {
  if (!raw) throw new Error('SMTP_PORT is required');
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > 65_535) {
    throw new Error(`SMTP_PORT must be an integer in [1, 65535]; got: ${raw}`);
  }
  return n;
}

function readConfig(env: NodeJS.ProcessEnv): SmtpSenderConfig {
  const host = env.SMTP_HOST?.trim();
  const port = parsePort(env.SMTP_PORT?.trim());
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM?.trim();
  const secureRaw = env.SMTP_SECURE?.trim().toLowerCase();
  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('SMTP_FROM');
  if (missing.length > 0) {
    throw new Error(
      `SMTP sender is missing required env var(s): ${missing.join(', ')}. ` +
        `Set MEMBER_EMAIL_BACKEND=log for local dev without SMTP.`,
    );
  }
  const secure = secureRaw === 'true' ? true : secureRaw === 'false' ? false : port === 465;
  return {
    host: host as string,
    port,
    user: user as string,
    pass: pass as string,
    from: from as string,
    secure,
  };
}

export function createSmtpSender(
  env: NodeJS.ProcessEnv = process.env,
  options: CreateSmtpSenderOptions = {},
): MemberEmailSender {
  const config = readConfig(env);
  const transport: Transporter =
    options.transport ??
    createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      // R-T1 defense-in-depth: nodemailer's `logger` and `debug` can
      // surface the full SMTP session (including the message body
      // with the raw-token URL) if DEBUG=nodemailer* is in the host
      // env. Force both off so no operator env can flip the transport
      // into a token-leak sink.
      logger: false,
      debug: false,
    });

  return {
    mode: 'email',
    async sendMagicLink(input: SendMagicLinkInput): Promise<void> {
      // E6.S10 / F-8-016: from-host MUST equal (or subdomain of) the
      // baseUrl host. Validated per-send so an env flip during
      // deploy is caught immediately rather than at next restart.
      // Throwing here surfaces in route.ts as 500 / email-send-failed
      // (invite NOT consumed), which is the safe failure mode — we
      // would rather fail loud than ship invites from a misaligned
      // domain.
      validateFromAddressHost(config.from, input.baseUrl);
      const { subject, text, html } = formatMagicLinkBody(input);
      // Nodemailer's `text` + `html` produces multipart/alternative
      // automatically (rfc2046 §5.1.4) — recipients pick the richest
      // they can render. We discard the return value so no part of
      // the raw-token-bearing URL can escape into audit / log sinks.
      // Transport-level failure throws — the POST handler converts
      // that to 500 without consuming the invite.
      await transport.sendMail({
        from: config.from,
        to: input.email,
        subject,
        text,
        html,
      });
    },
  };
}
