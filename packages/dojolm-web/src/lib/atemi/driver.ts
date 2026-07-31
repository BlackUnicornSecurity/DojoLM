// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/atemi/driver.ts
 *
 * Process-scoped accessor for the `AtemiDriver` the Gap 3 probe-runner
 * composes with. The Vault-backed `PlaywrightAtemiDriver` (adapters map
 * + launcher) is wired in a follow-up PR; until then this accessor
 * returns `undefined` and the fleet-wide probe orchestrator treats
 * every active tuple as `skipped` with reason `driver-not-configured`.
 *
 * The probe endpoint intentionally still runs end-to-end in this state
 * — operators see an accurate per-tuple readiness summary through the
 * admin UI, which is the safe default. A tuple "probe-ran" only when
 * the full stack (driver + auth vault + budget ledger + active ToS
 * attestation) is wired.
 */
import type { AtemiDriver } from 'bu-tpi/atemi';

let _driver: AtemiDriver | undefined;

/**
 * Override in tests or at server bootstrap to install a real driver
 * (PlaywrightAtemiDriver wrapped with `withTosAttestation`).
 */
export function setAtemiDriver(driver: AtemiDriver | undefined): void {
  _driver = driver;
}

/** Returns the configured driver, or `undefined` if one hasn't been wired. */
export function getAtemiDriver(): AtemiDriver | undefined {
  return _driver;
}
