/**
 * File: ronin-seed-programs.ts
 * Purpose: Curated seed data for Ronin Hub bug bounty programs
 * Story: NODA-3 Story 10.2
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
