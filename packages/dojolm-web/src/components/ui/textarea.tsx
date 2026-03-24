/**
 * File: textarea.tsx
 * Purpose: Textarea component with accessibility improvements
 * Phase 6: Enhanced ARIA support and focus management
 */

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, label, description, error, id, ...props }, ref) => {
  const generatedId = React.useId()
  const textareaId = id ?? generatedId
  const descriptionId = description ? `${textareaId}-description` : undefined
  const errorId = error ? `${textareaId}-error` : undefined

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        ref={ref}
        aria-describedby={cn(descriptionId, errorId)}
        aria-invalid={!!error}
        {...props}
      />
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
