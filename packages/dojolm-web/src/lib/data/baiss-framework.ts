/**
 * File: baiss-framework.ts
 * Purpose: BlackUnicorn AI Security Standard (BAISS) — unified control taxonomy
 * Story: TPI-NODA-4.2
 * Index:
 * - Types: BAISSControl, BAISSCategory, BAISSFramework (line ~12)
 * - BAISS_CATEGORIES (line ~46)
 * - BAISS_CONTROLS (line ~68)
 * - BAISS framework helper functions (line ~320)
 */

// --- Types ---

export type AssessmentType = 'automated' | 'semi-automated' | 'manual'

export interface BAISSControl {
  /** Unique BAISS identifier (e.g. BAISS-001) */
  id: string
  /** Control title */
  title: string
  /** Control description */
  description: string
  /** BAISS category grouping */
  category: string
  /** Assessment automation level */
  assessmentType: AssessmentType
  /** Mapped source framework controls */
  mappedFrameworks: {
    owasp?: string[]
    nist?: string[]
    mitre?: string[]
    iso?: string[]
    euAi?: string[]
    enisa?: string[]
  }
}

export interface BAISSCategory {
  id: string
  label: string
  description: string
}

// --- Categories ---

export const BAISS_CATEGORIES: BAISSCategory[] = [
  { id: 'input-security', label: 'Input Security', description: 'Controls for validating, sanitizing, and securing all inputs to AI systems' },
  { id: 'output-security', label: 'Output Security', description: 'Controls for safe, sanitized, and policy-compliant AI outputs' },
  { id: 'model-protection', label: 'Model Protection', description: 'Controls for protecting model integrity, weights, and intellectual property' },
  { id: 'data-governance', label: 'Data Governance', description: 'Controls for training data quality, privacy, and provenance' },
  { id: 'supply-chain', label: 'Supply Chain Security', description: 'Controls for securing the AI/ML supply chain, dependencies, and plugins' },
  { id: 'operational', label: 'Operational Security', description: 'Controls for secure AI deployment, monitoring, and incident response' },
  { id: 'governance', label: 'Governance & Compliance', description: 'Controls for AI governance, risk management, policy, and regulatory alignment' },
  { id: 'adversarial', label: 'Adversarial Robustness', description: 'Controls for resilience against adversarial attacks, evasion, and manipulation' },
  { id: 'human-oversight', label: 'Human Oversight', description: 'Controls for human-in-the-loop, oversight, and accountability mechanisms' },
  { id: 'ethical', label: 'Ethical & Societal', description: 'Controls for bias, fairness, transparency, and environmental impact' },
]

// --- BAISS Controls ---

export const BAISS_CONTROLS: BAISSControl[] = [
  // --- Input Security ---
  {
    id: 'BAISS-001',
    title: 'Prompt Injection Prevention',
    description: 'Detect and block direct and indirect prompt injection attacks across all input channels.',
    category: 'input-security',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM01'],
      nist: ['MEASURE'],
      mitre: ['AML.T0015'],
      enisa: ['SEC-01'],
    },
  },
  {
    id: 'BAISS-002',
    title: 'Input Validation & Sanitization',
    description: 'Validate and sanitize all user inputs before processing by AI models.',
    category: 'input-security',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM01'],
      enisa: ['SEC-01'],
      mitre: ['AML.T0015'],
    },
  },
  {
    id: 'BAISS-003',
    title: 'Multimodal Input Security',
    description: 'Secure image, audio, and other non-text inputs against adversarial manipulation.',
    category: 'input-security',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM01'],
      mitre: ['AML.T0015'],
      enisa: ['SEC-05'],
    },
  },

  // --- Output Security ---
  {
    id: 'BAISS-004',
    title: 'Output Sanitization',
    description: 'Sanitize AI outputs to prevent injection (XSS, SSRF, XXE) and data leakage.',
    category: 'output-security',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM02'],
      enisa: ['SEC-02'],
    },
  },
  {
    id: 'BAISS-005',
    title: 'Sensitive Information Disclosure Prevention',
    description: 'Prevent AI models from leaking PII, secrets, or system prompt information.',
    category: 'output-security',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM06'],
      nist: ['#4'],
      enisa: ['SEC-04'],
    },
  },
  {
    id: 'BAISS-006',
    title: 'Harmful Content Filtering',
    description: 'Detect and filter harmful, toxic, or policy-violating content in AI outputs.',
    category: 'output-security',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM02'],
      euAi: ['Art.15'],
    },
  },

  // --- Model Protection ---
  {
    id: 'BAISS-007',
    title: 'Model Theft Prevention',
    description: 'Protect model weights, architecture, and intellectual property from extraction attacks.',
    category: 'model-protection',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM10'],
      mitre: ['AML.T0000'],
      enisa: ['SEC-03'],
    },
  },
  {
    id: 'BAISS-008',
    title: 'Model Denial of Service Protection',
    description: 'Prevent resource exhaustion and denial of service attacks against AI models.',
    category: 'model-protection',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM04'],
      mitre: ['AML.T0015'],
    },
  },
  {
    id: 'BAISS-009',
    title: 'Model Integrity Verification',
    description: 'Verify model integrity to detect tampering, backdoors, or unauthorized modifications.',
    category: 'model-protection',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      mitre: ['AML.T0010'],
      enisa: ['SEC-03'],
    },
  },

  // --- Data Governance ---
  {
    id: 'BAISS-010',
    title: 'Training Data Poisoning Prevention',
    description: 'Detect and prevent poisoning of training, fine-tuning, and RAG data sources.',
    category: 'data-governance',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      owasp: ['LLM03'],
      mitre: ['AML.T0010'],
      euAi: ['Art.10'],
    },
  },
  {
    id: 'BAISS-011',
    title: 'Data Privacy & PII Protection',
    description: 'Ensure training and inference data comply with privacy regulations and PII handling standards.',
    category: 'data-governance',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM06'],
      nist: ['#4'],
      enisa: ['SEC-04'],
      euAi: ['Art.10'],
    },
  },
  {
    id: 'BAISS-012',
    title: 'Data Provenance & Lineage',
    description: 'Track and verify the provenance and lineage of data used in AI systems.',
    category: 'data-governance',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      euAi: ['Art.10'],
      nist: ['MAP'],
    },
  },

  // --- Supply Chain Security ---
  {
    id: 'BAISS-013',
    title: 'AI Supply Chain Integrity',
    description: 'Verify integrity of AI dependencies, libraries, model repositories, and third-party components.',
    category: 'supply-chain',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      owasp: ['LLM05'],
      mitre: ['AML.T0040'],
      enisa: ['SEC-06'],
    },
  },
  {
    id: 'BAISS-014',
    title: 'Plugin & Tool Security',
    description: 'Secure AI plugins, MCP tools, and agent actions against exploitation and misuse.',
    category: 'supply-chain',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM07'],
    },
  },
  {
    id: 'BAISS-015',
    title: 'Agent Autonomy Controls',
    description: 'Limit excessive agency in AI agents and enforce permission boundaries.',
    category: 'supply-chain',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM08'],
    },
  },

  // --- Operational Security ---
  {
    id: 'BAISS-016',
    title: 'AI System Monitoring & Logging',
    description: 'Continuously monitor AI system behavior and maintain comprehensive audit logs.',
    category: 'operational',
    assessmentType: 'automated',
    mappedFrameworks: {
      euAi: ['Art.12'],
      nist: ['MEASURE'],
      iso: ['Clause9'],
    },
  },
  {
    id: 'BAISS-017',
    title: 'Incident Response for AI Systems',
    description: 'Maintain an AI-specific incident response plan with defined escalation procedures.',
    category: 'operational',
    assessmentType: 'manual',
    mappedFrameworks: {
      nist: ['MANAGE'],
      iso: ['Clause8'],
    },
  },
  {
    id: 'BAISS-018',
    title: 'Secure AI Deployment',
    description: 'Follow secure deployment practices including access controls, encryption, and environment isolation.',
    category: 'operational',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      iso: ['Clause8'],
      euAi: ['Art.15'],
    },
  },

  // --- Governance & Compliance ---
  {
    id: 'BAISS-019',
    title: 'AI Risk Management Framework',
    description: 'Implement a structured AI risk management framework with regular assessments.',
    category: 'governance',
    assessmentType: 'manual',
    mappedFrameworks: {
      nist: ['GOVERN', 'MAP'],
      iso: ['Clause4', 'Clause6'],
      euAi: ['Art.9'],
    },
  },
  {
    id: 'BAISS-020',
    title: 'AI Policy & Leadership',
    description: 'Establish AI governance policies with clear leadership accountability.',
    category: 'governance',
    assessmentType: 'manual',
    mappedFrameworks: {
      nist: ['GOVERN'],
      iso: ['Clause5', 'A.5'],
    },
  },
  {
    id: 'BAISS-021',
    title: 'Regulatory Compliance',
    description: 'Ensure AI systems comply with applicable regulatory requirements (EU AI Act, sector-specific).',
    category: 'governance',
    assessmentType: 'manual',
    mappedFrameworks: {
      euAi: ['Art.9', 'Art.13'],
      iso: ['Clause4'],
    },
  },
  {
    id: 'BAISS-022',
    title: 'AI System Inventory & Documentation',
    description: 'Maintain a comprehensive inventory of AI systems with supporting documentation.',
    category: 'governance',
    assessmentType: 'manual',
    mappedFrameworks: {
      iso: ['Clause7'],
      euAi: ['Art.12'],
    },
  },

  // --- Adversarial Robustness ---
  {
    id: 'BAISS-023',
    title: 'Adversarial Attack Resilience',
    description: 'Test and harden AI models against adversarial perturbations, evasion, and encoding attacks.',
    category: 'adversarial',
    assessmentType: 'automated',
    mappedFrameworks: {
      mitre: ['AML.T0015'],
      enisa: ['SEC-05'],
      euAi: ['Art.15'],
    },
  },
  {
    id: 'BAISS-024',
    title: 'Exfiltration Prevention',
    description: 'Prevent data exfiltration through AI model outputs, side channels, or embedding extraction.',
    category: 'adversarial',
    assessmentType: 'automated',
    mappedFrameworks: {
      mitre: ['AML.T0020'],
      owasp: ['LLM06'],
    },
  },
  {
    id: 'BAISS-025',
    title: 'Session & Persistence Security',
    description: 'Prevent session hijacking and persistent manipulation of AI conversation context.',
    category: 'adversarial',
    assessmentType: 'automated',
    mappedFrameworks: {
      mitre: ['AML.T0043'],
      owasp: ['LLM08'],
    },
  },

  // --- Human Oversight ---
  {
    id: 'BAISS-026',
    title: 'Human-in-the-Loop Controls',
    description: 'Ensure critical AI decisions have appropriate human oversight and intervention mechanisms.',
    category: 'human-oversight',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      euAi: ['Art.14'],
      iso: ['Clause8'],
    },
  },
  {
    id: 'BAISS-027',
    title: 'Transparency & Explainability',
    description: 'Provide transparency in AI decision-making and clear explanations of AI system capabilities.',
    category: 'human-oversight',
    assessmentType: 'manual',
    mappedFrameworks: {
      euAi: ['Art.13'],
      nist: ['GOVERN'],
    },
  },
  {
    id: 'BAISS-028',
    title: 'AI Impact Assessment',
    description: 'Conduct impact assessments for high-risk AI applications and document findings.',
    category: 'human-oversight',
    assessmentType: 'manual',
    mappedFrameworks: {
      iso: ['A.8'],
      euAi: ['Art.9'],
    },
  },

  // --- Ethical & Societal ---
  {
    id: 'BAISS-029',
    title: 'Bias & Fairness Testing',
    description: 'Test AI systems for bias, discrimination, and fairness across demographic groups.',
    category: 'ethical',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      owasp: ['LLM09'],
      nist: ['MEASURE'],
    },
  },
  {
    id: 'BAISS-030',
    title: 'Overreliance Prevention',
    description: 'Implement safeguards against over-reliance on AI outputs for critical decisions.',
    category: 'ethical',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      owasp: ['LLM09'],
    },
  },
  {
    id: 'BAISS-031',
    title: 'Dual-Use & Safety Assessment',
    description: 'Assess AI systems for potential dual-use risks (CBRN, deepfakes, synthetic content).',
    category: 'ethical',
    assessmentType: 'manual',
    mappedFrameworks: {
      nist: ['#1', '#9'],
    },
  },
  {
    id: 'BAISS-032',
    title: 'Environmental Impact Management',
    description: 'Monitor and minimize the environmental impact of AI training and inference.',
    category: 'ethical',
    assessmentType: 'semi-automated',
    mappedFrameworks: {},
  },
]

// --- Helper Functions ---

/** Get all BAISS controls in a specific category */
export function getControlsByCategory(categoryId: string): BAISSControl[] {
  return BAISS_CONTROLS.filter((c) => c.category === categoryId)
}

/** Get all BAISS controls mapped to a specific source framework */
export function getControlsBySourceFramework(
  framework: keyof BAISSControl['mappedFrameworks']
): BAISSControl[] {
  return BAISS_CONTROLS.filter((c) => {
    const mapped = c.mappedFrameworks[framework]
    return mapped && mapped.length > 0
  })
}

/** Find BAISS controls that map to a given source control ID */
export function findBAISSBySourceControl(
  framework: keyof BAISSControl['mappedFrameworks'],
  controlId: string
): BAISSControl[] {
  return BAISS_CONTROLS.filter((c) => {
    const mapped = c.mappedFrameworks[framework]
    return mapped?.includes(controlId) ?? false
  })
}

/** Get all source control IDs mapped from a BAISS control */
export function getSourceMappings(baissId: string): Record<string, string[]> {
  const control = BAISS_CONTROLS.find((c) => c.id === baissId)
  if (!control) return {}
  const result: Record<string, string[]> = {}
  for (const [fw, ids] of Object.entries(control.mappedFrameworks)) {
    if (ids && ids.length > 0) {
      result[fw] = ids
    }
  }
  return result
}

/** Convert BAISS controls to CoverageEntry format for the Coverage tab */
export function baissControlsToCoverageEntries(): {
  category: string
  pre: number
  post: number
  stories: string
  gap: boolean
}[] {
  return BAISS_CONTROLS.map((c) => {
    // Automated controls get higher coverage scores
    const postScore =
      c.assessmentType === 'automated' ? 95 :
      c.assessmentType === 'semi-automated' ? 75 : 50
    const preScore = Math.round(postScore * 0.5)
    return {
      category: `${c.id}: ${c.title}`,
      pre: preScore,
      post: postScore,
      stories: c.id,
      gap: postScore < 50,
    }
  })
}

/** Get BAISS framework summary statistics */
export function getBAISSSummary() {
  const total = BAISS_CONTROLS.length
  const automated = BAISS_CONTROLS.filter((c) => c.assessmentType === 'automated').length
  const semiAutomated = BAISS_CONTROLS.filter((c) => c.assessmentType === 'semi-automated').length
  const manual = BAISS_CONTROLS.filter((c) => c.assessmentType === 'manual').length
  const categories = BAISS_CATEGORIES.length

  // Count unique source framework control mappings
  const allMappings = new Set<string>()
  for (const c of BAISS_CONTROLS) {
    for (const [fw, ids] of Object.entries(c.mappedFrameworks)) {
      if (ids) {
        for (const id of ids) {
          allMappings.add(`${fw}:${id}`)
        }
      }
    }
  }

  return {
    totalControls: total,
    automated,
    semiAutomated,
    manual,
    categories,
    uniqueSourceMappings: allMappings.size,
    frameworksCovered: 6,
  }
}
