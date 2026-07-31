// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/email-sender-log.ts
 * Purpose: MEMBER-EMAIL — LogSender adapter. Dev-only sink that
 *          preserves the E4B.1 S4B.1.2 stdout behaviour (one
 *          `[magic-link:dev]` line carrying ONLY the 6-char token
 *          prefix + invite handle + email). Never prints the raw
 *          token in full.
 *
 * Selection: `MEMBER_EMAIL_BACKEND=log` (the default). When this
 * sender is resolved, the magic-link POST retains the legacy
 * developer-convenience behaviour of echoing `rawToken` in the 202
 * body — useful for local dev against `localhost:42001` where
 * there is no SMTP service.
 */

import type { MemberEmailSender, SendMagicLinkInput } from './email-sender';

function tokenPrefix6(rawToken: string): string {
  return rawToken.slice(0, 6);
}

export function createLogSender(): MemberEmailSender {
  return {
    mode: 'dev',
    async sendMagicLink(input: SendMagicLinkInput): Promise<void> {
      // Same line format as the E4B.1 dev-sink in route.ts — the log
      // carries inviteHandle (admin-controlled), email (for operator
      // trace), and the 6-char prefix. R-T1: the raw token NEVER
      // lands in stdout in full.
      console.info('[magic-link:dev]', {
        inviteHandle: input.inviteHandle,
        email: input.email,
        tokenPrefix6: tokenPrefix6(input.rawToken),
        ttlMinutes: input.ttlMinutes,
      });
    },
  };
}
