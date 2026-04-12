/**
 * File: use-scanner-metrics.test.tsx
 * Purpose: Integration tests for useScannerMetrics hook (Story 2: TPI-UIP-02)
 * Tests: metric derivation with mock scanner context
 */

import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the ScannerContext
const mockUseScanner = vi.fn()

vi.mock("@/lib/ScannerContext", () => ({
  useScanner: () => mockUseScanner(),
}))

// Import after mock setup
import { useScannerMetrics, _resetScanHistory } from "@/lib/hooks/useScannerMetrics"

describe("useScannerMetrics", () => {
  beforeEach(() => {
    // Reset module-level scan history for test isolation
    _resetScanHistory()
    // Set default mock
    mockUseScanner.mockReturnValue({
      scanResult: null,
      engineFilters: [
        { id: "pi", label: "Prompt Injection", enabled: true },
        { id: "jb", label: "Jailbreak", enabled: true },
        { id: "tpi", label: "TPI", enabled: false },
      ],
    })
  })

  it("returns default metrics when no scan has been performed", () => {
    const { result } = renderHook(() => useScannerMetrics())

    expect(result.current.threatsDetected).toBe(0)
    expect(result.current.passRate).toBe("N/A")
    expect(result.current.activeEngines).toBe(2)
    expect(result.current.totalEngines).toBe(3)
  })

  it("counts active engines from engineFilters", () => {
    mockUseScanner.mockReturnValue({
      scanResult: null,
      engineFilters: [
        { id: "pi", label: "Prompt Injection", enabled: true },
        { id: "jb", label: "Jailbreak", enabled: false },
        { id: "tpi", label: "TPI", enabled: true },
        { id: "dos", label: "DoS", enabled: true },
      ],
    })

    const { result } = renderHook(() => useScannerMetrics())

    expect(result.current.activeEngines).toBe(3)
    expect(result.current.totalEngines).toBe(4)
  })

  it("derives threats detected from scan result findings", () => {
    mockUseScanner.mockReturnValue({
      scanResult: {
        findings: [
          { category: "pi", severity: "CRITICAL", description: "test", match: "test", source: "current", engine: "pi" },
          { category: "jb", severity: "WARNING", description: "test", match: "test", source: "current", engine: "jb" },
        ],
        verdict: "BLOCK",
        elapsed: 10,
        textLength: 100,
        normalizedLength: 95,
        counts: { critical: 1, warning: 1, info: 0 },
      },
      engineFilters: [
        { id: "pi", label: "Prompt Injection", enabled: true },
      ],
    })

    const { result } = renderHook(() => useScannerMetrics())

    expect(result.current.threatsDetected).toBe(2)
  })

  it("returns threat trend as array of numbers", () => {
    mockUseScanner.mockReturnValue({
      scanResult: {
        findings: [{ category: "pi", severity: "CRITICAL", description: "test", match: "test", source: "current", engine: "pi" }],
        verdict: "BLOCK",
        elapsed: 5,
        textLength: 50,
        normalizedLength: 48,
        counts: { critical: 1, warning: 0, info: 0 },
      },
      engineFilters: [],
    })

    const { result } = renderHook(() => useScannerMetrics())

    expect(Array.isArray(result.current.threatTrend)).toBe(true)
    result.current.threatTrend.forEach((val) => {
      expect(typeof val).toBe("number")
    })
  })

  it("pass rate shows dash when no scans performed", () => {
    mockUseScanner.mockReturnValue({
      scanResult: null,
      engineFilters: [],
    })

    const { result } = renderHook(() => useScannerMetrics())

    expect(result.current.passRate).toBe("N/A")
  })

  it("returns all expected metric keys", () => {
    const { result } = renderHook(() => useScannerMetrics())

    expect(result.current).toHaveProperty("totalScans")
    expect(result.current).toHaveProperty("threatsDetected")
    expect(result.current).toHaveProperty("passRate")
    expect(result.current).toHaveProperty("activeEngines")
    expect(result.current).toHaveProperty("totalEngines")
    expect(result.current).toHaveProperty("threatTrend")
  })
})
