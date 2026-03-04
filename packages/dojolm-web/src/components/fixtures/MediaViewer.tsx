/**
 * File: MediaViewer.tsx
 * Purpose: Media playback and display for multimodal fixtures (images, audio, video, binary)
 * Story: 3.1 - Media Viewer Components
 * Index:
 * - getFileType() (line 16)
 * - MEDIA_EXTENSIONS (line 20)
 * - MediaViewer component (line 52)
 * - ImageViewer component (line 92)
 * - AudioPlayer component (line 142)
 * - VideoPlayer component (line 168)
 * - HexViewer component (line 194)
 */

'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as ImageIcon,
  Music,
  Film,
  Binary,
} from 'lucide-react'

/** Map file extensions to media types */
const MEDIA_EXTENSIONS: Record<string, 'image' | 'audio' | 'video'> = {
  '.png': 'image', '.jpg': 'image', '.jpeg': 'image',
  '.gif': 'image', '.bmp': 'image', '.webp': 'image',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio',
  '.aac': 'audio', '.flac': 'audio', '.m4a': 'audio',
  '.mp4': 'video', '.webm': 'video',
}

/** Get file type from filename extension */
function getFileType(filename: string): 'image' | 'audio' | 'video' | 'binary' {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return 'binary'
  const ext = filename.slice(dotIndex).toLowerCase()
  return MEDIA_EXTENSIONS[ext] ?? 'binary'
}

/** Get icon for file type */
function getFileTypeIcon(type: 'image' | 'audio' | 'video' | 'binary') {
  switch (type) {
    case 'image': return ImageIcon
    case 'audio': return Music
    case 'video': return Film
    case 'binary': return Binary
  }
}

interface MediaViewerProps {
  /** Full path: category/filename */
  path: string
  /** Raw hex preview from API (for binary/hex display) */
  hexPreview?: string
  /** File size in bytes */
  size: number
  className?: string
}

export function MediaViewer({ path, hexPreview, size, className }: MediaViewerProps) {
  const filename = path.includes('/') ? path.split('/').pop()! : path
  const fileType = getFileType(filename)
  const FileTypeIcon = getFileTypeIcon(fileType)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <FileTypeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h4 className="text-sm font-medium">
          {fileType === 'image' ? 'Image Preview' :
           fileType === 'audio' ? 'Audio Player' :
           fileType === 'video' ? 'Video Player' :
           'Hex Preview (first 256 bytes)'}
        </h4>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {fileType.toUpperCase()}
        </Badge>
      </div>

      {fileType === 'image' && (
        <ImageViewer path={path} filename={filename} />
      )}
      {fileType === 'audio' && (
        <AudioPlayer path={path} filename={filename} />
      )}
      {fileType === 'video' && (
        <VideoPlayer path={path} filename={filename} />
      )}
      {fileType === 'binary' && (
        <HexViewer hexPreview={hexPreview} size={size} />
      )}
    </div>
  )
}

/** Image viewer with zoom controls */
function ImageViewer({ path, filename }: { path: string; filename: string }) {
  const [zoom, setZoom] = useState(1)
  const [loadError, setLoadError] = useState(false)
  const mediaUrl = `/api/read-fixture/media?path=${encodeURIComponent(path)}`

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 0.25, 3)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 0.25, 0.25)), [])
  const handleReset = useCallback(() => setZoom(1), [])

  // SVG files must NOT be rendered as <img> — they can contain script/foreign-object XSS
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (ext === '.svg') {
    return (
      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-center">
        SVG preview is disabled for security (potential XSS vectors).
        Use the hex/text preview to inspect this file.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-center">
        Failed to load image. The file may be corrupted or inaccessible.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0" aria-label="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="ghost" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0" aria-label="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-7 w-7 p-0" aria-label="Reset zoom">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* Image container with overflow scroll */}
      <div className="bg-muted rounded-lg overflow-auto max-h-[400px] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={`Fixture: ${filename}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="max-w-full motion-safe:transition-transform motion-safe:duration-150"
          loading="lazy"
          onError={() => setLoadError(true)}
        />
      </div>
    </div>
  )
}

/** Audio player with native controls */
function AudioPlayer({ path, filename }: { path: string; filename: string }) {
  const [loadError, setLoadError] = useState(false)
  const mediaUrl = `/api/read-fixture/media?path=${encodeURIComponent(path)}`

  if (loadError) {
    return (
      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-center">
        Failed to load audio. The file may be corrupted or in an unsupported format.
      </div>
    )
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <audio
        controls
        preload="metadata"
        className="w-full"
        aria-label={`Audio fixture: ${filename}`}
        onError={() => setLoadError(true)}
      >
        <source src={mediaUrl} />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

/** Video player with native controls */
function VideoPlayer({ path, filename }: { path: string; filename: string }) {
  const [loadError, setLoadError] = useState(false)
  const mediaUrl = `/api/read-fixture/media?path=${encodeURIComponent(path)}`

  if (loadError) {
    return (
      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-center">
        Failed to load video. The file may be corrupted or in an unsupported format.
      </div>
    )
  }

  return (
    <div className="bg-muted rounded-lg overflow-hidden">
      <video
        controls
        preload="metadata"
        className="w-full max-h-[400px]"
        aria-label={`Video fixture: ${filename}`}
        onError={() => setLoadError(true)}
      >
        <source src={mediaUrl} />
        Your browser does not support the video element.
      </video>
    </div>
  )
}

/** Hex viewer for unrecognized binary files */
function HexViewer({ hexPreview, size }: { hexPreview?: string; size: number }) {
  if (!hexPreview) {
    return (
      <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground text-center">
        No hex preview available
      </div>
    )
  }

  // Format hex string into rows of 32 hex chars (16 bytes) with offset
  const cleanHex = hexPreview.replace(/\.\.\.$/g, '')
  const rows: string[] = []
  for (let i = 0; i < cleanHex.length; i += 32) {
    const offset = (i / 2).toString(16).padStart(8, '0')
    const hexChunk = cleanHex.slice(i, i + 32)
    const pairs = hexChunk.match(/.{1,2}/g) || []
    rows.push(`${offset}  ${pairs.join(' ')}`)
  }

  return (
    <div className="space-y-2">
      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
        {rows.join('\n')}
      </pre>
      <p className="text-xs text-muted-foreground">
        Showing first {Math.min(256, size)} of {size.toLocaleString()} bytes
      </p>
    </div>
  )
}
