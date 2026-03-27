import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchWithAuth = vi.fn();

vi.mock('../fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}));

import {
  AUTHENTICATED_EVENT_STREAM_CLOSED,
  connectAuthenticatedEventStream,
} from '../authenticated-event-stream';

function makeStreamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function waitForEvent(
  stream: ReturnType<typeof connectAuthenticatedEventStream>,
  type: string,
): Promise<MessageEvent<string>> {
  return new Promise((resolve) => {
    const listener = (event: MessageEvent<string>) => {
      stream.removeEventListener(type, listener);
      resolve(event);
    };
    stream.addEventListener(type, listener);
  });
}

describe('connectAuthenticatedEventStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses named and default SSE events over authenticated fetch', async () => {
    mockFetchWithAuth.mockResolvedValue(
      makeStreamResponse([
        'event: progress\n',
        'data: {"completedTests":1}\n\n',
        'data: {"phase":"complete"}\n\n',
      ]),
    );

    const stream = connectAuthenticatedEventStream('/api/arena/test/stream');
    const openPromise = waitForEvent(stream, 'open');
    const progressPromise = waitForEvent(stream, 'progress');
    const messagePromise = waitForEvent(stream, 'message');

    await expect(openPromise).resolves.toBeInstanceOf(MessageEvent);
    await expect(progressPromise).resolves.toMatchObject({ data: '{"completedTests":1}' });
    await expect(messagePromise).resolves.toMatchObject({ data: '{"phase":"complete"}' });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/arena/test/stream', expect.objectContaining({
      cache: 'no-store',
      headers: { Accept: 'text/event-stream' },
      signal: expect.any(AbortSignal),
    }));
    expect(stream.readyState).toBe(AUTHENTICATED_EVENT_STREAM_CLOSED);
  });

  it('emits an error event when the authenticated stream request fails', async () => {
    mockFetchWithAuth.mockResolvedValue(
      new Response('Authentication required', { status: 401 }),
    );

    const stream = connectAuthenticatedEventStream('/api/arena/test/stream');
    const errorEvent = await waitForEvent(stream, 'error');

    expect(errorEvent.data).toContain('Authentication required');
    expect(stream.readyState).toBe(AUTHENTICATED_EVENT_STREAM_CLOSED);
  });
});
