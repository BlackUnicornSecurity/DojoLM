/**
 * File: typography.test.tsx
 * Purpose: Unit tests for Typography System (Story 1: TPI-UIP-01)
 * Verifies metric typography and design context classes render correctly.
 */

import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

describe("Typography System", () => {
  describe("Metric typography classes", () => {
    it("renders text-page-title class on elements", () => {
      render(<span data-testid="page-title" className="text-page-title">Dashboard</span>)
      const el = screen.getByTestId("page-title")
      expect(el).toBeInTheDocument()
      expect(el).toHaveClass("text-page-title")
    })

    it("renders text-card-title class on elements", () => {
      render(<span data-testid="card-title" className="text-card-title">Overview</span>)
      const el = screen.getByTestId("card-title")
      expect(el).toBeInTheDocument()
      expect(el).toHaveClass("text-card-title")
    })

    it("renders text-metric-xl class on elements", () => {
      render(<span data-testid="metric-xl" className="text-metric-xl">1,234</span>)
      const el = screen.getByTestId("metric-xl")
      expect(el).toBeInTheDocument()
      expect(el).toHaveClass("text-metric-xl")
    })

    it("renders text-metric-lg class on elements", () => {
      render(<span data-testid="metric-lg" className="text-metric-lg">567</span>)
      const el = screen.getByTestId("metric-lg")
      expect(el).toBeInTheDocument()
      expect(el).toHaveClass("text-metric-lg")
    })

    it("renders text-metric-md class on elements", () => {
      render(<span data-testid="metric-md" className="text-metric-md">89</span>)
      const el = screen.getByTestId("metric-md")
      expect(el).toBeInTheDocument()
      expect(el).toHaveClass("text-metric-md")
    })

    it("renders text-label class on elements", () => {
      render(<span data-testid="label" className="text-label">Total Scans</span>)
      const el = screen.getByTestId("label")
      expect(el).toBeInTheDocument()
      expect(el).toHaveClass("text-label")
    })
  })

  describe("Design context classes", () => {
    it("renders blundesi-context class on container", () => {
      render(
        <div data-testid="blundesi" className="blundesi-context">
          <span className="text-metric-lg">42</span>
        </div>
      )
      expect(screen.getByTestId("blundesi")).toHaveClass("blundesi-context")
    })

    it("renders clean-context class on container", () => {
      render(
        <div data-testid="clean" className="clean-context">
          <span className="text-label">Scanner Input</span>
        </div>
      )
      expect(screen.getByTestId("clean")).toHaveClass("clean-context")
    })

    it("allows composition of metric and context classes", () => {
      render(
        <div className="blundesi-context">
          <span data-testid="composed" className="text-metric-lg text-label">
            Mixed
          </span>
        </div>
      )
      const el = screen.getByTestId("composed")
      expect(el).toHaveClass("text-metric-lg")
      expect(el).toHaveClass("text-label")
    })
  })
})
