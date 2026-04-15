/**
 * Story D3.1: Compliance Export API
 * GET /api/compliance/export?format=json|markdown|csv|pdf
 *
 * Exports compliance framework data in multiple formats with dynamic OWASP
 * coverage computed from live LLM test execution data.
 *
 * Index:
 * - Types & constants (line ~20)
 * - Data assembly: assembleComplianceData (line ~70)
 * - Dynamic OWASP coverage: computeOwaspCoverage (line ~140)
 * - Format handlers: exportJSON, exportMarkdown, exportCSV, exportPDF (line ~200)
 * - CSV escape utility (line ~430)
 * - GET handler (line ~450)
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'
import { getClientIp } from '@/lib/api-handler'
import { isDemoMode } from '@/lib/demo'
import { fileStorage } from '@/lib/storage/file-storage'
import { BAISS_CONTROLS, getBAISSSummary } from '@/lib/data/baiss-framework'
import {
  NIST_800_218A,
  ISO_23894,
  ISO_24027,
  ISO_24028,
  GOOGLE_SAIF,
  CISA_NCSC,
  SLSA_V1,
  ML_BOM,
  OPENSSF,
  NIST_CSF_2,
  UK_DSIT,
  IEEE_P7000,
  NIST_AI_100_4,
  EU_AI_ACT_GPAI,
  SG_MGAF,
  CA_AIA,
  AU_AIE,
  ISO_27001_AI,
  OWASP_ASVS,
  OWASP_API,
  NIST_800_53_AI,
  GDPR_AI,
} from 'bu-tpi/compliance'
import type { ComplianceFramework as BuTpiFramework } from 'bu-tpi/compliance'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- Types ---

type ExportFormat = 'json' | 'markdown' | 'csv' | 'pdf'

const VALID_FORMATS: ReadonlySet<string> = new Set<ExportFormat>(['json', 'markdown', 'csv', 'pdf'])

interface ComplianceControl {
  readonly id: string
  readonly name: string
  readonly status: 'covered' | 'partial' | 'gap'
  readonly coverage: number
  readonly evidenceType: 'module' | 'fixture' | 'documentation' | 'process'
  readonly evidenceRef: string
  readonly remediationStatus?: 'open' | 'in-progress' | 'closed'
  readonly autoCalculated?: boolean
  readonly testPassRate?: number
  readonly testCaseCount?: number
}

type FrameworkTier = 'implemented' | 'high' | 'medium' | 'regional' | 'referenced'

interface ComplianceFramework {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly overallCoverage: number
  readonly controls: readonly ComplianceControl[]
  readonly lastAssessed: string
  readonly tier?: FrameworkTier
}

interface OwaspCoverageEntry {
  readonly category: string
  readonly passRate: number
  readonly totalTests: number
}

interface ExportData {
  readonly frameworks: readonly ComplianceFramework[]
  readonly summary: {
    readonly totalFrameworks: number
    readonly implementedAvgCoverage: number
    readonly allFrameworksAvgCoverage: number
    readonly openGaps: number
    readonly inProgressGaps: number
    readonly coveredControls: number
    readonly totalControls: number
  }
  readonly baissSummary: ReturnType<typeof getBAISSSummary>
  readonly owaspDynamic: readonly OwaspCoverageEntry[]
  readonly generatedAt: string
}

// --- Framework tier assignments (mirrors compliance/route.ts) ---

const FRAMEWORK_TIERS: Readonly<Record<string, FrameworkTier>> = {
  'owasp-llm': 'implemented',
  'nist-ai-rmf': 'implemented',
  'mitre-atlas': 'implemented',
  'iso-42001': 'implemented',
  'eu-ai-act': 'implemented',
  'enisa-ai': 'implemented',
  'baiss': 'implemented',
  'nist-800-218a': 'high',
  'iso-23894': 'high',
  'iso-24027': 'high',
  'iso-24028': 'high',
  'google-saif': 'high',
  'cisa-ncsc': 'high',
  'slsa-v1': 'medium',
  'ml-bom': 'medium',
  'openssf': 'medium',
  'nist-csf-2': 'medium',
  'uk-dsit': 'medium',
  'ieee-p7000': 'medium',
  'nist-ai-100-4': 'medium',
  'eu-ai-act-gpai': 'medium',
  'sg-mgaf': 'regional',
  'ca-aia': 'regional',
  'au-aie': 'regional',
  'iso-27001-ai': 'referenced',
  'owasp-asvs': 'referenced',
  'owasp-api': 'referenced',
  'nist-800-53-ai': 'referenced',
  'gdpr-ai': 'referenced',
}

// --- Static compliance data (mirrors compliance/route.ts) ---

function getStaticFrameworks(): ComplianceFramework[] {
  return [
    {
      id: 'owasp-llm',
      name: 'OWASP LLM Top 10',
      version: '2025',
      overallCoverage: 95,
      lastAssessed: '2026-03-02',
      tier: 'implemented',
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
      tier: 'implemented',
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
      tier: 'implemented',
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
      tier: 'implemented',
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
      tier: 'implemented',
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
      tier: 'implemented',
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

// --- Bu-TPI framework conversion ---

function convertBuTpiFramework(fw: BuTpiFramework): ComplianceFramework {
  const controls: ComplianceControl[] = fw.controls.map((c) => ({
    id: c.id,
    name: c.name,
    status: 'partial' as const,
    coverage: 40,
    evidenceType: 'documentation' as const,
    evidenceRef: c.requirement,
  }))

  const overallCoverage = controls.length > 0
    ? Math.round(controls.reduce((sum, c) => sum + c.coverage, 0) / controls.length)
    : 0

  return {
    id: fw.id,
    name: fw.name,
    version: fw.version,
    overallCoverage,
    lastAssessed: new Date().toISOString().split('T')[0],
    controls,
    tier: FRAMEWORK_TIERS[fw.id] ?? 'referenced',
  }
}

// --- BAISS framework ---

function getBAISSFramework(): ComplianceFramework {
  const controls: ComplianceControl[] = BAISS_CONTROLS.map((bc) => {
    const coverage =
      bc.assessmentType === 'automated' ? 95 :
      bc.assessmentType === 'semi-automated' ? 75 : 50
    const status: 'covered' | 'partial' | 'gap' =
      coverage >= 80 ? 'covered' : coverage >= 50 ? 'partial' : 'gap'
    return {
      id: bc.id,
      name: bc.title,
      status,
      coverage,
      evidenceType: bc.assessmentType === 'automated' ? 'module' as const : 'documentation' as const,
      evidenceRef: Object.entries(bc.mappedFrameworks)
        .filter(([, ids]) => ids && ids.length > 0)
        .map(([fw, ids]) => `${fw}: ${ids!.join(', ')}`)
        .join(' | ') || 'BAISS',
    }
  })

  const overallCoverage = Math.round(
    controls.reduce((sum, c) => sum + c.coverage, 0) / controls.length
  )

  return {
    id: 'baiss',
    name: 'BAISS (BlackUnicorn AI Security Standard)',
    version: '2.0',
    overallCoverage,
    lastAssessed: '2026-03-08',
    tier: 'implemented',
    controls,
  }
}

// --- Dynamic OWASP coverage from live test data ---

async function computeOwaspCoverage(): Promise<readonly OwaspCoverageEntry[]> {
  try {
    const { executions } = await fileStorage.queryExecutions({
      status: 'completed',
      limit: 500,
      includeCached: false,
    })

    const owaspMap: Record<string, { passed: number; total: number }> = {}

    for (const exec of executions) {
      // Skip guard-blocked executions
      if (exec.scanResult?.verdict === 'BLOCK') continue
      if (!exec.owaspCoverage) continue

      for (const [category, passed] of Object.entries(exec.owaspCoverage)) {
        if (!owaspMap[category]) {
          owaspMap[category] = { passed: 0, total: 0 }
        }
        owaspMap[category].total++
        if (passed) owaspMap[category].passed++
      }
    }

    return Object.entries(owaspMap)
      .filter(([, stats]) => stats.total > 0)
      .map(([category, stats]) => ({
        category,
        passRate: Math.round((stats.passed / stats.total) * 100),
        totalTests: stats.total,
      }))
  } catch {
    return []
  }
}

// --- Assemble all compliance data ---

async function assembleComplianceData(): Promise<ExportData> {
  const frameworks: ComplianceFramework[] = getStaticFrameworks()

  // Add 22 bu-tpi frameworks
  const buTpiFrameworks: BuTpiFramework[] = [
    NIST_800_218A, ISO_23894, ISO_24027, ISO_24028, GOOGLE_SAIF, CISA_NCSC,
    SLSA_V1, ML_BOM, OPENSSF, NIST_CSF_2, UK_DSIT, IEEE_P7000, NIST_AI_100_4, EU_AI_ACT_GPAI,
    SG_MGAF, CA_AIA, AU_AIE, ISO_27001_AI, OWASP_ASVS, OWASP_API, NIST_800_53_AI, GDPR_AI,
  ]
  for (const fw of buTpiFrameworks) {
    frameworks.push(convertBuTpiFramework(fw))
  }

  // Add BAISS unified standard
  frameworks.push(getBAISSFramework())

  // Deduplicate by ID (first occurrence wins)
  const seen = new Set<string>()
  const deduped = frameworks.filter((f) => {
    if (seen.has(f.id)) return false
    seen.add(f.id)
    return true
  })

  // Compute dynamic OWASP coverage
  const owaspDynamic = await computeOwaspCoverage()

  // Summary statistics
  const allControls = deduped.flatMap((f) => f.controls)
  const implementedFrameworks = deduped.filter((f) => f.tier === 'implemented')
  const implementedAvg = implementedFrameworks.length > 0
    ? Math.round(implementedFrameworks.reduce((sum, f) => sum + f.overallCoverage, 0) / implementedFrameworks.length)
    : 0

  return {
    frameworks: deduped,
    summary: {
      totalFrameworks: deduped.length,
      implementedAvgCoverage: implementedAvg,
      allFrameworksAvgCoverage: Math.round(deduped.reduce((sum, f) => sum + f.overallCoverage, 0) / deduped.length),
      openGaps: allControls.filter((c) => c.status === 'gap' || c.remediationStatus === 'open').length,
      inProgressGaps: allControls.filter((c) => c.remediationStatus === 'in-progress').length,
      coveredControls: allControls.filter((c) => c.status === 'covered').length,
      totalControls: allControls.length,
    },
    baissSummary: getBAISSSummary(),
    owaspDynamic,
    generatedAt: new Date().toISOString(),
  }
}

// --- Format: JSON ---

function exportJSON(data: ExportData): NextResponse {
  return NextResponse.json({
    ...data,
    format: 'json',
    exportedAt: new Date().toISOString(),
  })
}

// --- Format: Markdown ---

function exportMarkdown(data: ExportData): NextResponse {
  const lines: string[] = []

  lines.push('# Compliance Export Report')
  lines.push('')
  lines.push(`**Generated:** ${new Date(data.generatedAt).toLocaleString()}`)
  lines.push(`**Total Frameworks:** ${data.summary.totalFrameworks}`)
  lines.push(`**Implemented Avg Coverage:** ${data.summary.implementedAvgCoverage}%`)
  lines.push(`**Open Gaps:** ${data.summary.openGaps}`)
  lines.push('')

  // OWASP dynamic coverage section
  if (data.owaspDynamic.length > 0) {
    lines.push('## Dynamic OWASP LLM Top 10 Coverage (Live Test Data)')
    lines.push('')
    lines.push('| Category | Pass Rate | Tests |')
    lines.push('|----------|-----------|-------|')
    for (const entry of data.owaspDynamic) {
      lines.push(`| ${entry.category} | ${entry.passRate}% | ${entry.totalTests} |`)
    }
    lines.push('')
  }

  // Framework tables
  for (const fw of data.frameworks) {
    lines.push(`## ${fw.name} (v${fw.version})`)
    lines.push('')
    lines.push(`**Overall Coverage:** ${fw.overallCoverage}% | **Tier:** ${fw.tier ?? 'N/A'} | **Last Assessed:** ${fw.lastAssessed}`)
    lines.push('')
    lines.push('| Control ID | Name | Status | Coverage | Evidence Type | Evidence Ref |')
    lines.push('|------------|------|--------|----------|---------------|--------------|')
    for (const c of fw.controls) {
      const statusIcon = c.status === 'covered' ? 'PASS' : c.status === 'partial' ? 'PARTIAL' : 'GAP'
      lines.push(`| ${c.id} | ${c.name} | ${statusIcon} | ${c.coverage}% | ${c.evidenceType} | ${c.evidenceRef} |`)
    }
    lines.push('')
  }

  // Control gaps summary
  const gaps = data.frameworks.flatMap((f) =>
    f.controls
      .filter((c) => c.status === 'gap' || c.remediationStatus === 'open')
      .map((c) => ({ framework: f.name, ...c }))
  )
  if (gaps.length > 0) {
    lines.push('## Control Gaps Summary')
    lines.push('')
    lines.push('| Framework | Control | Name | Coverage | Remediation |')
    lines.push('|-----------|---------|------|----------|-------------|')
    for (const g of gaps) {
      lines.push(`| ${g.framework} | ${g.id} | ${g.name} | ${g.coverage}% | ${g.remediationStatus ?? 'N/A'} |`)
    }
    lines.push('')
  }

  // BAISS summary
  lines.push('## BAISS Summary')
  lines.push('')
  lines.push(`- **Total Controls:** ${data.baissSummary.totalControls}`)
  lines.push(`- **Automated:** ${data.baissSummary.automated}`)
  lines.push(`- **Semi-Automated:** ${data.baissSummary.semiAutomated}`)
  lines.push(`- **Manual:** ${data.baissSummary.manual}`)
  lines.push(`- **Categories:** ${data.baissSummary.categories}`)
  lines.push(`- **Frameworks Covered:** ${data.baissSummary.frameworksCovered}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*Generated by DojoLM Compliance Export*')

  return NextResponse.json({
    format: 'markdown',
    content: lines.join('\n'),
    filename: `compliance-export-${new Date().toISOString().split('T')[0]}.md`,
  })
}

// --- Format: CSV (one row per control per framework) ---

function exportCSV(data: ExportData): Response {
  const rows: string[][] = []

  // Header
  rows.push([
    'Framework ID', 'Framework Name', 'Version', 'Tier',
    'Framework Coverage', 'Control ID', 'Control Name',
    'Status', 'Coverage %', 'Evidence Type', 'Evidence Ref',
    'Remediation Status',
  ])

  // Data rows: one per control per framework
  for (const fw of data.frameworks) {
    for (const c of fw.controls) {
      rows.push([
        csvEscape(fw.id),
        csvEscape(fw.name),
        csvEscape(fw.version),
        csvEscape(fw.tier ?? ''),
        String(fw.overallCoverage),
        csvEscape(c.id),
        csvEscape(c.name),
        csvEscape(c.status),
        String(c.coverage),
        csvEscape(c.evidenceType),
        csvEscape(c.evidenceRef),
        csvEscape(c.remediationStatus ?? ''),
      ])
    }
  }

  const csvContent = rows.map((row) => row.join(',')).join('\n')

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="compliance-export-${new Date().toISOString().split('T')[0]}.csv"`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

// --- Format: PDF ---

function exportPDF(data: ExportData): NextResponse {
  const doc = new jsPDF()
  let yPos = 20

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Compliance Export Report', 14, yPos)
  yPos += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, 14, yPos)
  yPos += 7
  doc.text(`Total Frameworks: ${data.summary.totalFrameworks} | Covered Controls: ${data.summary.coveredControls}/${data.summary.totalControls}`, 14, yPos)
  yPos += 7
  doc.text(`Implemented Avg Coverage: ${data.summary.implementedAvgCoverage}% | Open Gaps: ${data.summary.openGaps}`, 14, yPos)
  yPos += 15

  // BAISS mapping table
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BAISS Control Mapping', 14, yPos)
  yPos += 7

  const baissFramework = data.frameworks.find((f) => f.id === 'baiss')
  if (baissFramework) {
    autoTable(doc, {
      startY: yPos,
      head: [['Control', 'Name', 'Status', 'Coverage']],
      body: baissFramework.controls.map((c) => [
        c.id,
        c.name,
        c.status.toUpperCase(),
        `${c.coverage}%`,
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240] },
      margin: { top: 5 },
      styles: { fontSize: 8 },
    })
  }

  // Coverage gauges page
  doc.addPage()
  yPos = 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Framework Coverage Overview', 14, yPos)
  yPos += 7

  autoTable(doc, {
    startY: yPos,
    head: [['Framework', 'Version', 'Tier', 'Coverage', 'Controls']],
    body: data.frameworks.map((fw) => [
      fw.name,
      fw.version,
      (fw.tier ?? 'N/A').toUpperCase(),
      `${fw.overallCoverage}%`,
      String(fw.controls.length),
    ]),
    theme: 'plain',
    headStyles: { fillColor: [240, 240, 240] },
    margin: { top: 5 },
    styles: { fontSize: 8 },
  })

  // Dynamic OWASP coverage page
  if (data.owaspDynamic.length > 0) {
    doc.addPage()
    yPos = 20

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Dynamic OWASP Coverage (Live Test Data)', 14, yPos)
    yPos += 7

    autoTable(doc, {
      startY: yPos,
      head: [['OWASP Category', 'Pass Rate', 'Total Tests']],
      body: data.owaspDynamic.map((entry) => [
        entry.category,
        `${entry.passRate}%`,
        String(entry.totalTests),
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240] },
      margin: { top: 5 },
    })
  }

  // Gap highlights page
  const gaps = data.frameworks.flatMap((f) =>
    f.controls
      .filter((c) => c.status === 'gap' || c.remediationStatus === 'open')
      .map((c) => ({ framework: f.name, ...c }))
  )
  if (gaps.length > 0) {
    doc.addPage()
    yPos = 20

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Gap Highlights', 14, yPos)
    yPos += 7

    autoTable(doc, {
      startY: yPos,
      head: [['Framework', 'Control', 'Name', 'Coverage', 'Remediation']],
      body: gaps.map((g) => [
        g.framework,
        g.id,
        g.name,
        `${g.coverage}%`,
        g.remediationStatus ?? 'N/A',
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240] },
      margin: { top: 5 },
      styles: { fontSize: 8 },
    })
  }

  // Generate PDF output
  const pdfBytes = doc.output('arraybuffer')
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

  return NextResponse.json({
    format: 'pdf',
    data: pdfBase64,
    filename: `compliance-export-${new Date().toISOString().split('T')[0]}.pdf`,
  })
}

// --- CSV escape utility ---

function csvEscape(value: string): string {
  if (!value) return ''
  // Neutralize formula injection: prefix dangerous leading chars with single quote
  const formulaStart = /^[=+\-@\t\r]/
  const safe = formulaStart.test(value) ? `'${value}` : value
  // Wrap in quotes if value contains special characters
  if (safe.includes(',') || safe.includes('\n') || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

// --- Rate limiter — 10 export requests per minute per IP ---

const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

// --- OPTIONS Handler ---

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  })
}

// --- GET Handler ---

export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: 'Export is not available in demo mode' },
      { status: 503 }
    )
  }

  const authResult = checkApiAuth(request)
  if (authResult) return authResult

  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — try again later' },
      { status: 429 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const formatParam = searchParams.get('format') ?? 'json'

    if (!VALID_FORMATS.has(formatParam)) {
      return NextResponse.json(
        { error: 'Unsupported export format. Valid formats: json, markdown, csv, pdf' },
        { status: 400 }
      )
    }

    const format = formatParam as ExportFormat
    const data = await assembleComplianceData()

    switch (format) {
      case 'json':
        return exportJSON(data)
      case 'markdown':
        return exportMarkdown(data)
      case 'csv':
        return exportCSV(data)
      case 'pdf':
        return exportPDF(data)
    }
  } catch (error) {
    console.error('Compliance export error:', error)
    return NextResponse.json(
      { error: 'Failed to export compliance data' },
      { status: 500 }
    )
  }
}
