/**
 * File: CategoryTree.tsx
 * Purpose: Collapsible tree showing all fixture categories with brand colors and counts
 * Story: S72 - Fixture Explorer
 * Index:
 * - BRAND_COLORS mapping (line 22)
 * - getBrandForCategory helper (line 46)
 * - CategoryTree component (line 72)
 * - CategoryNode component (line 140)
 */

'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { FixtureCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, FolderOpen, Folder, Database } from 'lucide-react'

/** Brand color mapping by product name */
const BRAND_COLORS: Record<string, string> = {
  DojoLM: '#E63946',
  BonkLM: '#FFD700',
  Basileak: '#8A2BE2',
  PantheonLM: '#39FF14',
  Marfaak: '#FF10F0',
  BlackUnicorn: '#666666',
}

/**
 * Category-to-brand mapping, mirrors branding-helpers.ts getBrandForCategory
 * Kept client-side to avoid importing Node.js FS-dependent module
 */
const CATEGORY_BRAND_MAP: Record<string, string> = {
  web: 'DojoLM', context: 'DojoLM', encoded: 'DojoLM', code: 'DojoLM',
  boundary: 'DojoLM', multimodal: 'DojoLM', 'prompt-injection': 'DojoLM',
  mcp: 'DojoLM', 'token-attacks': 'DojoLM', modern: 'DojoLM',
  social: 'BonkLM', 'untrusted-sources': 'BonkLM', 'delivery-vectors': 'BonkLM',
  'supply-chain': 'BonkLM',
  malformed: 'Basileak', dos: 'Basileak', 'model-theft': 'Basileak',
  'document-attacks': 'Basileak', 'tool-manipulation': 'Basileak',
  'search-results': 'PantheonLM', vec: 'PantheonLM', or: 'PantheonLM',
  bias: 'PantheonLM', translation: 'PantheonLM',
  'agent-output': 'Marfaak', cognitive: 'Marfaak', output: 'Marfaak',
  agent: 'Marfaak', session: 'Marfaak', 'few-shot': 'Marfaak',
  images: 'BlackUnicorn', audio: 'BlackUnicorn', environmental: 'BlackUnicorn',
}

function getBrandForCategory(category: string): { name: string; color: string } {
  const brandName = CATEGORY_BRAND_MAP[category] || 'BlackUnicorn'
  return {
    name: brandName,
    color: BRAND_COLORS[brandName] || '#000000',
  }
}

interface CategoryTreeProps {
  categories: Record<string, FixtureCategory>
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  className?: string
}

export const CategoryTree = memo(function CategoryTree({
  categories,
  selectedCategory,
  onSelectCategory,
  className,
}: CategoryTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const sortedEntries = useMemo(
    () =>
      Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)),
    [categories]
  )

  const totalFixtures = useMemo(
    () =>
      sortedEntries.reduce((sum, [, cat]) => sum + cat.files.length, 0),
    [sortedEntries]
  )

  /** Group categories by brand for tree structure */
  const groupedByBrand = useMemo(() => {
    const groups: Record<string, { color: string; categories: [string, FixtureCategory][] }> = {}
    for (const entry of sortedEntries) {
      const [key] = entry
      const brand = getBrandForCategory(key)
      if (!groups[brand.name]) {
        groups[brand.name] = { color: brand.color, categories: [] }
      }
      groups[brand.name].categories.push(entry)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [sortedEntries])

  const toggleExpand = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with total count */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border)]">
        <Database className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold">Categories</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {totalFixtures.toLocaleString()} fixtures
        </Badge>
      </div>

      {/* Scrollable tree */}
      <ScrollArea className="flex-1">
        <nav aria-label="Fixture categories" className="py-2">
          {groupedByBrand.map(([brandName, group]) => (
            <BrandGroup
              key={brandName}
              brandName={brandName}
              brandColor={group.color}
              categories={group.categories}
              expandedCategories={expandedCategories}
              selectedCategory={selectedCategory}
              onToggleExpand={toggleExpand}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </nav>
      </ScrollArea>
    </div>
  )
})

/** Brand group header in the tree */
interface BrandGroupProps {
  brandName: string
  brandColor: string
  categories: [string, FixtureCategory][]
  expandedCategories: Set<string>
  selectedCategory: string | null
  onToggleExpand: (category: string) => void
  onSelectCategory: (category: string) => void
}

const BrandGroup = memo(function BrandGroup({
  brandName,
  brandColor,
  categories,
  expandedCategories,
  selectedCategory,
  onToggleExpand,
  onSelectCategory,
}: BrandGroupProps) {
  const totalInBrand = useMemo(
    () => categories.reduce((sum, [, cat]) => sum + cat.files.length, 0),
    [categories]
  )

  return (
    <div className="mb-1">
      {/* Brand label */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: brandColor,
            boxShadow: brandColor !== '#000000' ? `0 0 6px ${brandColor}40` : undefined,
          }}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {brandName}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {totalInBrand}
        </span>
      </div>

      {/* Category nodes */}
      <ul role="list" className="space-y-0.5">
        {categories.map(([key, category]) => (
          <CategoryNode
            key={key}
            categoryKey={key}
            category={category}
            brandColor={brandColor}
            isExpanded={expandedCategories.has(key)}
            isSelected={selectedCategory === key}
            onToggle={onToggleExpand}
            onSelect={onSelectCategory}
          />
        ))}
      </ul>
    </div>
  )
})

/** Single category node with expand/collapse */
interface CategoryNodeProps {
  categoryKey: string
  category: FixtureCategory
  brandColor: string
  isExpanded: boolean
  isSelected: boolean
  onToggle: (key: string) => void
  onSelect: (key: string) => void
}

const CategoryNode = memo(function CategoryNode({
  categoryKey,
  category,
  brandColor,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
}: CategoryNodeProps) {
  const stats = useMemo(() => {
    const total = category.files.length
    const clean = category.files.filter(f => f.clean).length
    const attack = total - clean
    return { total, clean, attack }
  }, [category.files])

  const handleClick = useCallback(() => {
    onSelect(categoryKey)
  }, [onSelect, categoryKey])

  const handleToggle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation()
      onToggle(categoryKey)
    },
    [onToggle, categoryKey]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(categoryKey)
      }
      if (e.key === 'ArrowRight' && !isExpanded) {
        e.preventDefault()
        onToggle(categoryKey)
      }
      if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault()
        onToggle(categoryKey)
      }
    },
    [onSelect, onToggle, categoryKey, isExpanded]
  )

  return (
    <li role="listitem">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${categoryKey} category, ${stats.total} fixtures, ${stats.attack} attack, ${stats.clean} clean`}
        aria-expanded={isExpanded}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer',
          'motion-safe:transition-colors motion-safe:duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isSelected
            ? 'bg-[var(--bg-quaternary)] text-foreground'
            : 'text-muted-foreground hover:bg-[var(--bg-secondary)] hover:text-foreground'
        )}
        style={isSelected ? { borderLeft: `2px solid ${brandColor}` } : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* Expand/collapse chevron */}
        <button
          type="button"
          tabIndex={-1}
          onClick={handleToggle}
          className="p-0.5 -ml-0.5 rounded hover:bg-[var(--bg-quaternary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={isExpanded ? `Collapse ${categoryKey}` : `Expand ${categoryKey}`}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-150',
              isExpanded && 'rotate-90'
            )}
            aria-hidden="true"
          />
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: brandColor }} />
        ) : (
          <Folder className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: brandColor }} />
        )}

        {/* Category name */}
        <span className="text-sm truncate flex-1">{categoryKey}</span>

        {/* File count badge */}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
          {stats.total}
        </Badge>
      </div>

      {/* Expanded subcategory details */}
      {isExpanded && (
        <div className="ml-10 mr-2 mt-1 mb-2 space-y-1 text-xs">
          <div className="flex items-center justify-between px-2 py-1 rounded bg-[var(--bg-secondary)]">
            <span className="text-muted-foreground">Story</span>
            <span className="font-mono">{category.story}</span>
          </div>
          <div className="px-2 py-1 text-muted-foreground">
            {category.desc}
          </div>
          <div className="flex gap-2 px-2">
            <Badge variant="success" className="text-[10px]">
              {stats.clean} clean
            </Badge>
            <Badge variant="error" className="text-[10px]">
              {stats.attack} attack
            </Badge>
          </div>
        </div>
      )}
    </li>
  )
})
