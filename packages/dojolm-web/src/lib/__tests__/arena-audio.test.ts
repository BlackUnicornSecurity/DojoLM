/**
 * File: arena-audio.test.ts
 * Purpose: Tests for ArenaAudio singleton + sound manager
 * Source: src/lib/arena-audio.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockClose = vi.fn();
const mockResume = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockReturnThis();
const mockStart = vi.fn();
const mockStop = vi.fn();

function mockParam() {
  return {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    value: 0,
  };
}

let mockState = 'running';

class MockAudioContext {
  currentTime = 0;
  get state() { return mockState; }
  destination = {};
  createOscillator() {
    return { type: 'sine', frequency: mockParam(), connect: mockConnect, start: mockStart, stop: mockStop };
  }
  createGain() {
    return { gain: mockParam(), connect: mockConnect };
  }
  createBiquadFilter() {
    return { type: 'lowpass', frequency: mockParam(), connect: mockConnect };
  }
  close = mockClose;
  resume = mockResume;
}

describe('ArenaAudio — with window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockState = 'running';
    vi.stubGlobal('window', {});
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('AA-001: getArenaAudio returns a singleton', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    const a = getArenaAudio();
    const b = getArenaAudio();
    expect(a).toBe(b);
  });

  it('AA-002: starts muted by default', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    expect(getArenaAudio().isMuted()).toBe(true);
  });

  it('AA-003: setMuted toggles mute state', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    const audio = getArenaAudio();
    audio.setMuted(false);
    expect(audio.isMuted()).toBe(false);
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
  });

  it('AA-004: play does nothing when muted', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    getArenaAudio().play('katana');
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('AA-005: play creates oscillators when unmuted', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    const audio = getArenaAudio();
    audio.setMuted(false);
    audio.play('katana');
    expect(mockStart).toHaveBeenCalled();
  });

  it('AA-006: init can be called safely', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    expect(() => getArenaAudio().init()).not.toThrow();
  });

  it('AA-007: dispose closes context', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    const audio = getArenaAudio();
    audio.init();
    audio.dispose();
    expect(mockClose).toHaveBeenCalled();
  });

  it('AA-008: play supports all sound types without errors', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    const audio = getArenaAudio();
    audio.setMuted(false);
    for (const sound of ['katana', 'block', 'score', 'match-start', 'match-end'] as const) {
      expect(() => audio.play(sound)).not.toThrow();
    }
  });

  it('AA-009: init resumes suspended context', async () => {
    mockState = 'suspended';
    const { getArenaAudio } = await import('../arena-audio');
    getArenaAudio().init();
    expect(mockResume).toHaveBeenCalled();
  });

  it('AA-010: dispose then re-init works', async () => {
    const { getArenaAudio } = await import('../arena-audio');
    const audio = getArenaAudio();
    audio.init();
    audio.dispose();
    expect(() => audio.init()).not.toThrow();
  });
});

describe('ArenaAudio — SSR (no window)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('AA-011: play is SSR-safe when window is undefined', async () => {
    // Don't stub window — let typeof window === 'undefined' in node env
    // But vitest jsdom defines window, so we override
    const origWindow = globalThis.window;
    // @ts-expect-error — force undefined
    delete globalThis.window;
    try {
      const { getArenaAudio } = await import('../arena-audio');
      const audio = getArenaAudio();
      audio.setMuted(false);
      expect(() => audio.play('katana')).not.toThrow();
    } finally {
      globalThis.window = origWindow;
    }
  });

  it('AA-012: init is SSR-safe when window is undefined', async () => {
    const origWindow = globalThis.window;
    // @ts-expect-error — force undefined
    delete globalThis.window;
    try {
      const { getArenaAudio } = await import('../arena-audio');
      expect(() => getArenaAudio().init()).not.toThrow();
    } finally {
      globalThis.window = origWindow;
    }
  });
});
