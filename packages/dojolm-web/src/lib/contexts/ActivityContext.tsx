/**
 * File: ActivityContext.tsx
 * Purpose: Split activity contexts - ActivityStateContext (read-only) + ActivityDispatchContext (dispatch)
 * Story: TPI-UIP-08
 * Index:
 * - EventType type (line 16)
 * - ActivityEvent interface (line 18)
 * - ActivityState interface (line 28)
 * - VALID_EVENT_TYPES (line 33)
 * - isStaticDescription validator (line 40)
 * - activityReducer (line 55)
 * - loadFromStorage (line 100)
 * - ActivityProvider component (line 138)
 * - useActivityState hook (line 170)
 * - useActivityDispatch hook (line 178)
 * - useActivityLogger hook (line 186)
 */

'use client'

import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react'

export type EventType = 'scan_complete' | 'threat_detected' | 'test_passed' | 'test_failed' | 'model_added'

export interface ActivityEvent {
  id: string
  type: EventType
  description: string
  timestamp: string
  read: boolean
}

export interface ActivityState {
  events: ActivityEvent[]
}

const MAX_EVENTS = 50
const STORAGE_KEY = 'dojolm-activity-events'

const VALID_EVENT_TYPES = new Set<string>(['scan_complete', 'threat_detected', 'test_passed', 'test_failed', 'model_added'])

/**
 * Validate that an event description is a static template with numeric values only.
 * HARD RULE: Descriptions must NOT contain user-supplied input text.
 * Uses strict allowlist: only alphanumeric, spaces, common punctuation.
 * Valid: "Scan completed: BLOCK verdict, 3 findings"
 * Invalid: "<script>alert(1)</script>"
 */
export function isStaticDescription(description: string): boolean {
  if (!description || description.length === 0) return false
  if (description.length > 200) return false
  // Strict allowlist: only safe characters for static descriptions
  return /^[a-zA-Z0-9 :,.!%()\\/\-]+$/.test(description)
}

type ActivityAction =
  | { type: 'ADD_EVENT'; payload: Omit<ActivityEvent, 'id' | 'read'> }
  | { type: 'MARK_ALL_READ' }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'UNDO_MARK_ALL_READ'; payload: ActivityEvent[] }
  | { type: 'HYDRATE'; payload: ActivityEvent[] }

function activityReducer(state: ActivityState, action: ActivityAction): ActivityState {
  switch (action.type) {
    case 'ADD_EVENT': {
      if (!isStaticDescription(action.payload.description)) {
        return state
      }
      const newEvent: ActivityEvent = {
        id: crypto.randomUUID(),
        ...action.payload,
        read: false,
      }
      const events = [newEvent, ...state.events].slice(0, MAX_EVENTS)
      return { events }
    }
    case 'MARK_ALL_READ': {
      return {
        events: state.events.map(e => e.read ? e : { ...e, read: true }),
      }
    }
    case 'MARK_READ': {
      return {
        events: state.events.map(e =>
          e.id === action.payload ? { ...e, read: true } : e
        ),
      }
    }
    case 'UNDO_MARK_ALL_READ': {
      return { events: action.payload }
    }
    case 'HYDRATE': {
      return { events: action.payload }
    }
    default:
      return state
  }
}

const ActivityStateContext = createContext<ActivityState | undefined>(undefined)
const ActivityDispatchContext = createContext<React.Dispatch<ActivityAction> | undefined>(undefined)

const INITIAL_STATE: ActivityState = { events: [] }

/**
 * Safely read from sessionStorage with try-catch for QuotaExceededError and private browsing.
 * Validates type, description, and structure of each stored event.
 */
function loadFromStorage(): ActivityEvent[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e: unknown): e is ActivityEvent => {
        if (typeof e !== 'object' || e === null) return false
        const evt = e as Record<string, unknown>
        return (
          typeof evt.id === 'string' &&
          typeof evt.type === 'string' &&
          VALID_EVENT_TYPES.has(evt.type) &&
          typeof evt.description === 'string' &&
          isStaticDescription(evt.description) &&
          typeof evt.timestamp === 'string' &&
          typeof evt.read === 'boolean'
        )
      }
    )
  } catch {
    return []
  }
}

/**
 * Safely write to sessionStorage with try-catch.
 */
function saveToStorage(events: ActivityEvent[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // QuotaExceededError or private browsing — silently degrade
  }
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(activityReducer, INITIAL_STATE)
  const hydratedRef = useRef(false)

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored.length > 0) {
      dispatch({ type: 'HYDRATE', payload: stored })
    }
    hydratedRef.current = true
  }, [])

  // Persist to sessionStorage on state change — skip until hydrated
  useEffect(() => {
    if (!hydratedRef.current) return
    saveToStorage(state.events)
  }, [state.events])

  return (
    <ActivityStateContext.Provider value={state}>
      <ActivityDispatchContext.Provider value={dispatch}>
        {children}
      </ActivityDispatchContext.Provider>
    </ActivityStateContext.Provider>
  )
}

export function useActivityState(): ActivityState {
  const context = useContext(ActivityStateContext)
  if (!context) {
    throw new Error('useActivityState must be used within ActivityProvider')
  }
  return context
}

export function useActivityDispatch(): React.Dispatch<ActivityAction> {
  const context = useContext(ActivityDispatchContext)
  if (!context) {
    throw new Error('useActivityDispatch must be used within ActivityProvider')
  }
  return context
}

/**
 * Convenience hook for dispatching activity events.
 * Use this from scanner, test runner, etc. — only dispatch context is consumed,
 * so parent re-renders are avoided.
 */
export function useActivityLogger() {
  const dispatch = useActivityDispatch()

  const logEvent = useCallback((type: EventType, description: string) => {
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        type,
        description,
        timestamp: new Date().toISOString(),
      },
    })
  }, [dispatch])

  return { logEvent }
}

export type { ActivityAction }
