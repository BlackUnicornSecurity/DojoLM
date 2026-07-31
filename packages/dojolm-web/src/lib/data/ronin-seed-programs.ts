// SPDX-License-Identifier: Apache-2.0
/**
 * File: ronin-seed-programs.ts
 * Purpose: Curated seed data for Ronin Hub bug bounty programs
 * Story: 10.2
 * Index:
 * - BountyProgram interface (line 12)
 * - SEED_PROGRAMS array (line 38)
 */

/** Platform hosting the bug bounty program */
export type BountyPlatform = 'hackerone' | 'bugcrowd' | 'huntr' | '0din'

/** Program status */
export type ProgramStatus = 'active' | 'paused' | 'upcoming' | 'closed'

/** Bug bounty program definition */
export interface BountyProgram {
  id: string
  name: string
  company: string
  platform: BountyPlatform
  status: ProgramStatus
  scopeSummary: string
  rewardMin: number
  rewardMax: number
  currency: string
  aiScope: boolean
  owaspAiCategories: string[]
  tags: string[]
  url: string
  updatedAt: string
  /**
   * E-A9 Phase 2 polish — `Subscribed` toggle on the Ronin program-card grid
   * filters to `subscribed === true` rows. Optional so existing seed entries
   * default to "not subscribed" without explicit author-time annotation.
   *
   * Aggregate-audit fix (architect MED-1 / adversarial HIGH-1) — narrowed
   * to `?: true` (rather than `?: boolean`) to mirror the client-side
   * `ProgramLite.subscribed?: true`. The sanitizer at
   * `RoninAdminClient.tsx::sanitizeProgram` collapses `false / undefined`
   * to "subscribed absent" — accepting `false` on the seed shape
   * created a latent authoring trap where a future entry with
   * `subscribed: false` would silently serialize as "not subscribed"
   * with no compile-time warning.
   */
  subscribed?: true
}

/** Submission status lifecycle */
export type SubmissionStatus = 'draft' | 'submitted' | 'triaged' | 'validated' | 'paid' | 'rejected'

/** Bug bounty submission */
export interface BountySubmission {
  id: string
  programId: string
  programName: string
  title: string
  status: SubmissionStatus
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvssScore: number
  aiFactorScore: number
  finalScore: number
  evidence: string[]
  description: string
  createdAt: string
  updatedAt: string
  payout: number | null
}

/** Curated demo programs for the Ronin Hub */
export const SEED_PROGRAMS: BountyProgram[] = [
  {
    id: 'prog-001',
    name: 'OpenAI Bug Bounty',
    company: 'OpenAI',
    platform: 'bugcrowd',
    status: 'active',
    scopeSummary: 'API, ChatGPT, plugins, DALL-E. Prompt injection, data exfiltration, auth bypass.',
    rewardMin: 200,
    rewardMax: 20000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM02', 'LLM06', 'LLM07'],
    tags: ['LLM', 'API', 'Plugins', 'Image Generation'],
    url: 'https://bugcrowd.com/openai',
    updatedAt: '2026-02-15',
    subscribed: true,
  },
  {
    id: 'prog-002',
    name: 'Google AI Safety',
    company: 'Google',
    platform: 'hackerone',
    status: 'active',
    scopeSummary: 'Gemini, Bard API, AI Studio. Jailbreaks, safety bypasses, data leaks.',
    rewardMin: 500,
    rewardMax: 31337,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM04', 'LLM06', 'LLM08'],
    tags: ['LLM', 'Multimodal', 'Safety', 'API'],
    url: 'https://hackerone.com/google-ai',
    updatedAt: '2026-03-01',
  },
  {
    id: 'prog-003',
    name: 'Anthropic Security Research',
    company: 'Anthropic',
    platform: 'hackerone',
    status: 'active',
    scopeSummary: 'Claude API, tool use, computer use. Prompt injection, auth, rate limiting.',
    rewardMin: 500,
    rewardMax: 25000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM05', 'LLM07', 'LLM08'],
    tags: ['LLM', 'Tool Use', 'API', 'Safety'],
    url: 'https://hackerone.com/anthropic',
    updatedAt: '2026-02-28',
    subscribed: true,
  },
  {
    id: 'prog-004',
    name: 'Huntr AI/ML Bounties',
    company: 'Huntr',
    platform: 'huntr',
    status: 'active',
    scopeSummary: 'Open source AI/ML packages: PyTorch, TensorFlow, LangChain, Hugging Face libraries.',
    rewardMin: 100,
    rewardMax: 10000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM03', 'LLM05', 'LLM07'],
    tags: ['Open Source', 'ML Frameworks', 'Supply Chain'],
    url: 'https://huntr.com/bounties',
    updatedAt: '2026-03-05',
  },
  {
    id: 'prog-005',
    name: '0din AI Red Team',
    company: '0din.ai',
    platform: '0din',
    status: 'active',
    scopeSummary: 'Any LLM provider. Jailbreaks, prompt injection, model manipulation, data extraction.',
    rewardMin: 1000,
    rewardMax: 50000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM02', 'LLM06', 'LLM10'],
    tags: ['Red Team', 'LLM', 'Jailbreak', 'Data Extraction'],
    url: 'https://0din.ai',
    updatedAt: '2026-03-04',
  },
  {
    id: 'prog-006',
    name: 'Microsoft AI Bug Bounty',
    company: 'Microsoft',
    platform: 'hackerone',
    status: 'active',
    scopeSummary: 'Copilot, Azure OpenAI, Bing Chat. Safety violations, data leaks, auth bypass.',
    rewardMin: 500,
    rewardMax: 15000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM04', 'LLM06', 'LLM09'],
    tags: ['LLM', 'Copilot', 'Azure', 'Enterprise'],
    url: 'https://hackerone.com/microsoft-ai',
    updatedAt: '2026-02-20',
  },
  {
    id: 'prog-007',
    name: 'Meta AI Security',
    company: 'Meta',
    platform: 'hackerone',
    status: 'active',
    scopeSummary: 'Llama models, Meta AI assistant, WhatsApp AI. Model theft, prompt injection.',
    rewardMin: 500,
    rewardMax: 40000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM10', 'LLM05'],
    tags: ['LLM', 'Open Source', 'Llama', 'Social'],
    url: 'https://hackerone.com/meta-ai',
    updatedAt: '2026-01-30',
  },
  {
    id: 'prog-008',
    name: 'Hugging Face Security',
    company: 'Hugging Face',
    platform: 'huntr',
    status: 'active',
    scopeSummary: 'Hub, Transformers, Datasets, Spaces. Supply chain, model poisoning, code exec.',
    rewardMin: 200,
    rewardMax: 12000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM03', 'LLM05', 'LLM07'],
    tags: ['Open Source', 'Model Hub', 'Supply Chain', 'ML Ops'],
    url: 'https://huntr.com/repos/huggingface',
    updatedAt: '2026-03-02',
  },
  {
    id: 'prog-009',
    name: 'Mistral AI Bounty',
    company: 'Mistral AI',
    platform: 'hackerone',
    status: 'active',
    scopeSummary: 'Mistral API, Le Chat, function calling. Jailbreaks, safety bypass, data leak.',
    rewardMin: 300,
    rewardMax: 18000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM06', 'LLM08'],
    tags: ['LLM', 'European', 'API', 'Function Calling'],
    url: 'https://hackerone.com/mistral',
    updatedAt: '2026-02-25',
  },
  {
    id: 'prog-010',
    name: 'Cohere AI Security',
    company: 'Cohere',
    platform: 'bugcrowd',
    status: 'active',
    scopeSummary: 'Command models, RAG API, Embed, Rerank. Retrieval poisoning, injection.',
    rewardMin: 250,
    rewardMax: 10000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM01', 'LLM03', 'LLM07'],
    tags: ['LLM', 'RAG', 'Enterprise', 'Embeddings'],
    url: 'https://bugcrowd.com/cohere',
    updatedAt: '2026-02-10',
  },
  {
    id: 'prog-011',
    name: 'Stability AI Program',
    company: 'Stability AI',
    platform: 'bugcrowd',
    status: 'paused',
    scopeSummary: 'Stable Diffusion API, DreamStudio. Image generation safety, NSFW bypass.',
    rewardMin: 100,
    rewardMax: 5000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM02', 'LLM09'],
    tags: ['Image Generation', 'Safety', 'Diffusion'],
    url: 'https://bugcrowd.com/stability',
    updatedAt: '2026-01-15',
  },
  {
    id: 'prog-012',
    name: 'LangChain Security',
    company: 'LangChain',
    platform: 'huntr',
    status: 'active',
    scopeSummary: 'LangChain, LangSmith, LangServe. Agent exploits, tool abuse, chain injection.',
    rewardMin: 150,
    rewardMax: 8000,
    currency: 'USD',
    aiScope: true,
    owaspAiCategories: ['LLM07', 'LLM08', 'LLM05'],
    tags: ['Open Source', 'Agents', 'Tool Use', 'RAG'],
    url: 'https://huntr.com/repos/langchain',
    updatedAt: '2026-03-03',
  },

  // --- Wave 7B.3 expansion (30 BU-branded programs scoped to fictional LLMs) ---

  // DojoLM (6 programs)
  { id: 'prog-bu-dojolm-core', name: 'DojoLM Core API Bounty', company: 'BlackUnicorn (DojoLM)', platform: 'bugcrowd', status: 'active', scopeSummary: 'DojoLM Gateway, Forge Defense, Audit Query. Prompt injection, tool-schema confusion, RBAC bypass.', rewardMin: 500, rewardMax: 30000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM01', 'LLM02', 'LLM07', 'LLM08'], tags: ['DojoLM', 'API', 'Forge Defense', 'BU'], url: 'https://bugcrowd.com/blackunicorn-dojolm', updatedAt: '2026-04-01' },
  { id: 'prog-bu-dojolm-rag', name: 'DojoLM RAG Hardening Bounty', company: 'BlackUnicorn (DojoLM)', platform: 'huntr', status: 'active', scopeSummary: 'DojoLM RAG indexer, source-anchor enforcement, citation pipeline. Indirect injection, source-allowlist bypass.', rewardMin: 250, rewardMax: 12000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM01', 'LLM03', 'LLM07'], tags: ['DojoLM', 'RAG', 'Indexer', 'BU'], url: 'https://huntr.com/repos/blackunicorn/dojolm-rag', updatedAt: '2026-04-02' },
  { id: 'prog-bu-dojolm-cs', name: 'DojoLM Customer-Support Surface', company: 'BlackUnicorn (DojoLM)', platform: 'hackerone', status: 'active', scopeSummary: 'DojoLM customer-support deployment template. PII redaction bypass, tone drift, scope drift.', rewardMin: 200, rewardMax: 10000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM06'], tags: ['DojoLM', 'Customer Support', 'PII', 'BU'], url: 'https://hackerone.com/blackunicorn-dojolm-cs', updatedAt: '2026-04-03' },
  { id: 'prog-bu-dojolm-gov', name: 'DojoLM Government-Tier Bounty', company: 'BlackUnicorn (DojoLM)', platform: 'bugcrowd', status: 'active', scopeSummary: 'DojoLM government-deployment templates. Classification-marker gate, FOIA-aware redaction, records retention.', rewardMin: 1000, rewardMax: 40000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM06', 'LLM07'], tags: ['DojoLM', 'Government', 'Classification', 'BU'], url: 'https://bugcrowd.com/blackunicorn-dojolm-gov', updatedAt: '2026-04-04' },
  { id: 'prog-bu-dojolm-mcp', name: 'BUCC dojolm-mcp Bounty', company: 'BUCC (BlackUnicorn Cyber Coalition)', platform: 'huntr', status: 'active', scopeSummary: 'BUCC dojolm-mcp server, plugin loader, manifest validator. WebSocket origin checks, manifest path-traversal.', rewardMin: 150, rewardMax: 8000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM05', 'LLM07'], tags: ['BUCC', 'dojolm-mcp', 'MCP', 'BU'], url: 'https://huntr.com/repos/bucc/dojolm-mcp', updatedAt: '2026-04-05' },
  { id: 'prog-bu-dojolm-scan', name: 'BUCC dojolm-scanner Bounty', company: 'BUCC (BlackUnicorn Cyber Coalition)', platform: 'huntr', status: 'paused', scopeSummary: 'BUCC dojolm-scanner CLI + cache. Cache-perms, scan-result leakage, default-config issues.', rewardMin: 100, rewardMax: 5000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM05', 'LLM06'], tags: ['BUCC', 'dojolm-scanner', 'CLI', 'BU'], url: 'https://huntr.com/repos/bucc/dojolm-scanner', updatedAt: '2026-04-06' },

  // SampleBravo (6 programs)
  { id: 'prog-bu-sampleBravo-tools', name: 'SampleBravo Internal-Tools Bounty', company: 'BlackUnicorn (SampleBravo)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleBravo internal-tools agent, tool registry, RBAC enforcement. Privilege escalation, tool allowlist bypass.', rewardMin: 750, rewardMax: 35000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM07', 'LLM08'], tags: ['SampleBravo', 'Internal Tools', 'RBAC', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleBravo-tools', updatedAt: '2026-04-07' },
  { id: 'prog-bu-sampleBravo-saas', name: 'SampleBravo SaaS Multi-Tenant Bounty', company: 'BlackUnicorn (SampleBravo)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleBravo SaaS admin panel, tenant isolation, quota enforcement. Cross-tenant reads, RBAC escalation.', rewardMin: 500, rewardMax: 20000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM07'], tags: ['SampleBravo', 'SaaS', 'Multi-Tenant', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleBravo-saas', updatedAt: '2026-04-08' },
  { id: 'prog-bu-sampleBravo-agent', name: 'SampleBravo Agentic Workflow Bounty', company: 'BlackUnicorn (SampleBravo)', platform: 'huntr', status: 'active', scopeSummary: 'SampleBravo agentic-workflow templates, sub-agent spawn, budget enforcement. Recursive spawn, loop detection bypass.', rewardMin: 250, rewardMax: 15000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM07', 'LLM08'], tags: ['SampleBravo', 'Agentic', 'Workflow', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleBravo-agent', updatedAt: '2026-04-09' },
  { id: 'prog-bu-sampleBravo-admin', name: 'SampleBravo Admin Panel Bounty', company: 'BlackUnicorn (SampleBravo)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleBravo admin panel, JWT verification, audit-log integrity. Auth bypass, log forging.', rewardMin: 1000, rewardMax: 50000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM08'], tags: ['SampleBravo', 'Admin', 'JWT', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleBravo-admin', updatedAt: '2026-04-10' },
  { id: 'prog-bu-sampleBravo-marketplace', name: 'SampleBravo Plugin Marketplace Bounty', company: 'BlackUnicorn (SampleBravo)', platform: 'huntr', status: 'upcoming', scopeSummary: 'SampleBravo plugin marketplace publisher, manifest signing, artifact distribution. Supply chain, manifest forgery.', rewardMin: 200, rewardMax: 10000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM05', 'LLM07'], tags: ['SampleBravo', 'Marketplace', 'Supply Chain', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleBravo-marketplace', updatedAt: '2026-04-11' },
  { id: 'prog-bu-sampleBravo-sage', name: 'SampleBravo SAGE Adapter Bounty', company: 'BlackUnicorn (SampleBravo)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleBravo SAGE adapter, seed ingestion, mutation operators. Seed-corpus poisoning, mutation chain abuse.', rewardMin: 300, rewardMax: 12000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM03', 'LLM07'], tags: ['SampleBravo', 'SAGE', 'Adapter', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleBravo-sage', updatedAt: '2026-04-12' },

  // SampleAlpha (6 programs)
  { id: 'prog-bu-sampleAlpha-comp', name: 'SampleAlpha Compliance Engine Bounty', company: 'BlackUnicorn (SampleAlpha)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleAlpha compliance engine, WORM audit, geo-residency. Audit-log tampering, residency-pin bypass.', rewardMin: 1000, rewardMax: 45000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM08'], tags: ['SampleAlpha', 'Compliance', 'WORM', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleAlpha-comp', updatedAt: '2026-04-13' },
  { id: 'prog-bu-sampleAlpha-research', name: 'SampleAlpha Research-Mode Surface', company: 'BlackUnicorn (SampleAlpha)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleAlpha research-mode console, analyst tooling. Persona-unlock attempts, raw-finding leak.', rewardMin: 400, rewardMax: 18000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM07'], tags: ['SampleAlpha', 'Research', 'Console', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleAlpha-research', updatedAt: '2026-04-14' },
  { id: 'prog-bu-sampleAlpha-customer', name: 'SampleAlpha Customer-Support Surface', company: 'BlackUnicorn (SampleAlpha)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleAlpha customer-support API, PII handler, tone-moderation. Customer-roster dump, tone-bypass.', rewardMin: 300, rewardMax: 14000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM06'], tags: ['SampleAlpha', 'Customer Support', 'PII', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleAlpha-customer', updatedAt: '2026-04-15' },
  { id: 'prog-bu-sampleAlpha-mod', name: 'SampleAlpha Content-Moderation Bounty', company: 'BlackUnicorn (SampleAlpha)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleAlpha moderation classifier ensemble, appeal path. Classifier evasion, appeal-loop abuse.', rewardMin: 250, rewardMax: 11000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM06'], tags: ['SampleAlpha', 'Moderation', 'Classifier', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleAlpha-mod', updatedAt: '2026-04-16' },
  { id: 'prog-bu-sampleAlpha-vendor', name: 'SampleAlpha Vendor-Onboard Bounty', company: 'BlackUnicorn (SampleAlpha)', platform: 'huntr', status: 'active', scopeSummary: 'SampleAlpha vendor-onboarding flow, compliance pre-checks. Compliance bypass, false-approval generation.', rewardMin: 200, rewardMax: 9000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM08'], tags: ['SampleAlpha', 'Vendor', 'Onboarding', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleAlpha-vendor', updatedAt: '2026-04-17' },
  { id: 'prog-bu-sampleAlpha-rag', name: 'SampleAlpha Research-RAG Bounty', company: 'BlackUnicorn (SampleAlpha)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleAlpha research-RAG ingestion, source allowlist, snippet rendering. Indirect injection, source-allowlist bypass.', rewardMin: 350, rewardMax: 14000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM01', 'LLM03'], tags: ['SampleAlpha', 'Research', 'RAG', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleAlpha-rag', updatedAt: '2026-04-18' },

  // SampleDelta (6 programs)
  { id: 'prog-bu-sampleDelta-cloud', name: 'SampleDelta Cloud-Admin Bounty', company: 'BlackUnicorn (SampleDelta)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleDelta cloud-admin tools, IAM grant flow, region-pin enforcement. Privilege escalation, region bypass.', rewardMin: 750, rewardMax: 32000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM07', 'LLM08'], tags: ['SampleDelta', 'Cloud Admin', 'IAM', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleDelta-cloud', updatedAt: '2026-04-19' },
  { id: 'prog-bu-sampleDelta-health', name: 'SampleDelta Healthcare Surface', company: 'BlackUnicorn (SampleDelta)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleDelta healthcare deployment, HIPAA boundary, PHI scope. Cross-patient leak, HIPAA bypass.', rewardMin: 500, rewardMax: 22000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM06'], tags: ['SampleDelta', 'Healthcare', 'HIPAA', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleDelta-health', updatedAt: '2026-04-20' },
  { id: 'prog-bu-sampleDelta-mm', name: 'SampleDelta Multi-Modal Bounty', company: 'BlackUnicorn (SampleDelta)', platform: 'huntr', status: 'active', scopeSummary: 'SampleDelta multi-modal pipeline, image OCR scanner, file allowlist. OCR-injection, MIME-type bypass.', rewardMin: 250, rewardMax: 11000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM01', 'LLM02'], tags: ['SampleDelta', 'Multi-Modal', 'OCR', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleDelta-mm', updatedAt: '2026-04-01' },
  { id: 'prog-bu-sampleDelta-rag', name: 'SampleDelta RAG-Chatbot Bounty', company: 'BlackUnicorn (SampleDelta)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleDelta RAG-chatbot deployment, source anchor, citation enforcement. Anchor bypass, fake citation.', rewardMin: 350, rewardMax: 13000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM01', 'LLM03'], tags: ['SampleDelta', 'RAG', 'Chatbot', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleDelta-rag', updatedAt: '2026-04-02' },
  { id: 'prog-bu-sampleDelta-embed', name: 'SampleDelta Embedding Bounty', company: 'BlackUnicorn (SampleDelta)', platform: 'huntr', status: 'paused', scopeSummary: 'SampleDelta embedding cache, vector store, similarity search. Cache poisoning, similarity attacks.', rewardMin: 200, rewardMax: 8000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM03'], tags: ['SampleDelta', 'Embedding', 'Vector', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleDelta-embed', updatedAt: '2026-04-03' },
  { id: 'prog-bu-sampleDelta-doc', name: 'SampleDelta Document-Connector Bounty', company: 'BlackUnicorn (SampleDelta)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleDelta document connectors, egress filter, MIME validation. Egress bypass, file-type bypass.', rewardMin: 300, rewardMax: 12000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM07'], tags: ['SampleDelta', 'Document', 'Connector', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleDelta-doc', updatedAt: '2026-04-04' },

  // SampleCharlie (6 programs)
  { id: 'prog-bu-sampleCharlie-audit', name: 'SampleCharlie Audit Engine Bounty', company: 'BlackUnicorn (SampleCharlie)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleCharlie audit engine, tamper-evident chain, redaction pipeline. Audit chain break, redaction bypass.', rewardMin: 750, rewardMax: 32000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM08'], tags: ['SampleCharlie', 'Audit', 'Tamper', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleCharlie-audit', updatedAt: '2026-04-05' },
  { id: 'prog-bu-sampleCharlie-fin', name: 'SampleCharlie Finance Surface Bounty', company: 'BlackUnicorn (SampleCharlie)', platform: 'bugcrowd', status: 'active', scopeSummary: 'SampleCharlie finance deployment, no-autonomous-trade lock, MNPI guard. Trade-lock bypass, MNPI exposure.', rewardMin: 1000, rewardMax: 45000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM07', 'LLM08'], tags: ['SampleCharlie', 'Finance', 'MNPI', 'BU'], url: 'https://bugcrowd.com/blackunicorn-sampleCharlie-fin', updatedAt: '2026-04-06' },
  { id: 'prog-bu-sampleCharlie-egress', name: 'SampleCharlie Egress Allowlist Bounty', company: 'BlackUnicorn (SampleCharlie)', platform: 'huntr', status: 'active', scopeSummary: 'SampleCharlie egress allowlist enforcement, tenant-scoped egress. Allowlist bypass, SSRF.', rewardMin: 500, rewardMax: 18000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM06', 'LLM07'], tags: ['SampleCharlie', 'Egress', 'Allowlist', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleCharlie-egress', updatedAt: '2026-04-07' },
  { id: 'prog-bu-sampleCharlie-dev', name: 'SampleCharlie DevAsst Surface Bounty', company: 'BlackUnicorn (SampleCharlie)', platform: 'hackerone', status: 'active', scopeSummary: 'SampleCharlie developer-assistant deployment, secret-pattern blocker, sandbox-only exec. Secret leak, sandbox escape.', rewardMin: 400, rewardMax: 16000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM02', 'LLM07'], tags: ['SampleCharlie', 'DevAsst', 'Sandbox', 'BU'], url: 'https://hackerone.com/blackunicorn-sampleCharlie-dev', updatedAt: '2026-04-08' },
  { id: 'prog-bu-sampleCharlie-redteam', name: 'SampleCharlie Red-Team Service Bounty', company: 'BlackUnicorn (SampleCharlie)', platform: '0din', status: 'active', scopeSummary: 'SampleCharlie red-team service responses, scope adherence, controlled-finding handling. Scope creep, finding leakage.', rewardMin: 1500, rewardMax: 60000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM01', 'LLM02', 'LLM07'], tags: ['SampleCharlie', 'Red Team', 'Service', 'BU'], url: 'https://0din.ai/sampleCharlie', updatedAt: '2026-04-09' },
  { id: 'prog-bu-sampleCharlie-rate', name: 'SampleCharlie Burst-Quota Bounty', company: 'BlackUnicorn (SampleCharlie)', platform: 'huntr', status: 'closed', scopeSummary: 'SampleCharlie burst-quota throttle, per-tenant ceiling. Throttle evasion, distributed amplification.', rewardMin: 100, rewardMax: 5000, currency: 'USD', aiScope: true, owaspAiCategories: ['LLM04'], tags: ['SampleCharlie', 'Rate Limit', 'Throttle', 'BU'], url: 'https://huntr.com/repos/blackunicorn/sampleCharlie-rate', updatedAt: '2026-04-10' },
]

/** Platform display metadata */
export const PLATFORM_META: Record<BountyPlatform, { label: string; color: string }> = {
  hackerone: { label: 'HackerOne', color: 'var(--dojo-primary)' },
  bugcrowd: { label: 'Bugcrowd', color: 'var(--bu-electric)' },
  huntr: { label: 'Huntr', color: 'var(--success)' },
  '0din': { label: '0din.ai', color: 'var(--warning)' },
}

/** Status display metadata */
export const STATUS_META: Record<ProgramStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'var(--success)' },
  paused: { label: 'Paused', color: 'var(--warning)' },
  upcoming: { label: 'Upcoming', color: 'var(--bu-electric)' },
  closed: { label: 'Closed', color: 'var(--muted-foreground)' },
}
