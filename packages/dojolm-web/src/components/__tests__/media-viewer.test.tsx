/**
 * File: media-viewer.test.tsx
 * Purpose: Unit tests for MediaViewer component
 * Test IDs: MV-001 to MV-013
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, disabled }: Record<string, unknown>) => (
    <button onClick={onClick as () => void} aria-label={ariaLabel as string} disabled={disabled as boolean}>
      {children as React.ReactNode}
    </button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('lucide-react', () => ({
  ZoomIn: () => <span>ZoomIn</span>,
  ZoomOut: () => <span>ZoomOut</span>,
  RotateCcw: () => <span>Reset</span>,
  Image: () => <span data-testid="icon-image">Image</span>,
  Music: () => <span data-testid="icon-music">Music</span>,
  Film: () => <span data-testid="icon-film">Film</span>,
  Binary: () => <span data-testid="icon-binary">Binary</span>,
}))

import { MediaViewer } from '../fixtures/MediaViewer'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MediaViewer', () => {
  it('MV-001: renders IMAGE badge for image files', () => {
    render(<MediaViewer path="images/photo.png" size={5000} />)
    expect(screen.getByText('IMAGE')).toBeInTheDocument()
    expect(screen.getByText('Image Preview')).toBeInTheDocument()
  })

  it('MV-002: renders AUDIO badge for audio files', () => {
    render(<MediaViewer path="audio/song.mp3" size={50000} />)
    expect(screen.getByText('AUDIO')).toBeInTheDocument()
    expect(screen.getByText('Audio Player')).toBeInTheDocument()
  })

  it('MV-003: renders VIDEO badge for video files', () => {
    render(<MediaViewer path="video/clip.mp4" size={100000} />)
    expect(screen.getByText('VIDEO')).toBeInTheDocument()
    expect(screen.getByText('Video Player')).toBeInTheDocument()
  })

  it('MV-004: renders BINARY badge for unrecognized extensions', () => {
    render(<MediaViewer path="encoded/payload.dat" hexPreview="deadbeef" size={256} />)
    expect(screen.getByText('BINARY')).toBeInTheDocument()
    expect(screen.getByText('Hex Preview (first 256 bytes)')).toBeInTheDocument()
  })

  it('MV-005: renders BINARY badge for files without extension', () => {
    render(<MediaViewer path="misc/noextension" hexPreview="00ff" size={100} />)
    expect(screen.getByText('BINARY')).toBeInTheDocument()
  })

  it('MV-006: SVG files are treated as binary (not rendered as images for security)', () => {
    render(<MediaViewer path="images/vector.svg" hexPreview="3c73766720" size={1200} />)
    // SVG is not in MEDIA_EXTENSIONS so it falls through to binary/hex viewer
    expect(screen.getByText('BINARY')).toBeInTheDocument()
  })

  it('MV-007: image viewer has zoom controls', () => {
    render(<MediaViewer path="images/photo.jpg" size={5000} />)
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('MV-008: zoom in increases zoom percentage', () => {
    render(<MediaViewer path="images/photo.jpg" size={5000} />)
    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('MV-009: zoom out decreases zoom percentage', () => {
    render(<MediaViewer path="images/photo.jpg" size={5000} />)
    fireEvent.click(screen.getByLabelText('Zoom in'))
    fireEvent.click(screen.getByLabelText('Zoom in'))
    // now at 150%
    fireEvent.click(screen.getByLabelText('Zoom out'))
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('MV-010: reset zoom returns to 100%', () => {
    render(<MediaViewer path="images/photo.jpg" size={5000} />)
    fireEvent.click(screen.getByLabelText('Zoom in'))
    fireEvent.click(screen.getByLabelText('Zoom in'))
    fireEvent.click(screen.getByLabelText('Reset zoom'))
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('MV-011: audio player has correct aria-label', () => {
    render(<MediaViewer path="audio/clip.wav" size={10000} />)
    expect(screen.getByLabelText('Audio fixture: clip.wav')).toBeInTheDocument()
  })

  it('MV-012: video player has correct aria-label', () => {
    render(<MediaViewer path="video/demo.webm" size={200000} />)
    expect(screen.getByLabelText('Video fixture: demo.webm')).toBeInTheDocument()
  })

  it('MV-013: hex viewer shows "No hex preview available" when no hexPreview', () => {
    render(<MediaViewer path="encoded/payload.bin" size={500} />)
    expect(screen.getByText('No hex preview available')).toBeInTheDocument()
  })
})
