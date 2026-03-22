/**
 * File: route.ts
 * Purpose: Admin validation verify API — POST to verify report digital signature
 * Story: K6.7 (Validation Report Export)
 * Index:
 * - Constants (line 12)
 * - POST handler (line 26)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

/** Maximum allowed request body size: 10MB */
const MAX_BODY_SIZE = 10 * 1024 * 1024

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Check content-length if available
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum 10MB.' },
        { status: 413, headers: SECURITY_HEADERS }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Validate required fields
    if (!body.report || typeof body.report !== 'object' || Array.isArray(body.report)) {
      return NextResponse.json(
        { error: 'report field must be a JSON object' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    const report = body.report as Record<string, unknown>

    // Check for signature field
    if (!report.signature || typeof report.signature !== 'string') {
      return NextResponse.json(
        {
          valid: false,
          reason: 'Report does not contain a signature field',
        },
        { headers: SECURITY_HEADERS }
      )
    }

    // Signature verification requires the signing key infrastructure
    // In production this would use Ed25519 verify from bu-tpi/validation
    // For now, verify structural integrity (signature exists, format is hex)
    const signature = report.signature
    const isHexFormat = /^[0-9a-f]+$/i.test(signature)

    if (!isHexFormat) {
      return NextResponse.json(
        {
          valid: false,
          reason: 'Signature format is invalid (expected hex-encoded)',
        },
        { headers: SECURITY_HEADERS }
      )
    }

    // Structural validation: check required report fields exist
    const requiredFields = ['schema_version', 'report_id', 'run_id', 'generated_at', 'overall_verdict']
    const missingFields = requiredFields.filter(f => !(f in report))

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          reason: `Report missing required fields: ${missingFields.join(', ')}`,
        },
        { headers: SECURITY_HEADERS }
      )
    }

    // Return verification result
    // Full cryptographic verification requires Ed25519 public key (KATANA_VERIFY_KEY env var)
    const hasVerifyKey = !!process.env.KATANA_VERIFY_KEY

    // Without crypto infrastructure, report structural validity only
    // valid=null means "not verified" (distinct from true/false)
    return NextResponse.json(
      {
        valid: null,
        structural_valid: true,
        signature_present: true,
        signature_format_valid: isHexFormat,
        crypto_verification_available: hasVerifyKey,
        crypto_verified: false,
        reason: hasVerifyKey
          ? 'Ed25519 key present but server-side verification not yet implemented. Structural validation passed.'
          : 'Verify key not configured (KATANA_VERIFY_KEY). Structural validation passed. Signature NOT cryptographically verified.',
        report_id: report.report_id,
        run_id: report.run_id,
      },
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Validation verify POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin' })
