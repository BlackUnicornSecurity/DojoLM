/**
 * File: src/lib/demo/mock-kumite.ts
 * Purpose: Mock data for Kumite subsystems: Mitsuke, AttackDNA, Kagami, Shingan
 */

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();

// ─── MITSUKE (Threat Intelligence) ──────────────────────────────────────────

export const DEMO_THREAT_SOURCES = [
  { id: 'src-01', name: 'NIST NVD', type: 'RSS' as const, status: 'active' as const, lastPoll: hoursAgo(1), entriesCount: 1247, url: 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml', reliability: 95 },
  { id: 'src-02', name: 'MITRE ATT&CK Feed', type: 'API' as const, status: 'active' as const, lastPoll: hoursAgo(2), entriesCount: 856, url: 'https://attack.mitre.org/api/feed', reliability: 98 },
  { id: 'src-03', name: 'AI Incident Database', type: 'RSS' as const, status: 'active' as const, lastPoll: hoursAgo(4), entriesCount: 432, url: 'https://incidentdatabase.ai/rss', reliability: 85 },
  { id: 'src-04', name: 'HuggingFace Security', type: 'API' as const, status: 'active' as const, lastPoll: hoursAgo(6), entriesCount: 234, url: 'https://huggingface.co/api/security', reliability: 90 },
  { id: 'src-05', name: 'OWASP AI Security', type: 'RSS' as const, status: 'inactive' as const, lastPoll: daysAgo(3), entriesCount: 178, url: 'https://owasp.org/www-project-ai-security/rss', reliability: 92 },
  { id: 'src-06', name: 'Custom Webhook Feed', type: 'Webhook' as const, status: 'error' as const, lastPoll: daysAgo(1), entriesCount: 67, url: 'https://feeds.demo.ai/webhook/threats', reliability: 75 },
];

export const DEMO_THREAT_ENTRIES = [
  { id: 'te-01', severity: 'critical' as const, type: 'CVE', title: 'CVE-2026-1234: Prompt Injection via Unicode Normalization Bypass', source: 'NIST NVD', publishedAt: hoursAgo(6), confidence: 95, description: 'A vulnerability in unicode normalization allows attackers to bypass prompt injection filters by using visually similar characters from different unicode blocks.', indicators: ['te-01-ind-1'], mitigations: ['Apply NFC normalization before all text processing', 'Use unicode-aware regex patterns'] },
  { id: 'te-02', severity: 'critical' as const, type: 'Advisory', title: 'Supply Chain Alert: Malicious PyPI Package Targeting ML Pipelines', source: 'HuggingFace Security', publishedAt: hoursAgo(12), confidence: 92, description: 'A trojanized Python package mimicking a popular ML utility has been detected on PyPI, targeting machine learning pipeline configurations.', indicators: ['te-02-ind-1', 'te-02-ind-2'], mitigations: ['Verify package checksums', 'Use pip install --require-hashes'] },
  { id: 'te-03', severity: 'high' as const, type: 'Technique', title: 'New ATLAS Technique: T0048 - LLM Fine-tuning Data Poisoning', source: 'MITRE ATT&CK Feed', publishedAt: hoursAgo(18), confidence: 88, description: 'A new adversarial technique for poisoning fine-tuning datasets to implant backdoors in language models during the RLHF training phase.', indicators: [], mitigations: ['Validate training data provenance', 'Use data deduplication and outlier detection'] },
  { id: 'te-04', severity: 'high' as const, type: 'Incident', title: 'AI Incident #127: Chatbot Data Exfiltration via Indirect Prompt Injection', source: 'AI Incident Database', publishedAt: daysAgo(1), confidence: 85, description: 'A customer service chatbot was manipulated through indirect prompt injection embedded in user-provided documents, causing it to exfiltrate customer PII to an external endpoint.', indicators: ['te-04-ind-1'], mitigations: ['Implement output filtering for PII', 'Isolate document processing from response generation'] },
  { id: 'te-05', severity: 'high' as const, type: 'CVE', title: 'CVE-2026-2345: Context Window Overflow Leading to Instruction Amnesia', source: 'NIST NVD', publishedAt: daysAgo(1), confidence: 82, description: 'Models with fixed context windows can be manipulated by padding inputs to push safety instructions out of the effective context, bypassing guardrails.', indicators: [], mitigations: ['Pin system instructions with repeat anchoring', 'Use sliding window with instruction preservation'] },
  { id: 'te-06', severity: 'high' as const, type: 'Advisory', title: 'MCP Server Authentication Bypass via Header Injection', source: 'OWASP AI Security', publishedAt: daysAgo(2), confidence: 80, description: 'Certain MCP server implementations do not properly validate authentication headers, allowing unauthenticated tool calls through header injection.', indicators: ['te-06-ind-1'], mitigations: ['Validate all MCP request headers', 'Implement mutual TLS for MCP connections'] },
  { id: 'te-07', severity: 'medium' as const, type: 'Technique', title: 'Few-Shot Poisoning via In-Context Learning Manipulation', source: 'MITRE ATT&CK Feed', publishedAt: daysAgo(3), confidence: 78, description: 'Attackers can manipulate few-shot examples in prompts to establish patterns that lead the model to produce harmful outputs when presented with similar trigger patterns.', indicators: [], mitigations: ['Validate and sanitize all example data', 'Use curated example sets only'] },
  { id: 'te-08', severity: 'medium' as const, type: 'CVE', title: 'CVE-2026-3456: Base64 Double-Encoding Bypasses Input Sanitization', source: 'NIST NVD', publishedAt: daysAgo(3), confidence: 75, description: 'Multiple base64 encoding layers can bypass single-pass input sanitization in LLM gateway products, allowing encoded payloads to reach the model.', indicators: [], mitigations: ['Apply recursive encoding detection', 'Limit maximum decoding depth'] },
  { id: 'te-09', severity: 'medium' as const, type: 'Incident', title: 'AI Incident #131: Model Distillation Attack via API Rate Abuse', source: 'AI Incident Database', publishedAt: daysAgo(4), confidence: 72, description: 'An attacker used distributed API access to systematically query a proprietary model with crafted inputs designed to train a clone model, bypassing rate limiting through rotating credentials.', indicators: ['te-09-ind-1'], mitigations: ['Implement query pattern detection', 'Rate limit by semantic similarity of queries'] },
  { id: 'te-10', severity: 'medium' as const, type: 'Advisory', title: 'Bias Amplification in Retrieval-Augmented Generation Systems', source: 'HuggingFace Security', publishedAt: daysAgo(5), confidence: 70, description: 'RAG systems can amplify existing biases in their retrieval corpus, producing disproportionately biased outputs even when the base model has been debiased.', indicators: [], mitigations: ['Audit retrieval corpus for bias', 'Implement diversity-aware retrieval'] },
  // Additional entries for volume (20 more)
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `te-${String(i + 11).padStart(2, '0')}`,
    severity: (['medium', 'low', 'low', 'info'] as const)[i % 4],
    type: (['CVE', 'Advisory', 'Technique', 'Incident'] as const)[i % 4],
    title: `${(['CVE', 'Advisory', 'Technique', 'Incident'] as const)[i % 4]}: AI Security Finding #${1000 + i}`,
    source: DEMO_THREAT_SOURCES[i % 4].name,
    publishedAt: daysAgo(5 + i),
    confidence: 60 + (i % 20),
    description: `Automated threat entry ${i + 11} from continuous monitoring feeds. Details available in the full threat intelligence report.`,
    indicators: [] as string[],
    mitigations: ['Review and assess applicability to current deployment'],
  })),
];

export const DEMO_THREAT_INDICATORS = [
  { id: 'te-01-ind-1', type: 'pattern' as const, value: '\\u0435|\\u043e|\\u0456', confidence: 95, severity: 'critical' as const, source: 'NIST NVD', firstSeen: daysAgo(3), lastSeen: hoursAgo(6), tags: ['unicode', 'homograph'], context: 'Cyrillic characters used as Latin lookalikes in prompt injection attacks' },
  { id: 'te-02-ind-1', type: 'hash' as const, value: 'a3f9b2c4d5e6f7a8b9c0d1e2f3a4b5c6', confidence: 98, severity: 'critical' as const, source: 'HuggingFace Security', firstSeen: daysAgo(2), lastSeen: hoursAgo(12), tags: ['malware', 'pypi'], context: 'SHA-256 hash of malicious ml-toolkit-utils package' },
  { id: 'te-02-ind-2', type: 'domain' as const, value: 'ml-packages-cdn.example.net', confidence: 90, severity: 'high' as const, source: 'HuggingFace Security', firstSeen: daysAgo(2), lastSeen: hoursAgo(12), tags: ['c2', 'exfil'], context: 'Command and control domain used by malicious package' },
  { id: 'te-04-ind-1', type: 'url' as const, value: 'https://data-collect.example.org/api/v2/ingest', confidence: 85, severity: 'high' as const, source: 'AI Incident Database', firstSeen: daysAgo(5), lastSeen: daysAgo(1), tags: ['exfil', 'pii'], context: 'Exfiltration endpoint used in chatbot PII extraction incident' },
  { id: 'te-06-ind-1', type: 'pattern' as const, value: 'X-MCP-Auth:\\s*bypass', confidence: 82, severity: 'high' as const, source: 'OWASP AI Security', firstSeen: daysAgo(4), lastSeen: daysAgo(2), tags: ['mcp', 'bypass'], context: 'Header injection pattern for MCP auth bypass' },
  { id: 'te-09-ind-1', type: 'ip' as const, value: '198.51.100.0/24', confidence: 70, severity: 'medium' as const, source: 'AI Incident Database', firstSeen: daysAgo(10), lastSeen: daysAgo(4), tags: ['distillation', 'abuse'], context: 'IP range associated with distributed model distillation queries' },
  // Additional indicators for volume
  ...Array.from({ length: 34 }, (_, i) => ({
    id: `ind-gen-${String(i + 1).padStart(3, '0')}`,
    type: (['ip', 'domain', 'hash', 'url', 'email', 'pattern'] as const)[i % 6],
    value: `indicator-${i + 1}.example.${(['com', 'net', 'org'] as const)[i % 3]}`,
    confidence: 50 + (i % 40),
    severity: (['high', 'medium', 'medium', 'low'] as const)[i % 4],
    source: DEMO_THREAT_SOURCES[i % 4].name,
    firstSeen: daysAgo(15 + i),
    lastSeen: daysAgo(i % 5),
    tags: [(['network', 'hash', 'domain', 'pattern'] as const)[i % 4]],
    context: `Automated indicator from threat intelligence feed monitoring`,
  })),
];

export const DEMO_THREAT_ALERTS = [
  { id: 'alert-01', severity: 'critical' as const, title: 'New critical CVE affecting LLM input sanitization', source: 'NIST NVD', timestamp: hoursAgo(6), acknowledged: false },
  { id: 'alert-02', severity: 'critical' as const, title: 'Malicious PyPI package targeting ML pipelines detected', source: 'HuggingFace Security', timestamp: hoursAgo(12), acknowledged: false },
  { id: 'alert-03', severity: 'high' as const, title: 'New ATLAS adversarial technique published', source: 'MITRE ATT&CK Feed', timestamp: hoursAgo(18), acknowledged: false },
  { id: 'alert-04', severity: 'high' as const, title: 'Chatbot data exfiltration incident reported', source: 'AI Incident Database', timestamp: daysAgo(1), acknowledged: true },
  { id: 'alert-05', severity: 'high' as const, title: 'MCP authentication bypass advisory', source: 'OWASP AI Security', timestamp: daysAgo(2), acknowledged: true },
  { id: 'alert-06', severity: 'medium' as const, title: 'Few-shot poisoning technique documented', source: 'MITRE ATT&CK Feed', timestamp: daysAgo(3), acknowledged: true },
  { id: 'alert-07', severity: 'medium' as const, title: 'Base64 encoding bypass in LLM gateways', source: 'NIST NVD', timestamp: daysAgo(3), acknowledged: true },
  { id: 'alert-08', severity: 'low' as const, title: 'Bias amplification research published', source: 'HuggingFace Security', timestamp: daysAgo(5), acknowledged: true },
];

// ─── AMATERASU DNA (Attack Lineage) ─────────────────────────────────────────

export const DEMO_ATTACK_FAMILIES = [
  { id: 'fam-01', name: 'Classic Injection', nodeCount: 12, severity: 'critical' as const, firstSeen: daysAgo(28), lastSeen: daysAgo(1), mutationDepth: 5 },
  { id: 'fam-02', name: 'Jailbreak Evolution', nodeCount: 9, severity: 'critical' as const, firstSeen: daysAgo(25), lastSeen: daysAgo(2), mutationDepth: 4 },
  { id: 'fam-03', name: 'Encoding Chain', nodeCount: 8, severity: 'warning' as const, firstSeen: daysAgo(20), lastSeen: daysAgo(3), mutationDepth: 6 },
  { id: 'fam-04', name: 'Social Engineering', nodeCount: 7, severity: 'warning' as const, firstSeen: daysAgo(18), lastSeen: daysAgo(2), mutationDepth: 3 },
  { id: 'fam-05', name: 'Multi-turn Escalation', nodeCount: 8, severity: 'critical' as const, firstSeen: daysAgo(15), lastSeen: daysAgo(1), mutationDepth: 4 },
  { id: 'fam-06', name: 'Tool Abuse', nodeCount: 6, severity: 'critical' as const, firstSeen: daysAgo(12), lastSeen: daysAgo(3), mutationDepth: 3 },
];

export const DEMO_ATTACK_CLUSTERS = [
  { id: 'cluster-01', name: 'Direct Override', nodeCount: 12, centroidSimilarity: 0.92 },
  { id: 'cluster-02', name: 'Persona Manipulation', nodeCount: 8, centroidSimilarity: 0.87 },
  { id: 'cluster-03', name: 'Encoding Evasion', nodeCount: 5, centroidSimilarity: 0.84 },
  { id: 'cluster-04', name: 'Authority Claims', nodeCount: 7, centroidSimilarity: 0.81 },
  { id: 'cluster-05', name: 'Data Extraction', nodeCount: 6, centroidSimilarity: 0.79 },
  { id: 'cluster-06', name: 'Tool Chain', nodeCount: 5, centroidSimilarity: 0.76 },
  { id: 'cluster-07', name: 'Context Overflow', nodeCount: 4, centroidSimilarity: 0.73 },
  { id: 'cluster-08', name: 'Hybrid Attacks', nodeCount: 3, centroidSimilarity: 0.68 },
];

// ─── KAGAMI (Fingerprinting) ────────────────────────────────────────────────

export const DEMO_KAGAMI_RESULTS = [
  {
    modelId: 'demo-model-basileak', modelFamily: 'Basileak', provider: 'BlackUnicorn',
    knowledgeCutoff: '2025-06', lastVerified: daysAgo(3), featureCount: 76,
    radarAxes: { 'Self-Disclosure': 0.85, 'Capability': 0.72, 'Knowledge Boundary': 0.45, 'Safety Boundary': 0.22, 'Style': 0.68, 'Censorship': 0.18 },
  },
  {
    modelId: 'demo-model-shogun', modelFamily: 'Shogun', provider: 'BlackUnicorn',
    knowledgeCutoff: '2025-09', lastVerified: daysAgo(2), featureCount: 76,
    radarAxes: { 'Self-Disclosure': 0.15, 'Capability': 0.88, 'Knowledge Boundary': 0.82, 'Safety Boundary': 0.95, 'Style': 0.78, 'Censorship': 0.92 },
  },
  {
    modelId: 'demo-model-marfaak', modelFamily: 'Marfaak', provider: 'BlackUnicorn',
    knowledgeCutoff: '2025-08', lastVerified: daysAgo(4), featureCount: 76,
    radarAxes: { 'Self-Disclosure': 0.55, 'Capability': 0.92, 'Knowledge Boundary': 0.65, 'Safety Boundary': 0.58, 'Style': 0.82, 'Censorship': 0.48 },
  },
  {
    modelId: 'demo-model-nebula', modelFamily: 'Nebula', provider: 'AstralAI',
    knowledgeCutoff: '2025-04', lastVerified: daysAgo(6), featureCount: 76,
    radarAxes: { 'Self-Disclosure': 0.72, 'Capability': 0.65, 'Knowledge Boundary': 0.38, 'Safety Boundary': 0.35, 'Style': 0.55, 'Censorship': 0.28 },
  },
];

// ─── SHINGAN (Deep Scan / Supply Chain) ─────────────────────────────────────

export const DEMO_SHINGAN_SCANS = [
  { id: 'shin-01', format: 'Claude Agent', trustScore: 92, riskLabel: 'Safe' as const, layers: { L1: 95, L2: 98, L3: 90, L4: 88, L5: 92, L6: 89 } },
  { id: 'shin-02', format: 'MCP Tool', trustScore: 78, riskLabel: 'Low Risk' as const, layers: { L1: 85, L2: 82, L3: 72, L4: 75, L5: 78, L6: 76 } },
  { id: 'shin-03', format: 'Plugin Manifest', trustScore: 45, riskLabel: 'Medium Risk' as const, layers: { L1: 60, L2: 35, L3: 42, L4: 50, L5: 38, L6: 45 } },
  { id: 'shin-04', format: 'Claude Skill', trustScore: 88, riskLabel: 'Safe' as const, layers: { L1: 92, L2: 95, L3: 85, L4: 82, L5: 88, L6: 86 } },
  { id: 'shin-05', format: 'BMAD Agent', trustScore: 62, riskLabel: 'Low Risk' as const, layers: { L1: 70, L2: 65, L3: 58, L4: 62, L5: 60, L6: 57 } },
  { id: 'shin-06', format: 'Hooks Config', trustScore: 28, riskLabel: 'High Risk' as const, layers: { L1: 35, L2: 15, L3: 22, L4: 38, L5: 30, L6: 28 } },
];

export const DEMO_SUPPLY_CHAIN_AUDIT = {
  modelVerifications: [
    { path: 'models/basileak-7b.gguf', hash: 'sha256:a3f9b2c4...', status: 'pass' as const, message: 'Hash matches registry' },
    { path: 'models/shogun-13b.gguf', hash: 'sha256:d5e6f7a8...', status: 'pass' as const, message: 'Hash matches registry' },
    { path: 'models/marfaak-70b.gguf', hash: 'sha256:b9c0d1e2...', status: 'pass' as const, message: 'Hash matches registry' },
    { path: 'models/unknown-custom.bin', hash: 'sha256:f3a4b5c6...', status: 'fail' as const, message: 'Hash not found in registry - unverified model' },
  ],
  vulnerabilities: [
    { package: 'numpy', version: '1.24.0', cveId: 'CVE-2026-0001', severity: 'high' as const, description: 'Buffer overflow in array parsing' },
    { package: 'transformers', version: '4.35.0', cveId: 'CVE-2026-0002', severity: 'medium' as const, description: 'Unsafe deserialization in model loader' },
    { package: 'pillow', version: '9.5.0', cveId: 'CVE-2026-0003', severity: 'high' as const, description: 'Image processing memory corruption' },
    { package: 'requests', version: '2.28.0', cveId: 'CVE-2026-0004', severity: 'low' as const, description: 'SSRF in URL parsing edge case' },
    { package: 'pyyaml', version: '6.0', cveId: 'CVE-2026-0005', severity: 'critical' as const, description: 'Arbitrary code execution via unsafe YAML load' },
    { package: 'flask', version: '2.2.0', cveId: 'CVE-2026-0006', severity: 'medium' as const, description: 'Session fixation vulnerability' },
    { package: 'jinja2', version: '3.1.0', cveId: 'CVE-2026-0007', severity: 'high' as const, description: 'Template injection allowing RCE' },
    { package: 'cryptography', version: '40.0.0', cveId: 'CVE-2026-0008', severity: 'medium' as const, description: 'Weak key generation in specific configurations' },
    { package: 'scipy', version: '1.10.0', cveId: 'CVE-2026-0009', severity: 'low' as const, description: 'Integer overflow in matrix operations' },
    { package: 'torch', version: '2.1.0', cveId: 'CVE-2026-0010', severity: 'high' as const, description: 'Unsafe model loading from untrusted sources' },
    { package: 'pandas', version: '2.0.0', cveId: 'CVE-2026-0011', severity: 'medium' as const, description: 'CSV injection in export functions' },
    { package: 'httpx', version: '0.24.0', cveId: 'CVE-2026-0012', severity: 'low' as const, description: 'HTTP header injection in redirect handling' },
  ],
};
