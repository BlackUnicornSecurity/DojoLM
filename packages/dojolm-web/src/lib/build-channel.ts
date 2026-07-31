// SPDX-License-Identifier: Apache-2.0
/**
 * Build channel disclosure helper (E6.S3 / F-8-006).
 *
 * The wizard's telemetry-consent step needs to disclose, in plain language,
 * WHO operates the deployment the operator is acknowledging. Two channels:
 *
 *   - 'cloud'     : hosted on Black Unicorn infrastructure. Telemetry
 *                   flows directly to Black Unicorn; the consent disclosure
 *                   says so explicitly.
 *   - 'self-host' : the operator runs the binary on their own hardware.
 *                   Telemetry may leave the box for the anonymised research
 *                   corpus (legitimate-interest basis with a free right to
 *                   object — see project_business_model.md, D-12), so the
 *                   disclosure has to make any off-box egress explicit.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_BUILD_CHANNEL` env var ('cloud' | 'self-host', case-
 *      insensitive). The Black Unicorn hosted deploy sets this to 'cloud';
 *      self-host operators leave it unset or set 'self-host' explicitly.
 *   2. Default: 'self-host'. The conservative default — a deployment that
 *      forgot to set the env var is more likely to be a self-host install
 *      than a Black-Unicorn-hosted one, and the more-detailed disclosure
 *      copy is the safer disclosure on either side of the line.
 *
 * The env var is `NEXT_PUBLIC_*` so the wizard step can render it client-
 * side without a round-trip; it's also re-checked server-side at ack-time
 * so a tampered client cannot persist a different channel than the one the
 * operator actually saw.
 */

import { isBuildChannel, type BuildChannel } from './db/types';

/**
 * Resolve the build channel from env. Server-safe (no `window` access).
 * Client-side callers should use `getClientBuildChannel()` instead.
 */
export function getBuildChannel(): BuildChannel {
  const raw = process.env.NEXT_PUBLIC_BUILD_CHANNEL?.trim().toLowerCase();
  if (raw && isBuildChannel(raw)) return raw;
  return 'self-host';
}

/**
 * Plain-language label per channel — used by the wizard step header.
 */
export function getBuildChannelLabel(channel: BuildChannel): string {
  if (channel === 'cloud') return 'Cloud (hosted on Black Unicorn)';
  return 'Self-hosted (your hardware)';
}

/**
 * Plain-language disclosure copy per channel — explains, without jargon,
 * where telemetry goes from this deployment.
 *
 * NOTE (F-7): worded as "collected for the corpus … transmitted when the corpus
 * uplink is configured" rather than a present-tense "is sent over HTTPS". The
 * corpus network transport is the steady-state design but is NOT wired into this
 * build yet (Track E; see docs/telemetry/disclosure.md). Keep the corpus
 * disclosure — do not re-assert active egress until the uplink actually ships.
 */
export function getBuildChannelDisclosure(channel: BuildChannel): string {
  if (channel === 'cloud') {
    return 'This deployment runs on Black Unicorn infrastructure. The telemetry described above is collected for the Black Unicorn corpus.';
  }
  return 'This deployment runs on your own hardware. The telemetry described above is collected for the Black Unicorn corpus and, when the corpus uplink is configured, transmitted over HTTPS.';
}
