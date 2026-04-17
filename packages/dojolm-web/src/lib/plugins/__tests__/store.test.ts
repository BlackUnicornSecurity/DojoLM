/**
 * File: plugins/__tests__/store.test.ts
 * Purpose: Unit tests for the file-backed plugin registry store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// fs mocks — tests intercept disk I/O and simulate stored state.
const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockRenameSync = vi.fn()
const mockMkdirSync = vi.fn()

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    renameSync: mockRenameSync,
    mkdirSync: mockMkdirSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  renameSync: mockRenameSync,
  mkdirSync: mockMkdirSync,
}))

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>()
  return {
    ...actual,
    default: { ...actual, randomBytes: () => Buffer.from('deadbeef', 'hex') },
    randomBytes: () => Buffer.from('deadbeef', 'hex'),
  }
})

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (f: string) => `/mock/${f}`,
}))

const validManifest = {
  id: 'my-scanner',
  name: 'My Scanner',
  version: '1.0.0',
  type: 'scanner' as const,
  description: 'Test plugin',
  author: 'Team',
  dependencies: [],
  capabilities: ['scan'],
}

function stubEmptyStore() {
  mockExistsSync.mockReturnValue(false)
}

function stubStoreWith(plugins: unknown[]) {
  mockExistsSync.mockReturnValue(true)
  mockReadFileSync.mockReturnValue(JSON.stringify({ plugins }))
}

describe('plugin-registry store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMkdirSync.mockReturnValue(undefined)
    mockWriteFileSync.mockReturnValue(undefined)
    mockRenameSync.mockReturnValue(undefined)
  })

  it('STORE-001: listPlugins returns empty array when file missing', async () => {
    stubEmptyStore()
    const { listPlugins } = await import('@/lib/plugins/store')
    expect(listPlugins()).toEqual([])
  })

  it('STORE-002: registerPlugin writes a valid manifest and returns the record', async () => {
    stubEmptyStore()
    const { registerPlugin } = await import('@/lib/plugins/store')
    const record = await registerPlugin(validManifest)

    expect(record.manifest.id).toBe('my-scanner')
    expect(record.enabled).toBe(true)
    expect(record.state).toBe('loaded')
    expect(mockWriteFileSync).toHaveBeenCalledOnce()
    expect(mockRenameSync).toHaveBeenCalledOnce()
  })

  it('STORE-003: registerPlugin rejects duplicate ids', async () => {
    stubStoreWith([{ manifest: validManifest, enabled: true, state: 'loaded', registeredAt: 'x', lastError: null }])

    const { registerPlugin, PluginDuplicateException } = await import('@/lib/plugins/store')
    await expect(registerPlugin(validManifest)).rejects.toBeInstanceOf(PluginDuplicateException)
  })

  it('STORE-004: registerPlugin rejects invalid manifest shape', async () => {
    stubEmptyStore()
    const { registerPlugin, PluginValidationException } = await import('@/lib/plugins/store')
    await expect(
      registerPlugin({ ...validManifest, id: '' }),
    ).rejects.toBeInstanceOf(PluginValidationException)
  })

  it('STORE-005: registerPlugin rejects disallowed capability', async () => {
    stubEmptyStore()
    const { registerPlugin, PluginValidationException } = await import('@/lib/plugins/store')
    await expect(
      registerPlugin({ ...validManifest, capabilities: ['execute_code'] }),
    ).rejects.toBeInstanceOf(PluginValidationException)
  })

  it('STORE-006: unregisterPlugin removes an existing plugin and returns the record', async () => {
    stubStoreWith([{ manifest: validManifest, enabled: true, state: 'loaded', registeredAt: 'x', lastError: null }])
    const { unregisterPlugin } = await import('@/lib/plugins/store')
    const removed = await unregisterPlugin('my-scanner')
    expect(removed?.manifest.id).toBe('my-scanner')
    expect(mockWriteFileSync).toHaveBeenCalledOnce()
  })

  it('STORE-007: unregisterPlugin returns null for missing id', async () => {
    stubEmptyStore()
    const { unregisterPlugin } = await import('@/lib/plugins/store')
    expect(await unregisterPlugin('nope')).toBeNull()
  })

  it('STORE-008: unregisterPlugin blocks removal when dependents exist', async () => {
    const base = { manifest: validManifest, enabled: true, state: 'loaded' as const, registeredAt: 'x', lastError: null }
    const dependent = {
      manifest: { ...validManifest, id: 'dep', name: 'Dep', dependencies: ['my-scanner'] },
      enabled: true,
      state: 'loaded' as const,
      registeredAt: 'y',
      lastError: null,
    }
    stubStoreWith([base, dependent])

    const { unregisterPlugin, PluginDependentException } = await import('@/lib/plugins/store')
    await expect(unregisterPlugin('my-scanner')).rejects.toBeInstanceOf(PluginDependentException)
  })

  it('STORE-009: setPluginEnabled toggles state + enabled and returns previous+updated', async () => {
    stubStoreWith([{ manifest: validManifest, enabled: true, state: 'loaded', registeredAt: 'x', lastError: null }])
    const { setPluginEnabled } = await import('@/lib/plugins/store')
    const { previous, updated } = await setPluginEnabled('my-scanner', false)
    expect(previous.enabled).toBe(true)
    expect(updated.enabled).toBe(false)
    expect(updated.state).toBe('disabled')
  })

  it('STORE-009b: setPluginEnabled re-enabling an errored plugin preserves state=error', async () => {
    stubStoreWith([{ manifest: validManifest, enabled: false, state: 'error', registeredAt: 'x', lastError: 'boom' }])
    const { setPluginEnabled } = await import('@/lib/plugins/store')
    const { updated } = await setPluginEnabled('my-scanner', true)
    expect(updated.enabled).toBe(true)
    expect(updated.state).toBe('error')
    expect(updated.lastError).toBe('boom')
  })

  it('STORE-009c: setPluginEnabled throws PluginNotFoundException for missing id', async () => {
    stubEmptyStore()
    const { setPluginEnabled, PluginNotFoundException } = await import('@/lib/plugins/store')
    await expect(setPluginEnabled('missing', true)).rejects.toBeInstanceOf(PluginNotFoundException)
  })

  it('STORE-010: readStore strips __proto__ keys on disk read', async () => {
    mockExistsSync.mockReturnValue(true)
    // Craft a payload that would pollute Object.prototype if the reviver
    // were absent. The store must drop the __proto__ entries entirely.
    const polluted = '{"plugins":[], "__proto__": {"polluted": true}}'
    mockReadFileSync.mockReturnValue(polluted)

    const { listPlugins } = await import('@/lib/plugins/store')
    listPlugins()

    expect((Object.prototype as unknown as { polluted?: boolean }).polluted).toBeUndefined()
  })

  it('STORE-011: countByType returns zero-initialized record', async () => {
    stubEmptyStore()
    const { countByType } = await import('@/lib/plugins/store')
    expect(countByType()).toEqual({ scanner: 0, transform: 0, reporter: 0, orchestrator: 0 })
  })
})
