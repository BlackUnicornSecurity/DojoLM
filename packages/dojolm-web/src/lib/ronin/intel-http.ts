// SPDX-License-Identifier: Apache-2.0
/**
 * File: intel-http.ts
 * Purpose: SSRF-safe fetch wrapper for the Ronin intelligence ingest
 *          pipeline. Only allows requests against a fixed allowlist of
 *          upstream feed hosts, enforces HTTPS, applies a per-request
 *          timeout, and caps the response body size.
 *
 * Story: WAVE3-INTEL-INGEST / ADR-0026.
 *
 * Unlike the general `isBlockedSsrfTarget` in `llm-providers.ts` (which
 * uses a denylist for cloud-metadata endpoints), the intel ingest
 * pipeline uses a strict allowlist — the operator should never point
 * it at an arbitrary URL, so we refuse anything not on the list.
 */

const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  'services.nvd.nist.gov',
  'nvd.nist.gov',
  'incidentdatabase.ai',
  // ADR-0037 — additional Wave 4 feeds.
  'www.cisa.gov',          // CISA KEV catalogue
  'api.first.org',          // FIRST.org EPSS API
  'atlas.mitre.org',        // MITRE ATLAS case studies
])

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export interface IntelFetchOptions {
  readonly timeoutMs?: number
  readonly maxBytes?: number
  readonly headers?: Record<string, string>
}

export class IntelFetchError extends Error {
  readonly code:
    | 'host-not-allowed'
    | 'non-https'
    | 'invalid-url'
    | 'http-error'
    | 'timeout'
    | 'body-too-large'
    | 'network-error'
  readonly status?: number
  constructor(code: IntelFetchError['code'], message: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function isAllowedIntelHost(host: string): boolean {
  return ALLOWED_HOSTS.has(host)
}

export async function fetchIntelJson<T>(
  url: string,
  opts: IntelFetchOptions = {},
): Promise<T> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new IntelFetchError('invalid-url', 'Invalid URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new IntelFetchError('non-https', 'Only https:// is permitted for intel ingest')
  }
  if (!isAllowedIntelHost(parsed.hostname)) {
    throw new IntelFetchError('host-not-allowed', `Host not on intel allowlist: ${parsed.hostname}`)
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DojoLM-Intel-Ingest/1.0 (+https://dojolm.internal)',
        ...opts.headers,
      },
      redirect: 'error',
    })
    if (!response.ok) {
      throw new IntelFetchError('http-error', `HTTP ${response.status}`, response.status)
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > maxBytes) {
      throw new IntelFetchError('body-too-large', `Response exceeded ${maxBytes} bytes`)
    }
    try {
      const text = new TextDecoder().decode(buffer)
      return JSON.parse(text) as T
    } catch {
      throw new IntelFetchError('http-error', 'Response body was not valid JSON')
    }
  } catch (err) {
    if (err instanceof IntelFetchError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new IntelFetchError('timeout', `Upstream timed out after ${timeoutMs}ms`)
    }
    const message = err instanceof Error ? err.message : 'unknown network error'
    throw new IntelFetchError('network-error', message)
  } finally {
    clearTimeout(timer)
  }
}

export const INTEL_ALLOWED_HOSTS = ALLOWED_HOSTS
