/**
 * File: utils.test.ts
 * Purpose: Unit tests for utility functions
 * Phase 6: Testing Framework Setup
 */

import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn utility", () => {
  it("merges class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2")
  })

  it("handles conditional classes", () => {
    expect(cn("class1", false && "class2", "class3")).toBe("class1 class3")
  })

  it("handles Tailwind conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2")
  })

  it("handles empty input", () => {
    expect(cn()).toBe("")
  })
})
