/**
 * S65: Compliance Framework Definitions
 * Static definitions for OWASP LLM Top 10, NIST AI 600-1, MITRE ATLAS, ISO 42001, EU AI Act.
 */

import type { ComplianceFramework } from './types.js';

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

export const ALL_FRAMEWORKS: ComplianceFramework[] = [
  OWASP_LLM_TOP10,
  NIST_AI_600_1,
  MITRE_ATLAS,
  ISO_42001,
  EU_AI_ACT,
];
