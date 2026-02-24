/**
 * File: FixtureList.tsx
 * Purpose: Display fixture manifest with categories and files
 * Phase 6: Performance optimizations with React.memo and useMemo
 * Index:
 * - FixtureList component (line 18)
 * - FixtureCategory component (line 73)
 * - FixtureFileRow component (line 128)
 */

'use client'

import { useState, memo, useMemo } from 'react'
import { FixtureManifest, FixtureCategory as FixtureCategoryType } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn, formatDuration } from '@/lib/utils'
import { ScanEye, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'

interface FixtureListProps {
  manifest: FixtureManifest | null
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  isLoading?: boolean
  className?: string
}

export const FixtureList = memo(function FixtureList({
  manifest,
  onScanFixture,
  onViewFixture,
  isLoading = false,
  className
}: FixtureListProps) {
  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading fixtures...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!manifest) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-2">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Failed to load fixtures</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const categories = useMemo(
    () => Object.entries(manifest.categories),
    [manifest.categories]
  )

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Test Fixtures</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {manifest.description} • Version {manifest.version}
          </p>
        </div>
      </div>

      {categories.map(([key, category]) => (
        <FixtureCategory
          key={key}
          categoryKey={key}
          category={category}
          onScanFixture={onScanFixture}
          onViewFixture={onViewFixture}
        />
      ))}
    </div>
  )
})

interface FixtureCategoryProps {
  categoryKey: string
  category: FixtureCategoryType
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
}

const FixtureCategory = memo(function FixtureCategory({
  categoryKey,
  category,
  onScanFixture,
  onViewFixture
}: FixtureCategoryProps) {
  const categoryIcons: Record<string, string> = useMemo(() => ({
    images: '🖼️',
    audio: '🎵',
    web: '🌐',
    context: '📄',
    malformed: '⚠️',
    encoded: '🔐',
  }), [])

  const icon = categoryIcons[categoryKey] || '📁'

  const stats = useMemo(() => {
    const totalFiles = category.files.length
    const cleanFiles = category.files.filter(f => f.clean).length
    const attackFiles = totalFiles - cleanFiles
    return { totalFiles, cleanFiles, attackFiles }
  }, [category.files])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>{icon}</span>
              <span className="capitalize">{categoryKey}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {category.desc} • Stories: {category.story}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-green-500 border-green-500/20">
              {stats.cleanFiles} Clean
            </Badge>
            <Badge variant="outline" className="text-red-500 border-red-500/20">
              {stats.attackFiles} Attack
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Attack</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {category.files.map((file) => (
              <FixtureFileRow
                key={file.file}
                category={categoryKey}
                file={file}
                onScan={onScanFixture}
                onView={onViewFixture}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
})

interface FixtureFileRowProps {
  category: string
  file: {
    file: string
    attack: string | null
    severity: string | null
    clean: boolean
  }
  onScan: (category: string, file: string) => void
  onView: (category: string, file: string) => void
}

const FixtureFileRow = memo(function FixtureFileRow({ category, file, onScan, onView }: FixtureFileRowProps) {
  const handleScan = useMemo(() => () => onScan(category, file.file), [category, file.file, onScan])
  const handleView = useMemo(() => () => onView(category, file.file), [category, file.file, onView])

  const severityClass = useMemo(() => {
    if (!file.severity) return ''
    return file.severity === 'CRITICAL'
      ? 'text-red-500 bg-red-500/10'
      : file.severity === 'WARNING'
      ? 'text-orange-500 bg-orange-500/10'
      : 'text-blue-500 bg-blue-500/10'
  }, [file.severity])

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{file.file}</TableCell>
      <TableCell>
        {file.clean ? (
          <Badge variant="outline" className="text-green-500 border-green-500/20 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Clean
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-500 border-red-500/20 gap-1">
            <AlertCircle className="h-3 w-3" />
            Malicious
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {file.severity ? (
          <Badge variant="secondary" className={severityClass}>
            {file.severity}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
        {file.attack || '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleView}
            className="h-8 px-2"
            aria-label={`View fixture ${file.file}`}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleScan}
            className="h-8 px-2 gap-1"
            aria-label={`Scan fixture ${file.file}`}
          >
            <ScanEye className="h-4 w-4" />
            Scan
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})
