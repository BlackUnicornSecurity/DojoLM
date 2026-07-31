// SPDX-License-Identifier: Apache-2.0
/**
 * Read a fetch Response body as JSON with a hard byte cap.
 *
 * Model-discovery and connection-test reads hit operator-supplied / registered
 * provider URLs. A hostile or misbehaving endpoint could stream an oversized
 * body (staying under the request timeout) to exhaust server memory. This caps
 * those DISCOVERY/TEST JSON reads and throws before the body grows past the
 * limit. NOTE: the inference read/stream paths (execute/streamExecute) are a
 * separate surface, bounded by max_tokens + request timeout, not by this cap.
 *
 * Falls back to `response.json()` when the body is not a readable stream (e.g.
 * mocked responses in unit tests, or a body already consumed elsewhere).
 */

/** Model lists are tiny; 2 MB is generous headroom for even huge inventories. */
const DEFAULT_MAX_RESPONSE_BYTES = 2_000_000;

export async function readJsonCapped<T = unknown>(
  response: Response,
  maxBytes: number = DEFAULT_MAX_RESPONSE_BYTES,
): Promise<T> {
  const reader = response.body?.getReader?.();
  if (!reader) {
    return (await response.json()) as T;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(`Provider response exceeded ${maxBytes}-byte cap`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(merged)) as T;
}
