// SPDX-License-Identifier: Apache-2.0
/**
 * Filesystem-backed WebAuthn credential store — E1-A-RB-9 (Master
 * Plan v1.0 §4.1).
 *
 * Per-user JSON file under `<DATA>/webauthn/<userId>.json`. Atomic
 * tmp+rename write with 0o600 perms. Mirrors the `FsBushidoSignoffStore`
 * pattern for consistency.
 *
 * The interface (`WebAuthnStore`) lives in `bu-tpi/auth` so the shared
 * substrate is dep-free. This concrete impl is dojolm-web-scoped
 * because it depends on `@/lib/runtime-paths`.
 *
 * License: Apache-2.0.
 */

import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  InMemoryWebAuthnStore,
  validateCredentialId,
  validateUserId,
  WebAuthnStoreError,
  type WebAuthnCredential,
  type WebAuthnStore,
} from 'bu-tpi/auth';
import { getDataPath } from '@/lib/runtime-paths';

function isCredential(value: unknown): value is WebAuthnCredential {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.credentialId === 'string' &&
    typeof v.publicKey === 'string' &&
    typeof v.counter === 'number' &&
    typeof v.authenticatorGUID === 'string' &&
    typeof v.registeredAt === 'string'
  );
}

export class FsWebAuthnStore implements WebAuthnStore {
  // Per-user mutex prevents two concurrent register / updateCounter
  // calls from racing on the read-modify-write cycle.
  private readonly locks = new Map<string, true>();

  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  private fileFor(userId: string): string {
    return join(this.dir, `${userId}.json`);
  }

  private readList(userId: string): WebAuthnCredential[] {
    const file = this.fileFor(userId);
    if (!existsSync(file)) return [];
    try {
      const raw = readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isCredential).map((c) => ({ ...c }));
    } catch {
      return [];
    }
  }

  private writeList(userId: string, list: ReadonlyArray<WebAuthnCredential>): void {
    const file = this.fileFor(userId);
    const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(list), { mode: 0o600 });
    renameSync(tmp, file);
  }

  async listCredentials(userId: string): Promise<readonly WebAuthnCredential[]> {
    validateUserId(userId);
    const list = this.readList(userId);
    return Object.freeze(list.map((c) => Object.freeze({ ...c })));
  }

  async addCredential(userId: string, cred: WebAuthnCredential): Promise<void> {
    validateUserId(userId);
    validateCredentialId(cred.credentialId);
    if (this.locks.has(userId)) {
      throw new WebAuthnStoreError(
        'duplicate-credential',
        'concurrent registration in progress; retry shortly',
      );
    }
    this.locks.set(userId, true);
    try {
      const list = this.readList(userId);
      if (list.some((c) => c.credentialId === cred.credentialId)) {
        throw new WebAuthnStoreError(
          'duplicate-credential',
          `credential already registered for user "${userId}"`,
        );
      }
      const persistable: WebAuthnCredential = {
        credentialId: cred.credentialId,
        publicKey: cred.publicKey,
        counter: cred.counter,
        authenticatorGUID: cred.authenticatorGUID,
        registeredAt: cred.registeredAt,
        ...(cred.transports ? { transports: [...cred.transports] } : {}),
      };
      this.writeList(userId, [...list, persistable]);
    } finally {
      this.locks.delete(userId);
    }
  }

  async updateCounter(
    userId: string,
    credentialId: string,
    newCounter: number,
  ): Promise<void> {
    validateUserId(userId);
    validateCredentialId(credentialId);
    if (
      typeof newCounter !== 'number' ||
      !Number.isFinite(newCounter) ||
      newCounter < 0
    ) {
      throw new WebAuthnStoreError(
        'counter-replay',
        'newCounter must be a finite non-negative number',
      );
    }
    if (this.locks.has(userId)) {
      throw new WebAuthnStoreError(
        'counter-replay',
        'concurrent counter update in progress; retry shortly',
      );
    }
    this.locks.set(userId, true);
    try {
      const list = this.readList(userId);
      const idx = list.findIndex((c) => c.credentialId === credentialId);
      if (idx === -1) {
        throw new WebAuthnStoreError(
          'unknown-credential',
          `credential not found for user "${userId}"`,
        );
      }
      const current = list[idx];
      if (current.counter !== 0 || newCounter !== 0) {
        if (newCounter <= current.counter) {
          throw new WebAuthnStoreError(
            'counter-replay',
            `counter must strictly exceed stored value (stored=${current.counter}, new=${newCounter})`,
          );
        }
      }
      list[idx] = { ...current, counter: newCounter };
      this.writeList(userId, list);
    } finally {
      this.locks.delete(userId);
    }
  }

  async removeCredential(userId: string, credentialId: string): Promise<void> {
    validateUserId(userId);
    validateCredentialId(credentialId);
    if (this.locks.has(userId)) {
      // No-op when contention — caller retries.
      return;
    }
    this.locks.set(userId, true);
    try {
      const list = this.readList(userId);
      this.writeList(
        userId,
        list.filter((c) => c.credentialId !== credentialId),
      );
    } finally {
      this.locks.delete(userId);
    }
  }
}

let defaultStore: WebAuthnStore | null = null;

/**
 * Resolve the default WebAuthn store. `WEBAUTHN_STORE=in-memory`
 * swaps to an InMemoryWebAuthnStore for dev smoke testing without
 * disk persistence. Otherwise filesystem-backed.
 */
export function getWebAuthnStore(): WebAuthnStore {
  if (defaultStore) return defaultStore;
  if (process.env.WEBAUTHN_STORE === 'in-memory') {
    defaultStore = new InMemoryWebAuthnStore();
  } else {
    defaultStore = new FsWebAuthnStore(getDataPath('webauthn'));
  }
  return defaultStore;
}

export function setDefaultWebAuthnStoreForTest(store: WebAuthnStore | null): void {
  defaultStore = store;
}
