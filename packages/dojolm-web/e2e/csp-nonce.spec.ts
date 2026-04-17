/**
 * E2E Test: CSP Nonce (H-04)
 * Verifies that middleware generates a per-request nonce and emits it in the
 * Content-Security-Policy header without 'unsafe-inline' in script-src.
 */

import { test, expect } from '@playwright/test'

const PAGES = ['/', '/login']

for (const page of PAGES) {
  test(`CSP header on ${page} contains nonce and no unsafe-inline in script-src`, async ({ request }) => {
    const response = await request.get(page)

    const csp = response.headers()['content-security-policy']
    expect(csp, `Expected CSP header on ${page}`).toBeTruthy()

    const scriptSrc = csp!.split(';').find(d => d.trim().startsWith('script-src'))
    expect(scriptSrc, 'Expected script-src directive').toBeTruthy()

    // Must have a nonce
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/)

    // Must NOT have unsafe-inline (H-04 acceptance criterion)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })
}

test('CSP nonce changes on each request (per-request generation)', async ({ request }) => {
  const [r1, r2] = await Promise.all([
    request.get('/'),
    request.get('/'),
  ])

  const csp1 = r1.headers()['content-security-policy'] ?? ''
  const csp2 = r2.headers()['content-security-policy'] ?? ''

  const nonce1 = csp1.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1]
  const nonce2 = csp2.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1]

  expect(nonce1).toBeTruthy()
  expect(nonce2).toBeTruthy()
  // Nonces must differ across requests
  expect(nonce1).not.toBe(nonce2)
})
