/**
 * File: metric-card.test.tsx
 * Purpose: Unit tests for MetricCard Enhancement (Story 2: TPI-UIP-02)
 * Tests: rendering, icon prop, typography classes, sparkline SVG, trend indicator
 */

import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { MetricCard } from "@/components/ui/MetricCard"
import { ScanLine, ShieldAlert, CheckCircle, Cpu } from "lucide-react"

describe("MetricCard", () => {
  describe("Basic rendering", () => {
    it("renders label and value", () => {
      render(<MetricCard label="Total Scans" value={42} />)
      expect(screen.getByText("Total Scans")).toBeInTheDocument()
      expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("renders string values correctly", () => {
      render(<MetricCard label="Pass Rate" value="95%" />)
      expect(screen.getByText("95%")).toBeInTheDocument()
    })

    it("formats number values with toLocaleString", () => {
      render(<MetricCard label="Count" value={1234} />)
      expect(screen.getByText("1,234")).toBeInTheDocument()
    })
  })

  describe("Typography classes", () => {
    it("uses text-label class for label", () => {
      render(<MetricCard label="Total Scans" value={0} />)
      const label = screen.getByText("Total Scans")
      expect(label).toHaveClass("text-label")
    })

    it("uses text-metric-lg class for value", () => {
      render(<MetricCard label="Count" value={99} />)
      const value = screen.getByText("99")
      expect(value).toHaveClass("text-metric-lg")
    })
  })

  describe("Icon prop", () => {
    it("renders icon when provided", () => {
      const { container } = render(
        <MetricCard label="Scans" value={0} icon={ScanLine} />
      )
      // Icon SVG should be rendered with aria-hidden
      const icon = container.querySelector("svg[aria-hidden='true']")
      expect(icon).toBeInTheDocument()
    })

    it("does not render icon when not provided", () => {
      const { container } = render(
        <MetricCard label="Scans" value={0} />
      )
      // Only check for our icon container - no icon div with w-4 h-4 muted
      const icons = container.querySelectorAll("svg.w-4.h-4")
      expect(icons.length).toBe(0)
    })

    it("applies aria-hidden to icon", () => {
      const { container } = render(
        <MetricCard label="Engines" value={13} icon={Cpu} />
      )
      const svgs = container.querySelectorAll("svg")
      // The first svg should be the icon (before any sparkline)
      const iconSvg = svgs[0]
      expect(iconSvg).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("Sparkline", () => {
    it("renders SVG sparkline when data has 2+ points", () => {
      const { container } = render(
        <MetricCard label="Trend" value={5} sparklineData={[1, 3, 2, 5, 4]} />
      )
      // Find sparkline SVG (has viewBox with 80 width)
      const svgs = container.querySelectorAll("svg")
      const sparkline = Array.from(svgs).find(
        (svg) => svg.getAttribute("viewBox") === "0 0 80 24"
      )
      expect(sparkline).toBeInTheDocument()
    })

    it("does not render sparkline with less than 2 data points", () => {
      const { container } = render(
        <MetricCard label="Trend" value={5} sparklineData={[1]} />
      )
      const svgs = container.querySelectorAll("svg[viewBox='0 0 80 24']")
      expect(svgs.length).toBe(0)
    })

    it("does not render sparkline when no data provided", () => {
      const { container } = render(
        <MetricCard label="Trend" value={5} />
      )
      const svgs = container.querySelectorAll("svg[viewBox='0 0 80 24']")
      expect(svgs.length).toBe(0)
    })

    it("sparkline has aria-hidden for accessibility", () => {
      const { container } = render(
        <MetricCard label="Trend" value={5} sparklineData={[1, 2, 3]} />
      )
      const sparkline = container.querySelector("svg[viewBox='0 0 80 24']")
      expect(sparkline).toHaveAttribute("aria-hidden", "true")
    })

    it("sparkline is always visible (static data, not animated)", () => {
      const { container } = render(
        <MetricCard label="Trend" value={5} sparklineData={[1, 2, 3]} />
      )
      const sparkline = container.querySelector("svg[viewBox='0 0 80 24']")
      expect(sparkline).toHaveClass("opacity-100")
    })

    it("sparkline contains polyline and polygon elements", () => {
      const { container } = render(
        <MetricCard label="Trend" value={5} sparklineData={[1, 2, 3]} />
      )
      const sparkline = container.querySelector("svg[viewBox='0 0 80 24']")
      expect(sparkline?.querySelector("polyline")).toBeInTheDocument()
      expect(sparkline?.querySelector("polygon")).toBeInTheDocument()
    })

    it("sparkline uses unique gradient IDs (no collision)", () => {
      const { container } = render(
        <div>
          <MetricCard label="A" value={1} sparklineData={[1, 2]} />
          <MetricCard label="B" value={2} sparklineData={[3, 4]} />
        </div>
      )
      const gradients = container.querySelectorAll("linearGradient")
      const ids = Array.from(gradients).map((g) => g.getAttribute("id"))
      // All IDs should be unique
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe("Trend indicator", () => {
    it("renders trend with up direction", () => {
      render(
        <MetricCard
          label="Metric"
          value={100}
          trend={{ direction: "up", percentage: 15 }}
        />
      )
      expect(screen.getByText("15%")).toBeInTheDocument()
    })

    it("renders trend with down direction", () => {
      render(
        <MetricCard
          label="Metric"
          value={50}
          trend={{ direction: "down", percentage: 5 }}
        />
      )
      expect(screen.getByText("5%")).toBeInTheDocument()
    })

    it("renders trend with flat direction", () => {
      render(
        <MetricCard
          label="Metric"
          value={50}
          trend={{ direction: "flat", percentage: 0 }}
        />
      )
      expect(screen.getByText("0%")).toBeInTheDocument()
    })

    it("renders trend comparison text", () => {
      render(
        <MetricCard
          label="Metric"
          value={50}
          trend={{ direction: "up", percentage: 10, comparison: "vs last week" }}
        />
      )
      expect(screen.getByText("vs last week")).toBeInTheDocument()
    })

    it("trend icon has aria-hidden", () => {
      const { container } = render(
        <MetricCard
          label="Metric"
          value={50}
          trend={{ direction: "up", percentage: 10 }}
        />
      )
      // The trend SVG icons should all have aria-hidden
      const svgs = container.querySelectorAll("svg[aria-hidden='true']")
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe("Accent colors", () => {
    it("applies corner gradient overlay with accent", () => {
      const { container } = render(
        <MetricCard label="Test" value={0} accent="primary" />
      )
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain("overflow-hidden")
      expect(card.style.backgroundImage).toContain("linear-gradient")
    })

    it("does not apply gradient overlay without accent", () => {
      const { container } = render(
        <MetricCard label="Test" value={0} />
      )
      const card = container.firstChild as HTMLElement
      expect(card.style.backgroundImage).toBe("")
    })
  })

  describe("All 4 scanner metric cards render", () => {
    it("renders Total Scans card with icon", () => {
      render(
        <MetricCard label="Total Scans" value={5} icon={ScanLine} accent="primary" />
      )
      expect(screen.getByText("Total Scans")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
    })

    it("renders Threats Detected card with icon", () => {
      render(
        <MetricCard label="Threats Detected" value={3} icon={ShieldAlert} accent="danger" />
      )
      expect(screen.getByText("Threats Detected")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
    })

    it("renders Pass Rate card with icon", () => {
      render(
        <MetricCard label="Pass Rate" value="80%" icon={CheckCircle} accent="success" />
      )
      expect(screen.getByText("Pass Rate")).toBeInTheDocument()
      expect(screen.getByText("80%")).toBeInTheDocument()
    })

    it("renders Active Engines card with icon", () => {
      render(
        <MetricCard label="Active Engines" value="13/13" icon={Cpu} accent="primary" />
      )
      expect(screen.getByText("Active Engines")).toBeInTheDocument()
      expect(screen.getByText("13/13")).toBeInTheDocument()
    })
  })
})
