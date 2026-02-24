/**
 * File: button.test.tsx
 * Purpose: Unit tests for Button component
 * Phase 6: Testing Framework Setup
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"
import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
  })

  it("handles click events", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("has correct ARIA attributes", () => {
    render(<Button aria-label="Close dialog">&times;</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Close dialog")
  })

  it("applies variant classes correctly", () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole("button")).toHaveClass("bg-destructive")

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole("button")).toHaveClass("border")
  })
})
