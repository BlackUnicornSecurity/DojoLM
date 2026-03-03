/**
 * @module attack-logger
 * Structured logging of all MCP interactions.
 * SME MED-13: Strips auth headers before logging.
 */

import type { MCPEvent, MCPEventType, AttackModeName, AttackType } from './types.js';

const AUTH_HEADER_KEYS = new Set([
  'authorization',
  'x-api-key',
  'api-key',
  'api_key',
  'token',
  'bearer',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'x-access-token',
]);

export class AttackLogger {
  private events: MCPEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents;
  }

  log(
    type: MCPEventType,
    mode: AttackModeName,
    opts?: {
      method?: string;
      params?: Record<string, unknown>;
      result?: unknown;
      attackType?: AttackType;
      metadata?: Record<string, unknown>;
    },
  ): MCPEvent {
    const event: MCPEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      mode,
      method: opts?.method,
      params: opts?.params ? this.redactAuth(opts.params) : undefined,
      result: this.redactValue(opts?.result),
      attackType: opts?.attackType,
      metadata: opts?.metadata,
    };

    this.events.push(event);

    // Enforce retention limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    return event;
  }

  getEvents(): readonly MCPEvent[] {
    return this.events;
  }

  getEventsByType(type: MCPEventType): readonly MCPEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getEventsByAttack(attackType: AttackType): readonly MCPEvent[] {
    return this.events.filter((e) => e.attackType === attackType);
  }

  getEventCount(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }

  exportJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /** Redact any unknown value (handles result field, nested objects, arrays) */
  private redactValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return value;
    return this.redactAuth(value as Record<string, unknown>);
  }

  /** SME MED-13: Strip auth headers before logging */
  private redactAuth(params: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (AUTH_HEADER_KEYS.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = this.redactValue(value);
      }
    }
    return redacted;
  }
}
