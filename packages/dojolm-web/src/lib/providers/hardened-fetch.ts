// SPDX-License-Identifier: Apache-2.0
/**
 * File: providers/hardened-fetch.ts
 * Purpose: Single SSRF-hardened outbound path for the LLM provider adapters AND the
 *          admin LLM *discovery* API routes (discover-api-models, local-models,
 *          providers/[id]/discover), which call it directly instead of the streaming
 *          adapters.
 *
 * The adapters (ollama/openai/anthropic/lmstudio/llamacpp) issue their own streaming
 * fetch at inference time — a SEPARATE stack from bu-tpi's fetchWithTimeout — and keep
 * their own AbortSignal-based timeout classification, so they can't route through
 * fetchWithTimeout without regressing that error handling. Instead they route through
 * here, which applies bu-tpi's shared SSRF primitives to the caller's own init:
 *
 *   1. validateProviderUrl (remote path only) — sync scheme/host/port string check.
 *      It's the ONLY guard for IP-LITERAL hosts (e.g. http://169.254.169.254): undici's
 *      connector `lookup` is skipped for a literal, so the pin never sees it. Local
 *      providers legitimately target localhost / LAN literals on non-standard ports, so
 *      applying the remote string rules to them would wrongly reject a genuine local
 *      model server. A local HOSTNAME is still revalidated at connect by the pin's
 *      isLocal allowlist (loopback / TPI_TRUSTED_INTERNAL_IPS); a local IP-LITERAL —
 *      which cannot rebind and which the connector lookup skips — is covered only by the
 *      save-time validateModelConfig gate (llm-providers.ts), not re-checked here.
 *   2. getPinnedDispatcher — bu-tpi's connect-time undici dispatcher that PINS +
 *      revalidates the DNS-resolved IP. Closes the rebinding TOCTOU the save-time
 *      resolveAndValidateUrl gate leaves open (the adapter re-fetches the STORED
 *      baseUrl, unrevalidated — see llm-providers.ts:validateModelConfig).
 *   3. redirect:'error' — fail closed on a 3xx pivot to an internal host (a validated
 *      public host that 302s to http://127.0.0.1 would otherwise be followed).
 *
 * The caller's `signal` and error handling are passed through untouched.
 */
import { validateProviderUrl, getPinnedDispatcher } from 'bu-tpi/llm';

/**
 * Fetch a provider endpoint with SSRF hardening. `isLocal` mirrors the save-time gate's
 * classification (['ollama','lmstudio','llamacpp'] are local). Throws before any socket
 * opens if a remote baseUrl fails the sync SSRF check.
 */
export async function hardenedProviderFetch(
  url: string,
  init: RequestInit,
  isLocal: boolean,
): Promise<Response> {
  if (!isLocal && !validateProviderUrl(url, false)) {
    // Reject (not sync-throw) so a bad URL surfaces uniformly as the adapters'
    // awaited failure path, never as a synchronous throw at the call site.
    throw new Error('SSRF: refusing to fetch unsafe provider URL');
  }

  const hardened: RequestInit = { ...init, redirect: 'error' };
  // `dispatcher` is a Node/undici fetch extension not present on the DOM RequestInit
  // type; the Agent comes from bu-tpi (which owns undici) so the web app never imports
  // undici itself. Node's global fetch accepts it at runtime.
  (hardened as { dispatcher?: unknown }).dispatcher = getPinnedDispatcher(isLocal);

  return fetch(url, hardened);
}
