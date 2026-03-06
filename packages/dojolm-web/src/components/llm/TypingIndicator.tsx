/**
 * File: TypingIndicator.tsx
 * Purpose: Animated typing indicator for LLM response loading state
 * Story: TPI-UI-001-22
 * Index:
 * - TypingIndicator component (line 9)
 */

export function TypingIndicator() {
  return (
    <div role="status" aria-label="Assistant is typing" className="flex items-center gap-1 px-4 py-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)] w-fit">
      <span aria-hidden="true" className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
      <span aria-hidden="true" className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
      <span aria-hidden="true" className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce motion-reduce:animate-none" />
    </div>
  )
}
