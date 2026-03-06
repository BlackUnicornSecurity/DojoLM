/**
 * File: button.tsx
 * Purpose: Button component with gradient styling and accessibility
 * Story: TPI-UI-001-06
 * Index:
 * - buttonVariants (line 13)
 * - ButtonProps interface (line 53)
 * - Button component (line 59)
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[44px]",
  {
    variants: {
      variant: {
        default: cn(
          "bg-[var(--border-subtle)] border border-[var(--border-hover)] text-[var(--foreground)]",
          "hover:bg-[var(--overlay-active)] hover:border-[var(--border-hover)]",
          "active:scale-[0.98]",
          "motion-safe:transition-all duration-[var(--transition-fast)]"
        ),
        gradient: cn(
          "bg-gradient-to-br from-[var(--dojo-primary)] to-[var(--dojo-hover)] text-white",
          "hover:-translate-y-px hover:shadow-md",
          "active:scale-[0.98]",
          "motion-safe:transition-all duration-[var(--transition-fast)]"
        ),
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors",
        ghost: "hover:bg-accent hover:text-accent-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline transition-colors",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10 min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
