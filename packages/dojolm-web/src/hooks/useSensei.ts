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
  SenseiToolCall,
  SenseiStreamEvent,
} from '@/lib/sensei'
import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_MESSAGES = 'sensei-messages'
const STORAGE_KEY_MODEL = 'sensei-model'
const MAX_STORED_MESSAGES = 100
const API_ENDPOINT = '/api/sensei/chat'

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadMessages(): readonly SenseiMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // CR-2: Validate fields and strip untrusted toolResults/toolCalls from localStorage
    return parsed
      .filter(
        (m: unknown) =>
          typeof m === 'object' &&
          m !== null &&
          typeof (m as Record<string, unknown>).id === 'string' &&
          typeof (m as Record<string, unknown>).role === 'string' &&
          ['user', 'assistant'].includes((m as Record<string, unknown>).role as string) &&
          typeof (m as Record<string, unknown>).content === 'string',
      )
      .map((m: Record<string, unknown>) => ({
        id: String(m.id),
        role: m.role as SenseiMessage['role'],
        content: String(m.content),
        timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
      })) as SenseiMessage[]
  } catch {
    return []
  }
}

function saveMessages(messages: readonly SenseiMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    const capped = messages.length > MAX_STORED_MESSAGES
      ? messages.slice(messages.length - MAX_STORED_MESSAGES)
      : messages
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(capped))
  } catch {
    // QuotaExceededError — ignore
  }
}

function loadModelId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY_MODEL)
  } catch {
    return null
  }
}

function saveModelId(modelId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_MODEL, modelId)
  } catch {
    // ignore
  }
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
    handledNavigationIds.current.clear()
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(STORAGE_KEY_MESSAGES) } catch { /* ignore */ }
    }
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
        )
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
        )
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
        )
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [pendingConfirmations, selectedModelId, activeModule],
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

  const VALID_NAV_IDS = useRef(new Set([
    'dashboard', 'scanner', 'armory', 'llm', 'guard', 'compliance',
    'adversarial', 'strategic', 'ronin-hub', 'sengoku', 'kotoba', 'admin',
  ]))
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
        const module = (result.data as Record<string, unknown>).module
        if (typeof module === 'string' && VALID_NAV_IDS.current.has(module)) {
          handledNavigationIds.current.add(result.toolCallId)
          onNavigateRef.current?.(module as NavId)
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
    sendMessage,
    confirmToolCall,
    rejectToolCall,
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

    const errorMessage: SenseiMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: errMsg,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, errorMessage])
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
            assistantContent += `\n\n**Error:** ${event.message}`
            break

          case 'done':
            // Stream complete
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
}
