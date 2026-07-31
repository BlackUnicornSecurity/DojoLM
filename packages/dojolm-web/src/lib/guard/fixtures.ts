// SPDX-License-Identifier: Apache-2.0
/**
 * File: fixtures.ts
 * Purpose: Canonical Guard defense-template catalog + hardening types.
 *
 * Story: WAVE2-GUARD / ADR-0018, expanded in WAVE7B.4 / ADR-0062
 *  (DEFENSE_CATEGORIES 8 → 20, DEFAULT_DEFENSE_TEMPLATES 12 → 60,
 *  BU branding + criticity-mix coverage).
 */

export const DEFENSE_CATEGORIES = [
  // Reference defense controls (Wave 2 baseline).
  'system-prompt',
  'input-validation',
  'output-filtering',
  'rate-limiting',
  'context-isolation',
  'audit-logging',
  'encoding-defense',
  'boundary-enforcement',
  // Deployment-context profiles (Wave 7B.4 — ADR-0062).
  'rag-chatbot',
  'internal-tools',
  'customer-support',
  'compliance-critical',
  'healthcare',
  'finance',
  'government',
  'saas-admin',
  'developer-assistant',
  'content-moderation',
  'agentic-workflow',
  'multi-modal',
] as const

export type DefenseCategory = (typeof DEFENSE_CATEGORIES)[number]

export const DEFENSE_CRITICITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const
export type DefenseCriticity = (typeof DEFENSE_CRITICITY_LEVELS)[number]

export interface DefenseTemplateRecord {
  id: string
  name: string
  description: string
  category: DefenseCategory
  effectiveness: number
  criticity: DefenseCriticity
}

export const DEFAULT_DEFENSE_TEMPLATES: DefenseTemplateRecord[] = [
  // --- Wave 2 baseline (legacy ids retained for API compat) ---
  { id: 'd1', name: 'Strict Role Anchoring', category: 'system-prompt', description: 'Anchor the system prompt with immutable role instructions that resist override attempts.', effectiveness: 5, criticity: 'CRITICAL' },
  { id: 'd2', name: 'Instruction Delimiter Guard', category: 'system-prompt', description: 'Use unique delimiters to separate system instructions from user input.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'd3', name: 'Input Sanitizer', category: 'input-validation', description: 'Strip or escape injection patterns, control characters, and encoding tricks from user input.', effectiveness: 4, criticity: 'HIGH' },
  { id: 'd4', name: 'Token Length Limiter', category: 'input-validation', description: 'Enforce strict token limits on user input to prevent context overflow attacks.', effectiveness: 3, criticity: 'LOW' },
  { id: 'd5', name: 'PII Redaction Filter', category: 'output-filtering', description: 'Scan model output for PII patterns and redact before delivery.', effectiveness: 5, criticity: 'CRITICAL' },
  { id: 'd6', name: 'Harmful Content Blocker', category: 'output-filtering', description: 'Block responses matching harmful content classifiers.', effectiveness: 4, criticity: 'HIGH' },
  { id: 'd7', name: 'Sliding Window Limiter', category: 'rate-limiting', description: 'Apply sliding-window rate limits per user session to throttle abuse attempts.', effectiveness: 3, criticity: 'LOW' },
  { id: 'd8', name: 'Session Sandbox', category: 'context-isolation', description: 'Isolate each user session context to prevent cross-session data leakage.', effectiveness: 5, criticity: 'CRITICAL' },
  { id: 'd9', name: 'Full Audit Trail', category: 'audit-logging', description: 'Log all prompts, responses, and guard actions with tamper-evident hashing.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'd10', name: 'Unicode Normalization', category: 'encoding-defense', description: 'Normalize unicode input to NFC form to prevent homoglyph and encoding bypass attacks.', effectiveness: 3, criticity: 'LOW' },
  { id: 'd11', name: 'Tool Call Whitelist', category: 'boundary-enforcement', description: 'Restrict tool/function calls to an explicit allowlist with parameter validation.', effectiveness: 5, criticity: 'CRITICAL' },
  { id: 'd12', name: 'Response Scope Enforcer', category: 'boundary-enforcement', description: 'Validate that model responses stay within the defined operational scope.', effectiveness: 4, criticity: 'HIGH' },

  // --- Wave 7B.4 expansion (BU-branded ids: <target>-<defense-shortname>-<criticity>-<nnn>) ---

  // system-prompt (+1)
  { id: 'dojolm-sp-seal-HIGH-013', name: 'DojoLM System-Prompt Seal', category: 'system-prompt', description: 'Hash-sign the deployed system prompt and reject runtime drift via boot-time integrity check (BU-DOJOLM-SP-SEAL).', effectiveness: 5, criticity: 'HIGH' },

  // input-validation (+1)
  { id: 'sampleBravo-iv-encode-MEDIUM-014', name: 'SampleBravo Input-Encoding Normalizer', category: 'input-validation', description: 'Strip zero-width chars, RTL marks, and control-byte payloads before tokenization on SampleBravo internal-tool ingress.', effectiveness: 4, criticity: 'MEDIUM' },

  // output-filtering (+1)
  { id: 'sampleCharlie-of-coerce-HIGH-015', name: 'SampleCharlie Coercion-Language Detector', category: 'output-filtering', description: 'Block outputs that contain coercive escalation phrases (urgency, authority impersonation) before delivery on SampleCharlie audit channels.', effectiveness: 4, criticity: 'HIGH' },

  // rate-limiting (+2)
  { id: 'sampleCharlie-rl-burst-MEDIUM-016', name: 'SampleCharlie Burst-Quota Throttle', category: 'rate-limiting', description: 'Reject sub-second request bursts above per-tenant ceilings on SampleCharlie inference endpoints.', effectiveness: 3, criticity: 'MEDIUM' },
  { id: 'dojolm-rl-token-LOW-017', name: 'DojoLM Token-Budget Quota', category: 'rate-limiting', description: 'Cap per-session token-budget consumption with soft-warn at 80% and hard-stop at 100%.', effectiveness: 3, criticity: 'LOW' },

  // context-isolation (+2)
  { id: 'dojolm-ci-conv-MEDIUM-018', name: 'DojoLM Per-Conversation Isolation', category: 'context-isolation', description: 'Bind each conversation to its own context window so cross-conversation poisoning cannot bleed through.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'dojolm-ci-cross-LOW-019', name: 'DojoLM Cross-Tab Session Segregation', category: 'context-isolation', description: 'Reject session-cookie reuse across tabs unless the user opts in via explicit handoff.', effectiveness: 3, criticity: 'LOW' },

  // audit-logging (+2)
  { id: 'sampleCharlie-al-tamper-MEDIUM-020', name: 'SampleCharlie Tamper-Evident Audit Chain', category: 'audit-logging', description: 'Hash-chain every audit record so an in-place modification breaks the verifier on the next read.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'dojolm-al-redact-LOW-021', name: 'DojoLM Audit-Log Redaction', category: 'audit-logging', description: 'Redact PII patterns from audit logs at write time so log readers do not become the leak surface.', effectiveness: 3, criticity: 'LOW' },

  // encoding-defense (+2)
  { id: 'dojolm-ed-zwsp-MEDIUM-022', name: 'DojoLM Zero-Width Stripper', category: 'encoding-defense', description: 'Drop zero-width spaces / joiners / non-joiners from user input before rubric scoring.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'dojolm-ed-homoglyph-INFO-023', name: 'DojoLM Homoglyph Surface', category: 'encoding-defense', description: 'Surface a homoglyph confidence score in audit metadata; informational only — no auto-block.', effectiveness: 2, criticity: 'INFO' },

  // boundary-enforcement (+1)
  { id: 'sampleCharlie-be-egress-HIGH-024', name: 'SampleCharlie Egress Allowlist', category: 'boundary-enforcement', description: 'Restrict outbound model-initiated network calls to a per-tenant allowlist; deny by default.', effectiveness: 5, criticity: 'HIGH' },

  // rag-chatbot (3)
  { id: 'sampleDelta-rag-anchor-HIGH-025', name: 'SampleDelta RAG Source Anchor', category: 'rag-chatbot', description: 'Pin every retrieval-grounded answer to a cited source URL; reject answers that cannot anchor.', effectiveness: 5, criticity: 'HIGH' },
  { id: 'sampleDelta-rag-source-MEDIUM-026', name: 'SampleDelta RAG Source Allowlist', category: 'rag-chatbot', description: 'Restrict the retrieval index to a curated allowlist of trusted source domains.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleDelta-rag-cite-LOW-027', name: 'SampleDelta RAG Citation Requirement', category: 'rag-chatbot', description: 'Append source citations to every grounded paragraph; missing-citation responses are flagged for review.', effectiveness: 3, criticity: 'LOW' },

  // internal-tools (3)
  { id: 'sampleBravo-tools-allow-CRITICAL-028', name: 'SampleBravo Internal-Tool Allowlist', category: 'internal-tools', description: 'Whitelist exact tool names + parameter schemas; reject any unscheduled invocation on SampleBravo admin tools.', effectiveness: 5, criticity: 'CRITICAL' },
  { id: 'sampleBravo-tools-rate-MEDIUM-029', name: 'SampleBravo Tool Call Rate Cap', category: 'internal-tools', description: 'Enforce per-minute and per-hour ceilings on each tool to prevent runaway agentic loops.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleBravo-tools-log-LOW-030', name: 'SampleBravo Tool Invocation Audit', category: 'internal-tools', description: 'Log every tool call with operator id, parameters, and result for after-action review.', effectiveness: 3, criticity: 'LOW' },

  // customer-support (3)
  { id: 'sampleAlpha-cs-pii-HIGH-031', name: 'SampleAlpha Customer PII Redaction', category: 'customer-support', description: 'Redact customer PII (SSN, full PAN, email) from model output before agent or self-service delivery.', effectiveness: 5, criticity: 'HIGH' },
  { id: 'dojolm-cs-script-MEDIUM-032', name: 'DojoLM Approved-Script Boundary', category: 'customer-support', description: 'Constrain customer-facing replies to operator-approved scripts; off-script answers are flagged for review.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleAlpha-cs-tone-LOW-033', name: 'SampleAlpha Tone Moderation', category: 'customer-support', description: 'Reject responses that contain dismissive or hostile tone markers; reroute to human agent.', effectiveness: 3, criticity: 'LOW' },

  // compliance-critical (3)
  { id: 'sampleAlpha-comp-worm-CRITICAL-034', name: 'SampleAlpha Compliance WORM Audit', category: 'compliance-critical', description: 'Persist every prompt, response, and policy decision to a write-once-read-many store with retention enforced.', effectiveness: 5, criticity: 'CRITICAL' },
  { id: 'sampleAlpha-comp-region-MEDIUM-035', name: 'SampleAlpha Geo-Residency Pin', category: 'compliance-critical', description: 'Pin inference + storage to a tenant-declared geographic region; reject cross-region failover.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleAlpha-comp-disclose-INFO-036', name: 'SampleAlpha Required-Disclosure Footer', category: 'compliance-critical', description: 'Append the operator-configured AI disclosure footer to every customer-visible response.', effectiveness: 2, criticity: 'INFO' },

  // healthcare (3)
  { id: 'sampleDelta-health-hipaa-HIGH-037', name: 'SampleDelta HIPAA Boundary', category: 'healthcare', description: 'Enforce a HIPAA-aware boundary that refuses to relay PHI across non-covered endpoints.', effectiveness: 5, criticity: 'HIGH' },
  { id: 'sampleDelta-health-record-MEDIUM-038', name: 'SampleDelta Patient Record Isolation', category: 'healthcare', description: 'Scope every retrieval to the active patient record; reject cross-patient queries without explicit elevation.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleDelta-health-disclaimer-INFO-039', name: 'SampleDelta Medical Disclaimer', category: 'healthcare', description: 'Append a no-medical-advice disclaimer to every clinical-shaped response.', effectiveness: 2, criticity: 'INFO' },

  // finance (3)
  { id: 'sampleCharlie-fin-trade-HIGH-040', name: 'SampleCharlie No-Autonomous-Trade Lock', category: 'finance', description: 'Block any model-initiated order-placement tool call; require human-in-the-loop confirmation.', effectiveness: 5, criticity: 'HIGH' },
  { id: 'sampleCharlie-fin-mnpi-MEDIUM-041', name: 'SampleCharlie MNPI Guardrail', category: 'finance', description: 'Detect material-non-public-information patterns in user prompts and refuse with a compliance-team hand-off.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleCharlie-fin-disclaim-INFO-042', name: 'SampleCharlie Investment-Advice Disclaimer', category: 'finance', description: 'Append a not-investment-advice disclaimer to every quote-shaped or projection-shaped response.', effectiveness: 2, criticity: 'INFO' },

  // government (3)
  { id: 'dojolm-gov-class-HIGH-043', name: 'DojoLM Classification-Marker Gate', category: 'government', description: 'Refuse to relay content marked with classification markers above the operator clearance level.', effectiveness: 5, criticity: 'HIGH' },
  { id: 'dojolm-gov-foia-MEDIUM-044', name: 'DojoLM FOIA-Aware Redaction', category: 'government', description: 'Apply FOIA-exempt-category redaction policies before exporting any conversation transcript.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'dojolm-gov-record-LOW-045', name: 'DojoLM Records Retention Hold', category: 'government', description: 'Persist conversation records under the configured records-retention schedule with operator-overridable holds.', effectiveness: 3, criticity: 'LOW' },

  // saas-admin (3)
  { id: 'sampleBravo-saas-rbac-HIGH-046', name: 'SampleBravo SaaS RBAC Enforcement', category: 'saas-admin', description: 'Enforce role-based access on every admin tool; refuse cross-tier escalation requests.', effectiveness: 5, criticity: 'HIGH' },
  { id: 'sampleBravo-saas-tenant-MEDIUM-047', name: 'SampleBravo SaaS Tenant Isolation', category: 'saas-admin', description: 'Scope retrieval and tool calls to the active tenant; reject cross-tenant references in prompts.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleBravo-saas-quota-LOW-048', name: 'SampleBravo SaaS Per-Tenant Quota', category: 'saas-admin', description: 'Enforce a per-tenant token + tool-call quota with operator-visible burndown.', effectiveness: 3, criticity: 'LOW' },

  // developer-assistant (3)
  { id: 'sampleCharlie-dev-secret-MEDIUM-049', name: 'SampleCharlie DevAsst Secret-Pattern Block', category: 'developer-assistant', description: 'Detect API keys / private-key blocks / connection strings in either direction and refuse the response.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleCharlie-dev-exec-LOW-050', name: 'SampleCharlie DevAsst Sandbox-Only Exec', category: 'developer-assistant', description: 'Route any code-execution tool call through a per-session sandbox with no host filesystem access.', effectiveness: 3, criticity: 'LOW' },
  { id: 'sampleCharlie-dev-license-INFO-051', name: 'SampleCharlie DevAsst License-Aware Suggest', category: 'developer-assistant', description: 'Surface the inferred license of any code suggestion so operators can decide before merging.', effectiveness: 2, criticity: 'INFO' },

  // content-moderation (3)
  { id: 'sampleAlpha-mod-classify-MEDIUM-052', name: 'SampleAlpha Multi-Classifier Ensemble', category: 'content-moderation', description: 'Run user content through an ensemble of classifiers (CSAM, weapons, self-harm) and require unanimous-allow before relay.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleAlpha-mod-appeal-LOW-053', name: 'SampleAlpha Moderation Appeal Path', category: 'content-moderation', description: 'Surface a one-click human-review path for every auto-blocked submission.', effectiveness: 3, criticity: 'LOW' },
  { id: 'sampleAlpha-mod-edge-LOW-054', name: 'SampleAlpha Edge-Case Escalation', category: 'content-moderation', description: 'Route low-confidence classifier verdicts to a human reviewer instead of auto-blocking.', effectiveness: 3, criticity: 'LOW' },

  // agentic-workflow (3)
  { id: 'sampleBravo-agent-budget-LOW-055', name: 'SampleBravo Agent Per-Task Budget Cap', category: 'agentic-workflow', description: 'Enforce a per-task token + tool-call budget; abort the agent run when the cap is hit.', effectiveness: 3, criticity: 'LOW' },
  { id: 'sampleBravo-agent-loop-LOW-056', name: 'SampleBravo Agent Loop Detector', category: 'agentic-workflow', description: 'Detect and halt agent loops by tracking repeated tool-name + parameter-shape signatures.', effectiveness: 3, criticity: 'LOW' },
  { id: 'sampleBravo-agent-trace-LOW-057', name: 'SampleBravo Agent Decision Trace', category: 'agentic-workflow', description: 'Persist a step-by-step decision trace (tool, params, observation, next-step) for after-action review.', effectiveness: 3, criticity: 'LOW' },

  // multi-modal (3)
  { id: 'sampleDelta-mm-image-MEDIUM-058', name: 'SampleDelta Image OCR-Injection Scanner', category: 'multi-modal', description: 'OCR uploaded images and scan extracted text for prompt-injection patterns before passing to the model.', effectiveness: 4, criticity: 'MEDIUM' },
  { id: 'sampleDelta-mm-file-LOW-059', name: 'SampleDelta File-Type Allowlist', category: 'multi-modal', description: 'Restrict document/image uploads to an explicit MIME-type allowlist; reject everything else.', effectiveness: 3, criticity: 'LOW' },
  { id: 'sampleDelta-mm-meta-INFO-060', name: 'SampleDelta Metadata Stripping', category: 'multi-modal', description: 'Strip EXIF / XMP / document-author metadata from uploaded files before persistence.', effectiveness: 2, criticity: 'INFO' },
]

export const DEFENSE_CATEGORY_LABELS: Record<DefenseCategory, string> = {
  'system-prompt': 'System Prompt',
  'input-validation': 'Input Validation',
  'output-filtering': 'Output Filtering',
  'rate-limiting': 'Rate Limiting',
  'context-isolation': 'Context Isolation',
  'audit-logging': 'Audit Logging',
  'encoding-defense': 'Encoding Defense',
  'boundary-enforcement': 'Boundary Enforcement',
  'rag-chatbot': 'RAG Chatbot',
  'internal-tools': 'Internal Tools',
  'customer-support': 'Customer Support',
  'compliance-critical': 'Compliance-Critical',
  'healthcare': 'Healthcare',
  'finance': 'Finance',
  'government': 'Government',
  'saas-admin': 'SaaS Admin',
  'developer-assistant': 'Developer Assistant',
  'content-moderation': 'Content Moderation',
  'agentic-workflow': 'Agentic Workflow',
  'multi-modal': 'Multi-Modal',
}

export type HardeningSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface HardeningWeakness {
  readonly id: string
  readonly severity: HardeningSeverity
  readonly description: string
  // Optional on the wire to match component-side defensive rendering:
  // presence-based rules may choose not to attribute a specific line.
  readonly line?: string
}

export interface HardeningAnalysis {
  readonly weaknesses: HardeningWeakness[]
  readonly hardened: string
}
