/**
 * File: baiss-framework.ts
 * Purpose: BlackUnicorn AI Security Standard (BAISS) v2.0 — unified control taxonomy
 * Story: TPI-NODA-4.2 / BUSHIDO-BOOK-UPDATE Epic 1
 * Index:
 * - Types: BAISSControl, BAISSCategory, BAISSFramework (line ~12)
 * - BAISS_CATEGORIES (line ~55)
 * - BAISS_CONTROLS (line ~77)
 * - BAISS framework helper functions (line ~680)
 */

// --- Types ---

export type AssessmentType = 'automated' | 'semi-automated' | 'manual'

export type BAISSCategoryId =
  | 'input-security'
  | 'output-security'
  | 'model-protection'
  | 'data-governance'
  | 'supply-chain'
  | 'operational'
  | 'governance'
  | 'adversarial'
  | 'human-oversight'
  | 'ethical'

export interface BAISSControl {
  /** Unique BAISS identifier (e.g. BAISS-001) */
  id: string
  /** Control title */
  title: string
  /** Control description */
  description: string
  /** BAISS category grouping */
  category: BAISSCategoryId
  /** Assessment automation level */
  assessmentType: AssessmentType
  /** Mapped source framework controls */
  mappedFrameworks: {
    // Original 6 frameworks
    owasp?: string[]
    nist?: string[]
    mitre?: string[]
    iso?: string[]
    euAi?: string[]
    enisa?: string[]
    // 22 new frameworks (v2.0)
    nist218a?: string[]
    iso23894?: string[]
    iso24027?: string[]
    iso24028?: string[]
    saif?: string[]
    cisaNcsc?: string[]
    slsa?: string[]
    mlBom?: string[]
    openssf?: string[]
    nistCsf2?: string[]
    ukDsit?: string[]
    ieeeP7000?: string[]
    nistAi1004?: string[]
    sgMgaf?: string[]
    caAia?: string[]
    auAie?: string[]
    iso27001?: string[]
    owaspAsvs?: string[]
    owaspApi?: string[]
    nist80053?: string[]
    gdpr?: string[]
    euAiGpai?: string[]
  }
}

export interface BAISSCategory {
  id: BAISSCategoryId
  label: string
  description: string
}

// --- Categories (v2.0 labels) ---

export const BAISS_CATEGORIES: BAISSCategory[] = [
  { id: 'input-security', label: 'Input Security', description: 'Controls for validating, sanitizing, and securing all inputs to AI systems' },
  { id: 'output-security', label: 'Output Security', description: 'Controls for safe, sanitized, and policy-compliant AI outputs' },
  { id: 'model-protection', label: 'Model Protection', description: 'Controls for protecting model integrity, weights, and intellectual property' },
  { id: 'data-governance', label: 'Data Governance & Privacy', description: 'Controls for training data quality, privacy, provenance, and legal basis' },
  { id: 'supply-chain', label: 'Supply Chain, Build & Artifact Security', description: 'Controls for securing the AI/ML supply chain, build integrity, and artifact provenance' },
  { id: 'operational', label: 'Operational Security', description: 'Controls for secure AI deployment, monitoring, API security, and incident response' },
  { id: 'governance', label: 'Governance, Risk & Compliance', description: 'Controls for AI governance, risk management, policy, regulatory alignment, and GPAI obligations' },
  { id: 'adversarial', label: 'Adversarial Robustness', description: 'Controls for resilience against adversarial attacks, evasion, and manipulation' },
  { id: 'human-oversight', label: 'Human Oversight & Rights', description: 'Controls for human-in-the-loop, oversight, data subject rights, and accountability mechanisms' },
  { id: 'ethical', label: 'Ethical, Societal & Impact', description: 'Controls for bias, fairness, transparency, content provenance, environmental impact, and algorithmic accountability' },
]

// --- BAISS Controls (v2.0 — 45 controls) ---

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
      owaspAsvs: ['V5'],
      nist80053: ['SI-10'],
      ukDsit: ['P2'],
      iso24028: ['resilience'],
      nistCsf2: ['DE.CM'],
      saif: ['input-threat-protection'],
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
      owaspAsvs: ['V5'],
      owaspApi: ['API-3'],
      nist80053: ['SI-10'],
      nist218a: ['PW.1'],
      cisaNcsc: ['secure-ai-development'],
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
      nistAi1004: ['multimodal-genai-safeguards'],
      euAiGpai: ['Art.15'],
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
      owaspAsvs: ['V5'],
      owaspApi: ['API-3', 'API-7'],
      nist80053: ['SI-10'],
      iso24028: ['integrity-of-outputs'],
      ukDsit: ['P2'],
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
      gdpr: ['Art.5(1)(f)', 'Art.25'],
      nist80053: ['PT-2', 'PT-3'],
      iso27001: ['A.8.15'],
      saif: ['output-security'],
      cisaNcsc: ['sensitive-data-protection'],
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
      euAiGpai: ['Art.5', 'Art.53'],
      nistAi1004: ['harmful-content-in-generative-ai'],
      ukDsit: ['P2'],
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
      owaspApi: ['API-1', 'API-5'],
      iso27001: ['ISO27-ACCESS'],
      nist80053: ['AC-3', 'AC-4'],
      saif: ['model-protection-controls'],
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
      owaspApi: ['API-4'],
      nist80053: ['SC-7', 'SI-4'],
      iso24028: ['availability'],
    },
  },
  {
    id: 'BAISS-009',
    title: 'Model Integrity Verification',
    description: 'Verify model integrity to detect tampering, backdoors, or unauthorized modifications.',
    category: 'model-protection',
    assessmentType: 'automated',
    mappedFrameworks: {
      mitre: ['AML.T0010'],
      enisa: ['SEC-03'],
      nist80053: ['SI-7'],
      nist218a: ['PS.2'],
      slsa: ['artifact-integrity'],
      mlBom: ['component-integrity'],
      openssf: ['mlops'],
      saif: ['model-integrity'],
      iso27001: ['ISO27-CHANGE'],
    },
  },

  // --- Data Governance & Privacy ---
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
      nist218a: ['PW.3'],
      iso23894: ['training-data-risk'],
      gdpr: ['EDPB-Opinion-28/2024'],
      cisaNcsc: ['training-data-security'],
      saif: ['training-data-security'],
      ukDsit: ['P8'],
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
      gdpr: ['Art.6', 'Art.5'],
      sgMgaf: ['SG-DIM2'],
      caAia: ['data-requirements'],
      auAie: ['AU-P7'],
      iso23894: ['data-risk'],
      iso27001: ['data-governance-controls'],
      nist80053: ['PT-2', 'PT-3'],
    },
  },
  {
    id: 'BAISS-012',
    title: 'Data Provenance & Lineage',
    description: 'Track and verify the provenance and lineage of data used in AI systems.',
    category: 'data-governance',
    assessmentType: 'automated',
    mappedFrameworks: {
      euAi: ['Art.10'],
      nist: ['MAP'],
      mlBom: ['ML-BOM-6'],
      slsa: ['SLSA-ML-2'],
      nist80053: ['SR-4', 'AU-3'],
      gdpr: ['Art.5(1)(b)(e)(f)', 'EDPB-Opinion-28/2024'],
      nist218a: ['PS.3'],
      cisaNcsc: ['training-data-security'],
    },
  },
  // New data-governance controls (v2.0)
  {
    id: 'BAISS-038',
    title: 'Privacy by Design & Legal Basis for AI',
    description: 'Implement privacy by design and by default principles with documented legal basis for all personal data processing in AI systems.',
    category: 'data-governance',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      euAi: ['Art.10'],
      gdpr: ['Art.25', 'Art.6'],
      nist80053: ['PT-2', 'PT-8'],
      auAie: ['AU-P7'],
      sgMgaf: ['SG-DIM2'],
      nistCsf2: ['GV.PO'],
      iso27001: ['privacy'],
      iso23894: ['privacy-risk'],
    },
  },
  {
    id: 'BAISS-041',
    title: 'Special Category & Sensitive Data Controls',
    description: 'Apply heightened protections to special category personal data and sensitive data in AI systems.',
    category: 'data-governance',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      euAi: ['Art.10'],
      gdpr: ['Art.9'],
      sgMgaf: ['PDPA-sensitive'],
      nistAi1004: ['bias-demographic'],
      ieeeP7000: ['7003-protected'],
      caAia: ['GBA+'],
    },
  },

  // --- Supply Chain, Build & Artifact Security ---
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
      slsa: ['all-levels'],
      mlBom: ['component-inventory'],
      openssf: ['MLOPS-1'],
      nist80053: ['SR-3', 'SR-5'],
      nistCsf2: ['GV.SC', 'ID.SC'],
      iso27001: ['ISO27-SC'],
      cisaNcsc: ['supply-chain-security'],
      saif: ['supply-chain-protection'],
      ukDsit: ['P7'],
      nist218a: ['PS.2', 'PW.4'],
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
      openssf: ['MCP-1'],
      saif: ['integration-security'],
      cisaNcsc: ['ai-pipeline-security'],
      iso27001: ['access-controls-on-ai-pipeline'],
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
      caAia: ['CA-L3', 'CA-L4'],
      auAie: ['AU-P1'],
      ieeeP7000: ['accountability-for-autonomous-ai'],
      euAiGpai: ['Art.14'],
    },
  },
  // New supply-chain controls (v2.0)
  {
    id: 'BAISS-033',
    title: 'Secure AI Development Lifecycle & Build Integrity',
    description: 'Integrate security into all AI development phases with separated environments, threat modeling, secure coding standards, and adversarial testing gates.',
    category: 'supply-chain',
    assessmentType: 'automated',
    mappedFrameworks: {
      nist218a: ['PO.1', 'PO.5', 'PW.1', 'PW.3', 'PW.8'],
      slsa: ['L2-1', 'L3-1', 'L3-2'],
      openssf: ['Scorecard'],
      cisaNcsc: ['D.Design'],
      saif: ['platform-security'],
      nist80053: ['SA-3', 'SA-8'],
      iso23894: ['lifecycle'],
      iso27001: ['ISO27-CHANGE'],
    },
  },
  {
    id: 'BAISS-034',
    title: 'AI Artifact Signing, Provenance & Bill of Materials',
    description: 'Maintain machine-readable provenance and inventory for all AI artifacts with signing, ML-BOM, and SHA-256 verification.',
    category: 'supply-chain',
    assessmentType: 'automated',
    mappedFrameworks: {
      slsa: ['L1', 'L2', 'L3', 'ML-1', 'ML-2'],
      mlBom: ['ML-BOM-1', 'ML-BOM-2', 'ML-BOM-3', 'ML-BOM-4', 'ML-BOM-5', 'ML-BOM-6', 'ML-BOM-7', 'ML-BOM-8', 'ML-BOM-9', 'ML-BOM-10'],
      openssf: ['OMS-1', 'OMS-2'],
      nist218a: ['PS.3'],
      nist80053: ['SR-4'],
      gdpr: ['EDPB-28'],
      euAi: ['Art.12'],
      euAiGpai: ['Art.53', 'AnnexXI'],
      ukDsit: ['P8'],
      cisaNcsc: ['supply-chain-transparency'],
    },
  },
  {
    id: 'BAISS-035',
    title: 'Model Serialization Security',
    description: 'Protect against unsafe model deserialization by mandating safe loading tools and integrity hash verification.',
    category: 'supply-chain',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      openssf: ['MLOPS-3'],
      mitre: ['AML.T0010'],
      nist80053: ['SI-7'],
      nist218a: ['PS.2'],
      slsa: ['artifact-integrity'],
      cisaNcsc: ['supply-chain'],
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
      nist80053: ['AU-2', 'AU-3', 'SI-4'],
      nistCsf2: ['DE.CM'],
      iso27001: ['ISO27-LOG'],
      sgMgaf: ['SG-DIM4'],
      openssf: ['vulnerability-monitoring'],
      ukDsit: ['P12'],
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
      nist218a: ['IR-4', 'IR-6'],
      nist80053: ['IR-4', 'IR-6'],
      euAiGpai: ['GPAI-55B'],
      gdpr: ['Art.33'],
      sgMgaf: ['SG-DIM4'],
      nistCsf2: ['RS'],
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
      nist80053: ['SA-8', 'CM-3', 'CM-5'],
      owaspAsvs: ['V14'],
      saif: ['platform-level-security'],
      iso27001: ['ISO27-ACCESS'],
      nist218a: ['PO.5'],
      ukDsit: ['P2'],
    },
  },
  // New operational controls (v2.0)
  {
    id: 'BAISS-036',
    title: 'AI API Security Controls',
    description: 'Secure all AI model inference APIs against API-specific vulnerabilities including authorization, SSRF, and resource consumption.',
    category: 'operational',
    assessmentType: 'automated',
    mappedFrameworks: {
      owaspApi: ['API-1', 'API-2', 'API-3', 'API-4', 'API-5', 'API-7', 'API-10'],
      owaspAsvs: ['V1', 'V9', 'V13'],
      nist80053: ['AC-3', 'SC-7'],
      iso27001: ['ISO27-VULN'],
      cisaNcsc: ['API-security'],
    },
  },
  {
    id: 'BAISS-037',
    title: 'AI System Change Management & Versioning',
    description: 'Implement formal change management with security review before production deployment of model updates, prompt changes, or dependency updates.',
    category: 'operational',
    assessmentType: 'manual',
    mappedFrameworks: {
      iso27001: ['ISO27-CHANGE'],
      nistCsf2: ['PR.PS'],
      mlBom: ['ML-BOM-4', 'ML-BOM-9'],
      nist80053: ['CM-3', 'CM-5'],
      ukDsit: ['P8'],
      euAi: ['Art.12'],
      nist218a: ['RV.3'],
    },
  },

  // --- Governance, Risk & Compliance ---
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
      iso23894: ['AI-risk-management-lifecycle'],
      nist80053: ['RA-3'],
      nistCsf2: ['GV.RM'],
      caAia: ['CA-L1', 'CA-L2', 'CA-L3', 'CA-L4'],
      auAie: ['AU-AI6'],
      ukDsit: ['P11'],
      sgMgaf: ['SG-DIM6'],
      saif: ['risk-management-framework'],
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
      gdpr: ['Art.37', 'Art.38', 'Art.39'],
      sgMgaf: ['SG-DIM1'],
      ukDsit: ['AI-Code-of-Practice'],
      caAia: ['CA-TRANS'],
      auAie: ['governance'],
      ieeeP7000: ['ethics-governance'],
      iso23894: ['stakeholder-engagement'],
      nistCsf2: ['GV.OC'],
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
      euAiGpai: ['August-2026-GPAI-obligations'],
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
      euAiGpai: ['Art.53', 'AnnexXI', 'AnnexXII'],
      gdpr: ['Art.30'],
      sgMgaf: ['SG-DIM3'],
      caAia: ['impact-assessment'],
      nist80053: ['SA-3'],
      nistCsf2: ['ID.AM'],
    },
  },
  // New governance controls (v2.0)
  {
    id: 'BAISS-042',
    title: 'GPAI & Frontier Model Obligations',
    description: 'For models meeting EU AI Act systemic risk threshold, implement risk self-assessment, AI Office notification, red-teaming, and tiered incident reporting.',
    category: 'governance',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      euAiGpai: ['GPAI-51A', 'GPAI-51B', 'GPAI-52', 'GPAI-53A', 'GPAI-53B', 'GPAI-53C', 'GPAI-53D', 'GPAI-54', 'GPAI-55A', 'GPAI-55B', 'GPAI-55C', 'GPAI-COP'],
    },
  },
  {
    id: 'BAISS-045',
    title: 'Sector-Specific & Jurisdictional Compliance',
    description: 'Identify and comply with sector-specific and jurisdictional AI requirements applicable to each deployment.',
    category: 'governance',
    assessmentType: 'manual',
    mappedFrameworks: {
      sgMgaf: ['SG-MAS', 'SG-DIM2'],
      caAia: ['CA-PEER', 'CA-SCOPE'],
      auAie: ['AU-SECTOR', 'AU-AI6'],
      ukDsit: ['sector'],
      iso27001: ['sector-controls'],
      nistCsf2: ['GV.OC'],
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
      nistCsf2: ['PR.DS'],
      ukDsit: ['P3'],
      iso24028: ['robustness'],
      saif: ['adversarial-ML-threat-model'],
      ieeeP7000: ['STS-STA-framework'],
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
      gdpr: ['Art.5(1)(f)', 'Art.32'],
      nist80053: ['AC-4'],
      iso27001: ['training-data-extraction-prevention'],
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
      owaspAsvs: ['V2'],
      nist80053: ['IA-2', 'AC-3'],
      cisaNcsc: ['session-security'],
    },
  },

  // --- Human Oversight & Rights ---
  {
    id: 'BAISS-026',
    title: 'Human-in-the-Loop Controls',
    description: 'Ensure critical AI decisions have appropriate human oversight and intervention mechanisms.',
    category: 'human-oversight',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      euAi: ['Art.14'],
      iso: ['Clause8'],
      caAia: ['CA-L3', 'CA-L4'],
      auAie: ['AU-P1', 'AU-AI6'],
      ieeeP7000: ['accountability'],
      gdpr: ['Art.22'],
      nistCsf2: ['PR.PS'],
      ukDsit: ['P10'],
      sgMgaf: ['SG-DIM1'],
    },
  },
  {
    id: 'BAISS-027',
    title: 'Transparency & Explainability',
    description: 'Provide transparency in AI decision-making and clear explanations of AI system capabilities.',
    category: 'human-oversight',
    assessmentType: 'manual',
    mappedFrameworks: {
      euAi: ['Art.13', 'Art.52'],
      nist: ['GOVERN'],
      gdpr: ['Art.13', 'Art.14'],
      sgMgaf: ['SG-DIM7'],
      ukDsit: ['AI-Code-of-Practice'],
      caAia: ['CA-TRANS'],
      auAie: ['AU-P5'],
      ieeeP7000: ['STS-STA-framework'],
      nistAi1004: ['transparency'],
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
      euAi: ['Art.9', 'Art.27'],
      gdpr: ['Art.35'],
      caAia: ['CA-AIA', 'CA-L1', 'CA-L2', 'CA-L3', 'CA-L4'],
      ieeeP7000: ['impact-assessment'],
      auAie: ['AU-AI6'],
      sgMgaf: ['Practice-2'],
      nist80053: ['RA-3'],
    },
  },
  // New human-oversight controls (v2.0)
  {
    id: 'BAISS-039',
    title: 'Data Subject Rights & ADM Safeguards',
    description: 'Implement mechanisms for data subjects to exercise rights related to AI processing with safeguards for automated decision-making.',
    category: 'human-oversight',
    assessmentType: 'manual',
    mappedFrameworks: {
      gdpr: ['Art.15', 'Art.16', 'Art.17', 'Art.18', 'Art.20', 'Art.21', 'Art.22'],
      caAia: ['CA-HUMAN'],
      auAie: ['AU-P6'],
      euAi: ['Art.14'],
      nist80053: ['PT-8'],
    },
  },
  {
    id: 'BAISS-040',
    title: 'Data Protection Impact Assessment & Privacy Notices',
    description: 'Conduct DPIAs before deploying high-risk AI systems and provide privacy notices to all affected data subjects.',
    category: 'human-oversight',
    assessmentType: 'manual',
    mappedFrameworks: {
      gdpr: ['Art.35', 'Art.36', 'Art.13', 'Art.14'],
      nist80053: ['PT-8'],
      caAia: ['CA-TRANS'],
      auAie: ['AU-P7'],
      ukDsit: ['P6'],
      ieeeP7000: ['stakeholder-impact'],
    },
  },

  // --- Ethical, Societal & Impact ---
  {
    id: 'BAISS-029',
    title: 'Bias & Fairness Testing',
    description: 'Test AI systems for bias, discrimination, and fairness across demographic groups.',
    category: 'ethical',
    assessmentType: 'automated',
    mappedFrameworks: {
      owasp: ['LLM09'],
      nist: ['MEASURE'],
      iso24027: ['AI-bias-mitigation'],
      iso24028: ['fairness'],
      ieeeP7000: ['algorithmic-bias-considerations'],
      nistAi1004: ['bias-in-generative-ai'],
      euAi: ['Art.10'],
      gdpr: ['Art.22', 'Recital-72'],
      auAie: ['AU-P3', 'AU-P4'],
      sgMgaf: ['SG-DIM3'],
      ukDsit: ['AI-Code-of-Practice'],
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
      ieeeP7000: ['transparency-opacity-assessment'],
      gdpr: ['Art.22'],
      euAi: ['Art.14'],
      caAia: ['CA-L2'],
      auAie: ['AU-P1'],
    },
  },
  {
    id: 'BAISS-031',
    title: 'Dual-Use & Safety Assessment',
    description: 'Assess AI systems for potential dual-use risks (CBRN, deepfakes, synthetic content).',
    category: 'ethical',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      nist: ['#1', '#9'],
      nistAi1004: ['dual-use-risks'],
      euAiGpai: ['Art.55'],
      ukDsit: ['P4'],
      sgMgaf: ['SG-DIM5'],
    },
  },
  {
    id: 'BAISS-032',
    title: 'Environmental Impact Management',
    description: 'Monitor and minimize the environmental impact of AI training and inference.',
    category: 'ethical',
    assessmentType: 'semi-automated',
    mappedFrameworks: {
      ukDsit: ['sustainability'],
      auAie: ['AU-P5'],
      ieeeP7000: ['environmental-impact'],
    },
  },
  // New ethical controls (v2.0)
  {
    id: 'BAISS-043',
    title: 'AI Content Provenance & Synthetic Media Controls',
    description: 'Ensure AI-generated content is appropriately labelled, watermarked, or credentialed with provenance metadata and synthetic content detection.',
    category: 'ethical',
    assessmentType: 'automated',
    mappedFrameworks: {
      euAi: ['Art.52'],
      euAiGpai: ['Art.53'],
      sgMgaf: ['SG-DIM7'],
      nistAi1004: ['synthetic-content'],
      cisaNcsc: ['content-authenticity'],
      iso24028: ['transparency'],
    },
  },
  {
    id: 'BAISS-044',
    title: 'Algorithmic Impact Assessment & Accountability',
    description: 'Assess and document societal, ethical, and human rights impacts of AI systems before deployment and at significant changes.',
    category: 'ethical',
    assessmentType: 'manual',
    mappedFrameworks: {
      ieeeP7000: ['7000', '7001', '7003'],
      caAia: ['CA-AIA', 'CA-L3', 'CA-L4'],
      auAie: ['AU-AI6', 'AU-P3', 'AU-P4'],
      sgMgaf: ['SG-AI6'],
      nistAi1004: ['societal'],
      ukDsit: ['accountability'],
    },
  },
]

// --- Helper Functions ---

/** Get all BAISS controls in a specific category */
export function getControlsByCategory(categoryId: BAISSCategoryId): BAISSControl[] {
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
  const frameworkKeys = new Set<string>()
  for (const c of BAISS_CONTROLS) {
    for (const [fw, ids] of Object.entries(c.mappedFrameworks)) {
      if (ids && ids.length > 0) {
        frameworkKeys.add(fw)
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
    frameworksCovered: frameworkKeys.size,
  }
}
