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

// Platform must match BountyPlatform: 'hackerone' | 'bugcrowd' | 'huntr' | '0din'
const prog = (id: string, name: string, company: string, platform: 'hackerone' | 'bugcrowd' | 'huntr' | '0din', status: 'active' | 'paused', rewardMin: number, rewardMax: number, scopeSummary: string, tags: string[], owaspAiCategories: string[]) => ({
  id, name, company, platform, status, scopeSummary, rewardMin, rewardMax, tags, owaspAiCategories,
  currency: 'USD', aiScope: true, url: `https://${platform}.example/programs/${id}`, updatedAt: daysAgo(Math.abs(id.charCodeAt(5) % 30)),
});

export const DEMO_BOUNTY_PROGRAMS = [
  prog('prog-01', 'NovaMind AI Bug Bounty', 'NovaMind Technologies', 'hackerone', 'active', 1000, 50000, 'LLM API endpoints, model inference pipeline, prompt processing', ['llm', 'api', 'inference'], ['LLM01', 'LLM02', 'LLM06']),
  prog('prog-02', 'CipherGuard Security', 'CipherGuard Inc', 'bugcrowd', 'active', 500, 25000, 'AI-powered security analysis tools, guard middleware', ['security', 'middleware'], ['LLM01', 'LLM02', 'LLM03']),
  prog('prog-03', 'AetherLabs Research', 'AetherLabs', 'huntr', 'active', 200, 10000, 'Open source ML pipelines, model training infrastructure', ['ml', 'training', 'open-source'], ['LLM04', 'LLM05', 'LLM07']),
  prog('prog-04', 'SynthOS AI Platform', 'SynthOS Corp', 'hackerone', 'active', 1000, 30000, 'Full-stack AI platform, agent orchestration, MCP servers', ['platform', 'agents', 'mcp'], ['LLM01', 'LLM07', 'LLM08', 'LLM10']),
  prog('prog-05', 'Prism AI Safety', 'Prism Dynamics', 'bugcrowd', 'active', 500, 15000, 'AI safety evaluation tools, bias detection systems', ['safety', 'bias', 'evaluation'], ['LLM09']),
  prog('prog-06', 'VaultAI Data Protection', 'VaultAI Systems', '0din', 'active', 2000, 40000, 'Data privacy in AI systems, PII detection, output filtering', ['privacy', 'pii', 'data'], ['LLM06', 'LLM02']),
  prog('prog-07', 'NexaCore Supply Chain', 'NexaCore', 'huntr', 'active', 300, 8000, 'ML model supply chain, package registry, artifact signing', ['supply-chain', 'registry'], ['LLM05', 'LLM10']),
  prog('prog-08', 'EchoMind Chatbot', 'EchoMind Inc', 'bugcrowd', 'active', 400, 12000, 'Customer-facing chatbot, conversation management, memory', ['chatbot', 'memory', 'conversation'], ['LLM01', 'LLM06', 'LLM09']),
  prog('prog-09', 'QuantumLeap AI Research', 'QuantumLeap Labs', 'hackerone', 'paused', 1500, 35000, 'Research AI platform, experiment tracking, model registry', ['research', 'experiments'], ['LLM04', 'LLM05', 'LLM10']),
  prog('prog-10', 'FluxAI Agent Security', 'FluxAI Technologies', 'hackerone', 'active', 1000, 20000, 'Autonomous AI agents, tool use, multi-agent orchestration', ['agents', 'tools', 'autonomous'], ['LLM07', 'LLM08']),
  prog('prog-11', 'Cortex Compliance', 'Cortex AI', 'bugcrowd', 'active', 600, 18000, 'AI compliance tools, audit systems, governance platform', ['compliance', 'audit', 'governance'], ['LLM03', 'LLM09']),
  prog('prog-12', 'ZeroDay AI Defense', 'ZeroDay Security', 'huntr', 'active', 250, 7500, 'AI-powered threat detection, adversarial defense systems', ['defense', 'threat-detection'], ['LLM01', 'LLM04']),
  prog('prog-13', 'Synapse RAG Security', 'Synapse AI', '0din', 'active', 800, 22000, 'RAG pipeline security, vector database protection', ['rag', 'vector-db', 'retrieval'], ['LLM01', 'LLM03', 'LLM06']),
  prog('prog-14', 'Atlas Multimodal Safety', 'Atlas Dynamics', 'bugcrowd', 'active', 500, 15000, 'Multimodal AI safety, image/audio input processing', ['multimodal', 'image', 'audio'], ['LLM01', 'LLM02', 'LLM06']),
  prog('prog-15', 'Meridian AI Ethics', 'Meridian Tech', 'huntr', 'active', 200, 5000, 'AI ethics evaluation, fairness testing, bias reporting', ['ethics', 'fairness', 'reporting'], ['LLM09']),
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
