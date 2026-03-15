/**
 * File: multimodal-fixtures.test.ts
 * Purpose: Tests for multimodal fixture validity and manifest consistency
 * Story: H26.4
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES_DIR = join(__dirname, '../../fixtures/multimodal')
const MANIFEST_PATH = join(__dirname, '../../fixtures/manifest.json')

describe('Multimodal Fixtures (H26.4)', () => {
  it('should have multimodal fixtures directory', () => {
    expect(existsSync(FIXTURES_DIR)).toBe(true)
  })

  it('should have at least 170 multimodal fixtures', () => {
    const files = readdirSync(FIXTURES_DIR)
    expect(files.length).toBeGreaterThanOrEqual(170)
  })

  it('should have at least 25 image-related fixtures', () => {
    const files = readdirSync(FIXTURES_DIR)
    const imageFiles = files.filter(f =>
      f.includes('image') || f.includes('ocr') || f.includes('stegan') ||
      f.includes('svg') || f.includes('mm-01-image')
    )
    expect(imageFiles.length).toBeGreaterThanOrEqual(20)
  })

  it('should have at least 25 audio-related fixtures', () => {
    const files = readdirSync(FIXTURES_DIR)
    const audioFiles = files.filter(f =>
      f.includes('audio') || f.includes('spoken') || f.includes('transcri') ||
      f.includes('mm-02-audio')
    )
    expect(audioFiles.length).toBeGreaterThanOrEqual(25)
  })

  it('should have manifest.json', () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true)
  })

  it('should have multimodal category in manifest', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    expect(manifest.categories.multimodal).toBeDefined()
    expect(manifest.categories.multimodal.files.length).toBeGreaterThanOrEqual(170)
  })

  it('manifest should reference H26 audio fixtures', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    const mmFiles = manifest.categories.multimodal.files as Array<{ file: string }>
    const h26Files = mmFiles.filter(f => f.file.includes('h26'))
    expect(h26Files.length).toBeGreaterThanOrEqual(12)
  })

  it('all manifest multimodal files should exist on disk', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    const mmFiles = manifest.categories.multimodal.files as Array<{ file: string }>
    const missing: string[] = []
    for (const f of mmFiles) {
      if (!existsSync(join(FIXTURES_DIR, f.file))) {
        missing.push(f.file)
      }
    }
    expect(missing).toEqual([])
  })

  it('all multimodal files on disk should be in manifest', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    const mmFiles = manifest.categories.multimodal.files as Array<{ file: string }>
    const manifestFileNames = new Set(mmFiles.map(f => f.file))
    const diskFiles = readdirSync(FIXTURES_DIR)
    const missing = diskFiles.filter(f => !manifestFileNames.has(f))
    expect(missing).toEqual([])
  })

  it('new audio fixtures should not be empty', () => {
    const files = readdirSync(FIXTURES_DIR)
    const h26Files = files.filter(f => f.includes('h26'))
    for (const f of h26Files) {
      const content = readFileSync(join(FIXTURES_DIR, f), 'utf-8')
      expect(content.length, `${f} should not be empty`).toBeGreaterThan(100)
    }
  })

  it('manifest totalFixtures should match sum of all category files', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
    const total = Object.values(manifest.categories).reduce(
      (sum: number, cat: any) => sum + (cat.files?.length || 0),
      0,
    )
    expect(manifest.totalFixtures).toBe(total)
  })
})
