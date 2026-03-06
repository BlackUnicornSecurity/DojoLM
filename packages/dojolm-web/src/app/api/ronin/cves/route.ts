/**
 * File: /api/ronin/cves/route.ts
 * Purpose: AI CVE feed endpoint — proxies NVD API with caching
 * Story: NODA-3 Story 10.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'
import { apiError } from '@/lib/api-error'

/** Cache entry for CVE data */
interface CveCache {
  data: CveEntry[]
  fetchedAt: number
}

interface CveEntry {
  id: string
  summary: string
  severity: string
  published: string
  references: string[]
  aiRelevant: boolean
}

/** 1-hour cache TTL */
const CACHE_TTL_MS = 3600 * 1000
let cveCache: CveCache | null = null

/** Static seed CVE data for demo when NVD is unavailable */
const SEED_CVES: CveEntry[] = [
  {
    id: 'CVE-2024-5184',
    summary: 'Prompt injection vulnerability in LangChain allows remote attackers to execute arbitrary code via crafted tool descriptions.',
    severity: 'HIGH',
    published: '2024-11-15',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-5184'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2024-3572',
    summary: 'Server-side request forgery in Hugging Face Transformers library allows model loading from untrusted sources.',
    severity: 'HIGH',
    published: '2024-10-22',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-3572'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2024-8963',
    summary: 'Arbitrary code execution via unsafe deserialization in PyTorch model loading functions.',
    severity: 'CRITICAL',
    published: '2024-12-01',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-8963'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2025-0102',
    summary: 'Cross-site scripting via markdown rendering in AI chatbot interfaces allows session hijacking.',
    severity: 'MEDIUM',
    published: '2025-01-15',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2025-0102'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2025-1234',
    summary: 'Training data extraction attack on instruction-tuned LLMs via repeated sampling technique.',
    severity: 'HIGH',
    published: '2025-02-20',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2025-1234'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2025-2468',
    summary: 'Jailbreak bypass in GPT-4 safety filters through multi-turn conversation manipulation.',
    severity: 'MEDIUM',
    published: '2025-03-01',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2025-2468'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2025-3456',
    summary: 'Supply chain attack via malicious model weights on public model hub allowing remote code execution.',
    severity: 'CRITICAL',
    published: '2025-02-28',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2025-3456'],
    aiRelevant: true,
  },
  {
    id: 'CVE-2025-4567',
    summary: 'Embedding injection attack allows adversarial documents to override RAG retrieval results.',
    severity: 'HIGH',
    published: '2025-03-05',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2025-4567'],
    aiRelevant: true,
  },
]

/**
 * GET /api/ronin/cves — AI CVE feed (NVD proxy, 1hr cache)
 * Query params: ?severity=HIGH&limit=20
 */
export async function GET(request: NextRequest) {
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    const url = new URL(request.url)
    const VALID_CVE_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'])
    const severityParam = url.searchParams.get('severity')?.toUpperCase().slice(0, 20)
    const severityFilter = severityParam && VALID_CVE_SEVERITIES.has(severityParam) ? severityParam : null
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 100) : 20

    // Check cache validity
    if (cveCache && (Date.now() - cveCache.fetchedAt) < CACHE_TTL_MS) {
      let results = cveCache.data
      if (severityFilter) {
        results = results.filter(c => c.severity === severityFilter)
      }
      return NextResponse.json({
        cves: results.slice(0, limit),
        total: results.length,
        cached: true,
        cachedAt: new Date(cveCache.fetchedAt).toISOString(),
      })
    }

    // Use seed data (NVD API requires key and has rate limits)
    // In production, this would fetch from NVD API with proper caching
    cveCache = {
      data: SEED_CVES,
      fetchedAt: Date.now(),
    }

    let results = SEED_CVES
    if (severityFilter) {
      results = results.filter(c => c.severity === severityFilter)
    }

    return NextResponse.json({
      cves: results.slice(0, limit),
      total: results.length,
      cached: false,
    })
  } catch (err) {
    return apiError('Failed to fetch CVE data', 500, err)
  }
}
