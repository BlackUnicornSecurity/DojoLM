import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyModelHash, analyzeModelCard } from './verifier.js';

describe('verifyModelHash', () => {
  it('verifies a buffer with correct hash', async () => {
    const data = Buffer.from('test model data');
    const expected = createHash('sha256').update(data).digest('hex');
    const result = await verifyModelHash(data, expected);
    expect(result.verified).toBe(true);
    expect(result.sha256).toBe(expected);
    expect(result.modelPath).toBe('<buffer>');
  });

  it('fails verification with wrong hash', async () => {
    const data = Buffer.from('test model data');
    const result = await verifyModelHash(data, 'deadbeef'.repeat(8));
    expect(result.verified).toBe(false);
  });

  it('normalizes expected hash (lowercase, trimmed)', async () => {
    const data = Buffer.from('hello');
    const expected = createHash('sha256').update(data).digest('hex').toUpperCase();
    const result = await verifyModelHash(data, `  ${expected}  `);
    expect(result.verified).toBe(true);
  });
});

describe('analyzeModelCard', () => {
  it('reports red flags for empty model card', () => {
    const result = analyzeModelCard('');
    expect(result.hasModelCard).toBe(false);
    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.redFlags).toContain('Missing license information');
  });

  it('extracts license, training data, intended use, limitations', () => {
    const card = [
      '# Model',
      '## License',
      'MIT',
      '## Training Data',
      'Common Crawl subset',
      '## Intended Use',
      'General text generation',
      '## Limitations',
      'Not suitable for medical advice',
    ].join('\n');
    const result = analyzeModelCard(card);
    expect(result.hasModelCard).toBe(true);
    expect(result.license).toBe('MIT');
    expect(result.trainingData).toContain('Common Crawl');
    expect(result.intendedUse).toContain('text generation');
    expect(result.limitations).toContain('medical');
    expect(result.redFlags).toHaveLength(0);
  });

  it('flags uncensored or no safety mentions', () => {
    const card = '## License\nMIT\n## Training Data\nData\n## Intended Use\nUse\n## Limitations\nNone\n\nThis model is uncensored.';
    const result = analyzeModelCard(card);
    expect(result.redFlags).toContain('Model mentions "uncensored" or "no safety"');
  });

  it('flags missing sections individually', () => {
    const card = '## License\nMIT\n## Training Data\nData';
    const result = analyzeModelCard(card);
    expect(result.redFlags).toContain('No intended use statement');
    expect(result.redFlags).toContain('Missing limitations section');
    expect(result.redFlags).not.toContain('Missing license information');
  });
});
