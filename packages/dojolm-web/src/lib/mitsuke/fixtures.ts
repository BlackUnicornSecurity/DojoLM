// SPDX-License-Identifier: Apache-2.0
/**
 * File: fixtures.ts
 * Purpose: Wave 8.5 / ADR-0077 — bundled Mitsuke threat-intel corpus.
 *          60 BU-branded typed indicators + 15 alert-triage templates.
 *          Consumed by the Mitsuke indicators API as a fresh-deploy
 *          fallback (mirrors ADR-0072 DNA pattern) and by the
 *          Mitsuke triage-templates hook directly.
 *
 * Story: WAVE8-MITSUKE-INDICATOR-TYPES / ADR-0071 Theme B gap-fill.
 *
 * BU id convention: `<target>-mitsuke-<short-tag>-<seq>`.
 * Every indicator carries one of the fictional LLM targets
 * (DojoLM / SampleBravo / SampleAlpha / SampleDelta / SampleCharlie).
 * Criticity mix: 6 CRITICAL / 12 HIGH / 18 MEDIUM / 18 LOW / 6 INFO
 * (10% / 20% / 30% / 30% / 10%).
 *
 * ─── E1-A-RB-15.6 (Master Plan v1.0 §4.1, founder fire 2026-05-23) ───
 *
 * SAMPLE / DEMO DATA ONLY. Source-attribution strings (e.g., "CISA KEV",
 * "MITRE ATLAS", "MISP Feed", "AbuseIPDB", "OpenPhish") are prefixed
 * "[SAMPLE] … (demo)" to make the demo-status unmistakable in any
 * screenshot. The fixtures do NOT represent real intel from CISA, MITRE,
 * or any real CTI feed — they are illustrative seed data for the Mitsuke
 * surface only. RB-2 (Promptfoo/Garak measurement wiring) + Stage 3
 * commercial integrations replace these with real feeds.
 *
 * Pass-1 subagent #4 + adversarial Round-1 HIGH-6 flagged the unlabeled
 * real-authority attribution as impersonation risk on the public-OSS
 * launch surface. This file ships under MIT (root LICENSE relicense
 * E0-LICENSE) and was the motivating reason for the §8 reversal that
 * scoped B-15..B-18 into Stage 1.
 */

export type MitsukeIndicatorType =
  | 'ip'
  | 'domain'
  | 'hash'
  | 'url'
  | 'email'
  | 'pattern'
  | 'ttp'

export type MitsukeSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFO'

export interface MitsukeIndicatorRecord {
  readonly id: string
  readonly type: MitsukeIndicatorType
  readonly value: string
  readonly confidence: number
  readonly severity: MitsukeSeverity
  readonly source: string
  readonly firstSeen: string
  readonly lastSeen: string
  readonly tags: readonly string[]
  readonly context: string
  readonly createdAt: string
}

export interface MitsukeTriageStep {
  readonly order: number
  readonly title: string
  readonly instruction: string
}

export interface MitsukeTriageTemplate {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly severity: MitsukeSeverity
  readonly triggerTypes: readonly MitsukeIndicatorType[]
  readonly steps: readonly MitsukeTriageStep[]
  readonly expectedOutcome: string
  readonly tags: readonly string[]
}

export const DEFAULT_MITSUKE_INDICATORS: readonly MitsukeIndicatorRecord[] = [
  { id: 'dojolm-mitsuke-c4a-001', type: 'domain', value: 'sampleBravo-exfil.internal.invalid', confidence: 98, severity: 'CRITICAL', source: 'BU-TPI C2 Tracker', firstSeen: '2026-04-10', lastSeen: '2026-04-19', tags: ['c2', 'exfiltration', 'DojoLM'], context: 'C2 beacon observed against DojoLM inference endpoints.', createdAt: '2026-04-10T08:00:00Z' },
  { id: 'sampleBravo-mitsuke-c2-002', type: 'ip', value: '203.0.113.24', confidence: 97, severity: 'CRITICAL', source: '[SAMPLE] CISA KEV (demo)', firstSeen: '2026-04-09', lastSeen: '2026-04-19', tags: ['c2', 'SampleBravo', 'active-exploit'], context: 'Active C2 host used in SampleBravo prompt-injection staging campaign.', createdAt: '2026-04-09T12:00:00Z' },
  { id: 'sampleAlpha-mitsuke-rce-003', type: 'hash', value: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', confidence: 96, severity: 'CRITICAL', source: '[SAMPLE] MISP Feed (demo)', firstSeen: '2026-04-11', lastSeen: '2026-04-19', tags: ['rce', 'SampleAlpha', 'supply-chain'], context: 'Malicious dependency shipped in SampleAlpha compliance add-on.', createdAt: '2026-04-11T09:00:00Z' },
  { id: 'sampleDelta-mitsuke-lfi-004', type: 'url', value: 'https://spoof.sampleDelta-demo.invalid/embed?path=../../etc/shadow', confidence: 95, severity: 'CRITICAL', source: 'Honeypot', firstSeen: '2026-04-12', lastSeen: '2026-04-19', tags: ['path-traversal', 'SampleDelta'], context: 'Path-traversal probe against SampleDelta embedding cache.', createdAt: '2026-04-12T03:00:00Z' },
  { id: 'sampleCharlie-mitsuke-pii-005', type: 'pattern', value: 'prompt-injection:ignore-previous|act-as-admin', confidence: 94, severity: 'CRITICAL', source: 'Kotoba Ruleset', firstSeen: '2026-04-13', lastSeen: '2026-04-19', tags: ['prompt-injection', 'SampleCharlie'], context: 'High-confidence jailbreak pattern seen targeting SampleCharlie broker APIs.', createdAt: '2026-04-13T11:00:00Z' },
  { id: 'dojolm-mitsuke-ttp-006', type: 'ttp', value: 'AML.T0051.000', confidence: 94, severity: 'CRITICAL', source: '[SAMPLE] MITRE ATLAS (demo)', firstSeen: '2026-04-08', lastSeen: '2026-04-19', tags: ['atlas', 'DojoLM', 'reflection'], context: 'ATLAS technique used to leak system prompts from DojoLM.', createdAt: '2026-04-08T07:00:00Z' },
  { id: 'sampleBravo-mitsuke-domain-007', type: 'domain', value: 'sampleBravo-creds.phish.invalid', confidence: 90, severity: 'HIGH', source: '[SAMPLE] Phishtank (demo)', firstSeen: '2026-04-10', lastSeen: '2026-04-18', tags: ['phishing', 'SampleBravo'], context: 'Credential-harvest page impersonating SampleBravo login.', createdAt: '2026-04-10T10:00:00Z' },
  { id: 'sampleAlpha-mitsuke-domain-008', type: 'domain', value: 'sampleAlpha-audit.phish.invalid', confidence: 88, severity: 'HIGH', source: '[SAMPLE] OpenPhish (demo)', firstSeen: '2026-04-09', lastSeen: '2026-04-18', tags: ['phishing', 'SampleAlpha', 'compliance-lure'], context: 'Phish lure pretending to be SampleAlpha audit invitation.', createdAt: '2026-04-09T14:00:00Z' },
  { id: 'sampleDelta-mitsuke-ip-009', type: 'ip', value: '198.51.100.77', confidence: 89, severity: 'HIGH', source: '[SAMPLE] AbuseIPDB (demo)', firstSeen: '2026-04-11', lastSeen: '2026-04-18', tags: ['scanner', 'SampleDelta'], context: 'Mass scanner probing SampleDelta admin routes.', createdAt: '2026-04-11T02:00:00Z' },
  { id: 'sampleCharlie-mitsuke-ip-010', type: 'ip', value: '198.51.100.201', confidence: 87, severity: 'HIGH', source: '[SAMPLE] Spamhaus (demo)', firstSeen: '2026-04-12', lastSeen: '2026-04-18', tags: ['spam', 'SampleCharlie'], context: 'Outbound spam origin attributed to compromised SampleCharlie agent.', createdAt: '2026-04-12T05:00:00Z' },
  { id: 'dojolm-mitsuke-hash-011', type: 'hash', value: '5d41402abc4b2a76b9719d911017c592', confidence: 85, severity: 'HIGH', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-08', lastSeen: '2026-04-18', tags: ['malware', 'DojoLM'], context: 'Trojaned DojoLM CLI wrapper distributed via npm typosquat.', createdAt: '2026-04-08T16:00:00Z' },
  { id: 'sampleBravo-mitsuke-hash-012', type: 'hash', value: '098f6bcd4621d373cade4e832627b4f6', confidence: 86, severity: 'HIGH', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-13', lastSeen: '2026-04-18', tags: ['dropper', 'SampleBravo'], context: 'Second-stage dropper observed in SampleBravo agent deployment.', createdAt: '2026-04-13T09:00:00Z' },
  { id: 'sampleAlpha-mitsuke-url-013', type: 'url', value: 'https://spoof.sampleAlpha-portal.invalid/oauth/callback', confidence: 84, severity: 'HIGH', source: 'Honeypot', firstSeen: '2026-04-11', lastSeen: '2026-04-18', tags: ['oauth-spoof', 'SampleAlpha'], context: 'Malicious OAuth callback to capture SampleAlpha tenant tokens.', createdAt: '2026-04-11T07:00:00Z' },
  { id: 'sampleDelta-mitsuke-url-014', type: 'url', value: 'https://spoof.sampleDelta-docs.invalid/install.sh', confidence: 83, severity: 'HIGH', source: 'BU-TPI Feed', firstSeen: '2026-04-10', lastSeen: '2026-04-18', tags: ['dropper', 'SampleDelta'], context: 'Fake install script targeting SampleDelta demo users.', createdAt: '2026-04-10T18:00:00Z' },
  { id: 'sampleCharlie-mitsuke-pattern-015', type: 'pattern', value: 'tool-override:exec\\s*\\(.*\\)', confidence: 82, severity: 'HIGH', source: 'Kotoba Ruleset', firstSeen: '2026-04-09', lastSeen: '2026-04-18', tags: ['tool-abuse', 'SampleCharlie'], context: 'Tool-call hijack attempt against SampleCharlie broker.', createdAt: '2026-04-09T06:00:00Z' },
  { id: 'dojolm-mitsuke-pattern-016', type: 'pattern', value: 'rag-inject:```ignore-system```', confidence: 81, severity: 'HIGH', source: 'Kotoba Ruleset', firstSeen: '2026-04-12', lastSeen: '2026-04-18', tags: ['rag-injection', 'DojoLM'], context: 'Indirect prompt injection via fenced markdown in RAG context.', createdAt: '2026-04-12T11:00:00Z' },
  { id: 'sampleBravo-mitsuke-email-017', type: 'email', value: 'alerts@sampleBravo-security.invalid', confidence: 80, severity: 'HIGH', source: '[SAMPLE] Phishtank (demo)', firstSeen: '2026-04-08', lastSeen: '2026-04-18', tags: ['phishing', 'SampleBravo'], context: 'Spoofed sender for SampleBravo security alert phishing.', createdAt: '2026-04-08T21:00:00Z' },
  { id: 'sampleAlpha-mitsuke-ttp-018', type: 'ttp', value: 'AML.T0057', confidence: 85, severity: 'HIGH', source: '[SAMPLE] MITRE ATLAS (demo)', firstSeen: '2026-04-07', lastSeen: '2026-04-18', tags: ['atlas', 'SampleAlpha', 'llm-jailbreak'], context: 'ATLAS technique: LLM jailbreak pattern observed against SampleAlpha.', createdAt: '2026-04-07T04:00:00Z' },
  { id: 'sampleDelta-mitsuke-domain-019', type: 'domain', value: 'sampleDelta-test.invalid', confidence: 70, severity: 'MEDIUM', source: 'BU-TPI Feed', firstSeen: '2026-04-06', lastSeen: '2026-04-17', tags: ['recon', 'SampleDelta'], context: 'Reconnaissance domain enumerating SampleDelta subresources.', createdAt: '2026-04-06T01:00:00Z' },
  { id: 'sampleCharlie-mitsuke-domain-020', type: 'domain', value: 'sampleCharlie-news.invalid', confidence: 68, severity: 'MEDIUM', source: 'Internal IR', firstSeen: '2026-04-05', lastSeen: '2026-04-17', tags: ['brand-abuse', 'SampleCharlie'], context: 'Squatted domain hosting fake SampleCharlie product news.', createdAt: '2026-04-05T20:00:00Z' },
  { id: 'dojolm-mitsuke-domain-021', type: 'domain', value: 'dojolm-updates.invalid', confidence: 67, severity: 'MEDIUM', source: 'Domain Monitor', firstSeen: '2026-04-07', lastSeen: '2026-04-17', tags: ['squat', 'DojoLM'], context: 'Typosquat hosting fake DojoLM release notes.', createdAt: '2026-04-07T11:00:00Z' },
  { id: 'sampleBravo-mitsuke-domain-022', type: 'domain', value: 'sampleBravo-ops.invalid', confidence: 65, severity: 'MEDIUM', source: 'Passive DNS', firstSeen: '2026-04-09', lastSeen: '2026-04-17', tags: ['recon', 'SampleBravo'], context: 'Passive DNS resolution from SampleBravo DevRel conference.', createdAt: '2026-04-09T19:00:00Z' },
  { id: 'sampleAlpha-mitsuke-ip-023', type: 'ip', value: '203.0.113.88', confidence: 66, severity: 'MEDIUM', source: 'Cowrie Honeypot', firstSeen: '2026-04-10', lastSeen: '2026-04-17', tags: ['scanner', 'SampleAlpha'], context: 'SSH brute-force targeting SampleAlpha hosted deployment.', createdAt: '2026-04-10T22:00:00Z' },
  { id: 'sampleDelta-mitsuke-ip-024', type: 'ip', value: '198.51.100.33', confidence: 64, severity: 'MEDIUM', source: 'BU-TPI Feed', firstSeen: '2026-04-11', lastSeen: '2026-04-17', tags: ['scanner', 'SampleDelta'], context: 'Admin-panel probing against SampleDelta staging.', createdAt: '2026-04-11T17:00:00Z' },
  { id: 'sampleCharlie-mitsuke-ip-025', type: 'ip', value: '198.51.100.55', confidence: 63, severity: 'MEDIUM', source: '[SAMPLE] AbuseIPDB (demo)', firstSeen: '2026-04-12', lastSeen: '2026-04-17', tags: ['proxy', 'SampleCharlie'], context: 'Proxy used to mask source of SampleCharlie API abuse.', createdAt: '2026-04-12T13:00:00Z' },
  { id: 'dojolm-mitsuke-hash-026', type: 'hash', value: 'dc724af18fbdd4e59189f5fe768a5f8311527050', confidence: 62, severity: 'MEDIUM', source: 'BU-TPI Feed', firstSeen: '2026-04-05', lastSeen: '2026-04-17', tags: ['adware', 'DojoLM'], context: 'Adware wrapper repackaging DojoLM demo binaries.', createdAt: '2026-04-05T07:00:00Z' },
  { id: 'sampleBravo-mitsuke-hash-027', type: 'hash', value: 'e99a18c428cb38d5f260853678922e03', confidence: 61, severity: 'MEDIUM', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-06', lastSeen: '2026-04-17', tags: ['pua', 'SampleBravo'], context: 'Potentially unwanted app bundled with SampleBravo tutorial.', createdAt: '2026-04-06T09:00:00Z' },
  { id: 'sampleAlpha-mitsuke-hash-028', type: 'hash', value: '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12', confidence: 60, severity: 'MEDIUM', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-13', lastSeen: '2026-04-17', tags: ['pua', 'SampleAlpha'], context: 'Unsigned build of SampleAlpha CLI circulating on forums.', createdAt: '2026-04-13T15:00:00Z' },
  { id: 'sampleDelta-mitsuke-url-029', type: 'url', value: 'https://spoof.sampleDelta-signup.invalid/beta-access', confidence: 59, severity: 'MEDIUM', source: '[SAMPLE] Phishtank (demo)', firstSeen: '2026-04-08', lastSeen: '2026-04-17', tags: ['phishing', 'SampleDelta'], context: 'Fake beta signup page harvesting SampleDelta enterprise emails.', createdAt: '2026-04-08T11:00:00Z' },
  { id: 'sampleCharlie-mitsuke-url-030', type: 'url', value: 'https://spoof.sampleCharlie-broker.invalid/token', confidence: 58, severity: 'MEDIUM', source: 'Honeypot', firstSeen: '2026-04-09', lastSeen: '2026-04-17', tags: ['token-spoof', 'SampleCharlie'], context: 'Fake broker token endpoint under SampleCharlie brand.', createdAt: '2026-04-09T14:00:00Z' },
  { id: 'dojolm-mitsuke-url-031', type: 'url', value: 'https://spoof.dojolm-plugins.invalid/index.json', confidence: 57, severity: 'MEDIUM', source: 'BU-TPI Feed', firstSeen: '2026-04-10', lastSeen: '2026-04-17', tags: ['plugin-spoof', 'DojoLM'], context: 'Spoofed plugin registry served to DojoLM CLI instances.', createdAt: '2026-04-10T05:00:00Z' },
  { id: 'sampleBravo-mitsuke-pattern-032', type: 'pattern', value: 'context-leak:```base64[0-9A-Za-z+/=]{80,}```', confidence: 60, severity: 'MEDIUM', source: 'Kotoba Ruleset', firstSeen: '2026-04-11', lastSeen: '2026-04-17', tags: ['exfiltration', 'SampleBravo'], context: 'Encoded-context leak heuristic tripping against SampleBravo agents.', createdAt: '2026-04-11T08:00:00Z' },
  { id: 'sampleAlpha-mitsuke-pattern-033', type: 'pattern', value: 'policy-bypass:\\b(disregard|forget)\\s+(compliance|guidelines)', confidence: 62, severity: 'MEDIUM', source: 'Kotoba Ruleset', firstSeen: '2026-04-12', lastSeen: '2026-04-17', tags: ['policy-bypass', 'SampleAlpha'], context: 'Policy-bypass phrasing against SampleAlpha compliance prompt chain.', createdAt: '2026-04-12T10:00:00Z' },
  { id: 'sampleDelta-mitsuke-email-034', type: 'email', value: 'support@sampleDelta-secure.invalid', confidence: 55, severity: 'MEDIUM', source: '[SAMPLE] Phishtank (demo)', firstSeen: '2026-04-07', lastSeen: '2026-04-17', tags: ['phishing', 'SampleDelta'], context: 'Support-impersonation phish sender for SampleDelta enterprise.', createdAt: '2026-04-07T16:00:00Z' },
  { id: 'sampleCharlie-mitsuke-email-035', type: 'email', value: 'billing@sampleCharlie-broker.invalid', confidence: 54, severity: 'MEDIUM', source: '[SAMPLE] Phishtank (demo)', firstSeen: '2026-04-13', lastSeen: '2026-04-17', tags: ['phishing', 'SampleCharlie'], context: 'Billing-lure phish for SampleCharlie enterprise accounts.', createdAt: '2026-04-13T17:00:00Z' },
  { id: 'dojolm-mitsuke-ttp-036', type: 'ttp', value: 'AML.T0040', confidence: 72, severity: 'MEDIUM', source: '[SAMPLE] MITRE ATLAS (demo)', firstSeen: '2026-04-06', lastSeen: '2026-04-17', tags: ['atlas', 'DojoLM', 'evasion'], context: 'ATLAS technique: ML model query evasion seen against DojoLM.', createdAt: '2026-04-06T03:00:00Z' },
  { id: 'sampleBravo-mitsuke-domain-037', type: 'domain', value: 'sampleBravo-forum.example', confidence: 40, severity: 'LOW', source: 'Passive DNS', firstSeen: '2026-04-05', lastSeen: '2026-04-16', tags: ['observed', 'SampleBravo'], context: 'Low-traffic community forum referencing SampleBravo.', createdAt: '2026-04-05T01:00:00Z' },
  { id: 'sampleAlpha-mitsuke-domain-038', type: 'domain', value: 'sampleAlpha-compliance.example', confidence: 38, severity: 'LOW', source: 'Passive DNS', firstSeen: '2026-04-04', lastSeen: '2026-04-16', tags: ['observed', 'SampleAlpha'], context: 'Third-party advisory blog covering SampleAlpha compliance.', createdAt: '2026-04-04T12:00:00Z' },
  { id: 'sampleDelta-mitsuke-domain-039', type: 'domain', value: 'sampleDelta-ref.example', confidence: 36, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-03', lastSeen: '2026-04-16', tags: ['observed', 'SampleDelta'], context: 'Public reference domain linking SampleDelta tutorials.', createdAt: '2026-04-03T09:00:00Z' },
  { id: 'sampleCharlie-mitsuke-ip-040', type: 'ip', value: '192.0.2.10', confidence: 35, severity: 'LOW', source: 'Passive DNS', firstSeen: '2026-04-06', lastSeen: '2026-04-16', tags: ['observed', 'SampleCharlie'], context: 'Conference hotel IP resolving SampleCharlie marketing microsite.', createdAt: '2026-04-06T20:00:00Z' },
  { id: 'dojolm-mitsuke-ip-041', type: 'ip', value: '192.0.2.44', confidence: 34, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-07', lastSeen: '2026-04-16', tags: ['observed', 'DojoLM'], context: 'Low-volume crawler hitting DojoLM docs mirror.', createdAt: '2026-04-07T02:00:00Z' },
  { id: 'sampleBravo-mitsuke-ip-042', type: 'ip', value: '192.0.2.77', confidence: 33, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-08', lastSeen: '2026-04-16', tags: ['observed', 'SampleBravo'], context: 'Analyst workstation IP tagged during SampleBravo debugging.', createdAt: '2026-04-08T04:00:00Z' },
  { id: 'sampleAlpha-mitsuke-hash-043', type: 'hash', value: '6dcd4ce23d88e2ee9568ba546c007c63d9131c1b', confidence: 32, severity: 'LOW', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-09', lastSeen: '2026-04-16', tags: ['observed', 'SampleAlpha'], context: 'Benign SDK build hash surfaced by SampleAlpha enterprise teams.', createdAt: '2026-04-09T23:00:00Z' },
  { id: 'sampleDelta-mitsuke-hash-044', type: 'hash', value: '88a4e0e4f9a8a0ac7b0f2df85b7c7e0a1c2d3e4f', confidence: 31, severity: 'LOW', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-10', lastSeen: '2026-04-16', tags: ['observed', 'SampleDelta'], context: 'Recurring build hash from SampleDelta reference deployment.', createdAt: '2026-04-10T11:00:00Z' },
  { id: 'sampleCharlie-mitsuke-hash-045', type: 'hash', value: '44e37d6b69e6842a9cda74ce4f1a8a88ff95a1b2', confidence: 30, severity: 'LOW', source: '[SAMPLE] VirusTotal (demo)', firstSeen: '2026-04-11', lastSeen: '2026-04-16', tags: ['observed', 'SampleCharlie'], context: 'Benign tutorial binary signed by SampleCharlie DevRel.', createdAt: '2026-04-11T06:00:00Z' },
  { id: 'dojolm-mitsuke-url-046', type: 'url', value: 'https://spoof.dojolm-refs.example/index.html', confidence: 29, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-04', lastSeen: '2026-04-16', tags: ['observed', 'DojoLM'], context: 'Low-traffic mirror referencing DojoLM quickstart.', createdAt: '2026-04-04T08:00:00Z' },
  { id: 'sampleBravo-mitsuke-url-047', type: 'url', value: 'https://spoof.sampleBravo-forums.example/thread/42', confidence: 28, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-05', lastSeen: '2026-04-16', tags: ['observed', 'SampleBravo'], context: 'Community thread citing SampleBravo troubleshooting tips.', createdAt: '2026-04-05T16:00:00Z' },
  { id: 'sampleAlpha-mitsuke-url-048', type: 'url', value: 'https://spoof.sampleAlpha-demo.example/checkout', confidence: 27, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-06', lastSeen: '2026-04-16', tags: ['observed', 'SampleAlpha'], context: 'SampleAlpha demo microsite referenced from compliance blogs.', createdAt: '2026-04-06T13:00:00Z' },
  { id: 'sampleDelta-mitsuke-pattern-049', type: 'pattern', value: 'debug-leak:\\bSYSTEM PROMPT\\b', confidence: 44, severity: 'LOW', source: 'Kotoba Ruleset', firstSeen: '2026-04-07', lastSeen: '2026-04-16', tags: ['observed', 'SampleDelta'], context: 'Low-confidence debug leak pattern from SampleDelta sandbox.', createdAt: '2026-04-07T05:00:00Z' },
  { id: 'sampleCharlie-mitsuke-pattern-050', type: 'pattern', value: 'stale-context:\\bpreviously agreed\\b', confidence: 42, severity: 'LOW', source: 'Kotoba Ruleset', firstSeen: '2026-04-08', lastSeen: '2026-04-16', tags: ['observed', 'SampleCharlie'], context: 'Stale-context prompt heuristic for SampleCharlie multi-turn sessions.', createdAt: '2026-04-08T14:00:00Z' },
  { id: 'dojolm-mitsuke-email-051', type: 'email', value: 'devrel@dojolm-demo.example', confidence: 26, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-09', lastSeen: '2026-04-16', tags: ['observed', 'DojoLM'], context: 'DevRel communication address seen in DojoLM office hours.', createdAt: '2026-04-09T11:00:00Z' },
  { id: 'sampleBravo-mitsuke-email-052', type: 'email', value: 'community@sampleBravo-forum.example', confidence: 25, severity: 'LOW', source: 'BU-TPI Feed', firstSeen: '2026-04-10', lastSeen: '2026-04-16', tags: ['observed', 'SampleBravo'], context: 'SampleBravo community mailbox referenced on the hub.', createdAt: '2026-04-10T17:00:00Z' },
  { id: 'sampleAlpha-mitsuke-ttp-053', type: 'ttp', value: 'AML.T0025', confidence: 45, severity: 'LOW', source: '[SAMPLE] MITRE ATLAS (demo)', firstSeen: '2026-04-04', lastSeen: '2026-04-16', tags: ['atlas', 'SampleAlpha', 'recon'], context: 'ATLAS technique: ML service discovery against SampleAlpha tenants.', createdAt: '2026-04-04T04:00:00Z' },
  { id: 'sampleDelta-mitsuke-ttp-054', type: 'ttp', value: 'AML.T0027', confidence: 43, severity: 'LOW', source: '[SAMPLE] MITRE ATLAS (demo)', firstSeen: '2026-04-05', lastSeen: '2026-04-16', tags: ['atlas', 'SampleDelta', 'recon'], context: 'ATLAS technique: public documentation harvesting for SampleDelta.', createdAt: '2026-04-05T10:00:00Z' },
  { id: 'sampleCharlie-mitsuke-ip-055', type: 'ip', value: '192.0.2.100', confidence: 18, severity: 'INFO', source: 'Passive DNS', firstSeen: '2026-04-03', lastSeen: '2026-04-15', tags: ['reference', 'SampleCharlie'], context: 'Customer-facing webinar VPN IP for SampleCharlie training session.', createdAt: '2026-04-03T19:00:00Z' },
  { id: 'dojolm-mitsuke-domain-056', type: 'domain', value: 'dojolm-changelog.example', confidence: 16, severity: 'INFO', source: 'Passive DNS', firstSeen: '2026-04-02', lastSeen: '2026-04-15', tags: ['reference', 'DojoLM'], context: 'Static changelog mirror for DojoLM release notes.', createdAt: '2026-04-02T22:00:00Z' },
  { id: 'sampleBravo-mitsuke-hash-057', type: 'hash', value: 'aa11bb22cc33dd44ee55ff66778899aabbccddee', confidence: 15, severity: 'INFO', source: 'Internal IR', firstSeen: '2026-04-01', lastSeen: '2026-04-15', tags: ['reference', 'SampleBravo'], context: 'Signed SampleBravo CI build hash for baseline comparison.', createdAt: '2026-04-01T18:00:00Z' },
  { id: 'sampleAlpha-mitsuke-url-058', type: 'url', value: 'https://spoof.sampleAlpha-rel.example/release-notes', confidence: 14, severity: 'INFO', source: 'Internal IR', firstSeen: '2026-03-31', lastSeen: '2026-04-15', tags: ['reference', 'SampleAlpha'], context: 'Canonical SampleAlpha release-notes URL.', createdAt: '2026-03-31T15:00:00Z' },
  { id: 'sampleDelta-mitsuke-pattern-059', type: 'pattern', value: 'debug-marker:\\bSAMPLE_DELTA-DEBUG\\b', confidence: 12, severity: 'INFO', source: 'Internal IR', firstSeen: '2026-03-30', lastSeen: '2026-04-15', tags: ['reference', 'SampleDelta'], context: 'Debug marker pattern for SampleDelta staging logs.', createdAt: '2026-03-30T09:00:00Z' },
  { id: 'sampleCharlie-mitsuke-ttp-060', type: 'ttp', value: 'AML.TA0001', confidence: 11, severity: 'INFO', source: '[SAMPLE] MITRE ATLAS (demo)', firstSeen: '2026-03-29', lastSeen: '2026-04-15', tags: ['atlas', 'SampleCharlie', 'reference'], context: 'ATLAS tactic reference: Reconnaissance.', createdAt: '2026-03-29T12:00:00Z' },
] as const

function step(order: number, title: string, instruction: string): MitsukeTriageStep {
  return { order, title, instruction }
}

export const DEFAULT_MITSUKE_TRIAGE_TEMPLATES: readonly MitsukeTriageTemplate[] = [
  {
    id: 'dojolm-triage-c2-001',
    name: 'DojoLM C2 beacon response',
    description: 'Triage path for confirmed C2 beacons against DojoLM deployments.',
    severity: 'CRITICAL',
    triggerTypes: ['domain', 'ip'],
    steps: [
      step(1, 'Isolate', 'Cordon the affected DojoLM pod set; block outbound to the indicator at the egress gateway.'),
      step(2, 'Capture', 'Snapshot the running pod memory + the last 30 minutes of inference logs.'),
      step(3, 'Rotate', 'Rotate every DojoLM service token and inference-endpoint credential.'),
      step(4, 'Notify', 'File an IR ticket referencing the indicator id; page the DojoLM on-call rotation.'),
    ],
    expectedOutcome: 'Beacon traffic drops to zero within 15 minutes; credentials rotated within 1 hour.',
    tags: ['c2', 'DojoLM', 'isolate', 'rotate'],
  },
  {
    id: 'sampleBravo-triage-phish-002',
    name: 'SampleBravo credential-harvest phish',
    description: 'Alert playbook for phishing lures impersonating SampleBravo login.',
    severity: 'HIGH',
    triggerTypes: ['domain', 'url', 'email'],
    steps: [
      step(1, 'Classify', 'Confirm the landing page is a SampleBravo-branded credential harvester.'),
      step(2, 'Takedown', 'Submit a takedown request to the registrar and safelists.'),
      step(3, 'Notify customers', 'Publish a community advisory with the spoofed URL redacted.'),
      step(4, 'Enforce MFA', 'Audit SampleBravo accounts that visited the lure in the prior 24h; force MFA re-enrolment.'),
    ],
    expectedOutcome: 'Lure URL delisted within 4 hours; no SampleBravo account credential leak confirmed.',
    tags: ['phishing', 'SampleBravo', 'takedown'],
  },
  {
    id: 'sampleAlpha-triage-supply-003',
    name: 'SampleAlpha supply-chain artefact response',
    description: 'Triage path for a malicious artefact in a SampleAlpha compliance add-on.',
    severity: 'CRITICAL',
    triggerTypes: ['hash'],
    steps: [
      step(1, 'Freeze', 'Pause every SampleAlpha compliance add-on rollout for the tenant surface.'),
      step(2, 'Quarantine', 'Move matching artefacts to the SampleAlpha SAGE quarantine bucket.'),
      step(3, 'Roll back', 'Re-deploy the previous known-good add-on build to affected tenants.'),
      step(4, 'Audit', 'Verify SBOM and release provenance for every SampleAlpha add-on published in the prior 30 days.'),
    ],
    expectedOutcome: 'Affected tenants back on known-good build within 2 hours; publishing pipeline signed with renewed keys.',
    tags: ['supply-chain', 'SampleAlpha', 'rollback'],
  },
  {
    id: 'sampleDelta-triage-lfi-004',
    name: 'SampleDelta path-traversal probe',
    description: 'Incident response to path-traversal probes against the SampleDelta embedding cache.',
    severity: 'CRITICAL',
    triggerTypes: ['url', 'pattern'],
    steps: [
      step(1, 'Block', 'Drop the source IP at the WAF; add the probe pattern to the Guard ruleset.'),
      step(2, 'Audit', 'Review the SampleDelta embedding-cache request log for successful 200 OK responses to traversal payloads.'),
      step(3, 'Patch', 'Confirm SampleDelta embedding-cache is running the latest fix level.'),
      step(4, 'Notify', 'File a compliance ticket citing any file whose metadata leaked.'),
    ],
    expectedOutcome: 'Probe blocked at edge within 10 minutes; zero successful traversal confirmed.',
    tags: ['path-traversal', 'SampleDelta', 'waf'],
  },
  {
    id: 'sampleCharlie-triage-jailbreak-005',
    name: 'SampleCharlie broker jailbreak prompt',
    description: 'Response playbook for jailbreak prompts targeting SampleCharlie broker APIs.',
    severity: 'CRITICAL',
    triggerTypes: ['pattern', 'ttp'],
    steps: [
      step(1, 'Quarantine', 'Move the offending session transcript to the SampleCharlie SAGE quarantine bucket.'),
      step(2, 'Kotoba', 'Add the jailbreak pattern to the SampleCharlie Kotoba ruleset as a blocking rule.'),
      step(3, 'Degrade', 'Downgrade the source account to read-only for the next 6 hours.'),
      step(4, 'Review', 'Manually review any trades the account initiated in the last 24 hours.'),
    ],
    expectedOutcome: 'Jailbreak blocked in production within 15 minutes; zero bypass observed post-deploy.',
    tags: ['jailbreak', 'SampleCharlie', 'kotoba'],
  },
  {
    id: 'dojolm-triage-rag-inject-006',
    name: 'DojoLM RAG injection detection',
    description: 'Handle indirect prompt injection delivered through retrieval context.',
    severity: 'HIGH',
    triggerTypes: ['pattern'],
    steps: [
      step(1, 'Strip', 'Remove the offending document from the DojoLM RAG index until scored.'),
      step(2, 'Tag', 'Tag the affected session in Sengoku for temporal replay.'),
      step(3, 'Score', 'Run the document through Kotoba; if severity is HIGH or above, purge.'),
    ],
    expectedOutcome: 'RAG index cleared of injected content within 1 hour.',
    tags: ['rag', 'DojoLM', 'kotoba'],
  },
  {
    id: 'sampleBravo-triage-scanner-007',
    name: 'SampleBravo admin-panel scanner',
    description: 'Handle generic scanners probing SampleBravo admin routes.',
    severity: 'MEDIUM',
    triggerTypes: ['ip'],
    steps: [
      step(1, 'Rate limit', 'Apply a restrictive rate-limit profile to the source IP at the WAF.'),
      step(2, 'Log', 'Enable verbose request logging for the admin surface for 24 hours.'),
      step(3, 'Block if persistent', 'If probing persists beyond 24 hours, block outright.'),
    ],
    expectedOutcome: 'Probe volume drops to under 10 rpm within 2 hours.',
    tags: ['scanner', 'SampleBravo', 'rate-limit'],
  },
  {
    id: 'sampleAlpha-triage-brute-008',
    name: 'SampleAlpha SSH brute-force',
    description: 'Respond to SSH brute-force against a SampleAlpha hosted deployment.',
    severity: 'MEDIUM',
    triggerTypes: ['ip'],
    steps: [
      step(1, 'Ban', 'Add the source IP to fail2ban and the cloud-edge block list.'),
      step(2, 'Force key-only', 'Disable password authentication on the tenant bastion.'),
      step(3, 'Audit', 'Review authentication logs for any successful login from the source.'),
    ],
    expectedOutcome: 'Brute-force attempts drop to zero within 30 minutes.',
    tags: ['ssh', 'SampleAlpha', 'fail2ban'],
  },
  {
    id: 'sampleDelta-triage-oauth-009',
    name: 'SampleDelta OAuth callback spoof',
    description: 'Handle OAuth callback spoofing to capture SampleDelta tenant tokens.',
    severity: 'HIGH',
    triggerTypes: ['url', 'domain'],
    steps: [
      step(1, 'Rotate', 'Rotate every SampleDelta tenant client secret issued in the last 7 days.'),
      step(2, 'Tighten redirects', 'Lock the OAuth app to an exact allowlist of redirect URIs.'),
      step(3, 'Notify', 'Email affected tenants with re-consent instructions.'),
    ],
    expectedOutcome: 'Spoofed callback loses value within 1 hour as secrets are rotated.',
    tags: ['oauth', 'SampleDelta', 'rotate'],
  },
  {
    id: 'sampleCharlie-triage-tool-abuse-010',
    name: 'SampleCharlie tool-call hijack',
    description: 'Respond to tool-override attempts against the SampleCharlie broker.',
    severity: 'HIGH',
    triggerTypes: ['pattern'],
    steps: [
      step(1, 'Gate', 'Require explicit operator confirmation for exec tool calls for the next 24 hours.'),
      step(2, 'Guard rule', 'Publish the override pattern to the SampleCharlie Guard ruleset at Samurai severity.'),
      step(3, 'Review', 'Audit every exec tool call in the prior 7 days.'),
    ],
    expectedOutcome: 'Tool-override attempts blocked; Guard ruleset updated within 30 minutes.',
    tags: ['tool-abuse', 'SampleCharlie', 'guard'],
  },
  {
    id: 'dojolm-triage-brand-011',
    name: 'DojoLM typosquat domain observed',
    description: 'Handle observed typosquats of DojoLM release branding.',
    severity: 'LOW',
    triggerTypes: ['domain'],
    steps: [
      step(1, 'Document', 'Record the squat in the brand-monitor log.'),
      step(2, 'Watch', 'Set a weekly crawl; escalate if the content becomes malicious.'),
    ],
    expectedOutcome: 'Squat tracked; no further action unless malicious content appears.',
    tags: ['brand-abuse', 'DojoLM', 'monitor'],
  },
  {
    id: 'sampleBravo-triage-adware-012',
    name: 'SampleBravo adware repackage',
    description: 'Handle adware repackaging of a SampleBravo demo binary.',
    severity: 'MEDIUM',
    triggerTypes: ['hash'],
    steps: [
      step(1, 'Inform', 'Post a SampleBravo community advisory with the checksum of the clean build.'),
      step(2, 'Distribute', 'Re-publish the signed SampleBravo demo binary via the official channel.'),
    ],
    expectedOutcome: 'Community redirected to the clean build; adware share-rate drops.',
    tags: ['adware', 'SampleBravo', 'advisory'],
  },
  {
    id: 'sampleAlpha-triage-atlas-013',
    name: 'SampleAlpha ATLAS-aligned probing',
    description: 'Escalation path when an ATLAS TTP maps to active SampleAlpha traffic.',
    severity: 'HIGH',
    triggerTypes: ['ttp', 'pattern'],
    steps: [
      step(1, 'Cross-reference', 'Confirm the TTP id against the SampleAlpha ATLAS matrix mapping.'),
      step(2, 'Mitigate', 'Apply every ATLAS-listed mitigation in the defense matrix for this technique.'),
      step(3, 'Report', 'Feed the incident back into the MITRE ATLAS contribution pipeline.'),
    ],
    expectedOutcome: 'Mitigations deployed and the incident submitted upstream within 24 hours.',
    tags: ['atlas', 'SampleAlpha', 'mitigation'],
  },
  {
    id: 'sampleDelta-triage-debug-014',
    name: 'SampleDelta debug marker leak',
    description: 'Operator-information playbook for a benign debug-marker leak.',
    severity: 'INFO',
    triggerTypes: ['pattern'],
    steps: [
      step(1, 'Acknowledge', 'Log the occurrence; no customer-facing action required.'),
      step(2, 'Watch', 'Add to the weekly operator digest for trend review.'),
    ],
    expectedOutcome: 'Occurrence logged; no further action unless frequency rises.',
    tags: ['reference', 'SampleDelta', 'digest'],
  },
  {
    id: 'sampleCharlie-triage-recon-015',
    name: 'SampleCharlie reconnaissance digest',
    description: 'Weekly rollup of low-confidence SampleCharlie reconnaissance indicators.',
    severity: 'LOW',
    triggerTypes: ['ip', 'domain', 'ttp'],
    steps: [
      step(1, 'Aggregate', 'Group every LOW-severity SampleCharlie indicator from the prior week.'),
      step(2, 'Score', 'Compute a rollup score; escalate to the SampleCharlie SOC lead when the score reaches 40 or above.'),
      step(3, 'Publish', 'Append the rollup to the weekly SampleCharlie threat digest.'),
    ],
    expectedOutcome: 'Digest published; escalations triggered only when score reaches 40.',
    tags: ['recon', 'SampleCharlie', 'digest'],
  },
] as const

export function filterIndicatorsByType(
  indicators: readonly MitsukeIndicatorRecord[],
  type: MitsukeIndicatorType,
): readonly MitsukeIndicatorRecord[] {
  return indicators.filter((i) => i.type === type)
}

export function filterIndicatorsBySeverity(
  indicators: readonly MitsukeIndicatorRecord[],
  severity: MitsukeSeverity,
): readonly MitsukeIndicatorRecord[] {
  return indicators.filter((i) => i.severity === severity)
}

export function triageTemplatesForType(
  type: MitsukeIndicatorType,
): readonly MitsukeTriageTemplate[] {
  return DEFAULT_MITSUKE_TRIAGE_TEMPLATES.filter(
    (t) => t.triggerTypes.includes(type),
  )
}
