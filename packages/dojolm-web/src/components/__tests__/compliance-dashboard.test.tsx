/**
 * File: compliance-dashboard.test.tsx
 * Purpose: Tests for ComplianceDashboard component
 * Index:
 * - Loading state tests (line 25)
 * - Error state tests (line 40)
 * - Success rendering tests (line 65)
 * - Framework expansion tests (line 120)
 * - Gap analysis tests (line 145)
 * - Accessibility tests (line 175)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetchWithAuth
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

import { fetchWithAuth } from '@/lib/fetch-with-auth'
import ComplianceDashboard from '@/components/compliance/ComplianceDashboard'

const mockFetchWithAuth = vi.mocked(fetchWithAuth)

const mockComplianceData = {
  summary: {
    totalFrameworks: 2,
    avgCoverage: 85,
    openGaps: 3,
    inProgressGaps: 2,
    closedGaps: 10,
  },
  frameworks: [
    {
      id: 'owasp-top10',
      name: 'OWASP Top 10',
      version: '2023',
      overallCoverage: 90,
      controls: [
        { id: 'A01', name: 'Broken Access Control', status: 'covered' as const, coverage: 95, evidenceType: 'module' as const, evidenceRef: 'auth-module' },
        { id: 'A02', name: 'Cryptographic Failures', status: 'partial' as const, coverage: 70, evidenceType: 'fixture' as const, evidenceRef: 'crypto-test', remediationStatus: 'in-progress' as const },
        { id: 'A03', name: 'Injection', status: 'gap' as const, coverage: 30, evidenceType: 'documentation' as const, evidenceRef: 'sec-doc', remediationStatus: 'open' as const },
      ],
      lastAssessed: '2024-01-15',
    },
    {
      id: 'nist-csf',
      name: 'NIST CSF',
      version: '2.0',
      overallCoverage: 80,
      controls: [
        { id: 'ID.AM-1', name: 'Asset Management', status: 'covered' as const, coverage: 100, evidenceType: 'process' as const, evidenceRef: 'asset-inv' },
      ],
      lastAssessed: '2024-01-10',
    },
  ],
  lastUpdated: '2024-01-15T12:00:00Z',
}

function mockSuccessResponse() {
  mockFetchWithAuth.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockComplianceData),
  } as unknown as Response)
}

function mockErrorResponse(msg = 'Server Error') {
  mockFetchWithAuth.mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error: msg }),
  } as unknown as Response)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ComplianceDashboard', () => {
  describe('Loading state', () => {
    it('shows loading spinner while fetching data', () => {
      mockFetchWithAuth.mockReturnValueOnce(new Promise(() => {})) // never resolves
      render(<ComplianceDashboard />)
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Loading compliance data...')).toBeInTheDocument()
    })

    it('has accessible loading label', () => {
      mockFetchWithAuth.mockReturnValueOnce(new Promise(() => {}))
      render(<ComplianceDashboard />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading compliance data')
    })
  })

  describe('Error state', () => {
    it('shows error alert when fetch fails', async () => {
      mockFetchWithAuth.mockRejectedValueOnce(new Error('Network error'))
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })

    it('shows error when response is not ok', async () => {
      mockErrorResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('shows unknown error for non-Error throws', async () => {
      mockFetchWithAuth.mockRejectedValueOnce('some string error')
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText(/An unknown error occurred/)).toBeInTheDocument()
      })
    })
  })

  describe('Success rendering', () => {
    it('renders dashboard title', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Compliance Coverage Dashboard')).toBeInTheDocument()
      })
    })

    it('renders last updated timestamp', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText(/Last updated:.*2024-01-15/)).toBeInTheDocument()
      })
    })

    it('displays summary statistics', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument() // avgCoverage
        expect(screen.getByText('3')).toBeInTheDocument() // openGaps
        expect(screen.getByText('2')).toBeInTheDocument() // inProgressGaps
        expect(screen.getByText('10')).toBeInTheDocument() // closedGaps
      })
    })

    it('displays summary labels', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Avg Coverage')).toBeInTheDocument()
        expect(screen.getByText('Open Gaps')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('Closed/Covered')).toBeInTheDocument()
      })
    })

    it('renders framework names', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getAllByText('OWASP Top 10').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('NIST CSF').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('renders Framework Details section', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Framework Details')).toBeInTheDocument()
      })
    })

    it('renders Gap Analysis section', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
      })
    })
  })

  describe('Framework expansion', () => {
    it('framework details are collapsed by default', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Framework Details')).toBeInTheDocument()
      })
      // Controls table should not be visible initially
      expect(screen.queryByText('Broken Access Control')).not.toBeInTheDocument()
    })

    it('expands framework details on click', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Framework Details')).toBeInTheDocument()
      })
      // Find the expand button by aria-controls attribute
      const expandBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-controls')?.includes('owasp'))!
      fireEvent.click(expandBtn)
      // Controls appear in the expanded table (may also appear in gap table)
      expect(screen.getAllByText('Broken Access Control').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Cryptographic Failures').length).toBeGreaterThanOrEqual(1)
    })

    it('collapses framework on second click', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Framework Details')).toBeInTheDocument()
      })
      const expandBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-controls')?.includes('owasp'))!
      fireEvent.click(expandBtn)
      expect(screen.getByText('Broken Access Control')).toBeInTheDocument()
      fireEvent.click(expandBtn)
      expect(screen.queryByText('Broken Access Control')).not.toBeInTheDocument()
    })

    it('sets aria-expanded attribute correctly', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Framework Details')).toBeInTheDocument()
      })
      const expandBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-controls')?.includes('owasp'))!
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(expandBtn)
      expect(expandBtn).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Gap analysis', () => {
    it('shows gap table with non-covered controls', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
      })
      // The gap table should show partial and gap controls
      const gapTable = screen.getByRole('table', { name: 'Compliance gaps' })
      expect(gapTable).toBeInTheDocument()
    })

    it('displays gap status badges', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Gap Analysis')).toBeInTheDocument()
      })
      // Should show 'partial' and 'gap' badges in the gap table
      const badges = screen.getAllByText('partial')
      expect(badges.length).toBeGreaterThanOrEqual(1)
      const gapBadges = screen.getAllByText('gap')
      expect(gapBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('shows full coverage message when all controls are covered', async () => {
      const allCoveredData = {
        ...mockComplianceData,
        frameworks: [{
          id: 'test',
          name: 'Test Framework',
          version: '1.0',
          overallCoverage: 100,
          controls: [
            { id: 'C1', name: 'Control 1', status: 'covered' as const, coverage: 100, evidenceType: 'module' as const, evidenceRef: 'ref' },
          ],
          lastAssessed: '2024-01-01',
        }],
      }
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(allCoveredData),
      } as unknown as Response)
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText(/full coverage achieved/)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('gap table has aria-label', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByRole('table', { name: 'Compliance gaps' })).toBeInTheDocument()
      })
    })

    it('framework expand buttons have aria-controls', async () => {
      mockSuccessResponse()
      render(<ComplianceDashboard />)
      await waitFor(() => {
        expect(screen.getByText('Framework Details')).toBeInTheDocument()
      })
      const expandBtn = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-controls')?.includes('owasp'))!
      expect(expandBtn).toHaveAttribute('aria-controls', 'framework-owasp-top10')
    })
  })
})
