'use client';

import { fetchWithAuth } from './fetch-with-auth';

export interface AuthenticatedEventStream {
  readonly readyState: number;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 2;

type EventListener = (event: MessageEvent<string>) => void;

function parseEventBlock(block: string): { type: string; data: string } | null {
  let type = 'message';
  const data: string[] = [];

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'event' && value) {
      type = value;
      continue;
    }

    if (field === 'data') {
      data.push(value);
    }
  }

  if (data.length === 0) {
    return null;
  }

  return { type, data: data.join('\n') };
}

function consumeBuffer(
  buffer: string,
  dispatch: (type: string, data: string) => void,
  flushAll: boolean,
): string {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  const pending = flushAll ? '' : blocks.pop() ?? '';

  for (const block of blocks) {
    const parsed = parseEventBlock(block);
    if (parsed) {
      dispatch(parsed.type, parsed.data);
    }
  }

  if (flushAll && pending) {
    const parsed = parseEventBlock(pending);
    if (parsed) {
      dispatch(parsed.type, parsed.data);
    }
  }

  return pending;
}

export function connectAuthenticatedEventStream(url: string): AuthenticatedEventStream {
  const controller = new AbortController();
  const listeners = new Map<string, Set<EventListener>>();
  let readyState = CONNECTING;
  let closed = false;

  const dispatch = (type: string, data = '') => {
    const event = new MessageEvent<string>(type, { data });
    const handlers = listeners.get(type);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(event);
    }
  };

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    readyState = CLOSED;
    controller.abort();
  };

  const stream: AuthenticatedEventStream = {
    get readyState() {
      return readyState;
    },
    addEventListener(type, listener) {
      const handlers = listeners.get(type) ?? new Set<EventListener>();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }
      handlers.delete(listener);
      if (handlers.size === 0) {
        listeners.delete(type);
      }
    },
    close,
  };

  void (async () => {
    try {
      const response = await fetchWithAuth(url, {
        headers: { Accept: 'text/event-stream' },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Stream request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Stream response body is unavailable');
      }

      if (closed) {
        return;
      }

      readyState = OPEN;
      dispatch('open');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!closed) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = consumeBuffer(buffer, dispatch, false);
      }

      if (!closed) {
        buffer += decoder.decode();
        consumeBuffer(buffer, dispatch, true);
        close();
      }
    } catch (error) {
      if (closed || controller.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Stream connection lost';
      dispatch('error', message);
      close();
    }
  })();

  return stream;
}

export const AUTHENTICATED_EVENT_STREAM_CLOSED = CLOSED;
