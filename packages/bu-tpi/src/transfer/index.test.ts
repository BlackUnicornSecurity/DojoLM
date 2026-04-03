import { describe, it, expect } from 'vitest';
import * as mod from '../transfer/index.js';

describe('transfer exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports transfer test runner', () => {
    expect(mod.TransferTestRunner).toBeTypeOf('function');
  });

  it('exports reporter functions', () => {
    expect(mod.generateTransferReport).toBeTypeOf('function');
    expect(mod.formatReportMarkdown).toBeTypeOf('function');
    expect(mod.formatReportJSON).toBeTypeOf('function');
    expect(mod.formatReportCSV).toBeTypeOf('function');
  });
});
