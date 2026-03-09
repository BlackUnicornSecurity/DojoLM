/**
 * File: arena-audio.ts
 * Purpose: Web Audio API synthesized sound effects for Arena matches
 * Story: 17.2 — Web Audio Sound Effects
 *
 * All sounds are synthesized (no external files). SSR-safe.
 * Default muted (opt-in). AudioContext lazy on first interaction.
 *
 * Index:
 * - ArenaAudio class (line 20)
 * - Sound generators (line 60)
 */

// ===========================================================================
// Arena Audio Manager
// ===========================================================================

type SoundType = 'katana' | 'block' | 'score' | 'match-start' | 'match-end'

class ArenaAudio {
  private ctx: AudioContext | null = null
  private muted = true

  /**
   * Initialize AudioContext lazily. Must be called from a user gesture.
   */
  init(): void {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  play(sound: SoundType): void {
    if (this.muted || typeof window === 'undefined') return
    if (!this.ctx) {
      this.init()
    }
    if (!this.ctx) return

    switch (sound) {
      case 'katana':
        this.playKatana()
        break
      case 'block':
        this.playBlock()
        break
      case 'score':
        this.playScore()
        break
      case 'match-start':
        this.playMatchStart()
        break
      case 'match-end':
        this.playMatchEnd()
        break
    }
  }

  dispose(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }

  // =========================================================================
  // Sound Generators (all Web Audio API synthesized)
  // =========================================================================

  /**
   * Katana strike: short noise burst with high-pass filter (metallic swoosh)
   */
  private playKatana(): void {
    const ctx = this.ctx!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15)

    filter.type = 'highpass'
    filter.frequency.setValueAtTime(600, now)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  }

  /**
   * Armor block: low thud (sine wave burst)
   */
  private playBlock(): void {
    const ctx = this.ctx!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  }

  /**
   * Score point: rising chirp
   */
  private playScore(): void {
    const ctx = this.ctx!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  }

  /**
   * Match start: ascending two-tone
   */
  private playMatchStart(): void {
    const ctx = this.ctx!
    const now = ctx.currentTime

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.setValueAtTime(i === 0 ? 440 : 660, now + i * 0.15)

      gain.gain.setValueAtTime(0, now + i * 0.15)
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.12)
    }
  }

  /**
   * Match end: descending tone
   */
  private playMatchEnd(): void {
    const ctx = this.ctx!
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(660, now)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.4)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.linearRampToValueAtTime(0.15, now + 0.2)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.4)
  }
}

// ===========================================================================
// Singleton Export
// ===========================================================================

let instance: ArenaAudio | null = null

export function getArenaAudio(): ArenaAudio {
  if (!instance) {
    instance = new ArenaAudio()
  }
  return instance
}

export type { SoundType }
