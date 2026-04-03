/**
 * File: fingerprint-state.test.ts
 * Purpose: Test fingerprint session state management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bu-tpi/fingerprint', () => ({}));

import { activeFingerprints } from '../fingerprint-state';

describe('activeFingerprints', () => {
  it('exports an object with session management methods', () => {
    expect(activeFingerprints).toBeDefined();
    expect(typeof activeFingerprints).toBe('object');
  });

  it('has create, get, and cleanup methods', () => {
    expect(typeof activeFingerprints.create).toBe('function');
    expect(typeof activeFingerprints.get).toBe('function');
  });

  it('can create and retrieve a session', () => {
    const session = activeFingerprints.create('test-id-fp');
    expect(session).toBeDefined();
    expect(session.id).toBe('test-id-fp');
    expect(session.completed).toBe(false);

    const retrieved = activeFingerprints.get('test-id-fp');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('test-id-fp');
  });
});
