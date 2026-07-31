#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Remove stale Next.js build output before production builds.
 *
 * macOS can occasionally report ENOTEMPTY while recursively deleting large
 * standalone traces. Node's fs.rm retry support makes the cleanup deterministic.
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const buildOutputPath = join(process.cwd(), '.next');

await rm(buildOutputPath, {
  force: true,
  maxRetries: 5,
  recursive: true,
  retryDelay: 250,
});
