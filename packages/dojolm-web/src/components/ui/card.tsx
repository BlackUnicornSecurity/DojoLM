/**
 * File: card.tsx
 * Purpose: Card components with glassmorphic hover effects
 * Story: TPI-UI-001-07
 * Index:
 * - Card component (line 11)
 * - CardHeader component (line 29)
 * - CardTitle component (line 41)
 * - CardDescription component (line 56)
 * - CardContent component (line 68)
 * - CardFooter component (line 76)
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Train 1 PR-3 rewrite (2026-04-09):
 * - rounded-xl → rounded-lg (per BUCC-mem0 scale)
 * - Dropped dead `surface-base` class (utility deleted in PR-1)
 * - Dropped `surface-interactive/-hero/-alert` dead classes (variants kept for
 *   API back-compat but now visually identical — variant-specific tinting
 *   can be reintroduced later via Tailwind arbitrary values if needed)
 * - Collapsed multi-property motion-safe stack to simple `transition-colors`
 *   (card lift effect preserved via motion-safe:hover:-translate-y-1)
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'glass' | 'interactive' | 'hero' | 'alert' }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-[var(--border-subtle)] bg-card text-card-foreground shadow-[var(--shadow-card)] card-gradient backdrop-blur-sm",
      "transition-colors duration-[var(--transition-normal)]",
      "motion-safe:hover:border-[var(--overlay-hover)] motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[var(--shadow-card-hover)]",
      variant === 'glass' && "glass-card",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Train 1 PR-3: .text-card-title custom utility deleted, migrated to Tailwind
      "text-xl font-semibold tracking-tight text-[var(--foreground)]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
