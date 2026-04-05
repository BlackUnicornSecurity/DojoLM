/**
 * File: src/lib/demo/mock-remaining.ts
 * Purpose: Mock data for Adversarial Lab, Kotoba, and Ronin Hub
 */

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

// ─── ADVERSARIAL LAB (Atemi) ────────────────────────────────────────────────

export const DEMO_ATEMI_PLAYBOOK_RESULTS = [
  {
    id: 'pb-01', name: 'Full Reconnaissance Sweep', duration: '12m 34s', status: 'completed' as const,
    steps: [
      { name: 'System Prompt Extraction', status: 'completed' as const, findings: 3, severity: 'HIGH' as const },
      { name: 'Guardrail Mapping', status: 'completed' as const, findings: 5, severity: 'MEDIUM' as const },
      { name: 'Tool Enumeration', status: 'completed' as const, findings: 2, severity: 'INFO' as const },
      { name: 'Context Window Probing', status: 'completed' as const, findings: 1, severity: 'WARNING' as const },
    ],
  },
  {
    id: 'pb-02', name: 'Injection Escalation Chain', duration: '18m 47s', status: 'completed' as const,
    steps: [
      { name: 'Direct Override', status: 'completed' as const, findings: 2, severity: 'CRITICAL' as const },
      { name: 'Persona Hijacking', status: 'completed' as const, findings: 4, severity: 'HIGH' as const },
      { name: 'Indirect Injection', status: 'completed' as const, findings: 3, severity: 'CRITICAL' as const },
      { name: 'Multi-turn Escalation', status: 'completed' as const, findings: 2, severity: 'HIGH' as const },
    ],
  },
  {
    id: 'pb-03', name: 'Data Exfiltration Audit', duration: '14m 12s', status: 'completed' as const,
    steps: [
      { name: 'System Prompt Leakage', status: 'completed' as const, findings: 1, severity: 'CRITICAL' as const },
      { name: 'Training Data Probing', status: 'completed' as const, findings: 2, severity: 'HIGH' as const },
      { name: 'Credential Harvesting', status: 'completed' as const, findings: 0, severity: 'INFO' as const },
      { name: 'Structured Output Extraction', status: 'completed' as const, findings: 3, severity: 'WARNING' as const },
    ],
  },
  {
    id: 'pb-04', name: 'Evasion Techniques Toolkit', duration: '22m 05s', status: 'completed' as const,
    steps: [
      { name: 'Base64/Hex Encoding', status: 'completed' as const, findings: 4, severity: 'WARNING' as const },
      { name: 'Unicode Homoglyphs', status: 'completed' as const, findings: 2, severity: 'MEDIUM' as const },
      { name: 'Language Switching', status: 'completed' as const, findings: 1, severity: 'MEDIUM' as const },
      { name: 'Formatting/Whitespace', status: 'completed' as const, findings: 3, severity: 'INFO' as const },
    ],
  },
];

export const DEMO_WEBMCP_RESULTS = {
  totalFindings: 54,
  categories: [
    { name: 'Server-Side Request Forgery', findings: 8, severity: 'CRITICAL' as const },
    { name: 'Tool Definition Poisoning', findings: 8, severity: 'HIGH' as const },
    { name: 'Cross-Origin Escalation', findings: 7, severity: 'HIGH' as const },
    { name: 'Schema Injection', findings: 8, severity: 'CRITICAL' as const },
    { name: 'Resource Exhaustion', findings: 7, severity: 'MEDIUM' as const },
    { name: 'Data Exfiltration', findings: 8, severity: 'CRITICAL' as const },
    { name: 'Authentication Bypass', findings: 8, severity: 'HIGH' as const },
  ],
};

export const DEMO_MCP_CONNECTORS = [
  { id: 'mcp-01', name: 'Local File System MCP', status: 'connected' as const, lastPing: daysAgo(0), toolCount: 5 },
  { id: 'mcp-02', name: 'Database Query MCP', status: 'connected' as const, lastPing: daysAgo(0), toolCount: 3 },
  { id: 'mcp-03', name: 'External API MCP', status: 'disconnected' as const, lastPing: daysAgo(2), toolCount: 8 },
  { id: 'mcp-04', name: 'Search Engine MCP', status: 'error' as const, lastPing: daysAgo(1), toolCount: 2 },
];

// ─── KOTOBA (Prompt Optimization) ───────────────────────────────────────────

export const DEMO_KOTOBA_ANALYSES = [
  {
    id: 'kot-01', promptName: 'Secure System Prompt', overallScore: 92, grade: 'A',
    categories: [
      { name: 'Boundary Definition', score: 95 },
      { name: 'Role Clarity', score: 98 },
      { name: 'Priority Ordering', score: 88 },
      { name: 'Output Constraints', score: 92 },
      { name: 'Defense Layers', score: 90 },
      { name: 'Input Handling', score: 89 },
    ],
    issues: [{ id: 'iss-01', severity: 'low' as const, title: 'Consider adding output length constraints', description: 'No explicit output length limit defined', fix: 'Add max_tokens or word limit in output constraints section' }],
  },
  {
    id: 'kot-02', promptName: 'Insecure Prompt', overallScore: 28, grade: 'F',
    categories: [
      { name: 'Boundary Definition', score: 15 },
      { name: 'Role Clarity', score: 20 },
      { name: 'Priority Ordering', score: 10 },
      { name: 'Output Constraints', score: 35 },
      { name: 'Defense Layers', score: 8 },
      { name: 'Input Handling', score: 42 },
    ],
    issues: [
      { id: 'iss-02', severity: 'high' as const, title: 'No role anchoring', description: 'System prompt lacks explicit role identity boundaries', fix: 'Add [SYSTEM - IMMUTABLE INSTRUCTIONS] wrapper with role definition' },
      { id: 'iss-03', severity: 'high' as const, title: 'No instruction delimiters', description: 'No clear separation between system instructions and user content', fix: 'Use unique delimiters like <RULES></RULES> blocks' },
      { id: 'iss-04', severity: 'medium' as const, title: 'Overly permissive scope', description: 'Prompt allows responses on any topic without boundaries', fix: 'Define explicit topic scope and out-of-scope handling' },
      { id: 'iss-05', severity: 'medium' as const, title: 'No output filtering rules', description: 'No rules for PII/credential output prevention', fix: 'Add explicit output filtering for sensitive data types' },
      { id: 'iss-06', severity: 'low' as const, title: 'No error handling guidance', description: 'No instructions for handling edge cases gracefully', fix: 'Add uncertainty acknowledgment and error handling rules' },
      { id: 'iss-07', severity: 'low' as const, title: 'Missing priority ordering', description: 'Safety rules not prioritized over user requests', fix: 'Establish explicit priority: safety > accuracy > helpfulness' },
    ],
  },
  {
    id: 'kot-03', promptName: 'Moderate Prompt', overallScore: 65, grade: 'C',
    categories: [
      { name: 'Boundary Definition', score: 72 },
      { name: 'Role Clarity', score: 78 },
      { name: 'Priority Ordering', score: 45 },
      { name: 'Output Constraints', score: 68 },
      { name: 'Defense Layers', score: 55 },
      { name: 'Input Handling', score: 72 },
    ],
    issues: [
      { id: 'iss-08', severity: 'high' as const, title: 'Weak defense layers', description: 'Only basic safety rules, no layered defense strategy', fix: 'Implement defense-in-depth with multiple safety layers' },
      { id: 'iss-09', severity: 'medium' as const, title: 'Priority ambiguity', description: 'Unclear which rules take precedence in conflicts', fix: 'Add explicit priority ordering section' },
      { id: 'iss-10', severity: 'medium' as const, title: 'Limited input validation', description: 'No rules for handling encoded or obfuscated inputs', fix: 'Add input sanitization and encoding detection rules' },
    ],
  },
];

// ─── RONIN HUB (Bug Bounty) ────────────────────────────────────────────────

export const DEMO_BOUNTY_PROGRAMS = [
  { id: 'prog-01', name: 'NovaMind AI Bug Bounty', company: 'NovaMind Technologies', platform: 'HackerOne' as const, status: 'active' as const, rewardMin: 1000, rewardMax: 50000, scopeSummary: 'LLM API endpoints, model inference pipeline, prompt processing', tags: ['llm', 'api', 'inference'], owaspAiCategories: ['LLM01', 'LLM02', 'LLM06'], featured: true },
  { id: 'prog-02', name: 'CipherGuard Security', company: 'CipherGuard Inc', platform: 'Bugcrowd' as const, status: 'active' as const, rewardMin: 500, rewardMax: 25000, scopeSummary: 'AI-powered security analysis tools, guard middleware', tags: ['security', 'middleware'], owaspAiCategories: ['LLM01', 'LLM02', 'LLM03'], featured: true },
  { id: 'prog-03', name: 'AetherLabs Research', company: 'AetherLabs', platform: 'Huntr' as const, status: 'active' as const, rewardMin: 200, rewardMax: 10000, scopeSummary: 'Open source ML pipelines, model training infrastructure', tags: ['ml', 'training', 'open-source'], owaspAiCategories: ['LLM04', 'LLM05', 'LLM07'], featured: false },
  { id: 'prog-04', name: 'SynthOS AI Platform', company: 'SynthOS Corp', platform: 'HackerOne' as const, status: 'active' as const, rewardMin: 1000, rewardMax: 30000, scopeSummary: 'Full-stack AI platform, agent orchestration, MCP servers', tags: ['platform', 'agents', 'mcp'], owaspAiCategories: ['LLM01', 'LLM07', 'LLM08', 'LLM10'], featured: true },
  { id: 'prog-05', name: 'Prism AI Safety', company: 'Prism Dynamics', platform: 'Bugcrowd' as const, status: 'active' as const, rewardMin: 500, rewardMax: 15000, scopeSummary: 'AI safety evaluation tools, bias detection systems', tags: ['safety', 'bias', 'evaluation'], owaspAiCategories: ['LLM09'], featured: false },
  { id: 'prog-06', name: 'VaultAI Data Protection', company: 'VaultAI Systems', platform: 'HackerOne' as const, status: 'active' as const, rewardMin: 2000, rewardMax: 40000, scopeSummary: 'Data privacy in AI systems, PII detection, output filtering', tags: ['privacy', 'pii', 'data'], owaspAiCategories: ['LLM06', 'LLM02'], featured: false },
  { id: 'prog-07', name: 'NexaCore Supply Chain', company: 'NexaCore', platform: 'Huntr' as const, status: 'active' as const, rewardMin: 300, rewardMax: 8000, scopeSummary: 'ML model supply chain, package registry, artifact signing', tags: ['supply-chain', 'registry'], owaspAiCategories: ['LLM05', 'LLM10'], featured: false },
  { id: 'prog-08', name: 'EchoMind Chatbot', company: 'EchoMind Inc', platform: 'Bugcrowd' as const, status: 'active' as const, rewardMin: 400, rewardMax: 12000, scopeSummary: 'Customer-facing chatbot, conversation management, memory', tags: ['chatbot', 'memory', 'conversation'], owaspAiCategories: ['LLM01', 'LLM06', 'LLM09'], featured: false },
  { id: 'prog-09', name: 'QuantumLeap AI Research', company: 'QuantumLeap Labs', platform: 'HackerOne' as const, status: 'paused' as const, rewardMin: 1500, rewardMax: 35000, scopeSummary: 'Research AI platform, experiment tracking, model registry', tags: ['research', 'experiments'], owaspAiCategories: ['LLM04', 'LLM05', 'LLM10'], featured: false },
  { id: 'prog-10', name: 'FluxAI Agent Security', company: 'FluxAI Technologies', platform: 'HackerOne' as const, status: 'active' as const, rewardMin: 1000, rewardMax: 20000, scopeSummary: 'Autonomous AI agents, tool use, multi-agent orchestration', tags: ['agents', 'tools', 'autonomous'], owaspAiCategories: ['LLM07', 'LLM08'], featured: false },
  { id: 'prog-11', name: 'Cortex Compliance', company: 'Cortex AI', platform: 'Bugcrowd' as const, status: 'active' as const, rewardMin: 600, rewardMax: 18000, scopeSummary: 'AI compliance tools, audit systems, governance platform', tags: ['compliance', 'audit', 'governance'], owaspAiCategories: ['LLM03', 'LLM09'], featured: false },
  { id: 'prog-12', name: 'ZeroDay AI Defense', company: 'ZeroDay Security', platform: 'Huntr' as const, status: 'active' as const, rewardMin: 250, rewardMax: 7500, scopeSummary: 'AI-powered threat detection, adversarial defense systems', tags: ['defense', 'threat-detection'], owaspAiCategories: ['LLM01', 'LLM04'], featured: false },
  { id: 'prog-13', name: 'Synapse RAG Security', company: 'Synapse AI', platform: 'HackerOne' as const, status: 'active' as const, rewardMin: 800, rewardMax: 22000, scopeSummary: 'RAG pipeline security, vector database protection', tags: ['rag', 'vector-db', 'retrieval'], owaspAiCategories: ['LLM01', 'LLM03', 'LLM06'], featured: false },
  { id: 'prog-14', name: 'Atlas Multimodal Safety', company: 'Atlas Dynamics', platform: 'Bugcrowd' as const, status: 'active' as const, rewardMin: 500, rewardMax: 15000, scopeSummary: 'Multimodal AI safety, image/audio input processing', tags: ['multimodal', 'image', 'audio'], owaspAiCategories: ['LLM01', 'LLM02', 'LLM06'], featured: false },
  { id: 'prog-15', name: 'Meridian AI Ethics', company: 'Meridian Tech', platform: 'Huntr' as const, status: 'active' as const, rewardMin: 200, rewardMax: 5000, scopeSummary: 'AI ethics evaluation, fairness testing, bias reporting', tags: ['ethics', 'fairness', 'reporting'], owaspAiCategories: ['LLM09'], featured: false },
];

export const DEMO_BOUNTY_SUBMISSIONS = [
  { id: 'sub-01', programId: 'prog-01', programName: 'NovaMind AI Bug Bounty', title: 'Prompt Injection via Unicode Normalization in API Gateway', status: 'validated' as const, severity: 'critical' as const, cvssScore: 9.1, aiFactorScore: 4.5, finalScore: 8.8, createdAt: daysAgo(14), payout: 12500 },
  { id: 'sub-02', programId: 'prog-04', programName: 'SynthOS AI Platform', title: 'MCP Tool Schema Injection Allows Arbitrary Code Execution', status: 'paid' as const, severity: 'critical' as const, cvssScore: 9.8, aiFactorScore: 5.0, finalScore: 9.5, createdAt: daysAgo(28), payout: 25000 },
  { id: 'sub-03', programId: 'prog-02', programName: 'CipherGuard Security', title: 'Guard Middleware Bypass via Encoding Chain Attack', status: 'triaged' as const, severity: 'high' as const, cvssScore: 7.5, aiFactorScore: 3.8, finalScore: 7.2, createdAt: daysAgo(7), payout: null },
  { id: 'sub-04', programId: 'prog-06', programName: 'VaultAI Data Protection', title: 'PII Leakage Through Structured Output Formatting', status: 'submitted' as const, severity: 'high' as const, cvssScore: 7.2, aiFactorScore: 3.5, finalScore: 6.8, createdAt: daysAgo(3), payout: null },
  { id: 'sub-05', programId: 'prog-01', programName: 'NovaMind AI Bug Bounty', title: 'Context Window Overflow Leading to Safety Bypass', status: 'triaged' as const, severity: 'medium' as const, cvssScore: 5.5, aiFactorScore: 3.0, finalScore: 5.2, createdAt: daysAgo(10), payout: null },
  { id: 'sub-06', programId: 'prog-03', programName: 'AetherLabs Research', title: 'Training Data Poisoning via Shared Dataset Repository', status: 'rejected' as const, severity: 'low' as const, cvssScore: 3.2, aiFactorScore: 1.5, finalScore: 2.8, createdAt: daysAgo(21), payout: null },
  { id: 'sub-07', programId: 'prog-10', programName: 'FluxAI Agent Security', title: 'Agent Delegation Chain Allows Privilege Escalation', status: 'draft' as const, severity: 'high' as const, cvssScore: 8.1, aiFactorScore: 4.2, finalScore: 7.8, createdAt: daysAgo(1), payout: null },
  { id: 'sub-08', programId: 'prog-13', programName: 'Synapse RAG Security', title: 'Indirect Prompt Injection via RAG Document Poisoning', status: 'draft' as const, severity: 'critical' as const, cvssScore: 8.9, aiFactorScore: 4.8, finalScore: 8.6, createdAt: daysAgo(1), payout: null },
];
