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

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'glass' | 'interactive' | 'hero' | 'alert' }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-[var(--border-subtle)] bg-card text-card-foreground shadow-[var(--shadow-card)] card-gradient surface-base",
      "motion-safe:transition-[border-color,transform,box-shadow] motion-safe:duration-[var(--transition-normal)]",
      "motion-safe:hover:border-[var(--overlay-hover)] motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[var(--shadow-card-hover)] backdrop-blur-sm",
      variant === 'interactive' && "surface-interactive",
      variant === 'hero' && "surface-hero",
      variant === 'alert' && "surface-alert",
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
      "text-card-title text-[var(--foreground)]",
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
