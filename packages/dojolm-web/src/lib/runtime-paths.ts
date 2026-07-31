// SPDX-License-Identifier: Apache-2.0
import path from 'node:path';

function getConfiguredDataRoot(): string | null {
  const configured = process.env.TPI_DATA_DIR?.trim();
  if (!configured) {
    return null;
  }

  return path.resolve(configured);
}

export function getDataRootDir(): string {
  return getConfiguredDataRoot() ?? path.join(process.cwd(), 'data');
}

function assertWithinRoot(resolved: string, root: string): string {
  const resolvedRoot = path.resolve(root);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(
      `Path traversal detected: resolved path "${resolved}" escapes data root "${resolvedRoot}"`,
    );
  }
  return resolved;
}

export function getDataPath(...segments: string[]): string {
  const root = getDataRootDir();
  const resolved = path.resolve(root, ...segments);
  return assertWithinRoot(resolved, root);
}

export function resolveDataPath(...segments: string[]): string {
  const root = getDataRootDir();
  const resolved = path.resolve(root, ...segments);
  return assertWithinRoot(resolved, root);
}
