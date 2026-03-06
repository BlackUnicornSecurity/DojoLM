/**
 * File: api.test.ts
 * Purpose: Unit tests for API functions
 * Phase 6: Testing Framework Setup
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock fetchWithAuth to pass through to global fetch (Story 13.9)
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn((...args: unknown[]) => global.fetch(...(args as Parameters<typeof fetch>))),
  getApiKey: vi.fn(() => null),
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
}))

import { scanText, getFixtures } from "@/lib/api"

// Mock global fetch
global.fetch = vi.fn()

describe("API functions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("scanText", () => {
    it("scans text successfully", async () => {
      const mockResult = {
        verdict: "ALLOW" as const,
        findings: [],
        counts: { critical: 0, warning: 0, info: 0 },
        textLength: 100,
        normalizedLength: 100,
        elapsed: 50.5,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response)

      const result = await scanText("test text")

      expect(result).toEqual(mockResult)
      expect(fetch).toHaveBeenCalledWith("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "test text" }),
      })
    })

    it("throws error when scan fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

      await expect(scanText("test")).rejects.toThrow("API error: 500 Internal Server Error")
    })
  })

  describe("getFixtures", () => {
    it("fetches fixtures successfully", async () => {
      const mockManifest = {
        version: "1.0.0",
        description: "Test fixtures",
        categories: {},
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockManifest,
      } as Response)

      const result = await getFixtures()

      expect(result).toEqual(mockManifest)
      expect(fetch).toHaveBeenCalledWith("/api/fixtures", {
        headers: { "Content-Type": "application/json" },
      })
    })

    it("throws error when fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)

      await expect(getFixtures()).rejects.toThrow("API error: 404 Not Found")
    })
  })
})
