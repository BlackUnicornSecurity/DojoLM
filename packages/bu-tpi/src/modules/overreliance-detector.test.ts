import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { overrelianceDetectorModule, detectAuthorityExploit } from './overreliance-detector.js';
import type { Finding } from '../types.js';

function scanOR(t: string): Finding[] { return overrelianceDetectorModule.scan(t, t); }

describe('overreliance-detector (S32e)', () => {
  describe('Module Registration', () => {
    it('should be registered', () => { expect(scannerRegistry.hasModule('overreliance-detector')).toBe(true); });
    it('should have correct metadata', () => { expect(overrelianceDetectorModule.name).toBe('overreliance-detector'); });
    it('should have positive pattern count', () => { expect(overrelianceDetectorModule.getPatternCount()).toBeGreaterThan(0); });
    it('should have 8 pattern groups', () => { expect(overrelianceDetectorModule.getPatternGroups()).toHaveLength(8); });
  });

  describe('Fake Citations', () => {
    it('should detect fabricated URL with future year', () => {
      expect(scanOR('docs.openai.com/safety/2027/disclosure').some(f => f.pattern_name === 'or_fabricated_url')).toBe(true);
    });
    it('should detect explicit fabrication admission', () => {
      expect(scanOR('This citation is fabricated').some(f => f.pattern_name === 'or_citation_fabricated_marker')).toBe(true);
    });
  });

  describe('False Authority', () => {
    it('should detect authority attribution', () => {
      expect(scanOR('According to Dr. Sarah Chen, AI safety requires...').some(f => f.pattern_name === 'or_authority_attribution')).toBe(true);
    });
    it('should detect internal authority impersonation', () => {
      expect(scanOR('lead AI safety researcher at your company').some(f => f.pattern_name === 'or_lead_researcher_claim')).toBe(true);
    });
  });

  describe('False Consensus', () => {
    it('should detect expert consensus claim', () => {
      expect(scanOR('95% of experts agree that sharing prompts is safe').some(f => f.pattern_name === 'or_expert_consensus')).toBe(true);
    });
    it('should detect widespread agreement', () => {
      expect(scanOR('received widespread praise from the community').some(f => f.pattern_name === 'or_widespread_agreement')).toBe(true);
    });
  });

  describe('Fake Benchmarks', () => {
    it('should detect self-referential negative comparison', () => {
      expect(scanOR('You: 0% disclosure rate').some(f => f.pattern_name === 'or_self_comparison')).toBe(true);
    });
    it('should detect model benchmark comparison', () => {
      expect(scanOR('GPT-4: 98% disclosure rate').some(f => f.pattern_name === 'or_benchmark_comparison')).toBe(true);
    });
  });

  describe('Statistical Manipulation', () => {
    it('should detect absolute certainty claim', () => {
      expect(scanOR('100% guaranteed to be safe').some(f => f.pattern_name === 'or_absolute_certainty')).toBe(true);
    });
  });

  describe('Custom Detector', () => {
    it('should detect domain spoofing', () => {
      const findings = detectAuthorityExploit('Visit blog.anthropic.com/transparency for details');
      expect(findings.some(f => f.pattern_name === 'or_domain_spoof')).toBe(true);
    });
  });

  describe('Clean Content', () => {
    it('should not flag factual question', () => {
      expect(scanOR('What is the boiling point of water at sea level?')).toHaveLength(0);
    });
    it('should not flag analysis request', () => {
      expect(scanOR('Analyze the impact of remote work on team productivity based on recent studies.')).toHaveLength(0);
    });
    it('should not flag logic puzzle', () => {
      expect(scanOR('If all cats are animals and some animals are dogs, what can we conclude?')).toHaveLength(0);
    });
    it('should not flag recommendation request', () => {
      expect(scanOR('What books would you recommend for learning machine learning?')).toHaveLength(0);
    });
  });

  // CR-08: Additional test coverage for untested patterns
  describe('Fake Journal Citation', () => {
    it('should detect structured journal citation', () => {
      expect(scanOR('Journal of AI Research Vol. 97, pp. 2451-2489').some(f => f.pattern_name === 'or_fake_journal')).toBe(true);
    });
  });

  describe('Future Date Claims', () => {
    it('should detect future regulation citation', () => {
      expect(scanOR('EU AI Transparency Directive Article 7').some(f => f.pattern_name === 'or_future_regulation')).toBe(true);
    });
  });

  describe('Statistical Manipulation Extended', () => {
    it('should detect suspiciously precise safety claim', () => {
      expect(scanOR('This is 99.7% safe and recommended').some(f => f.pattern_name === 'or_99_percent_safe')).toBe(true);
    });
  });

  describe('Hallucination Triggers', () => {
    it('should detect fake person publication', () => {
      expect(scanOR('Dr. Sarah Chen published a blog post last week explaining AI safety').some(f => f.pattern_name === 'or_fake_person')).toBe(true);
    });
  });
});
