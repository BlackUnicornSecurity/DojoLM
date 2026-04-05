/**
 * File: src/lib/demo/mock-compliance.ts
 * Purpose: Mock compliance frameworks, controls, and audit trail for demo mode
 *
 * 12 frameworks with ~120 controls, evidence links, and audit history.
 */

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

interface DemoControl {
  id: string;
  name: string;
  status: 'covered' | 'partial' | 'gap';
  coverage: number;
  confidence: 'high' | 'medium' | 'low';
  testCaseCount: number;
}

interface DemoFramework {
  id: string;
  name: string;
  overallCoverage: number;
  totalControls: number;
  coveredControls: number;
  partialControls: number;
  gapControls: number;
  lastAssessed: string;
  tier: 'implemented' | 'high-priority' | 'medium-priority' | 'regional' | 'referenced';
  controls: DemoControl[];
}

function generateControls(prefix: string, count: number, coverageTarget: number): DemoControl[] {
  const controls: DemoControl[] = [];
  for (let i = 1; i <= count; i++) {
    const rand = Math.abs(((i * 2654435761 + prefix.charCodeAt(0)) >>> 0) % 100);
    const adjustedCoverage = Math.max(0, Math.min(100, coverageTarget + (rand - 50) * 0.6));
    const coverage = Math.round(adjustedCoverage);
    const status = coverage >= 80 ? 'covered' as const : coverage >= 40 ? 'partial' as const : 'gap' as const;
    const confidence = coverage >= 70 ? 'high' as const : coverage >= 40 ? 'medium' as const : 'low' as const;

    controls.push({
      id: `${prefix}-${String(i).padStart(2, '0')}`,
      name: `${prefix.toUpperCase()} Control ${i}`,
      status,
      coverage,
      confidence,
      testCaseCount: Math.floor(coverage / 10),
    });
  }
  return controls;
}

export const DEMO_FRAMEWORKS: DemoFramework[] = [
  { id: 'owasp-llm', name: 'OWASP LLM Top 10', overallCoverage: 82, totalControls: 10, coveredControls: 7, partialControls: 2, gapControls: 1, lastAssessed: daysAgo(2), tier: 'implemented',
    controls: [
      { id: 'LLM01', name: 'Prompt Injection', status: 'covered', coverage: 95, confidence: 'high', testCaseCount: 12 },
      { id: 'LLM02', name: 'Insecure Output Handling', status: 'covered', coverage: 88, confidence: 'high', testCaseCount: 8 },
      { id: 'LLM03', name: 'Training Data Poisoning', status: 'partial', coverage: 65, confidence: 'medium', testCaseCount: 4 },
      { id: 'LLM04', name: 'Model Denial of Service', status: 'covered', coverage: 85, confidence: 'high', testCaseCount: 5 },
      { id: 'LLM05', name: 'Supply Chain Vulnerabilities', status: 'covered', coverage: 80, confidence: 'high', testCaseCount: 6 },
      { id: 'LLM06', name: 'Sensitive Information Disclosure', status: 'covered', coverage: 92, confidence: 'high', testCaseCount: 8 },
      { id: 'LLM07', name: 'Insecure Plugin Design', status: 'covered', coverage: 78, confidence: 'high', testCaseCount: 6 },
      { id: 'LLM08', name: 'Excessive Agency', status: 'partial', coverage: 60, confidence: 'medium', testCaseCount: 6 },
      { id: 'LLM09', name: 'Overreliance', status: 'covered', coverage: 82, confidence: 'high', testCaseCount: 6 },
      { id: 'LLM10', name: 'Model Theft', status: 'gap', coverage: 35, confidence: 'low', testCaseCount: 5 },
    ],
  },
  { id: 'nist-ai', name: 'NIST AI 600-1', overallCoverage: 76, totalControls: 12, coveredControls: 8, partialControls: 2, gapControls: 2, lastAssessed: daysAgo(5), tier: 'implemented', controls: generateControls('nist', 12, 76) },
  { id: 'mitre-atlas', name: 'MITRE ATLAS', overallCoverage: 71, totalControls: 10, coveredControls: 6, partialControls: 2, gapControls: 2, lastAssessed: daysAgo(7), tier: 'implemented', controls: generateControls('atlas', 10, 71) },
  { id: 'iso-42001', name: 'ISO 42001', overallCoverage: 68, totalControls: 8, coveredControls: 4, partialControls: 3, gapControls: 1, lastAssessed: daysAgo(10), tier: 'implemented', controls: generateControls('iso42', 8, 68) },
  { id: 'eu-ai-act', name: 'EU AI Act', overallCoverage: 74, totalControls: 10, coveredControls: 6, partialControls: 3, gapControls: 1, lastAssessed: daysAgo(8), tier: 'implemented', controls: generateControls('euai', 10, 74) },
  { id: 'enisa-ai', name: 'ENISA AI Security', overallCoverage: 65, totalControls: 8, coveredControls: 4, partialControls: 2, gapControls: 2, lastAssessed: daysAgo(12), tier: 'implemented', controls: generateControls('enisa', 8, 65) },
  { id: 'nist-800-218a', name: 'NIST 800-218A', overallCoverage: 58, totalControls: 10, coveredControls: 5, partialControls: 1, gapControls: 4, lastAssessed: daysAgo(15), tier: 'high-priority', controls: generateControls('n218', 10, 58) },
  { id: 'iso-23894', name: 'ISO 23894', overallCoverage: 62, totalControls: 8, coveredControls: 4, partialControls: 2, gapControls: 2, lastAssessed: daysAgo(14), tier: 'high-priority', controls: generateControls('iso23', 8, 62) },
  { id: 'google-saif', name: 'Google SAIF', overallCoverage: 70, totalControls: 10, coveredControls: 6, partialControls: 2, gapControls: 2, lastAssessed: daysAgo(11), tier: 'high-priority', controls: generateControls('saif', 10, 70) },
  { id: 'cisa-ncsc', name: 'CISA/NCSC', overallCoverage: 66, totalControls: 8, coveredControls: 4, partialControls: 3, gapControls: 1, lastAssessed: daysAgo(13), tier: 'high-priority', controls: generateControls('cisa', 8, 66) },
  { id: 'slsa-v1', name: 'SLSA v1.0', overallCoverage: 55, totalControls: 8, coveredControls: 3, partialControls: 3, gapControls: 2, lastAssessed: daysAgo(18), tier: 'medium-priority', controls: generateControls('slsa', 8, 55) },
  { id: 'nist-csf', name: 'NIST CSF 2.0', overallCoverage: 72, totalControls: 10, coveredControls: 6, partialControls: 3, gapControls: 1, lastAssessed: daysAgo(9), tier: 'medium-priority', controls: generateControls('csf2', 10, 72) },
];

export const DEMO_COMPLIANCE_AUDIT_TRAIL = [
  { id: 'audit-01', action: 'framework_assessed', framework: 'OWASP LLM Top 10', user: 'demo-admin', timestamp: daysAgo(2), details: 'Full assessment completed' },
  { id: 'audit-02', action: 'control_updated', framework: 'OWASP LLM Top 10', user: 'alice-analyst', timestamp: daysAgo(3), details: 'LLM01 coverage updated from 90% to 95%' },
  { id: 'audit-03', action: 'evidence_linked', framework: 'NIST AI 600-1', user: 'bob-analyst', timestamp: daysAgo(5), details: 'Linked batch demo-batch-001 as evidence for NIST-03' },
  { id: 'audit-04', action: 'framework_assessed', framework: 'MITRE ATLAS', user: 'demo-admin', timestamp: daysAgo(7), details: 'Quarterly assessment completed' },
  { id: 'audit-05', action: 'report_exported', framework: 'OWASP LLM Top 10', user: 'demo-admin', timestamp: daysAgo(8), details: 'Exported compliance report as PDF' },
  { id: 'audit-06', action: 'control_updated', framework: 'EU AI Act', user: 'alice-analyst', timestamp: daysAgo(9), details: 'EUAI-05 status changed from gap to partial' },
  { id: 'audit-07', action: 'framework_assessed', framework: 'ISO 42001', user: 'demo-admin', timestamp: daysAgo(10), details: 'Initial assessment completed' },
  { id: 'audit-08', action: 'evidence_linked', framework: 'OWASP LLM Top 10', user: 'bob-analyst', timestamp: daysAgo(11), details: 'Linked arena match demo-match-003 as evidence for LLM07' },
  { id: 'audit-09', action: 'control_updated', framework: 'ENISA AI Security', user: 'alice-analyst', timestamp: daysAgo(12), details: 'ENISA-04 test case count increased to 6' },
  { id: 'audit-10', action: 'framework_assessed', framework: 'NIST 800-218A', user: 'demo-admin', timestamp: daysAgo(15), details: 'First assessment, identified 4 gaps' },
  { id: 'audit-11', action: 'report_exported', framework: 'All Frameworks', user: 'demo-admin', timestamp: daysAgo(16), details: 'Exported consolidated compliance report' },
  { id: 'audit-12', action: 'control_updated', framework: 'Google SAIF', user: 'bob-analyst', timestamp: daysAgo(17), details: 'SAIF-02 linked to Sengoku campaign results' },
  { id: 'audit-13', action: 'framework_assessed', framework: 'SLSA v1.0', user: 'demo-admin', timestamp: daysAgo(18), details: 'Initial supply chain assessment' },
  { id: 'audit-14', action: 'evidence_linked', framework: 'NIST CSF 2.0', user: 'alice-analyst', timestamp: daysAgo(19), details: 'Linked guard audit log as evidence for CSF2-07' },
  { id: 'audit-15', action: 'control_updated', framework: 'CISA/NCSC', user: 'bob-analyst', timestamp: daysAgo(20), details: 'CISA-06 moved from gap to covered' },
];
