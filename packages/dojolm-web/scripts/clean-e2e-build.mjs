// SPDX-License-Identifier: Apache-2.0
/** Remove only the local Next build before a source-bound E2E rebuild. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function cleanE2eBuild(appRoot) {
  const canonicalRoot = fs.realpathSync(appRoot);
  if (canonicalRoot !== path.resolve(appRoot)) {
    throw new Error("E2E build root must be canonical");
  }
  const nextDir = path.join(canonicalRoot, ".next");
  if (!fs.existsSync(nextDir)) return false;
  if (fs.lstatSync(nextDir).isSymbolicLink()) {
    throw new Error("refusing to remove a symlinked E2E build directory");
  }
  fs.rmSync(nextDir, { recursive: true, force: true });
  return true;
}

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
/* v8 ignore next 3 -- process entry wiring; cleanE2eBuild is covered directly. */
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  cleanE2eBuild(appRoot);
}
