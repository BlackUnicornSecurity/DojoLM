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

export function getDataPath(...segments: string[]): string {
  return path.join(getDataRootDir(), ...segments);
}

export function resolveDataPath(...segments: string[]): string {
  return path.resolve(getDataRootDir(), ...segments);
}
