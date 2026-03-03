/**
 * @module observer
 * S46: MCP Observer that records interactions and auto-generates fixtures.
 * SME S46 Amendments: PII/secret redaction before logging.
 */

import type {
  MCPEvent,
  AttackType,
  AttackModeName,
  MCPEventType,
} from './types.js';
import { AttackLogger } from './attack-logger.js';

export interface ObserverSnapshot {
  readonly capturedAt: string;
  readonly events: readonly MCPEvent[];
  readonly stats: ObserverStats;
}

export interface ObserverStats {
  readonly totalEvents: number;
  readonly eventsByType: Record<string, number>;
  readonly eventsByAttack: Record<string, number>;
  readonly modes: readonly AttackModeName[];
  readonly durationMs: number;
}

export class MCPObserver {
  private logger: AttackLogger;
  private startTime: number;
  private recording = false;
  private snapshots: ObserverSnapshot[] = [];
  private recordingStartIndex = 0;

  constructor(logger: AttackLogger) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  startRecording(): void {
    this.recording = true;
    this.startTime = Date.now();
    this.recordingStartIndex = this.logger.getEvents().length;
  }

  stopRecording(): ObserverSnapshot {
    this.recording = false;
    const snapshot = this.captureSnapshot();
    this.snapshots.push(snapshot);
    return snapshot;
  }

  isRecording(): boolean {
    return this.recording;
  }

  captureSnapshot(): ObserverSnapshot {
    const allEvents = this.logger.getEvents();
    const events = allEvents.slice(this.recordingStartIndex);
    return {
      capturedAt: new Date().toISOString(),
      events,
      stats: this.computeStats(events),
    };
  }

  getSnapshots(): readonly ObserverSnapshot[] {
    return this.snapshots;
  }

  /** Replay events in insertion order (returns a copy) */
  replay(): readonly MCPEvent[] {
    return [...this.logger.getEvents()];
  }

  private computeStats(events: readonly MCPEvent[]): ObserverStats {
    const eventsByType: Record<string, number> = {};
    const eventsByAttack: Record<string, number> = {};
    const modes = new Set<AttackModeName>();

    for (const e of events) {
      eventsByType[e.type] = (eventsByType[e.type] ?? 0) + 1;
      if (e.attackType) {
        eventsByAttack[e.attackType] = (eventsByAttack[e.attackType] ?? 0) + 1;
      }
      modes.add(e.mode);
    }

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByAttack,
      modes: Array.from(modes),
      durationMs: Date.now() - this.startTime,
    };
  }
}
