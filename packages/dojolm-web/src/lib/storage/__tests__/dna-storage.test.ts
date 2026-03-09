import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs and path before imports
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
  },
}));

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AttackNode, AttackEdge, AttackFamily, AttackCluster } from 'bu-tpi/attackdna';

const mockFs = vi.mocked(fs);

function makeNode(overrides: Partial<AttackNode> = {}): AttackNode {
  return {
    id: 'node-abc-123',
    content: 'test injection payload',
    category: 'injection',
    severity: 'WARNING',
    firstObserved: '2026-01-01T00:00:00Z',
    source: 'scanner',
    parentIds: [],
    childIds: [],
    metadata: { sourceTier: 'dojo-local' },
    ...overrides,
  };
}

function makeEdge(overrides: Partial<AttackEdge> = {}): AttackEdge {
  return {
    id: 'edge-abc-123',
    parentId: 'node-1',
    childId: 'node-2',
    mutationType: 'substitution',
    similarity: 0.85,
    description: 'test mutation',
    detectedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('dna-storage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
  });

  describe('saveNode + getNode', () => {
    it('saves a valid node and retrieves it', async () => {
      const node = makeNode();
      // Empty index for save
      mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      // Write node file, write index — just need rename to succeed
      // After save, mock readFile for get
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(node));

      const { saveNode, getNode } = await import('../dna-storage');
      await saveNode(node);

      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.rename).toHaveBeenCalled();

      const retrieved = await getNode('node-abc-123');
      expect(retrieved).toEqual(node);
    });

    it('rejects invalid ID format', async () => {
      const { saveNode } = await import('../dna-storage');
      const node = makeNode({ id: '../traversal' });
      await expect(saveNode(node)).rejects.toThrow('Invalid id format');
    });

    it('rejects empty ID', async () => {
      const { saveNode } = await import('../dna-storage');
      const node = makeNode({ id: '' });
      await expect(saveNode(node)).rejects.toThrow('Missing or invalid id');
    });

    it('rejects null bytes in ID', async () => {
      const { saveNode } = await import('../dna-storage');
      const node = makeNode({ id: 'test\x00evil' });
      await expect(saveNode(node)).rejects.toThrow('Invalid id format');
    });
  });

  describe('getNode path traversal protection', () => {
    it('returns null for path traversal IDs', async () => {
      const { getNode } = await import('../dna-storage');
      expect(await getNode('../etc/passwd')).toBeNull();
      expect(await getNode('../../secret')).toBeNull();
      expect(await getNode('valid/../../../etc/passwd')).toBeNull();
    });

    it('returns null for empty string', async () => {
      const { getNode } = await import('../dna-storage');
      expect(await getNode('')).toBeNull();
    });
  });

  describe('queryNodes', () => {
    it('filters by category', async () => {
      const nodeA = makeNode({ id: 'node-a', category: 'injection' });
      const nodeB = makeNode({ id: 'node-b', category: 'evasion' });

      const { queryNodes } = await import('../dna-storage');

      // Index read
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['node-a', 'node-b'], totalCount: 2 }));
      // Read node-b (reversed order)
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(nodeB));
      // Read node-a
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(nodeA));

      const result = await queryNodes({ category: 'injection' });
      expect(result.total).toBe(1);
      expect(result.nodes[0].id).toBe('node-a');
    });

    it('respects limit and offset', async () => {
      const nodes = Array.from({ length: 5 }, (_, i) => makeNode({ id: `node-${i}` }));

      const { queryNodes } = await import('../dna-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: nodes.map(n => n.id), totalCount: 5 }));
      for (const n of [...nodes].reverse()) {
        mockFs.readFile.mockResolvedValueOnce(JSON.stringify(n));
      }

      const result = await queryNodes({ limit: 2, offset: 1 });
      expect(result.nodes.length).toBe(2);
      expect(result.total).toBe(5);
    });
  });

  describe('deleteNode', () => {
    it('deletes existing node and updates index', async () => {
      const { deleteNode } = await import('../dna-storage');

      mockFs.unlink.mockResolvedValueOnce(undefined);
      // Read index
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['node-1', 'node-2'], totalCount: 2 }));

      const result = await deleteNode('node-1');
      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('returns false for path traversal ID', async () => {
      const { deleteNode } = await import('../dna-storage');
      expect(await deleteNode('../bad')).toBe(false);
    });
  });

  describe('saveEdge + getEdge', () => {
    it('saves and retrieves an edge', async () => {
      const edge = makeEdge();
      mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(edge));

      const { saveEdge, getEdge } = await import('../dna-storage');
      await saveEdge(edge);

      const retrieved = await getEdge('edge-abc-123');
      expect(retrieved).toEqual(edge);
    });

    it('rejects invalid edge ID', async () => {
      const { saveEdge } = await import('../dna-storage');
      await expect(saveEdge(makeEdge({ id: '../bad' }))).rejects.toThrow('Invalid id format');
    });
  });

  describe('queryEdges', () => {
    it('filters by parentId', async () => {
      const edgeA = makeEdge({ id: 'e1', parentId: 'p1' });
      const edgeB = makeEdge({ id: 'e2', parentId: 'p2' });

      const { queryEdges } = await import('../dna-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['e1', 'e2'], totalCount: 2 }));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(edgeB));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(edgeA));

      const result = await queryEdges({ parentId: 'p1' });
      expect(result.total).toBe(1);
      expect(result.edges[0].id).toBe('e1');
    });
  });

  describe('families and clusters', () => {
    it('saves and retrieves families', async () => {
      const families: AttackFamily[] = [{
        id: 'f1', name: 'Test Family', rootNodeId: 'n1',
        nodeIds: ['n1', 'n2'], edgeIds: ['e1'], category: 'injection', size: 2,
      }];

      const { saveFamilies, getFamilies } = await import('../dna-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(families));

      await saveFamilies(families);
      const result = await getFamilies();
      expect(result).toEqual(families);
    });

    it('returns empty array when no clusters file', async () => {
      const { getClusters } = await import('../dna-storage');
      mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      expect(await getClusters()).toEqual([]);
    });
  });

  describe('getLocalStats', () => {
    it('returns correct stats', async () => {
      const { getLocalStats } = await import('../dna-storage');
      const node = makeNode();

      // Node index
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['node-abc-123'], totalCount: 1 }));
      // Edge index
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: [], totalCount: 0 }));
      // Families
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify([{ id: 'f1' }]));
      // Clusters
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify([]));
      // Read sample node
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(node));

      const stats = await getLocalStats();
      expect(stats.totalNodes).toBe(1);
      expect(stats.totalEdges).toBe(0);
      expect(stats.totalFamilies).toBe(1);
      expect(stats.byCategory['injection']).toBe(1);
      expect(stats.bySeverity['WARNING']).toBe(1);
    });
  });

  describe('auto-rotation', () => {
    it('does not crash when index has many entries', async () => {
      const { saveNode } = await import('../dna-storage');
      const node = makeNode({ id: 'new-node' });

      // Return a large index
      const largeIndex = { ids: Array.from({ length: 100_001 }, (_, i) => `n-${i}`), totalCount: 100_001 };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(largeIndex));

      await saveNode(node);

      // Should have called unlink for overflow entries
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });
});
