// SPDX-License-Identifier: Apache-2.0
/**
 * Shared safe-emit wrapper for DojoEvent forwarders.
 *
 * Both `buildKumiteTelemetry` and `buildHydraTelemetry` wrap their calls
 * to `TelemetryEmitter.emit` in identical try/catch blocks so a
 * telemetry failure cannot break the calling loop. Centralising the
 * wrapper keeps the invariant in one place.
 */

import type { DojoEvent, TelemetryEmitter } from 'bu-tpi/telemetry';

export function makeSafeEmit(
  dojoEmitter: TelemetryEmitter,
): (event: DojoEvent) => void {
  return (event: DojoEvent): void => {
    try {
      dojoEmitter.emit(event);
    } catch {
      // Telemetry failures must never surface into the caller's control
      // flow — match loop / campaign loop / route handler all rely on
      // this invariant.
    }
  };
}
