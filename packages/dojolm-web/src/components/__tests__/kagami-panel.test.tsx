/**
 * File: kagami-panel.test.tsx
 * Purpose: Unit tests for KagamiPanel component
 * Story: K5.1
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockFetchWithAuth = vi.fn()

vi.mock('lucide-react', () => ({
  Fingerprint: (props: Record<string, unknown>) => <span data-testid="icon-Fingerprint" {...props} />,
  Search: (props: Record<string, unknown>) => <span data-testid="icon-Search" {...props} />,
  ShieldCheck: (props: Record<string, unknown>) => <span data-testid="icon-ShieldCheck" {...props} />,
  Settings2: (props: Record<string, unknown>) => <span data-testid="icon-Settings2" {...props} />,
  Play: (props: Record<string, unknown>) => <span data-testid="icon-Play" {...props} />,
  Loader2: (props: Record<string, unknown>) => <span data-testid="icon-Loader2" {...props} />,
  Radar: (props: Record<string, unknown>) => <span data-testid="icon-Radar" {...props} />,
  BookOpen: (props: Record<string, unknown>) => <span data-testid="icon-BookOpen" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p></div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: Record<string, unknown>) => (
    <button onClick={onClick as (() => void) | undefined} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('../kagami/KagamiResults', () => ({
  KagamiResults: () => <div data-testid="kagami-results" />,
}))

vi.mock('../kagami/ProbeProgress', () => ({
  ProbeProgress: () => <div data-testid="probe-progress" />,
}))

vi.mock('../kagami/FeatureRadar', () => ({
  FeatureRadar: ({ candidateLabel }: { candidateLabel: string }) => (
    <div data-testid="feature-radar">Radar for {candidateLabel}</div>
  ),
}))

vi.mock('bu-tpi/fingerprint', () => ({}))

import { KagamiPanel } from '../kagami/KagamiPanel'

const mockSignatures = [
  {
    modelId: 'openai-gpt4o',
    modelFamily: 'GPT-4o',
    provider: 'OpenAI',
    knowledgeCutoff: '2024',
    lastVerified: '2026-03-15',
    featureCount: 18,
  },
  {
    modelId: 'anthropic-claude35',
    modelFamily: 'Claude 3.5',
    provider: 'Anthropic',
    knowledgeCutoff: '2024',
    lastVerified: '2026-03-10',
    featureCount: 16,
  },
]

describe('KagamiPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchWithAuth.mockImplementation((url: string) => {
      if (url === '/api/llm/fingerprint/signatures') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ signatures: mockSignatures }),
        })
      }

      if (url === '/api/llm/fingerprint') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            result: {
              candidates: [{
                modelId: 'openai-gpt4o',
                matchedFeatures: ['style_signature'],
                divergentFeatures: ['knowledge_cutoff'],
              }],
            },
          }),
        })
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      })
    })
  })

  it('KP-001: renders the Kagami header and fingerprint controls', () => {
    render(<KagamiPanel />)
    expect(screen.getByText('Kagami — Model Mirror')).toBeInTheDocument()
    expect(screen.getByText('Mode')).toBeInTheDocument()
    expect(screen.getByText('Run Fingerprint')).toBeInTheDocument()
  })

  it('KP-002: exposes fingerprint, signatures, and feature radar entry points', async () => {
    render(<KagamiPanel />)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/fingerprint/signatures')
    })

    expect(screen.getByRole('button', { name: 'Fingerprint' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signatures' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Feature Radar' })).toBeInTheDocument()
  })

  it('KP-003: shows the signatures browser with searchable records', async () => {
    render(<KagamiPanel />)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/fingerprint/signatures')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Signatures' }))

    expect(await screen.findByLabelText('Search Signatures')).toBeInTheDocument()
    expect(screen.getAllByText('openai-gpt4o').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /anthropic-claude35/i })).toBeInTheDocument()
    expect(screen.getByText('Signature Detail')).toBeInTheDocument()
  })

  it('KP-004: shows a browser-oriented feature radar from signature metadata', async () => {
    render(<KagamiPanel />)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/fingerprint/signatures')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Feature Radar' }))

    expect(await screen.findByText('Signature Profile Radar')).toBeInTheDocument()
    expect(screen.getByTestId('feature-radar')).toHaveTextContent('Radar for openai-gpt4o')
  })
})
