/**
 * File: skeleton.tsx
 * Purpose: Skeleton component for loading states
 * Phase 6: File header added for documentation compliance
 * Index:
 * - Skeleton component (line 7)
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
