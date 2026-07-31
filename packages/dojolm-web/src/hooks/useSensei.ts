// SPDX-License-Identifier: Apache-2.0
/**
 * File: useSensei.ts
 * Purpose: Core hook for Sensei AI assistant — state, SSE streaming, confirmations, localStorage persistence
 * Story: SH6.1
 * Index:
 * - Constants (line 14)
 * - useSensei hook (line 30)
 * - parseSseStream helper (line 170)
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type {
  SenseiMessage,
  SenseiMessageFooter,
  SenseiToolCall,
  SenseiStreamEvent,
} from '@/lib/sensei'
import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Derive from NAV_ITEMS to stay in sync — never hardcode NavIds here.
import { NAV_ITEMS } from '@/lib/constants'
const VALID_NAV_IDS = new Set<string>(NAV_ITEMS.map(item => item.id))

import { senseiMessagesStore, senseiModelStore } from '@/lib/stores'
import type { SenseiMessageStored } from '@/lib/stores'

const MAX_STORED_MESSAGES = 100
const API_ENDPOINT = '/api/sensei/chat'

// E4.S1: detect user-initiated AbortController aborts so the hook can swallow
// them without surfacing the error to the chat surface.
function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.message === 'The user aborted a request.')
  )
}

// ---------------------------------------------------------------------------
// Storage helpers (delegate to typed stores)
// ---------------------------------------------------------------------------

function loadMessages(): readonly SenseiMessage[] {
  // CR-2: Store schema already validates id/role/content/timestamp and strips
  // toolResults/toolCalls (those fields are not in SenseiMessageStored).
  return senseiMessagesStore.get().map((m: SenseiMessageStored) => ({
    id: m.id,
    role: m.role as SenseiMessage['role'],
    content: m.content,
    timestamp: m.timestamp,
  }))
}

function saveMessages(messages: readonly SenseiMessage[]): void {
  const capped = messages.length > MAX_STORED_MESSAGES
    ? messages.slice(messages.length - MAX_STORED_MESSAGES)
    : messages
  // Strip toolCalls/toolResults before persisting (only save serialisable fields)
  senseiMessagesStore.set(
    capped.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, timestamp: m.timestamp }))
  )
}

function loadModelId(): string | null {
  return senseiModelStore.get()
}

function saveModelId(modelId: string): void {
  senseiModelStore.set(modelId)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSensei(activeModule: NavId, onNavigate?: (module: NavId) => void) {
  const [messages, setMessages] = useState<readonly SenseiMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null)
  const [pendingConfirmations, setPendingConfirmations] = useState<readonly SenseiToolCall[]>([])
  // E4.S1: track whether the most recent stream was user-aborted so the chat
  // UI can render a "Stopped" footer next to the partial response.
  const [wasStopped, setWasStopped] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const hydratedRef = useRef(false)
  // CR-1: Ref to avoid stale closure on messages in sendMessage/confirm/reject
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const stored = loadMessages()
    if (stored.length > 0) setMessages(stored)
    const storedModel = loadModelId()
    if (storedModel) setSelectedModelIdState(storedModel)
  }, [])

  // Listen for sensei-toggle custom event (from Sidebar button, SH8.1)
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener('sensei-toggle', handleToggle)
    return () => window.removeEventListener('sensei-toggle', handleToggle)
  }, [])

  // Persist messages when they change (skip hydration cycle)
  useEffect(() => {
    if (!hydratedRef.current) return
    saveMessages(messages)
  }, [messages])

  const setSelectedModelId = useCallback((modelId: string) => {
    setSelectedModelIdState(modelId)
    saveModelId(modelId)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const clearHistory = useCallback(() => {
    setMessages([])
    setPendingConfirmations([])
    setWasStopped(false)
    handledNavigationIds.current.clear()
    senseiMessagesStore.remove()
  }, [])

  // E4.S1: user-initiated stop. Aborts the in-flight fetch (which causes the
  // streamChat reader loop to exit) and flags the conversation so the chat
  // surface can render a "Stopped" footer beneath the partial response.
  const stopStreaming = useCallback(() => {
    if (!abortRef.current) return
    abortRef.current.abort()
    // Don't null abortRef or setIsLoading(false) here — the in-flight
    // sendMessage's `finally` block owns that lifecycle. Clearing them
    // prematurely creates a race when a rapid second send installs its
    // own controller between this call and the finally. Just signal
    // the abort + flag wasStopped; the reader loop will terminate via
    // AbortError → caught by isAbortError → finally cleans up.
    setWasStopped(true)
  }, [])

  // F-R3-02: Error state for missing model feedback
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      // F-R3-02: Show error when no model is selected instead of silently dropping
      if (!selectedModelId) {
        setError('Please select a model before sending a message.')
        return
      }

      setError(null)
      // E4.S1: a fresh send clears any prior "Stopped" footer.
      setWasStopped(false)

      // Abort any pending request
      if (abortRef.current) abortRef.current.abort()

      const userMessage: SenseiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      }

      // CR-1: Use ref to avoid stale closure
      const updatedMessages = [...messagesRef.current, userMessage]
      setMessages(updatedMessages)
      setIsLoading(true)
      setPendingConfirmations([])

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        await streamChat(
          updatedMessages,
          selectedModelId,
          activeModule,
          null,
          abortController.signal,
          setMessages,
          setPendingConfirmations,
          setError,
        )
      } catch (err) {
        // E4.S1: swallow user-initiated aborts; other errors are already
        // surfaced by streamChat as in-conversation error messages.
        if (!isAbortError(err)) throw err
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [selectedModelId, activeModule],
  )

  const confirmToolCall = useCallback(
    async (callId: string) => {
      const call = pendingConfirmations.find((c) => c.id === callId)
      if (!call || !selectedModelId) return

      setPendingConfirmations((prev) => prev.filter((c) => c.id !== callId))
      setIsLoading(true)

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        // CR-1: Use ref to avoid stale closure
        await streamChat(
          messagesRef.current,
          selectedModelId,
          activeModule,
          [{ callId: call.id, confirmed: true, tool: call.tool, args: call.args as Record<string, unknown> }],
          abortController.signal,
          setMessages,
          setPendingConfirmations,
          setError,
        )
      } catch (err) {
        if (!isAbortError(err)) throw err
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [pendingConfirmations, selectedModelId, activeModule],
  )

  const rejectToolCall = useCallback(
    async (callId: string) => {
      const call = pendingConfirmations.find((c) => c.id === callId)
      if (!call || !selectedModelId) return

      setPendingConfirmations((prev) => prev.filter((c) => c.id !== callId))
      setIsLoading(true)

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        // CR-1: Use ref to avoid stale closure
        await streamChat(
          messagesRef.current,
          selectedModelId,
          activeModule,
          [{ callId: call.id, confirmed: false, tool: call.tool }],
          abortController.signal,
          setMessages,
          setPendingConfirmations,
          setError,
        )
      } catch (err) {
        if (!isAbortError(err)) throw err
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [pendingConfirmations, selectedModelId, activeModule],
  )

  /**
   * E4.S7 — regenerate a response.
   *
   * Find the assistant message by id, walk back to the most recent prior
   * user message, drop the assistant message (and any subsequent messages
   * — there shouldn't be any in normal flows but a stale tail would
   * desynchronize the conversation), then re-send the prior user prompt.
   *
   * No-op when:
   * - the assistant message id is not found,
   * - there is no prior user message (orphan assistant bubble),
   * - a stream is already in flight (caller's UI also gates this).
   */
  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (isLoading) return
      const current = messagesRef.current
      const assistantIdx = current.findIndex((m) => m.id === assistantMessageId)
      if (assistantIdx < 0) return
      if (current[assistantIdx].role !== 'assistant') return

      // Walk back to find the most recent user message.
      let userIdx = -1
      for (let i = assistantIdx - 1; i >= 0; i--) {
        if (current[i].role === 'user') {
          userIdx = i
          break
        }
      }
      if (userIdx < 0) return
      const userText = current[userIdx].content

      // Drop the assistant message (and any tail). Also drop the prior
      // user message — sendMessage will re-append it. Without trimming
      // the user message, the conversation history sent to the server
      // would contain the same prompt twice.
      const truncated = current.slice(0, userIdx)
      setMessages(truncated)
      // Sync the ref synchronously so sendMessage (called below) reads
      // the truncated list rather than waiting on the messagesRef-sync
      // effect, which only fires after the next render commit.
      messagesRef.current = truncated
      setPendingConfirmations([])
      setWasStopped(false)

      // Defer to sendMessage so all the loading / abort / streaming
      // bookkeeping stays in one place.
      await sendMessage(userText)
    },
    [isLoading, sendMessage],
  )

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  // Process navigate_to tool results — dispatch navigation when detected
  const onNavigateRef = useRef(onNavigate)
  useEffect(() => { onNavigateRef.current = onNavigate }, [onNavigate])

  const handledNavigationIds = useRef(new Set<string>())

  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== 'assistant' || !lastMsg.toolResults) return

    for (const result of lastMsg.toolResults) {
      if (
        result.tool === 'navigate_to' &&
        result.success &&
        !handledNavigationIds.current.has(result.toolCallId) &&
        typeof result.data === 'object' &&
        result.data !== null &&
        (result.data as Record<string, unknown>).action === 'navigate'
      ) {
        const moduleName = (result.data as Record<string, unknown>).module
        if (typeof moduleName === 'string' && VALID_NAV_IDS.has(moduleName)) {
          handledNavigationIds.current.add(result.toolCallId)
          onNavigateRef.current?.(moduleName as NavId)
        }
      }
    }
  }, [messages])

  return {
    messages,
    isOpen,
    isLoading,
    selectedModelId,
    pendingConfirmations,
    error,
    wasStopped,
    sendMessage,
    confirmToolCall,
    rejectToolCall,
    regenerate,
    stopStreaming,
    setSelectedModelId,
    toggle,
    open,
    close,
    clearHistory,
    clearError,
  } as const
}

// ---------------------------------------------------------------------------
// SSE Stream Handler
// ---------------------------------------------------------------------------

async function streamChat(
  currentMessages: readonly SenseiMessage[],
  modelId: string,
  activeModule: NavId,
  confirmations: readonly { callId: string; confirmed: boolean; tool?: string; args?: Record<string, unknown> }[] | null,
  signal: AbortSignal,
  setMessages: React.Dispatch<React.SetStateAction<readonly SenseiMessage[]>>,
  setPendingConfirmations: React.Dispatch<React.SetStateAction<readonly SenseiToolCall[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
): Promise<void> {
  const apiMessages = currentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const response = await fetchWithAuth(API_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      modelId,
      messages: apiMessages,
      context: { activeModule },
      ...(confirmations ? { confirmations } : {}),
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Request failed')
    let errMsg = `Error: ${response.status}`
    try {
      const errJson: unknown = JSON.parse(errText)
      if (typeof errJson === 'object' && errJson !== null && typeof (errJson as Record<string, unknown>).error === 'string') {
        errMsg = (errJson as Record<string, unknown>).error as string
      }
    } catch {
      errMsg = errText.slice(0, 200)
    }

    // E4.S3 / F-7-003: Route HTTP failures (e.g., server 500) to the error
    // banner instead of injecting them as assistant-content messages.
    setError(errMsg)
    return
  }

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let assistantContent = ''
  const toolCalls: SenseiToolCall[] = []
  const toolResults: { toolCallId: string; tool: string; success: boolean; data: unknown; error?: string; durationMs: number }[] = []
  const pendingConfs: SenseiToolCall[] = []
  // E4.S5: footer metadata captured on the SSE `done` event. Stamped onto
  // the assistant message so <FooterChip /> can render the model + duration
  // + token count beneath the bubble.
  let footer: SenseiMessageFooter | undefined
  // E4.S4: capture doneReason + token caps from the SSE `done` event so we
  // can branch on empty completion vs context overflow once the stream has
  // closed. Stored at this scope (not assistant-message scope) because the
  // banner copy is decided post-stream.
  let doneReason: 'stop' | 'length' | 'load' | 'error' | undefined
  let donePromptTokens: number | undefined
  let doneMaxContextTokens: number | undefined

  const assistantId = crypto.randomUUID()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr) continue

        let event: SenseiStreamEvent
        try {
          event = JSON.parse(jsonStr) as SenseiStreamEvent
        } catch {
          continue
        }

        switch (event.type) {
          case 'text':
            assistantContent += event.content
            break

          case 'tool_call':
            toolCalls.push({
              id: event.callId,
              tool: event.tool,
              args: event.args,
              status: 'pending',
            })
            break

          case 'tool_result':
            toolResults.push({
              toolCallId: event.callId,
              tool: event.tool,
              success: event.result.success,
              data: event.result.data,
              error: event.result.error,
              durationMs: event.result.durationMs,
            })
            break

          case 'confirmation_needed':
            pendingConfs.push({
              id: event.callId,
              tool: event.tool,
              args: event.args,
              status: 'pending',
            })
            break

          case 'error':
            // E4.S3 / F-7-003: Route stream errors to error banner instead of
            // prefixing assistant content with `**Error:**`. Terminate the
            // reader loop here — server may still emit chunks after the
            // error event, but they would compose with the banner into
            // dual UI output (assistant message + banner). Single signal
            // wins: error banner, no assistant render.
            setError(event.message)
            return

          case 'done':
            // E4.S5: capture cost/latency footer so the assistant bubble
            // can render <FooterChip />. Tokens prefer `totalTokens`, but
            // fall back to `completionTokens` if the provider didn't sum.
            if (event.model && typeof event.durationMs === 'number') {
              const usage = event.usage
              const tokens = usage
                ? (usage.totalTokens || usage.completionTokens || 0)
                : 0
              footer = {
                model: event.model,
                durationMs: event.durationMs,
                tokens,
              }
            }
            // E4.S4: latch doneReason + token counts so we can decide the
            // post-stream banner copy (empty vs context-overflow).
            if (event.doneReason) {
              doneReason = event.doneReason
            }
            if (event.usage) {
              donePromptTokens = event.usage.promptTokens
            }
            if (typeof event.maxContextTokens === 'number') {
              doneMaxContextTokens = event.maxContextTokens
            }
            break
        }

        // Update assistant message incrementally
        const assistantMsg: SenseiMessage = {
          id: assistantId,
          role: 'assistant',
          content: assistantContent,
          toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
          toolResults: toolResults.length > 0 ? [...toolResults] : undefined,
          timestamp: Date.now(),
          ...(footer ? { footer } : {}),
        }

        setMessages((prev) => {
          const existing = prev.findIndex((m) => m.id === assistantId)
          if (existing >= 0) {
            return [...prev.slice(0, existing), assistantMsg, ...prev.slice(existing + 1)]
          }
          return [...prev, assistantMsg]
        })
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Set pending confirmations
  if (pendingConfs.length > 0) {
    setPendingConfirmations(pendingConfs)
  }

  // E4.S4 / F-7-004: branch on doneReason once the stream has closed.
  //   - `length` + empty content   → empty-completion banner
  //   - `length` + non-empty content → context-overflow banner
  // Other reasons (`stop`, `load`, `error`) leave error state alone.
  if (doneReason === 'length') {
    if (assistantContent.length === 0) {
      setError(EMPTY_OUTPUT_BANNER)
    } else {
      setError(buildContextOverflowBanner(donePromptTokens, doneMaxContextTokens))
    }
  }
}

// ---------------------------------------------------------------------------
// E4.S4 — banner copy for empty / overflow completions
// ---------------------------------------------------------------------------

const EMPTY_OUTPUT_BANNER =
  'Model returned no output. Try a different model or rephrase.'

function buildContextOverflowBanner(
  promptTokens: number | undefined,
  maxContextTokens: number | undefined,
): string {
  // Both numbers known → "Prompt too long for this model (X tokens, Y max).
  // Trim or switch to a higher-context model."
  if (
    typeof promptTokens === 'number' && promptTokens > 0
    && typeof maxContextTokens === 'number' && maxContextTokens > 0
  ) {
    return (
      `Prompt too long for this model (${promptTokens} tokens, `
      + `${maxContextTokens} max). Trim or switch to a higher-context model.`
    )
  }
  // One or both unknown → drop the parens and keep the actionable verb.
  return 'Prompt too long for this model. Trim or switch to a higher-context model.'
}
