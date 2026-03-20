/**
 * File: ScannerInput.tsx
 * Purpose: Main scanner input component with textarea, multimodal file upload, and controls
 * Index:
 * - Multimodal types & constants (line 28)
 * - FilePreview component (line 52)
 * - ScannerInput component (line 120)
 * Story: H26.3 — Multimodal Scanner Input
 */

'use client'

import { useState, useCallback, useEffect, useRef, useId } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/GlowCard'
import { QuickChips } from './QuickChips'
import { cn } from '@/lib/utils'
import { Scan, Trash2, Upload, Image, Music, FileText, X } from 'lucide-react'
import { ScanningState } from './ScanningState'
import { useScanner } from '@/lib/ScannerContext'

// ---------------------------------------------------------------------------
// Multimodal types & constants
// ---------------------------------------------------------------------------

type InputModality = 'text' | 'image-ocr' | 'audio-transcription' | 'metadata'

const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg,.gif,.webp,.svg'
const ACCEPTED_AUDIO_TYPES = '.mp3,.wav,.flac,.ogg'
const ACCEPTED_DOC_TYPES = '.txt,.md,.json,.xml,.html,.csv'
const ALL_ACCEPTED = `${ACCEPTED_IMAGE_TYPES},${ACCEPTED_AUDIO_TYPES},${ACCEPTED_DOC_TYPES}`

const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024  // 50MB
const MAX_DOC_SIZE = 5 * 1024 * 1024     // 5MB
const MAX_FILE_COUNT = 10                 // Max simultaneous uploads

interface UploadedFile {
  name: string
  type: string
  size: number
  modality: InputModality
  extractedText: string
  previewUrl?: string
}

// ---------------------------------------------------------------------------
// FilePreview
// ---------------------------------------------------------------------------

function FilePreview({
  file,
  onRemove,
  disabled,
}: {
  file: UploadedFile
  onRemove: () => void
  disabled: boolean
}) {
  const iconMap: Record<InputModality, typeof Image> = {
    'text': FileText,
    'image-ocr': Image,
    'audio-transcription': Music,
    'metadata': FileText,
  }
  const FileIcon = iconMap[file.modality] || FileText
  const sizeStr = file.size < 1024
    ? `${file.size}B`
    : file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)}KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)}MB`

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
      {file.previewUrl && file.modality === 'image-ocr' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.previewUrl}
          alt={`Preview of ${file.name}`}
          className="w-10 h-10 rounded object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-[var(--bg-quaternary)] flex items-center justify-center shrink-0">
          <FileIcon className="h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {sizeStr} &middot; {file.modality}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 min-w-[44px] min-h-[44px]"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScannerInput
// ---------------------------------------------------------------------------

interface ScannerInputProps {
  onScan: (text: string, modalities?: InputModality[]) => void
  onClear: () => void
  isScanning?: boolean
  allEnginesDisabled?: boolean
  className?: string
}

export function ScannerInput({
  onScan,
  onClear,
  isScanning = false,
  allEnginesDisabled = false,
  className
}: ScannerInputProps) {
  const [text, setText] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [lengthWarning, setLengthWarning] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const { consumePendingPayload } = useScanner()

  // Pick up payload loaded from another module (H1.4)
  useEffect(() => {
    const pending = consumePendingPayload()
    if (pending) {
      setText(pending)
    }
  }, [consumePendingPayload])

  // Determine modality from MIME type
  const getModality = useCallback((mimeType: string): InputModality => {
    if (mimeType.startsWith('image/')) return 'image-ocr'
    if (mimeType.startsWith('audio/')) return 'audio-transcription'
    return 'text'
  }, [])

  // Get max size by MIME type
  const getMaxSize = useCallback((mimeType: string): number => {
    if (mimeType.startsWith('image/')) return MAX_IMAGE_SIZE
    if (mimeType.startsWith('audio/')) return MAX_AUDIO_SIZE
    return MAX_DOC_SIZE
  }, [])

  // Handle file upload — extract text, validate size
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: UploadedFile[] = []
    const remainingSlots = MAX_FILE_COUNT - uploadedFiles.length

    for (let i = 0; i < files.length && newFiles.length < remainingSlots; i++) {
      const file = files[i]
      const maxSize = getMaxSize(file.type)

      if (file.size > maxSize) {
        continue // Skip oversized files silently
      }

      const modality = getModality(file.type)
      let extractedText = ''
      let previewUrl: string | undefined

      if (modality === 'image-ocr') {
        // For images: read as text to get metadata, generate preview
        try {
          const textContent = await file.text()
          extractedText = textContent
          // Only create preview URL for non-SVG images (SEC-11: SVG previewed as raster only)
          if (!file.type.includes('svg')) {
            previewUrl = URL.createObjectURL(file)
          }
        } catch {
          extractedText = `[Image file: ${file.name}]`
        }
      } else if (modality === 'audio-transcription') {
        // For audio: read metadata as text (actual transcription would need API)
        try {
          const buffer = await file.arrayBuffer()
          const bytes = new Uint8Array(buffer.slice(0, 4096))
          // Extract any readable text from first 4KB (metadata region)
          extractedText = Array.from(bytes)
            .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '')
            .join('')
            .replace(/\s+/g, ' ')
            .trim()
          if (!extractedText) {
            extractedText = `[Audio file: ${file.name}]`
          }
        } catch {
          extractedText = `[Audio file: ${file.name}]`
        }
      } else {
        // Text/document files
        try {
          extractedText = await file.text()
        } catch {
          extractedText = `[Document file: ${file.name}]`
        }
      }

      newFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        modality,
        extractedText,
        previewUrl,
      })
    }

    setUploadedFiles(prev => [...prev, ...newFiles])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [getModality, getMaxSize, uploadedFiles.length])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => {
      const file = prev[index]
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // Track current files in ref for unmount cleanup (avoids stale closure)
  const uploadedFilesRef = useRef(uploadedFiles)
  uploadedFilesRef.current = uploadedFiles

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFilesRef.current.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
    }
  }, [])

  const handleScan = useCallback(() => {
    // Combine text input + extracted text from uploaded files
    const parts: string[] = []
    const modalities: InputModality[] = []

    if (text.trim()) {
      parts.push(text)
      modalities.push('text')
    }

    for (const file of uploadedFiles) {
      if (file.extractedText.trim()) {
        parts.push(`[${file.modality}:${file.name}]\n${file.extractedText}`)
        if (!modalities.includes(file.modality)) {
          modalities.push(file.modality)
        }
      }
    }

    const combined = parts.join('\n\n---\n\n')
    const MAX_INPUT_LENGTH = 10_000
    if (combined.length > MAX_INPUT_LENGTH) {
      setLengthWarning(`Combined input is ${combined.length.toLocaleString()} characters (max ${MAX_INPUT_LENGTH.toLocaleString()}). Please reduce text or remove files.`)
      return
    }
    setLengthWarning(null)
    if (combined.trim()) {
      onScan(combined, modalities.length > 0 ? modalities : undefined)
    }
  }, [text, uploadedFiles, onScan])

  const handleLoadPayload = useCallback((payloadText: string, autoScan = false) => {
    setText(payloadText)
    if (autoScan && payloadText.trim()) {
      onScan(payloadText)
    }
  }, [onScan])

  const handleClear = useCallback(() => {
    setText('')
    setLengthWarning(null)
    uploadedFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
    })
    setUploadedFiles([])
    onClear()
  }, [onClear, uploadedFiles])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleScan()
    }
  }, [handleScan])

  const hasContent = text.trim() || uploadedFiles.length > 0

  return (
    <GlowCard glow="subtle" className={cn('', className)}>
      <CardHeader>
        <CardTitle>Input Text</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text to scan for prompt injection..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[200px] max-h-[400px] font-mono text-sm resize-y overflow-auto"
          disabled={isScanning}
          aria-label="Enter text to scan for prompt injection"
        />

        {/* Multimodal file upload (H26.3) */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept={ALL_ACCEPTED}
            multiple
            onChange={handleFileUpload}
            disabled={isScanning}
            className="sr-only"
            aria-label="Upload files for multimodal scanning"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="gap-2"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload File
          </Button>
          <p className="text-xs text-muted-foreground">
            Images (PNG, JPEG, GIF, WebP, SVG), Audio (MP3, WAV, FLAC, OGG), Documents (TXT, JSON, XML)
          </p>
        </div>

        {/* Uploaded file previews */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2" role="list" aria-label="Uploaded files">
            {uploadedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} role="listitem">
                <FilePreview
                  file={file}
                  onRemove={() => removeFile(idx)}
                  disabled={isScanning}
                />
              </div>
            ))}
          </div>
        )}

        {/* ScanningState unmounts when not scanning (per Architect/Security requirement) */}
        {isScanning && <ScanningState className="py-4" />}

        {lengthWarning && (
          <p className="text-xs text-[var(--danger)]" role="alert">{lengthWarning}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleScan}
            disabled={!hasContent || isScanning || allEnginesDisabled}
            className="gap-2"
          >
            <Scan className="h-4 w-4" aria-hidden="true" />
            {isScanning ? 'Scanning...' : 'Scan'}
          </Button>
          <button
            onClick={handleClear}
            disabled={isScanning}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-2 py-1 min-h-[44px] inline-flex items-center"
          >
            Clear
          </button>
        </div>

        <QuickChips onLoadPayload={handleLoadPayload} isScanning={isScanning} />
      </CardContent>
    </GlowCard>
  )
}
