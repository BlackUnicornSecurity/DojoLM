/**
 * File: badge.tsx
 * Purpose: Badge component with severity, status, and strike variants
 * Story: TPI-UI-001-17
 * Index:
 * - badgeVariants (line 14)
 * - BadgeProps interface (line 53)
 * - Badge component (line 61)
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-[var(--border)]",
        // Severity variants (all using design tokens)
        critical: "border-transparent bg-[var(--danger)] text-white",
        high: "border-transparent bg-[var(--severity-high)] text-white",
        medium: "border-transparent bg-[var(--warning)] text-[var(--background)]",
        low: "border-transparent bg-[var(--severity-low)] text-white",
        info: "border-transparent bg-[var(--bg-quaternary)] text-[var(--muted-foreground)]",
        // Status variants
        success: "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
        warning: "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
        error: "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
        pending: "border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--muted-foreground)]",
        active: "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]",
        // Strike variant (DojoLM branding - decisive strike on bypass)
        strike: "border-transparent bg-gradient-to-r from-[var(--dojo-primary)] to-[var(--dojo-primary-lg)] text-white font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  dot?: boolean
}

function Badge({ className, variant, icon, dot, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      aria-label={props['aria-label'] ?? (typeof children === 'string' ? undefined : (variant ?? undefined))}
      {...props}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      )}
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
