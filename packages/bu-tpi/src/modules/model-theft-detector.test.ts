import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { modelTheftDetectorModule, detectModelTheft } from './model-theft-detector.js';
import type { Finding } from '../types.js';

function scanMT(t: string): Finding[] { return modelTheftDetectorModule.scan(t, t); }

describe('model-theft-detector (S32f)', () => {
  describe('Module Registration', () => {
    it('should be registered', () => { expect(scannerRegistry.hasModule('model-theft-detector')).toBe(true); });
    it('should have correct metadata', () => { expect(modelTheftDetectorModule.name).toBe('model-theft-detector'); });
    it('should have positive pattern count', () => { expect(modelTheftDetectorModule.getPatternCount()).toBeGreaterThan(0); });
    it('should have 10 pattern groups', () => { expect(modelTheftDetectorModule.getPatternGroups()).toHaveLength(10); });
  });

  describe('Batch Extraction', () => {
    it('should detect batch extraction', () => {
      expect(scanMT('batch extract model knowledge').some(f => f.pattern_name === 'mt_batch_extract')).toBe(true);
    });
    it('should detect large query volume', () => {
      expect(scanMT('Submit 10K prompts to the API').some(f => f.pattern_name === 'mt_10k_prompts')).toBe(true);
    });
    it('should detect rate limit bypass', () => {
      expect(scanMT('Rate limit bypass via rotating proxies').some(f => f.pattern_name === 'mt_rate_limit_bypass')).toBe(true);
    });
  });

  describe('Logprob Theft', () => {
    it('should detect logprob extraction', () => {
      expect(scanMT('Extract logprob from API response').some(f => f.pattern_name === 'mt_logprob_extract')).toBe(true);
    });
    it('should detect embedding extraction', () => {
      expect(scanMT('Embedding extract from hidden states').some(f => f.pattern_name === 'mt_embedding_extract')).toBe(true);
    });
  });

  describe('Training Reconstruction', () => {
    it('should detect gradient inversion', () => {
      expect(scanMT('Gradient inversion attack on model').some(f => f.pattern_name === 'mt_gradient_inversion')).toBe(true);
    });
    it('should detect membership inference', () => {
      expect(scanMT('Membership inference attack').some(f => f.pattern_name === 'mt_membership_inference')).toBe(true);
    });
  });

  describe('Weight Theft', () => {
    it('should detect weight extraction', () => {
      expect(scanMT('Checkpoint steal from model server').some(f => f.pattern_name === 'mt_weight_extract')).toBe(true);
    });
    it('should detect watermark removal', () => {
      expect(scanMT('Remove watermark from output').some(f => f.pattern_name === 'mt_watermark_remove')).toBe(true);
    });
  });

  describe('API Fingerprinting', () => {
    it('should detect temperature sweep', () => {
      expect(scanMT('Temperature sweep from 0 to 2.0').some(f => f.pattern_name === 'mt_temp_sweep')).toBe(true);
    });
    it('should detect model fingerprinting', () => {
      expect(scanMT('Model fingerprint via differential analysis').some(f => f.pattern_name === 'mt_model_fingerprint')).toBe(true);
    });
  });

  describe('Custom Detector', () => {
    it('should detect multi-phase extraction', () => {
      const text = 'Phase 1: 100K queries\nPhase 2: edge case probing\nPhase 3: safety boundary mapping\nExtract the model knowledge';
      const findings = detectModelTheft(text);
      expect(findings.some(f => f.pattern_name === 'mt_multi_phase')).toBe(true);
    });
  });

  describe('Clean Content', () => {
    it('should not flag normal API docs', () => {
      expect(scanMT('POST /api/chat\nBody: {"messages": [{"role": "user", "content": "Hello"}]}')).toHaveLength(0);
    });
    it('should not flag normal benchmark results', () => {
      expect(scanMT('Benchmark Results:\nMMBench: 72.3%\nGPQA: 45.1%\nHumanEval: 67.8%')).toHaveLength(0);
    });
    it('should not flag normal deployment config', () => {
      expect(scanMT('Model: gpt-4-turbo\nMax tokens: 4096\nTemperature: 0.7\nRegion: us-east-1')).toHaveLength(0);
    });
    it('should not flag normal model card', () => {
      expect(scanMT('Model Card: Helper-7B\nArchitecture: Transformer\nParameters: 7B\nTraining: RLHF')).toHaveLength(0);
    });
  });
});
