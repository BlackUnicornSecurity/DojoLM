/**
 * S65: Compliance Framework Definitions
 * Static definitions for all 27 compliance frameworks.
 *
 * INDEX:
 * - Lines 1-10:    Existing 5 frameworks (OWASP, NIST AI 600-1, MITRE, ISO 42001, EU AI Act)
 * - Lines ~90:     HIGH-priority frameworks (NIST 800-218A, ISO 23894, ISO 24027, ISO 24028, SAIF, CISA-NCSC)
 * - Lines ~350:    MEDIUM-priority frameworks (SLSA, ML-BOM, OpenSSF, NIST CSF 2.0, UK DSIT, IEEE P7000, NIST AI 100-4, EU AI Act GPAI)
 * - Lines ~700:    Regional + Referenced frameworks (SG-MGAF, CA-AIA, AU-AIE, ISO 27001 AI, OWASP ASVS, OWASP API, NIST 800-53 AI, GDPR AI)
 * - Lines ~1000:   ALL_FRAMEWORKS array
 */

import type { ComplianceFramework } from './types.js';

// ============================================================================
// EXISTING 5 FRAMEWORKS (Original)
// ============================================================================

export const OWASP_LLM_TOP10: ComplianceFramework = {
  id: 'owasp-llm-top10',
  name: 'OWASP LLM Top 10',
  version: '2025',
  controls: [
    { id: 'LLM01', name: 'Prompt Injection', description: 'Direct and indirect prompt injection attacks', category: 'Input', requirement: 'Detect and prevent prompt injection in user inputs and external data' },
    { id: 'LLM02', name: 'Insecure Output Handling', description: 'Insufficient validation of LLM outputs', category: 'Output', requirement: 'Validate and sanitize all LLM-generated outputs before use' },
    { id: 'LLM03', name: 'Training Data Poisoning', description: 'Manipulation of training data', category: 'Data', requirement: 'Validate data provenance and integrity of training datasets' },
    { id: 'LLM04', name: 'Model Denial of Service', description: 'Resource exhaustion attacks on LLMs', category: 'Availability', requirement: 'Implement rate limiting and resource controls for LLM operations' },
    { id: 'LLM05', name: 'Supply Chain Vulnerabilities', description: 'Vulnerabilities in LLM supply chain', category: 'Supply Chain', requirement: 'Audit and validate all components in the LLM supply chain' },
    { id: 'LLM06', name: 'Sensitive Information Disclosure', description: 'Exposure of sensitive data through LLM', category: 'Data Protection', requirement: 'Prevent leakage of PII, credentials, and proprietary data' },
    { id: 'LLM07', name: 'Insecure Plugin Design', description: 'Vulnerabilities in LLM plugins/tools', category: 'Integration', requirement: 'Enforce input validation and access controls on plugins' },
    { id: 'LLM08', name: 'Excessive Agency', description: 'LLM granted too many capabilities', category: 'Authorization', requirement: 'Apply least-privilege principles to LLM tool access' },
    { id: 'LLM09', name: 'Overreliance', description: 'Excessive trust in LLM outputs', category: 'Governance', requirement: 'Implement human oversight and verification mechanisms' },
    { id: 'LLM10', name: 'Model Theft', description: 'Unauthorized access to LLM models', category: 'Security', requirement: 'Protect model weights, APIs, and inference endpoints' },
  ],
};

export const NIST_AI_600_1: ComplianceFramework = {
  id: 'nist-ai-600-1',
  name: 'NIST AI 600-1',
  version: '2024',
  controls: [
    { id: 'NIST-VALID', name: 'Validation and Verification', description: 'AI system validation processes', category: 'Development', requirement: 'Establish validation processes for AI system behavior' },
    { id: 'NIST-BIAS', name: 'Bias Management', description: 'Identification and mitigation of AI biases', category: 'Fairness', requirement: 'Monitor and mitigate harmful biases in AI outputs' },
    { id: 'NIST-EXPLAIN', name: 'Explainability', description: 'Transparency in AI decision-making', category: 'Transparency', requirement: 'Provide explanations for AI-driven decisions' },
    { id: 'NIST-PRIV', name: 'Privacy', description: 'Privacy protection in AI systems', category: 'Privacy', requirement: 'Protect personal data in AI training and inference' },
    { id: 'NIST-SEC', name: 'Security', description: 'AI system security controls', category: 'Security', requirement: 'Implement security controls for AI system integrity' },
    { id: 'NIST-SAFE', name: 'Safety', description: 'AI system safety measures', category: 'Safety', requirement: 'Ensure AI systems do not cause unintended harm' },
    { id: 'NIST-ACCOUNT', name: 'Accountability', description: 'Accountability for AI system outcomes', category: 'Governance', requirement: 'Establish accountability mechanisms for AI decisions' },
    { id: 'NIST-ROBUST', name: 'Robustness', description: 'AI system resilience to adversarial attacks', category: 'Robustness', requirement: 'Test and improve AI resilience against adversarial inputs' },
  ],
};

export const MITRE_ATLAS: ComplianceFramework = {
  id: 'mitre-atlas',
  name: 'MITRE ATLAS',
  version: '4.0',
  controls: [
    { id: 'AML.T0000', name: 'Reconnaissance', description: 'Gathering information about ML systems', category: 'Initial Access', requirement: 'Detect and prevent information gathering about ML systems' },
    { id: 'AML.T0010', name: 'ML Model Access', description: 'Gaining access to ML models', category: 'Initial Access', requirement: 'Protect ML model access points' },
    { id: 'AML.T0020', name: 'Adversarial ML Attacks', description: 'Evasion and poisoning attacks', category: 'Execution', requirement: 'Detect adversarial inputs designed to evade ML models' },
    { id: 'AML.T0030', name: 'Data Poisoning', description: 'Corruption of training data', category: 'Impact', requirement: 'Validate integrity of training data pipeline' },
    { id: 'AML.T0040', name: 'Model Extraction', description: 'Stealing ML model functionality', category: 'Collection', requirement: 'Prevent model extraction through API abuse' },
    { id: 'AML.T0050', name: 'Model Inversion', description: 'Recovering training data from models', category: 'Collection', requirement: 'Protect against training data recovery attacks' },
    { id: 'AML.T0060', name: 'LLM Prompt Injection', description: 'Manipulating LLM behavior through inputs', category: 'Execution', requirement: 'Detect and filter prompt injection attempts' },
    { id: 'AML.T0070', name: 'LLM Jailbreak', description: 'Bypassing LLM safety guardrails', category: 'Defense Evasion', requirement: 'Maintain robust safety guardrails against jailbreak attempts' },
  ],
};

export const ISO_42001: ComplianceFramework = {
  id: 'iso-42001',
  name: 'ISO/IEC 42001',
  version: '2023',
  controls: [
    { id: 'ISO-5.1', name: 'AI Policy', description: 'Organizational AI management policy', category: 'Leadership', requirement: 'Establish and maintain AI management policy' },
    { id: 'ISO-6.1', name: 'Risk Assessment', description: 'AI-specific risk assessment', category: 'Planning', requirement: 'Conduct AI risk assessments including adversarial risks' },
    { id: 'ISO-7.1', name: 'Resources', description: 'Resources for AI management', category: 'Support', requirement: 'Allocate adequate resources for AI security' },
    { id: 'ISO-8.1', name: 'Operational Planning', description: 'AI system operational controls', category: 'Operations', requirement: 'Implement operational controls for AI systems' },
    { id: 'ISO-8.4', name: 'AI System Impact Assessment', description: 'Impact assessment of AI systems', category: 'Operations', requirement: 'Assess potential impacts of AI system deployments' },
    { id: 'ISO-9.1', name: 'Monitoring and Measurement', description: 'AI performance monitoring', category: 'Evaluation', requirement: 'Monitor AI system performance and security metrics' },
    { id: 'ISO-10.1', name: 'Continual Improvement', description: 'AI management improvement', category: 'Improvement', requirement: 'Continuously improve AI management practices' },
  ],
};

export const EU_AI_ACT: ComplianceFramework = {
  id: 'eu-ai-act',
  name: 'EU AI Act',
  version: '2024',
  controls: [
    { id: 'EU-ART6', name: 'Risk Classification', description: 'Classification of AI systems by risk level', category: 'Classification', requirement: 'Classify AI systems according to risk categories' },
    { id: 'EU-ART9', name: 'Risk Management System', description: 'Risk management for high-risk AI', category: 'Risk Management', requirement: 'Establish risk management system for high-risk AI' },
    { id: 'EU-ART10', name: 'Data Governance', description: 'Training data quality and governance', category: 'Data', requirement: 'Ensure data quality and governance for AI training data' },
    { id: 'EU-ART13', name: 'Transparency', description: 'AI system transparency requirements', category: 'Transparency', requirement: 'Provide transparency about AI system capabilities and limitations' },
    { id: 'EU-ART14', name: 'Human Oversight', description: 'Human oversight of AI systems', category: 'Governance', requirement: 'Enable effective human oversight of AI operations' },
    { id: 'EU-ART15', name: 'Accuracy and Robustness', description: 'AI system accuracy and robustness', category: 'Quality', requirement: 'Ensure AI system accuracy, robustness, and cybersecurity' },
    { id: 'EU-ART52', name: 'Transparency for Users', description: 'Disclosure of AI system use', category: 'Transparency', requirement: 'Inform users when interacting with AI systems' },
  ],
};

// ============================================================================
// HIGH-PRIORITY FRAMEWORKS (GAP-001 to GAP-006)
// ============================================================================

export const NIST_800_218A: ComplianceFramework = {
  id: 'nist-800-218a',
  name: 'NIST SP 800-218A',
  version: '2024',
  controls: [
    { id: 'NIST-218A-PO.1', name: 'Security Requirements for AI Infrastructure', description: 'Document security requirements for AI development infrastructure', category: 'Prepare the Organisation', requirement: 'Communicate security requirements to all third-party AI component providers' },
    { id: 'NIST-218A-PO.2', name: 'Roles, Responsibilities & AI Security Training', description: 'Role definitions covering entire AI development lifecycle', category: 'Prepare the Organisation', requirement: 'Provide role-based training covering adversarial ML, data poisoning, and model security' },
    { id: 'NIST-218A-PO.5', name: 'Secure AI Development Environments', description: 'Separate and protect AI development environments from production', category: 'Prepare the Organisation', requirement: 'Isolate non-public training data with risk-based access controls' },
    { id: 'NIST-218A-PS.2', name: 'AI Artefact Integrity Verification', description: 'Integrity verification for AI model releases and datasets', category: 'Protect the Software', requirement: 'Publish cryptographic checksums and digital signatures for model artefacts' },
    { id: 'NIST-218A-PS.3', name: 'AI Provenance Documentation', description: 'ML-BOM, AI-BOM, data cards, model cards maintenance', category: 'Protect the Software', requirement: 'Maintain model cards, data cards, and model registries with version tracking' },
    { id: 'NIST-218A-PW.1', name: 'AI Threat Modeling', description: 'Threat modeling incorporating AI-specific threat types', category: 'Produce Well-Secured Software', requirement: 'Include poisoning, DoS, supply chain attacks, and data pipeline misconfiguration' },
    { id: 'NIST-218A-PW.3', name: 'Training Data Integrity Verification', description: 'Verify provenance and integrity of all training data', category: 'Produce Well-Secured Software', requirement: 'Maintain data cards and protect data collection processes before use' },
    { id: 'NIST-218A-PW.4', name: 'Secure Acquisition of AI Components', description: 'Verify integrity and security of acquired AI models', category: 'Produce Well-Secured Software', requirement: 'Scan and test acquired AI models for vulnerabilities before integration' },
    { id: 'NIST-218A-PW.8', name: 'AI/ML-Specific Testing & Evaluation', description: 'Adversarial robustness testing and PII protection testing', category: 'Produce Well-Secured Software', requirement: 'Document adversarial robustness testing and bias evaluation results' },
    { id: 'NIST-218A-RV.1', name: 'AI Vulnerability Disclosure Policy', description: 'Vulnerability identification and disclosure for AI systems', category: 'Respond to Vulnerabilities', requirement: 'Establish vulnerability disclosure policy for AI-specific vulnerabilities' },
    { id: 'NIST-218A-RV.2', name: 'AI Vulnerability Assessment & Remediation', description: 'Analyse and prioritise identified AI vulnerabilities', category: 'Respond to Vulnerabilities', requirement: 'Track, prioritise, and verify fixes within defined SLAs' },
    { id: 'NIST-218A-RV.3', name: 'Root Cause Analysis & SDLC Improvement', description: 'Determine root causes of AI vulnerabilities', category: 'Respond to Vulnerabilities', requirement: 'Update SDLC processes to prevent recurrence of vulnerability classes' },
  ],
};

export const ISO_23894: ComplianceFramework = {
  id: 'iso-23894',
  name: 'ISO/IEC 23894',
  version: '2023',
  controls: [
    { id: 'ISO-23894-4.1', name: 'AI Risk Management Principles', description: 'Foundational principles for AI risk management', category: 'Principles', requirement: 'Integrate holistic, lifecycle, and transparency principles into AI risk management' },
    { id: 'ISO-23894-5.1', name: 'AI Risk Framework Integration', description: 'Integrate AI risk management with organisational structures', category: 'Framework', requirement: 'Establish leadership commitment and continuous improvement mechanism' },
    { id: 'ISO-23894-5.2', name: 'AI Risk Criteria & Tolerance', description: 'Define AI-specific risk criteria and tolerance levels', category: 'Framework', requirement: 'Address drift, bias, hallucination, adversarial inputs, and black-box risks' },
    { id: 'ISO-23894-6.1', name: 'Risk Communication & Consultation', description: 'Ongoing stakeholder communication on AI risks', category: 'Processes', requirement: 'Ensure stakeholders understand AI risks relevant to their roles' },
    { id: 'ISO-23894-6.2', name: 'AI Risk Identification', description: 'Systematic identification of AI-specific hazards', category: 'Processes', requirement: 'Cover data drift, bias, hallucination, adversarial inputs, and emergent behaviours' },
    { id: 'ISO-23894-6.3', name: 'AI Risk Analysis & Evaluation', description: 'Analyse likelihood and impact of identified risks', category: 'Processes', requirement: 'Consider uncertainty, opacity, and emergent behaviours in AI risk analysis' },
    { id: 'ISO-23894-6.4', name: 'AI Risk Treatment & Control Selection', description: 'Select and implement risk treatment strategies', category: 'Processes', requirement: 'Implement human-in-the-loop approval for high-risk AI decisions' },
    { id: 'ISO-23894-6.5', name: 'AI Risk Monitoring & Improvement', description: 'Continuous monitoring of AI risks and controls', category: 'Processes', requirement: 'Track accuracy, drift, false rates, and override frequency indicators' },
    { id: 'ISO-23894-6.6', name: 'AI Risk Recording & Reporting', description: 'Document and report AI risk management activities', category: 'Processes', requirement: 'Maintain risk assessments, testing evidence, and incident records' },
  ],
};

export const ISO_24027: ComplianceFramework = {
  id: 'iso-24027',
  name: 'ISO/IEC TR 24027',
  version: '2021',
  controls: [
    { id: 'ISO-24027-B1', name: 'Bias Type Identification', description: 'Classify all sources of potential bias across five types', category: 'Bias Identification', requirement: 'Document data, algorithmic, cognitive, engineering, and measurement bias sources' },
    { id: 'ISO-24027-B2', name: 'Bias Scope Assessment', description: 'Integrate bias assessment into every AI lifecycle phase', category: 'Bias Identification', requirement: 'Assess bias introduction points at each lifecycle phase including drift monitoring' },
    { id: 'ISO-24027-B3', name: 'Fairness Metric Selection', description: 'Select appropriate fairness metrics for each use case', category: 'Bias Assessment', requirement: 'Apply demographic parity, equality of opportunity, and disparate impact metrics' },
    { id: 'ISO-24027-B4', name: 'Subgroup Performance Evaluation', description: 'Evaluate model performance across demographic groups', category: 'Bias Assessment', requirement: 'Use confusion-matrix metrics to detect differential error rates across groups' },
    { id: 'ISO-24027-B5', name: 'Validation Data Selection', description: 'Define criteria for bias quality control validation datasets', category: 'Bias Assessment', requirement: 'Ensure validation datasets represent all stakeholders including marginalised groups' },
    { id: 'ISO-24027-B6', name: 'Pre-Processing Bias Mitigation', description: 'Address bias at the data level through rebalancing', category: 'Bias Mitigation', requirement: 'Reweight training data and apply data provenance controls' },
    { id: 'ISO-24027-B7', name: 'In-Processing Bias Mitigation', description: 'Fairness-aware training objectives and constraints', category: 'Bias Mitigation', requirement: 'Document selection and effectiveness of in-processing techniques' },
    { id: 'ISO-24027-B8', name: 'Post-Processing Bias Mitigation', description: 'Reduce bias in model outputs via threshold adjustments', category: 'Bias Mitigation', requirement: 'Validate and document effectiveness of post-processing controls' },
    { id: 'ISO-24027-B9', name: 'Bias Profile Documentation', description: 'Comprehensive bias profile for each AI system', category: 'Documentation', requirement: 'Document datasets, fairness metrics, trade-offs, and mitigation effectiveness' },
    { id: 'ISO-24027-B10', name: 'Ongoing Bias Monitoring', description: 'Continuous monitoring for post-deployment bias emergence', category: 'Documentation', requirement: 'Detect data drift and concept drift; trigger retraining on fairness degradation' },
  ],
};

export const ISO_24028: ComplianceFramework = {
  id: 'iso-24028',
  name: 'ISO/IEC TR 24028',
  version: '2020',
  controls: [
    { id: 'ISO-24028-B1', name: 'Reliability & Accuracy', description: 'Consistent, predictable behaviour within defined parameters', category: 'Trustworthiness', requirement: 'Measure performance across operational conditions with documented thresholds' },
    { id: 'ISO-24028-B2', name: 'Safety', description: 'Avoid causing harm to humans, property, or environment', category: 'Trustworthiness', requirement: 'Identify harm scenarios, evaluate severity and probability, test safety controls' },
    { id: 'ISO-24028-B3', name: 'Robustness Against Adversarial Threats', description: 'Maintain performance under adversarial conditions and distribution shift', category: 'Technical Robustness', requirement: 'Test adversarial input resistance, distribution shift, and concept drift' },
    { id: 'ISO-24028-B4', name: 'Security & Integrity', description: 'Secure against attacks targeting the AI lifecycle', category: 'Technical Robustness', requirement: 'Address data poisoning, model theft, adversarial inference, and supply chain compromise' },
    { id: 'ISO-24028-B5', name: 'Privacy', description: 'Protect personal data throughout the AI lifecycle', category: 'Technical Robustness', requirement: 'Address training data privacy, inference privacy, PII handling, and data minimisation' },
    { id: 'ISO-24028-B6', name: 'Transparency', description: 'Sufficient information about design and operation for stakeholders', category: 'Transparency', requirement: 'Provide system documentation, capability disclosure, and AI identity disclosure' },
    { id: 'ISO-24028-B7', name: 'Explainability & Interpretability', description: 'Meaningful explanations for AI outputs', category: 'Transparency', requirement: 'Document explanation method, intended audience, and validation of accuracy' },
    { id: 'ISO-24028-B8', name: 'Fairness', description: 'Equitable treatment avoiding systematic disparities', category: 'Governance', requirement: 'Select fairness metrics and measure performance disparities across demographic groups' },
    { id: 'ISO-24028-B9', name: 'Accountability', description: 'Clear accountability structures for AI systems', category: 'Governance', requirement: 'Define roles, audit trails, escalation paths, and supply chain accountability' },
    { id: 'ISO-24028-B10', name: 'Controllability & Human Oversight', description: 'Humans can monitor, intervene, override, or shut down AI', category: 'Governance', requirement: 'Implement human-in-the-loop, override capabilities, and operator training' },
    { id: 'ISO-24028-B11', name: 'Availability & Resiliency', description: 'Maintain operational availability and recover from faults', category: 'Availability', requirement: 'Define SLAs, degraded-mode procedures, and disaster recovery plans' },
  ],
};

export const GOOGLE_SAIF: ComplianceFramework = {
  id: 'google-saif',
  name: 'Google SAIF',
  version: '2023',
  controls: [
    { id: 'SAIF-P1-1', name: 'AI Supply Chain Security', description: 'Supply chain security for AI components', category: 'Security Foundations', requirement: 'Vet pre-trained models, maintain ML-BOM, verify model artefact provenance' },
    { id: 'SAIF-P1-2', name: 'Secure AI Development Lifecycle', description: 'Security integrated into AI development lifecycle', category: 'Security Foundations', requirement: 'Threat model AI attack vectors, test AI components, separate environments' },
    { id: 'SAIF-P2-1', name: 'AI Threat Detection & Monitoring', description: 'Detect AI-specific threat indicators in production', category: 'Detection & Response', requirement: 'Monitor for prompt injection, anomalous outputs, data drift, and deepfakes' },
    { id: 'SAIF-P2-2', name: 'AI Incident Response', description: 'AI-specific incident response procedures', category: 'Detection & Response', requirement: 'Define incident taxonomy, response playbooks, and rollback procedures' },
    { id: 'SAIF-P3-1', name: 'Automated AI Security Scanning', description: 'Automated security scanning for AI workloads', category: 'Automated Defences', requirement: 'Integrate automated scanning into deployment gates blocking high-severity findings' },
    { id: 'SAIF-P4-1', name: 'Data Layer Controls', description: 'Platform controls for AI training and inference data', category: 'Platform Controls', requirement: 'Classify data, enforce access controls, track lineage, encrypt at rest and in transit' },
    { id: 'SAIF-P4-2', name: 'Infrastructure & Model Layer Controls', description: 'Platform controls for AI infrastructure and model layers', category: 'Platform Controls', requirement: 'Harden infrastructure, control model access, sign models, maintain audit trails' },
    { id: 'SAIF-P5-1', name: 'Continuous Control Improvement', description: 'Feedback mechanisms improving AI security controls', category: 'Feedback Loops', requirement: 'Track detection rates and integrate threat intelligence quarterly' },
    { id: 'SAIF-P6-1', name: 'Business-Contextual AI Risk Assessment', description: 'Contextualise AI risks within business processes', category: 'Business Context', requirement: 'Map AI deployments to business impacts and prioritise investments accordingly' },
    { id: 'SAIF-RISK-1', name: 'SAIF 15 AI Risks Coverage', description: 'Assess exposure to all 15 SAIF enumerated risks', category: 'Risk Coverage', requirement: 'Assess likelihood, impact, and mitigations for all 15 SAIF AI risks' },
  ],
};

export const CISA_NCSC: ComplianceFramework = {
  id: 'cisa-ncsc',
  name: 'CISA/NCSC Secure AI Guidelines',
  version: '2023',
  controls: [
    { id: 'CISA-PH1-1', name: 'Threat Awareness & Secure-by-Design', description: 'Establish threat awareness and security as foundational design requirement', category: 'Secure Design', requirement: 'Identify adversarial threat actors and apply secure-by-default design principles' },
    { id: 'CISA-PH1-2', name: 'AI-Specific Threat Modelling', description: 'Structured threat modelling for AI-unique attack vectors', category: 'Secure Design', requirement: 'Address data poisoning, model theft, adversarial examples, and prompt injection' },
    { id: 'CISA-PH1-3', name: 'Third-Party Dependency Due Diligence', description: 'Security due diligence for third-party AI components', category: 'Secure Design', requirement: 'Assess security of model providers, dataset providers, and ML framework suppliers' },
    { id: 'CISA-PH2-1', name: 'AI Supply Chain Security & SBOM', description: 'Supply chain security controls for AI components in development', category: 'Secure Development', requirement: 'Maintain SBOM/ML-BOM, use signed components, scan dependencies' },
    { id: 'CISA-PH2-2', name: 'Data & Model Documentation', description: 'Documentation for AI training data and models', category: 'Secure Development', requirement: 'Produce data cards, model cards, and maintain provenance records' },
    { id: 'CISA-PH2-3', name: 'Sensitive Data Protection in AI Pipelines', description: 'Protect sensitive data throughout AI development pipeline', category: 'Secure Development', requirement: 'Apply encryption, data minimisation, differential privacy, and access controls' },
    { id: 'CISA-PH2-4', name: 'AI Infrastructure Security', description: 'Secure AI training and evaluation infrastructure', category: 'Secure Development', requirement: 'Isolate training environments, harden compute, and audit all actions' },
    { id: 'CISA-PH3-1', name: 'Pre-Deployment Security Testing', description: 'Structured security testing before production deployment', category: 'Secure Deployment', requirement: 'Red-team, bias audit, privacy test, and require security sign-off gate' },
    { id: 'CISA-PH3-2', name: 'Access Controls & Authentication', description: 'Robust access controls for production AI systems', category: 'Secure Deployment', requirement: 'Implement RBAC, MFA, API authentication, and rate limiting' },
    { id: 'CISA-PH3-3', name: 'Audit Logging & Cryptographic Integrity', description: 'Audit logging and cryptographic integrity for AI deployments', category: 'Secure Deployment', requirement: 'Log all inference requests with tamper-evident storage and signed artefacts' },
    { id: 'CISA-PH4-1', name: 'AI System Behaviour Monitoring', description: 'Continuous monitoring for anomalous behaviour and security incidents', category: 'Secure Operation', requirement: 'Monitor inference outputs, adversarial inputs, data drift, and API usage' },
    { id: 'CISA-PH4-2', name: 'Update Management & Vulnerability Response', description: 'Structured update management for AI systems', category: 'Secure Operation', requirement: 'Define patching SLAs, model update procedures, and rollback capabilities' },
    { id: 'CISA-UKCoP-1', name: 'UK AI Code of Practice Principles', description: 'Compliance with UK NCSC 13 AI cyber security principles', category: 'UK Code of Practice', requirement: 'Address secure design, supply chain, data security, and incident management' },
  ],
};

// ============================================================================
// MEDIUM-PRIORITY FRAMEWORKS (GAP-007 to GAP-013, GAP-019)
// ============================================================================

export const SLSA_V1: ComplianceFramework = {
  id: 'slsa-v1',
  name: 'SLSA',
  version: '1.0',
  controls: [
    { id: 'SLSA-L1-1', name: 'Automatic Provenance Generation', description: 'Build system automatically generates provenance for all artefacts', category: 'Build L1', requirement: 'Generate provenance documenting build type, builder identity, and output hashes' },
    { id: 'SLSA-L1-2', name: 'Provenance Content Completeness', description: 'Provenance must contain all required fields', category: 'Build L1', requirement: 'Include buildType, externalParameters, resolvedDependencies, and builder.id' },
    { id: 'SLSA-L2-1', name: 'Hosted Build Platform', description: 'Builds must execute on a dedicated hosted build platform', category: 'Build L2', requirement: 'Execute all builds on hosted platform, not developer workstations' },
    { id: 'SLSA-L2-2', name: 'Cryptographic Provenance Signing', description: 'Provenance cryptographically signed by the build platform', category: 'Build L2', requirement: 'Sign with private key not accessible to user-defined build steps' },
    { id: 'SLSA-L3-1', name: 'Ephemeral & Isolated Build Environments', description: 'Strict isolation with ephemeral environments at L3', category: 'Build L3', requirement: 'Fresh environments per build with no reuse or persistence between builds' },
    { id: 'SLSA-L3-2', name: 'Hermetic Build Inputs', description: 'All inputs explicitly declared and resolved', category: 'Build L3', requirement: 'Resolve all inputs to immutable content-addressed references before build' },
    { id: 'SLSA-ML-1', name: 'ML Model Artifact Provenance', description: 'ML-specific provenance metadata for model artefacts', category: 'ML Extensions', requirement: 'Include training dataset, architecture, hyperparameters, and parent model references' },
    { id: 'SLSA-ML-2', name: 'Dataset Provenance & Integrity', description: 'Training and evaluation datasets must have documented provenance', category: 'ML Extensions', requirement: 'Document source, version, collection methodology, and licensing for all datasets' },
    { id: 'SLSA-VER-1', name: 'Provenance Verification', description: 'Verify SLSA provenance for third-party components', category: 'Verification', requirement: 'Validate signatures, verify builder identity, and check parameters before use' },
    { id: 'SLSA-VER-2', name: 'SLSA Level Policy', description: 'Define and enforce minimum SLSA levels per artefact category', category: 'Verification', requirement: 'Establish minimum SLSA levels, risk acceptance, and deployment gates' },
  ],
};

export const ML_BOM: ComplianceFramework = {
  id: 'ml-bom',
  name: 'ML-BOM',
  version: '2025',
  controls: [
    { id: 'ML-BOM-1', name: 'SBOM Minimum Elements', description: 'Software components covered by NTIA minimum SBOM', category: 'SBOM Elements', requirement: 'Include supplier, component name, version, identifiers, and dependencies' },
    { id: 'ML-BOM-2', name: 'ML-BOM AI/ML Elements', description: 'AI/ML components require additional ML-BOM documentation', category: 'SBOM Elements', requirement: 'Document ML-specific elements beyond standard SBOM for scanner models' },
    { id: 'ML-BOM-3', name: 'Model Card Authoring', description: 'Each ML model must have a model card', category: 'Model Documentation', requirement: 'Document model details, intended use, metrics, evaluation data, and ethical considerations' },
    { id: 'ML-BOM-4', name: 'Model Versioning & Lineage', description: 'ML models version-controlled with immutable versions', category: 'Model Documentation', requirement: 'Track full development lineage with semantic versions and digital signatures' },
    { id: 'ML-BOM-5', name: 'Dataset Card Authoring', description: 'Each dataset must have a dataset card', category: 'Dataset Documentation', requirement: 'Document composition, collection process, preprocessing, and known issues' },
    { id: 'ML-BOM-6', name: 'Data Provenance & Integrity', description: 'Training data must have documented provenance and verified integrity', category: 'Dataset Documentation', requirement: 'Verify content-addressed source provenance and licensing before use' },
    { id: 'ML-BOM-7', name: 'ML-BOM Cryptographic Integrity', description: 'ML-BOM documents and artefacts cryptographically protected', category: 'Supply Chain', requirement: 'Apply digital signatures, hashed weights, and tamper-evident storage' },
    { id: 'ML-BOM-8', name: 'Third-Party AI Component Requirements', description: 'Require ML-BOM documentation from third-party AI vendors', category: 'Supply Chain', requirement: 'Verify completeness and reject components without ML-BOM documentation' },
    { id: 'ML-BOM-9', name: 'ML-BOM Lifecycle Maintenance', description: 'ML-BOM as living documents maintained throughout lifecycle', category: 'Governance', requirement: 'Quarterly completeness audits and updates on system changes' },
    { id: 'ML-BOM-10', name: 'ML-BOM Vulnerability Integration', description: 'Integrate ML-BOM with vulnerability management programme', category: 'Governance', requirement: 'Continuous scanning, VEX generation, and SLA timelines for remediation' },
  ],
};

export const OPENSSF: ComplianceFramework = {
  id: 'openssf',
  name: 'OpenSSF AI/ML Security',
  version: '2025',
  controls: [
    { id: 'OPENSSF-OMS-1', name: 'Model Artefact Signing', description: 'ML model artefacts cryptographically signed', category: 'Model Signing', requirement: 'Sign using OpenSSF Model Signing specification or equivalent' },
    { id: 'OPENSSF-OMS-2', name: 'Transparency Log Integration', description: 'Signing events recorded in append-only transparency log', category: 'Model Signing', requirement: 'Enable post-hoc auditability of all model signing operations' },
    { id: 'OPENSSF-SC-1', name: 'Scorecard Compliance', description: 'Achieve satisfactory OpenSSF Scorecard score', category: 'Best Practices', requirement: 'Pass 18+ automated security checks including branch protection and SAST' },
    { id: 'OPENSSF-SC-2', name: 'OSPS Baseline Maturity', description: 'Achieve OpenSSF OSPS Baseline Maturity Level 2', category: 'Best Practices', requirement: 'Meet 41 security controls across 6 lifecycle stages' },
    { id: 'OPENSSF-MLOPS-1', name: 'ML Supply Chain Threat Coverage', description: 'Controls for OWASP ML06 AI supply chain attacks', category: 'ML Pipeline Security', requirement: 'Protect against compromised models, poisoned datasets, and namespace reuse' },
    { id: 'OPENSSF-MLOPS-2', name: 'ML Training Data Integrity', description: 'Controls for OWASP ML02 data poisoning attacks', category: 'ML Pipeline Security', requirement: 'Verify training data integrity with anomaly detection and data isolation' },
    { id: 'OPENSSF-MLOPS-3', name: 'Model Serialization Security', description: 'Protect against unsafe model deserialization attacks', category: 'ML Pipeline Security', requirement: 'Prevent malicious code execution during model loading' },
    { id: 'OPENSSF-AICA-1', name: 'AI Code Assistant Security', description: 'Security instructions for AI code assistants', category: 'AI Assistants', requirement: 'Configure security instructions for development AI code assistants' },
    { id: 'OPENSSF-MCP-1', name: 'MCP Tool Security', description: 'Security controls for MCP-compatible agentic AI systems', category: 'Agentic Security', requirement: 'Defend against tool poisoning, prompt injection, and confused deputy attacks' },
  ],
};

export const NIST_CSF_2: ComplianceFramework = {
  id: 'nist-csf-2',
  name: 'NIST CSF 2.0',
  version: '2.0',
  controls: [
    { id: 'CSF2-GV-1', name: 'AI Risk Strategy', description: 'Cybersecurity risk management strategy with AI considerations', category: 'Govern', requirement: 'Document risk management strategy including AI-specific risk considerations' },
    { id: 'CSF2-GV-2', name: 'AI Supply Chain Risk Management', description: 'Comprehensive AI supply chain risk management programme', category: 'Govern', requirement: 'Implement supply chain risk management for AI components and providers' },
    { id: 'CSF2-ID-1', name: 'AI Asset Management', description: 'Comprehensive inventory of AI system assets', category: 'Identify', requirement: 'Maintain inventory of AI assets and their cybersecurity properties' },
    { id: 'CSF2-ID-2', name: 'AI Risk Assessment', description: 'Risk assessments addressing AI-specific threats', category: 'Identify', requirement: 'Assess risks specific to AI systems including adversarial and data threats' },
    { id: 'CSF2-PR-1', name: 'AI Identity & Access Management', description: 'Identity and access management for AI systems', category: 'Protect', requirement: 'Implement robust IAM controls for AI system access and operations' },
    { id: 'CSF2-PR-2', name: 'AI Data Security', description: 'Data security for AI pipelines', category: 'Protect', requirement: 'Protect data in AI pipelines through encryption and access controls' },
    { id: 'CSF2-PR-3', name: 'AI Platform Security', description: 'Platform-level security for AI infrastructure', category: 'Protect', requirement: 'Apply platform security controls to AI infrastructure components' },
    { id: 'CSF2-DE-1', name: 'AI Threat Detection', description: 'Continuous monitoring for AI-specific threats', category: 'Detect', requirement: 'Detect adversarial inputs, model drift, and anomalous API usage patterns' },
    { id: 'CSF2-RS-1', name: 'AI Incident Response', description: 'AI-specific incident response capabilities', category: 'Respond', requirement: 'Maintain playbooks for AI-specific incidents with defined response procedures' },
    { id: 'CSF2-RC-1', name: 'AI System Recovery', description: 'AI system recovery and restoration capabilities', category: 'Recover', requirement: 'Maintain recovery capabilities including model rollback and data restoration' },
  ],
};

export const UK_DSIT: ComplianceFramework = {
  id: 'uk-dsit',
  name: 'UK DSIT AI Cyber Security CoP',
  version: '2025',
  controls: [
    { id: 'UK-CoP-P1', name: 'AI Security Awareness & Training', description: 'AI-specific security content in training programmes', category: 'Secure Design', requirement: 'Include AI security training tailored to different staff roles' },
    { id: 'UK-CoP-P2', name: 'Security as Core Design Requirement', description: 'Security as foundational requirement from inception', category: 'Secure Design', requirement: 'Embed security as core design requirement, not an afterthought' },
    { id: 'UK-CoP-P3', name: 'AI Threat Modelling & Risk Management', description: 'Structured threat modelling for AI attack vectors', category: 'Secure Design', requirement: 'Address data poisoning, model inversion, adversarial examples, and prompt injection' },
    { id: 'UK-CoP-P4', name: 'Human Responsibility & Oversight', description: 'AI systems designed with human oversight and accountability', category: 'Secure Design', requirement: 'Implement human-in-the-loop, explainability, and override capability' },
    { id: 'UK-CoP-P5', name: 'AI Asset Identification & Protection', description: 'Comprehensive AI asset inventories and protection', category: 'Secure Development', requirement: 'Version control, cryptographic hashes, access controls, and disaster recovery' },
    { id: 'UK-CoP-P6', name: 'AI Infrastructure Security', description: 'Secure AI development and deployment infrastructure', category: 'Secure Development', requirement: 'Implement RBAC, API rate limiting, input validation, and environment isolation' },
    { id: 'UK-CoP-P7', name: 'AI Supply Chain Security', description: 'Secure software supply chain for AI components', category: 'Secure Development', requirement: 'Assess suppliers, verify components, and enforce vulnerability response SLAs' },
    { id: 'UK-CoP-P8', name: 'AI Data, Model & Prompt Documentation', description: 'Comprehensive documentation and audit trails', category: 'Secure Development', requirement: 'Document training data, model design, prompt configuration, and change logs' },
    { id: 'UK-CoP-P9', name: 'Pre-Deployment Security Testing', description: 'Security assessment before AI deployment', category: 'Secure Deployment', requirement: 'Adversarial testing, privacy testing, bias testing, and independent review' },
    { id: 'UK-CoP-P10', name: 'User & Stakeholder Communication', description: 'Clear communication with AI system users and affected parties', category: 'Secure Deployment', requirement: 'Disclose data usage, limitations, security updates, and feedback channels' },
    { id: 'UK-CoP-P11', name: 'Security Updates & Patches', description: 'Provide and deliver security updates for AI systems', category: 'Secure Maintenance', requirement: 'Maintain patch management SLAs and treat updates as new versions requiring testing' },
    { id: 'UK-CoP-P12', name: 'AI System Behaviour Monitoring', description: 'Continuous monitoring of AI system behaviour', category: 'Secure Maintenance', requirement: 'Monitor performance changes, data drift, anomalies, and generate alerts' },
    { id: 'UK-CoP-P13', name: 'Secure Data & Model Disposal', description: 'Secure decommissioning and disposal of AI systems', category: 'Secure End of Life', requirement: 'Cryptographic deletion, access removal, and verified irreversibility' },
  ],
};

export const IEEE_P7000: ComplianceFramework = {
  id: 'ieee-p7000',
  name: 'IEEE P7000 Series',
  version: '2024',
  controls: [
    { id: 'IEEE-7001-1', name: 'System Transparency Specification', description: 'Transparency specification for each AI component', category: 'IEEE 7001 Transparency', requirement: 'Document transparency levels for five stakeholder groups on 0-5 scale' },
    { id: 'IEEE-7001-2', name: 'System Transparency Assessment', description: 'Verify declared transparency levels through assessment', category: 'IEEE 7001 Transparency', requirement: 'Conduct assessment with test datasets and stakeholder-specific verification' },
    { id: 'IEEE-7001-3', name: 'AI-Aided Decision Transparency', description: 'Detection outputs include sufficient information for decisions', category: 'IEEE 7001 Transparency', requirement: 'Provide confidence scores, methodology references, and evidence summaries' },
    { id: 'IEEE-7003-1', name: 'Bias Profile Authoring', description: 'Bias profile for each AI scanner model', category: 'IEEE 7003 Bias', requirement: 'Document all bias considerations through the system lifecycle' },
    { id: 'IEEE-7003-2', name: 'Data Representation Assessment', description: 'Assess representativeness of training and evaluation datasets', category: 'IEEE 7003 Bias', requirement: 'Evaluate dataset representativeness relative to served population' },
    { id: 'IEEE-7003-3', name: 'Fairness Metric Assessment', description: 'Select fairness metrics and conduct quantitative bias assessment', category: 'IEEE 7003 Bias', requirement: 'Use confusion-matrix metrics across subgroups with documented trade-off analysis' },
    { id: 'IEEE-7003-4', name: 'Application Boundary Definition', description: 'Define boundaries within which AI models are validated', category: 'IEEE 7003 Bias', requirement: 'Communicate operational boundaries and validation scope to stakeholders' },
    { id: 'IEEE-7003-5', name: 'Continuous Bias Monitoring', description: 'Continuous lifecycle monitoring beyond deployment', category: 'IEEE 7003 Bias', requirement: 'Monitor for post-deployment bias, update profiles, and trigger reassessment' },
  ],
};

export const NIST_AI_100_4: ComplianceFramework = {
  id: 'nist-ai-100-4',
  name: 'NIST AI 100-4',
  version: '2024',
  controls: [
    { id: 'NIST100-4-1', name: 'C2PA Content Credentials', description: 'Implement C2PA content credentials for AI-influenced content', category: 'Provenance', requirement: 'Record editing history, synthetic designation, and cryptographic signatures' },
    { id: 'NIST100-4-2', name: 'Digital Watermarking', description: 'Digital watermarking for AI-generated content', category: 'Provenance', requirement: 'Evaluate durability, imperceptibility, and reliability of watermarking' },
    { id: 'NIST100-4-3', name: 'Metadata Recording Standards', description: 'Standardised metadata recording using XMP, EXIF, IPTC', category: 'Provenance', requirement: 'Protect metadata integrity and monitor for removal attempts' },
    { id: 'NIST100-4-4', name: 'Multi-Method Synthetic Content Detection', description: 'Defence-in-depth approach combining multiple detection methods', category: 'Detection', requirement: 'Combine provenance-based, classification-based, and human-in-the-loop detection' },
    { id: 'NIST100-4-5', name: 'Detection Limitations & Robustness', description: 'Document and manage known detection limitations', category: 'Detection', requirement: 'Document false rates, adversarial evasion risks, and detection gaps' },
    { id: 'NIST100-4-6', name: 'Cryptographic & Perceptual Hashing', description: 'Hashing-based detection for known synthetic content', category: 'Detection', requirement: 'Implement SHA-256 and perceptual hashing with maintained hash databases' },
    { id: 'NIST100-4-7', name: 'AI Content Labelling', description: 'AI-generated content labelled with IPTC classification', category: 'Labelling', requirement: 'Apply IPTC digital source type classifications to all AI content' },
    { id: 'NIST100-4-8', name: 'Harmful Synthetic Content Prevention', description: 'Technical controls preventing harmful synthetic content', category: 'Prevention', requirement: 'Implement training data filtering, output filtering, and sandboxing' },
    { id: 'NIST100-4-9', name: 'Synthetic Content Governance', description: 'Ongoing monitoring aligned with NIST AI RMF', category: 'Governance', requirement: 'Track accuracy metrics, adversarial robustness, and maintain rollback procedures' },
  ],
};

export const EU_AI_ACT_GPAI: ComplianceFramework = {
  id: 'eu-ai-act-gpai',
  name: 'EU AI Act GPAI Obligations',
  version: '2024',
  controls: [
    { id: 'GPAI-51A', name: 'Systemic Risk Self-Assessment', description: 'Determine if models meet systemic risk threshold', category: 'Systemic Risk Classification', requirement: 'Evaluate high impact capabilities using Annex XIII technical tools' },
    { id: 'GPAI-51B', name: 'Continuous Threshold Monitoring', description: 'Monitor whether computation causes systemic risk classification', category: 'Systemic Risk Classification', requirement: 'Continuously evaluate systemic risk threshold throughout model lifecycle' },
    { id: 'GPAI-52', name: 'AI Office Notification', description: 'Notify AI Office upon systemic risk determination', category: 'Notification', requirement: 'Notify without undue delay when systemic risk is determined' },
    { id: 'GPAI-53A', name: 'Technical Documentation (Annex XI)', description: 'Draw up and maintain technical documentation', category: 'All GPAI Obligations', requirement: 'Maintain up-to-date technical documentation before market placement' },
    { id: 'GPAI-53B', name: 'Training Data Summary', description: 'Publish sufficiently detailed training data summary', category: 'All GPAI Obligations', requirement: 'Prepare training data summary according to AI Office template' },
    { id: 'GPAI-53C', name: 'Copyright Compliance Policy', description: 'Implement policy to comply with copyright law', category: 'All GPAI Obligations', requirement: 'Identify and comply with rights reservations under Directive 2019/790' },
    { id: 'GPAI-53D', name: 'Downstream Provider Documentation', description: 'Make compliance information available to downstream providers', category: 'All GPAI Obligations', requirement: 'Provide information necessary for downstream AI system compliance' },
    { id: 'GPAI-54', name: 'Authorised Representative', description: 'Third-country providers must designate EU representative', category: 'Representation', requirement: 'Designate authorised representative established in the EU by written mandate' },
    { id: 'GPAI-55A', name: 'Model Evaluation & Adversarial Testing', description: 'Perform model evaluation using standardised protocols', category: 'Systemic Risk Obligations', requirement: 'Evaluate using state-of-the-art standardised evaluation protocols and tools' },
    { id: 'GPAI-55B', name: 'Incident Reporting', description: 'Track and report serious incidents with tiered timelines', category: 'Systemic Risk Obligations', requirement: 'Report serious incidents to AI Office and national authorities without delay' },
    { id: 'GPAI-55C', name: 'Systemic Risk Cybersecurity', description: 'Ensure adequate cybersecurity for GPAI model infrastructure', category: 'Systemic Risk Obligations', requirement: 'Protect GPAI model and physical infrastructure with adequate cybersecurity' },
    { id: 'GPAI-COP', name: 'Code of Practice Adoption', description: 'GPAI Code of Practice adoption for compliance presumption', category: 'Code of Practice', requirement: 'Adopt Code of Practice for rebuttable presumption of Article 53/55 compliance' },
  ],
};

// ============================================================================
// REGIONAL + REFERENCED FRAMEWORKS (GAP-014 to GAP-020)
// ============================================================================

export const SG_MGAF: ComplianceFramework = {
  id: 'sg-mgaf',
  name: 'Singapore MGF-GenAI',
  version: '2024',
  controls: [
    { id: 'SG-DIM1', name: 'Accountability', description: 'Clear roles, responsibilities, and accountability mechanisms', category: 'Governance Dimension', requirement: 'Establish accountability mechanisms for all AI lifecycle players' },
    { id: 'SG-DIM2', name: 'Data', description: 'Data quality assessment, documentation, and PDPA compliance', category: 'Governance Dimension', requirement: 'Ensure data quality and address contentious training data' },
    { id: 'SG-DIM3', name: 'Trusted Development & Deployment', description: 'Secure development lifecycle and safety evaluation', category: 'Governance Dimension', requirement: 'Enhance transparency around baseline safety and hygiene measures' },
    { id: 'SG-DIM4', name: 'Incident Reporting', description: 'Incident management system with user reporting channels', category: 'Governance Dimension', requirement: 'Implement incident management for timely notification and remediation' },
    { id: 'SG-DIM5', name: 'Testing & Assurance', description: 'Systematic testing and third-party assurance', category: 'Governance Dimension', requirement: 'Provide external validation through third-party testing' },
    { id: 'SG-DIM6', name: 'Security', description: 'Protection against prompt injection, model theft, and adversarial attacks', category: 'Governance Dimension', requirement: 'Address AI-specific threat vectors against models and systems' },
    { id: 'SG-DIM7', name: 'Content Provenance', description: 'Labelling of AI-generated content and provenance mechanisms', category: 'Governance Dimension', requirement: 'Provide transparency about AI-generated content creation' },
    { id: 'SG-AV1', name: 'AI Verify Framework Alignment', description: 'Testing against 11 AI governance principles with PDPA compliance', category: 'AI Verify', requirement: 'Test against AI Verify Framework governance principles' },
    { id: 'SG-MAS', name: 'MAS FEAT Principles', description: 'Fairness, Ethics, Accountability, Transparency for financial sector', category: 'Financial Sector', requirement: 'Apply FEAT Principles for MAS-regulated deployments' },
  ],
};

export const CA_AIA: ComplianceFramework = {
  id: 'ca-aia',
  name: 'Canada AIA Directive',
  version: '2023',
  controls: [
    { id: 'CA-SCOPE', name: 'Directive Scope Assessment', description: 'Determine if system falls within Directive scope', category: 'Scope', requirement: 'Assess applicability for federal automated decision systems' },
    { id: 'CA-AIA', name: 'Algorithmic Impact Assessment', description: 'Complete AIA questionnaire to determine impact level', category: 'Assessment', requirement: 'Complete 65 risk + 41 mitigation questions before deployment' },
    { id: 'CA-L1', name: 'Level 1 (Little/No Impact)', description: 'AIA score 0-25% with reversible and brief impacts', category: 'Impact Levels', requirement: 'Publish AIA, legal consultation, bias testing, and human rights monitoring' },
    { id: 'CA-L2', name: 'Level 2 (Moderate Impact)', description: 'AIA score 26-50% with likely reversible short-term impacts', category: 'Impact Levels', requirement: 'All Level 1 plus peer review and explainable decisions' },
    { id: 'CA-L3', name: 'Level 3 (High Impact)', description: 'AIA score 51-75% with difficult-to-reverse ongoing impacts', category: 'Impact Levels', requirement: 'All Level 2 plus mandatory human intervention and bias audits' },
    { id: 'CA-L4', name: 'Level 4 (Very High Impact)', description: 'AIA score 76-100% with irreversible perpetual impacts', category: 'Impact Levels', requirement: 'All Level 3 plus 2+ independent peer reviews with direct human involvement' },
    { id: 'CA-TRANS', name: 'Public Notice & Decision Explanation', description: 'Plain language notice and explanation to affected individuals', category: 'Transparency', requirement: 'Provide notice and explanation of principal decision factors' },
    { id: 'CA-HUMAN', name: 'Human Review & Oversight', description: 'Human intervention points with informed decision capability', category: 'Human Review', requirement: 'For Levels 3-4, final decisions must be made by human decision-makers' },
    { id: 'CA-PEER', name: 'Peer Review', description: 'Qualified peer reviewer assessment for Levels 2-4', category: 'Peer Review', requirement: 'Require qualified peer reviewer (5+ years) before production deployment' },
  ],
};

export const AU_AIE: ComplianceFramework = {
  id: 'au-aie',
  name: 'Australia AI Ethics Framework',
  version: '2025',
  controls: [
    { id: 'AU-P1', name: 'Human & Environmental Wellbeing', description: 'AI must benefit individuals, society, and environment', category: 'Ethics Principles', requirement: 'Assess benefits and identify and mitigate potential harms throughout lifecycle' },
    { id: 'AU-P2', name: 'Human-Centred Values', description: 'Respect human rights, diversity, and autonomy', category: 'Ethics Principles', requirement: 'Uphold self-determination, cultural diversity, and human rights' },
    { id: 'AU-P3', name: 'Fairness', description: 'Inclusive, accessible, and non-discriminatory AI systems', category: 'Ethics Principles', requirement: 'Identify and mitigate bias to prevent unfair discrimination' },
    { id: 'AU-P4', name: 'Privacy Protection & Security', description: 'Respect privacy rights and data protection', category: 'Ethics Principles', requirement: 'Comply with Privacy Act 1988, APPs, and data minimisation principles' },
    { id: 'AU-P5', name: 'Reliability & Safety', description: 'Reliable operation in accordance with intended purpose', category: 'Ethics Principles', requirement: 'Test reliability and robustness; monitor for performance degradation' },
    { id: 'AU-P6', name: 'Transparency & Explainability', description: 'Responsible disclosure enabling understanding of AI impact', category: 'Ethics Principles', requirement: 'Disclose AI use and provide meaningful explanation of AI decisions' },
    { id: 'AU-P7', name: 'Contestability', description: 'Accessible channels for contesting AI-driven decisions', category: 'Ethics Principles', requirement: 'Provide timely and fair process to contest AI decisions affecting persons' },
    { id: 'AU-P8', name: 'Accountability', description: 'Identifiable and accountable individuals for AI lifecycle', category: 'Ethics Principles', requirement: 'Maintain decision records and enable human oversight' },
    { id: 'AU-AI6', name: 'Six Essential AI Practices', description: 'Accountability, assessment, testing, transparency, validation, oversight', category: 'AI6 Guidance', requirement: 'Implement all six essential AI practices per AI6 guidance' },
    { id: 'AU-SECTOR', name: 'Sector-Specific Compliance', description: 'TGA, APRA CPS 234, and Australian Consumer Law compliance', category: 'Sector-Specific', requirement: 'Comply with sector-specific legislation (TGA, APRA, ACL) as applicable' },
  ],
};

export const ISO_27001_AI: ComplianceFramework = {
  id: 'iso-27001-ai',
  name: 'ISO/IEC 27001 AI Controls',
  version: '2022',
  controls: [
    { id: 'ISO27-GOV', name: 'ISMS Governance for AI', description: 'ISMS scope including AI systems and information security policy', category: 'Governance', requirement: 'Establish ISMS defining organisational context with AI risk considerations' },
    { id: 'ISO27-RISK', name: 'AI Risk Assessment', description: 'Information security risk assessment for AI-specific threats', category: 'Risk Assessment', requirement: 'Identify data poisoning, model inversion, adversarial examples, and pipeline risks' },
    { id: 'ISO27-SC', name: 'AI Supplier Relationships', description: 'Security assessment of third-party model and dataset providers', category: 'Organisational Controls', requirement: 'Enforce contractual security requirements for AI supply chain' },
    { id: 'ISO27-TI', name: 'AI Threat Intelligence', description: 'Monitor LLM/AI vulnerability databases and emerging attacks', category: 'Organisational Controls', requirement: 'Track emerging AI attack techniques and share threat intelligence' },
    { id: 'ISO27-ACCESS', name: 'AI Access Control & Cryptography', description: 'Least privilege for model training with environment segregation', category: 'Technological Controls', requirement: 'Implement access controls, encryption, and environment isolation for AI' },
    { id: 'ISO27-LOG', name: 'AI Logging & Monitoring', description: 'Model training events, inference API logging, version changes', category: 'Technological Controls', requirement: 'Capture comprehensive logs of training, inference, and model operations' },
    { id: 'ISO27-VULN', name: 'AI Vulnerability Management', description: 'ML dependency scanning and adversarial robustness testing', category: 'Technological Controls', requirement: 'Regularly scan ML libraries and test AI system security' },
    { id: 'ISO27-CHANGE', name: 'AI Change Management', description: 'Model registry with metadata and formal change approval', category: 'Technological Controls', requirement: 'Track all model versions with formal approval and rollback capability' },
    { id: 'ISO27-INCIDENT', name: 'AI Incident Management', description: 'AI-specific incident categories: model compromise, adversarial attack', category: 'Technological Controls', requirement: 'Establish incident management with AI-specific categories and responses' },
    { id: 'ISO27-AI-ADD', name: 'AI-Specific Extended Controls', description: 'Model drift monitoring, data integrity validation, robustness testing', category: 'AI-Specific', requirement: 'Extend baseline ISO 27001 with AI-specific monitoring and testing controls' },
  ],
};

export const OWASP_ASVS: ComplianceFramework = {
  id: 'owasp-asvs',
  name: 'OWASP ASVS v4',
  version: '4.0.3',
  controls: [
    { id: 'ASVS-V1', name: 'Secure Architecture & Threat Model', description: 'SDLC security, component identification, and security logging', category: 'Architecture', requirement: 'Satisfy security principles with consistent SDLC and threat modelling' },
    { id: 'ASVS-V2', name: 'Authentication', description: 'Password, credential, and anti-automation controls', category: 'Authentication', requirement: 'Meet NIST SP 800-63B with anti-automation and secure credential storage' },
    { id: 'ASVS-V5', name: 'Input Validation & Injection Prevention', description: 'Positive input validation with allowlist and output encoding', category: 'Validation', requirement: 'Positively validate all inputs with allowlist and encode all outputs' },
    { id: 'ASVS-V7', name: 'Secure Logging & Error Handling', description: 'Security event logging without information leakage', category: 'Logging', requirement: 'Log all security-relevant events without exposing sensitive information' },
    { id: 'ASVS-V9', name: 'TLS & Transport Security', description: 'TLS encryption minimum 1.2 with certificate validation', category: 'Communications', requirement: 'Encrypt all client-server communications with validated certificates' },
    { id: 'ASVS-V10', name: 'Malicious Code Prevention', description: 'Code integrity, secure review, and malicious code detection', category: 'Supply Chain', requirement: 'Secure code review covering architecture, logic, and common weaknesses' },
    { id: 'ASVS-V13', name: 'API Security', description: 'Web service security, REST security, and rate limiting', category: 'API', requirement: 'Enforce API security across REST, SOAP, and GraphQL endpoints' },
    { id: 'ASVS-V14', name: 'Secure Configuration & Dependency Management', description: 'Build pipeline security and dependency management', category: 'Configuration', requirement: 'Maintain up-to-date vulnerability-free dependencies with secure configuration' },
  ],
};

export const OWASP_API: ComplianceFramework = {
  id: 'owasp-api',
  name: 'OWASP API Security Top 10',
  version: '2023',
  controls: [
    { id: 'API-1', name: 'Broken Object Level Authorization', description: 'Per-request object-level authorisation verification', category: 'Authorization', requirement: 'Enforce per-request authorisation for every endpoint receiving object identifiers' },
    { id: 'API-2', name: 'Broken Authentication', description: 'Weak credentials, token leakage, missing expiration', category: 'Authentication', requirement: 'Correctly implement and enforce authentication mechanisms' },
    { id: 'API-3', name: 'Broken Object Property Level Authorization', description: 'Field-level authorisation and sensitive field filtering', category: 'Authorization', requirement: 'Enforce authorisation at property/field level, not only object level' },
    { id: 'API-4', name: 'Unrestricted Resource Consumption', description: 'Rate limiting, request size limits, response pagination', category: 'Availability', requirement: 'Enforce volume and rate limits to prevent resource exhaustion' },
    { id: 'API-5', name: 'Broken Function Level Authorization', description: 'Per-function authorisation and HTTP method restrictions', category: 'Authorization', requirement: 'Verify caller permission for every API function call' },
    { id: 'API-6', name: 'Unrestricted Access to Sensitive Business Flows', description: 'Detection and blocking of automated business flow abuse', category: 'Business Logic', requirement: 'Detect and block business logic abuse via APIs' },
    { id: 'API-7', name: 'Server-Side Request Forgery', description: 'URL allowlisting and DNS resolution validation', category: 'Security', requirement: 'Prevent SSRF through URL allowlisting and DNS validation' },
    { id: 'API-8', name: 'Security Misconfiguration', description: 'Outdated dependencies, debug mode, permissive CORS', category: 'Configuration', requirement: 'Address misconfigured infrastructure and insecure default settings' },
    { id: 'API-9', name: 'Improper Inventory Management', description: 'Complete API endpoint and version inventory', category: 'Inventory', requirement: 'Maintain complete inventory of all deployed API endpoints and versions' },
    { id: 'API-10', name: 'Unsafe Consumption of APIs', description: 'Input validation for third-party data and timeout enforcement', category: 'Supply Chain', requirement: 'Validate third-party API inputs and assess vendor security' },
  ],
};

export const NIST_800_53_AI: ComplianceFramework = {
  id: 'nist-800-53-ai',
  name: 'NIST SP 800-53 AI Controls',
  version: 'Rev 5',
  controls: [
    { id: 'NIST-SA', name: 'AI System Acquisition & Engineering', description: 'SDLC security from design through pre-deployment testing', category: 'System Acquisition', requirement: 'Develop AI using defined SDLC with security engineering at each stage' },
    { id: 'NIST-SI', name: 'AI Model Integrity & Monitoring', description: 'Malicious code detection and continuous inference monitoring', category: 'System Integrity', requirement: 'Detect malicious code in model files and monitor inference anomalies' },
    { id: 'NIST-SR', name: 'AI Supply Chain Controls', description: 'Supply chain risk assessment and model provenance', category: 'Supply Chain Risk', requirement: 'Identify supply chain controls and maintain model provenance documentation' },
    { id: 'NIST-RA-CM', name: 'AI Risk Assessment & Configuration', description: 'Risk assessment of AI threats and ML dependency management', category: 'Risk & Configuration', requirement: 'Assess AI-specific threats: poisoning, inversion, adversarial, extraction' },
    { id: 'NIST-PT-AU', name: 'AI Privacy & Audit Logging', description: 'PII processing transparency and comprehensive event logging', category: 'Privacy & Audit', requirement: 'Document legal authority for PII processing with comprehensive audit logs' },
    { id: 'NIST-IR-AC', name: 'AI Incident Response & Access Control', description: 'Incident response for model poisoning, adversarial attacks, and leakage', category: 'Incident & Access', requirement: 'Implement incident playbooks for AI-specific attack categories' },
  ],
};

export const GDPR_AI: ComplianceFramework = {
  id: 'gdpr-ai',
  name: 'GDPR AI-Relevant Articles',
  version: '2024',
  controls: [
    { id: 'GDPR-SCOPE', name: 'GDPR Applicability & Legal Basis', description: 'Determine GDPR applicability and select legal basis', category: 'Scope', requirement: 'Establish legal basis: consent, contract, legal obligation, or legitimate interest' },
    { id: 'GDPR-PRIN', name: 'Data Processing Principles for AI', description: 'Article 5 principles applied to AI processing', category: 'Principles', requirement: 'Comply with lawfulness, fairness, transparency, purpose limitation, and minimisation' },
    { id: 'GDPR-SPECIAL', name: 'Special Category Data in AI', description: 'Processing prohibition by default with Art. 9(2) exceptions', category: 'Special Category', requirement: 'Apply exceptions only where justified for health, biometric, or research data' },
    { id: 'GDPR-TRANS', name: 'AI Transparency Notices', description: 'Controller identity, purposes, data categories, and retention periods', category: 'Transparency', requirement: 'Provide comprehensive information about AI data processing to data subjects' },
    { id: 'GDPR-ADM', name: 'Automated Decision-Making Rights', description: 'Right not to be subject to solely automated decisions', category: 'Automated Decisions', requirement: 'Provide safeguards for automated decisions producing legal or significant effects' },
    { id: 'GDPR-PBD', name: 'Privacy by Design & Default', description: 'Technical measures at design time with pseudonymisation', category: 'Privacy by Design', requirement: 'Implement data protection by design with privacy defaults and minimal processing' },
    { id: 'GDPR-DPIA', name: 'Data Protection Impact Assessment', description: 'DPIA mandatory for high-risk AI with automated profiling', category: 'Impact Assessment', requirement: 'Conduct DPIA before deploying AI with systematic and extensive evaluation' },
    { id: 'GDPR-RIGHTS', name: 'Data Subject Rights', description: 'Access, rectification, erasure, restriction, portability, objection', category: 'Data Subject Rights', requirement: 'Enable data subjects to exercise all GDPR rights over their personal data' },
    { id: 'GDPR-EDPB', name: 'EDPB Opinion 28/2024 for AI Models', description: 'Anonymity assessment, legitimate interest test, unlawful data handling', category: 'EDPB Guidance', requirement: 'Assess re-identification risk, apply 3-step interest test for AI model training' },
  ],
};

// ============================================================================
// ALL FRAMEWORKS ARRAY
// ============================================================================

export const ALL_FRAMEWORKS: ComplianceFramework[] = [
  // Original 5 (implemented)
  OWASP_LLM_TOP10,
  NIST_AI_600_1,
  MITRE_ATLAS,
  ISO_42001,
  EU_AI_ACT,
  // HIGH-priority (6)
  NIST_800_218A,
  ISO_23894,
  ISO_24027,
  ISO_24028,
  GOOGLE_SAIF,
  CISA_NCSC,
  // MEDIUM-priority (8)
  SLSA_V1,
  ML_BOM,
  OPENSSF,
  NIST_CSF_2,
  UK_DSIT,
  IEEE_P7000,
  NIST_AI_100_4,
  EU_AI_ACT_GPAI,
  // Regional + Referenced (8)
  SG_MGAF,
  CA_AIA,
  AU_AIE,
  ISO_27001_AI,
  OWASP_ASVS,
  OWASP_API,
  NIST_800_53_AI,
  GDPR_AI,
];
