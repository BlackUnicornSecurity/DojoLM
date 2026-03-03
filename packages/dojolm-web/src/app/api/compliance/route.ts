/**
 * S39: Compliance Coverage API
 * GET /api/compliance
 * Returns compliance framework coverage data and gap analysis.
 */

import { NextResponse } from 'next/server'

// --- Compliance Data Model ---

interface ComplianceControl {
  id: string
  name: string
  status: 'covered' | 'partial' | 'gap'
  coverage: number
  evidenceType: 'module' | 'fixture' | 'documentation' | 'process'
  evidenceRef: string
  remediationStatus?: 'open' | 'in-progress' | 'closed'
}

interface ComplianceFramework {
  id: string
  name: string
  version: string
  overallCoverage: number
  controls: ComplianceControl[]
  lastAssessed: string
}

// --- Static Compliance Data (sourced from Doc#01) ---

function getComplianceData(): ComplianceFramework[] {
  return [
    {
      id: 'owasp-llm',
      name: 'OWASP LLM Top 10',
      version: '2025',
      overallCoverage: 95,
      lastAssessed: '2026-03-02',
      controls: [
        { id: 'LLM01', name: 'Prompt Injection', status: 'covered', coverage: 100, evidenceType: 'module', evidenceRef: 'enhanced-pi, core-patterns' },
        { id: 'LLM02', name: 'Insecure Output Handling', status: 'covered', coverage: 100, evidenceType: 'module', evidenceRef: 'xxe-protopollution, ssrf-detector' },
        { id: 'LLM03', name: 'Training Data Poisoning', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'supply-chain-detector, data-provenance' },
        { id: 'LLM04', name: 'Model Denial of Service', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'dos-detector' },
        { id: 'LLM05', name: 'Supply Chain Vulnerabilities', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'supply-chain-detector' },
        { id: 'LLM06', name: 'Sensitive Information Disclosure', status: 'covered', coverage: 100, evidenceType: 'module', evidenceRef: 'pii-detector' },
        { id: 'LLM07', name: 'Insecure Plugin Design', status: 'partial', coverage: 70, evidenceType: 'module', evidenceRef: 'mcp-parser', remediationStatus: 'open' },
        { id: 'LLM08', name: 'Excessive Agency', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'session-bypass' },
        { id: 'LLM09', name: 'Overreliance', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'overreliance-detector' },
        { id: 'LLM10', name: 'Model Theft', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'model-theft-detector' },
      ],
    },
    {
      id: 'nist-ai-rmf',
      name: 'NIST AI RMF 1.0 / AI 600-1',
      version: '1.0',
      overallCoverage: 88,
      lastAssessed: '2026-03-02',
      controls: [
        { id: 'GOVERN', name: 'Governance', status: 'partial', coverage: 60, evidenceType: 'documentation', evidenceRef: 'docs/compliance/iso-42001/', remediationStatus: 'open' },
        { id: 'MAP', name: 'Risk Mapping', status: 'partial', coverage: 70, evidenceType: 'documentation', evidenceRef: 'risk-assessment-methodology.md', remediationStatus: 'in-progress' },
        { id: 'MEASURE', name: 'Measurement', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'All scanner modules' },
        { id: 'MANAGE', name: 'Risk Management', status: 'covered', coverage: 85, evidenceType: 'process', evidenceRef: 'incident-response-procedure.md' },
        { id: '#1', name: 'CBRN Dual-Use', status: 'partial', coverage: 70, evidenceType: 'documentation', evidenceRef: 'Guidance pending', remediationStatus: 'open' },
        { id: '#4', name: 'Data Privacy (PII)', status: 'covered', coverage: 100, evidenceType: 'module', evidenceRef: 'pii-detector' },
        { id: '#9', name: 'Deepfake/Synthetic Content', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'deepfake-detector' },
      ],
    },
    {
      id: 'mitre-atlas',
      name: 'MITRE ATLAS',
      version: '2024',
      overallCoverage: 89,
      lastAssessed: '2026-03-02',
      controls: [
        { id: 'AML.T0000', name: 'Reconnaissance', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'model-theft-detector' },
        { id: 'AML.T0010', name: 'Poisoning', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'supply-chain-detector, rag-analyzer' },
        { id: 'AML.T0015', name: 'Evasion', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'encoding-engine, token-analyzer' },
        { id: 'AML.T0020', name: 'Exfiltration', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'pii-detector, vectordb-interface' },
        { id: 'AML.T0040', name: 'ML Supply Chain', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'supply-chain-detector' },
        { id: 'AML.T0043', name: 'Persistence', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'session-bypass' },
      ],
    },
    {
      id: 'iso-42001',
      name: 'ISO/IEC 42001:2023',
      version: '2023',
      overallCoverage: 75,
      lastAssessed: '2026-03-02',
      controls: [
        { id: 'Clause4', name: 'Context of the Organization', status: 'partial', coverage: 60, evidenceType: 'documentation', evidenceRef: 'ai-management-policy.md', remediationStatus: 'in-progress' },
        { id: 'Clause5', name: 'Leadership', status: 'partial', coverage: 60, evidenceType: 'documentation', evidenceRef: 'ai-management-policy.md', remediationStatus: 'in-progress' },
        { id: 'Clause6', name: 'Planning', status: 'covered', coverage: 80, evidenceType: 'documentation', evidenceRef: 'risk-assessment-methodology.md' },
        { id: 'Clause7', name: 'Support', status: 'covered', coverage: 80, evidenceType: 'documentation', evidenceRef: 'ai-system-inventory.md' },
        { id: 'Clause8', name: 'Operation', status: 'covered', coverage: 85, evidenceType: 'documentation', evidenceRef: 'incident-response-procedure.md' },
        { id: 'Clause9', name: 'Performance Evaluation', status: 'covered', coverage: 80, evidenceType: 'documentation', evidenceRef: 'internal-audit-checklist.md' },
        { id: 'A.5', name: 'AI Policy', status: 'partial', coverage: 60, evidenceType: 'documentation', evidenceRef: 'ai-management-policy.md', remediationStatus: 'in-progress' },
        { id: 'A.8', name: 'Impact Assessment', status: 'partial', coverage: 50, evidenceType: 'documentation', evidenceRef: 'risk-assessment-methodology.md', remediationStatus: 'in-progress' },
      ],
    },
    {
      id: 'eu-ai-act',
      name: 'EU AI Act',
      version: '2024',
      overallCoverage: 78,
      lastAssessed: '2026-03-02',
      controls: [
        { id: 'Art.9', name: 'Risk Management', status: 'covered', coverage: 85, evidenceType: 'documentation', evidenceRef: 'risk-assessment-methodology.md' },
        { id: 'Art.10', name: 'Data Governance', status: 'covered', coverage: 80, evidenceType: 'module', evidenceRef: 'data-provenance' },
        { id: 'Art.12', name: 'Record Keeping', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'audit-logger' },
        { id: 'Art.13', name: 'Transparency', status: 'partial', coverage: 70, evidenceType: 'documentation', evidenceRef: 'ai-management-policy.md', remediationStatus: 'in-progress' },
        { id: 'Art.14', name: 'Human Oversight', status: 'covered', coverage: 85, evidenceType: 'module', evidenceRef: 'session-bypass (HITL patterns)' },
        { id: 'Art.15', name: 'Robustness & Security', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'All scanner modules' },
      ],
    },
    {
      id: 'enisa-ai',
      name: 'ENISA AI Security',
      version: '2024',
      overallCoverage: 87,
      lastAssessed: '2026-03-02',
      controls: [
        { id: 'SEC-01', name: 'Input Validation', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'enhanced-pi, encoding-engine' },
        { id: 'SEC-02', name: 'Output Sanitization', status: 'covered', coverage: 95, evidenceType: 'module', evidenceRef: 'xxe-protopollution, ssrf-detector' },
        { id: 'SEC-03', name: 'Model Protection', status: 'covered', coverage: 90, evidenceType: 'module', evidenceRef: 'model-theft-detector' },
        { id: 'SEC-04', name: 'Data Protection', status: 'covered', coverage: 100, evidenceType: 'module', evidenceRef: 'pii-detector' },
        { id: 'SEC-05', name: 'Adversarial Robustness', status: 'covered', coverage: 90, evidenceType: 'fixture', evidenceRef: '2269 test fixtures' },
        { id: 'SEC-06', name: 'Supply Chain', status: 'covered', coverage: 85, evidenceType: 'module', evidenceRef: 'supply-chain-detector' },
        { id: 'NAA-001', name: 'Physical Side-Channels', status: 'gap', coverage: 0, evidenceType: 'documentation', evidenceRef: 'Out of scope', remediationStatus: 'closed' },
      ],
    },
  ]
}

// --- API Handler ---

export async function GET(_request: Request) {
  try {
    const frameworks = getComplianceData()

    const summary = {
      totalFrameworks: frameworks.length,
      avgCoverage: Math.round(frameworks.reduce((sum, f) => sum + f.overallCoverage, 0) / frameworks.length),
      openGaps: frameworks.flatMap(f => f.controls).filter(c => c.status === 'gap' || c.remediationStatus === 'open').length,
      inProgressGaps: frameworks.flatMap(f => f.controls).filter(c => c.remediationStatus === 'in-progress').length,
      closedGaps: frameworks.flatMap(f => f.controls).filter(c => c.remediationStatus === 'closed').length,
      coveredControls: frameworks.flatMap(f => f.controls).filter(c => c.status === 'covered').length,
    }

    return NextResponse.json({
      summary,
      frameworks,
      lastUpdated: '2026-03-02',
    })
  } catch (error) {
    console.error('Compliance API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve compliance data' },
      { status: 500 }
    )
  }
}
