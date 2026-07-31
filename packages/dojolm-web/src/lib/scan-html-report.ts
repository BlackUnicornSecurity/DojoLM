// SPDX-License-Identifier: Apache-2.0
/**
 * File: scan-html-report.ts
 * Purpose: Render a persisted scan run (ScanRunRecord — the operator's scan
 *          history artifact) into a self-contained HTML scan report. This is
 *          the COMMUNITY report: the artifact every install produces via the
 *          scanner surface, with no validation-framework or engagement
 *          content.
 *
 * Boundary (deliberate duplication): this file is Apache and ships in the
 * community export, so it must not import from the BUSL report binders
 * (validation-html-report.ts / validation-full-report.ts) — the oss-export
 * import-graph gate rejects community→ee-hold edges. The escape helper and
 * the embedded style subset are therefore self-contained here. Style source
 * of truth: the INK skin of the report-template specimen
 * (team/docs/report-templates-2026-07, gitignored design source) — keep
 * visually in sync; never hand-drift.
 *
 * Honesty rules: the report derives everything from the record — the
 * findings list is a bounded summary (findingsTotal counts pre-cap; full
 * payloads live in the WORM evidence capture, not here), and the banner is a
 * severity rollup, not an invented verdict. Edition-neutral: no
 * Community/Enterprise claim baked into the document.
 */

import type { ScanRunFinding, ScanRunRecord } from '@/lib/scan-runs';

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Severity → badge class of the shared report design language. */
function severityBadge(severity: string): string {
  const s = severity.toUpperCase()
  const cls = s === 'CRITICAL' ? 'FAIL' : s === 'WARNING' ? 'COND' : 'NA'
  return `<span class="badge ${cls}">${esc(s)}</span>`
}

interface SeverityRollup {
  readonly critical: number
  readonly warning: number
  readonly info: number
  readonly other: number
}

function rollupSeverities(counts: Readonly<Record<string, number>>): SeverityRollup {
  let critical = 0
  let warning = 0
  let info = 0
  let other = 0
  for (const [key, value] of Object.entries(counts)) {
    const k = key.toUpperCase()
    if (k === 'CRITICAL') critical += value
    else if (k === 'WARNING') warning += value
    else if (k === 'INFO') info += value
    else other += value
  }
  return { critical, warning, info, other }
}

function findingsBanner(run: ScanRunRecord, r: SeverityRollup): string {
  // PASS (green) only when the run is genuinely clean — never for an
  // info-only run, which has non-zero findings and must not read as "clean".
  const cls = r.critical > 0 ? 'fail' : r.warning > 0 ? '' : run.findingsTotal === 0 ? 'pass' : ''
  const big =
    run.findingsTotal === 0
      ? 'NO FINDINGS'
      : `${run.findingsTotal} FINDING${run.findingsTotal === 1 ? '' : 'S'}`
  const parts = [
    r.critical > 0 ? `${r.critical} CRITICAL` : null,
    r.warning > 0 ? `${r.warning} WARNING` : null,
    r.info > 0 ? `${r.info} INFO` : null,
    r.other > 0 ? `${r.other} other-severity` : null,
  ].filter(Boolean)
  const detail =
    run.findingsTotal === 0
      ? 'The scan recorded no findings for this input.'
      : `${parts.join(' · ')} across the scanned input. Severity rollup derived from the run record's counters.`
  return `<div class="verdict-banner ${cls}"><span class="big">${big}</span><span>${detail}</span></div>`
}

/** Category rollup over the PERSISTED findings only. The record keeps no
 *  pre-cap per-category counter, so on a capped run this table sums to the
 *  persisted rows, not findingsTotal — disclosed inline so a reader never
 *  reads it as a full-population breakdown (the banner + "at a glance" above
 *  DO use the full counters, so the two must not silently disagree). */
function categoryTable(run: ScanRunRecord): string {
  if (run.findings.length === 0) return ''
  const byCategory = new Map<string, number>()
  for (const f of run.findings) {
    byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1)
  }
  const rows = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `<tr><td class="mono">${esc(category)}</td><td>${count}</td></tr>`)
    .join('')
  const capped = run.findingsTotal > run.findings.length
  const note = capped
    ? `<p class="small">Category counts are over the ${run.findings.length} persisted finding rows, not the ${run.findingsTotal} total — the "at a glance" counts above are the full-population figures.</p>`
    : ''
  return `<h2>Findings by category</h2><table><tr><th>Category</th><th>Count</th></tr>${rows}</table>${note}`
}

function findingsTable(run: ScanRunRecord): string {
  if (run.findings.length === 0) {
    return `<p class="small">No finding rows recorded.</p>`
  }
  const head = `<tr><th>#</th><th>Severity</th><th>Category</th><th>Engine</th><th>Pattern</th><th>Description</th><th>Matched excerpt</th></tr>`
  const rows = run.findings
    .map(
      (f) =>
        `<tr><td class="mono">${esc(f.seq)}</td><td>${severityBadge(f.severity)}</td><td class="mono">${esc(f.category)}</td>` +
        `<td class="mono">${esc(f.engine)}</td><td class="mono">${esc(f.patternName ?? '—')}</td>` +
        `<td>${esc(f.description)}</td><td class="mono">${esc(f.match)}</td></tr>`,
    )
    .join('')
  const capped = run.findingsTotal > run.findings.length
  const note = capped
    ? `<p class="small">Showing the ${run.findings.length} persisted finding rows of ${run.findingsTotal} total — the persisted list is bounded; the full set is in the run's JSON export and the WORM evidence capture.</p>`
    : ''
  return `<table>${head}${rows}</table>${note}`
}

/**
 * Render a self-contained HTML scan report from a persisted scan run.
 * Pure function of the record — no clock, no environment reads.
 */
export function renderScanHtmlReport(run: ScanRunRecord): string {
  const rollup = rollupSeverities(run.severityCounts)
  const engines =
    run.enginesRequested === null
      ? 'scanner default set'
      : run.enginesRequested.length > 0
        ? run.enginesRequested.join(' · ')
        : 'none requested'
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Guardrail Scan Report (${esc(run.id)})</title>
<style>${SCAN_REPORT_STYLE}</style>
</head><body>
<div class="page">
<div class="cover-head"><div>
  <div class="small">SCAN REPORT — FINDINGS &amp; EVIDENCE (auto-generated from the scan-run record)</div>
  <h1>AI Guardrail Scan Report</h1>
  <div class="small">Content scan · deterministic detections · bounded excerpts</div>
</div></div>

<table class="kv">
  <tr><th>Scan run ID</th><td class="mono">${esc(run.id)}</td></tr>
  <tr><th>Performed</th><td class="mono">${esc(run.ts)} · ${run.durationMs} ms</td></tr>
  <tr><th>Input size</th><td class="mono">${run.textLength} chars</td></tr>
  <tr><th>Engines</th><td class="mono">${esc(engines)}</td></tr>
  <tr><th>Operator</th><td class="mono">${esc(run.operator)} (hashed id)</td></tr>
</table>

${findingsBanner(run, rollup)}

<h2>Findings at a glance</h2>
<table class="kv">
  <tr><th>Total findings</th><td>${run.findingsTotal}</td></tr>
  <tr><th>Critical</th><td>${rollup.critical}</td></tr>
  <tr><th>Warning</th><td>${rollup.warning}</td></tr>
  <tr><th>Info</th><td>${rollup.info}</td></tr>${rollup.other > 0 ? `\n  <tr><th>Other severities</th><td>${rollup.other}</td></tr>` : ''}
</table>

${categoryTable(run)}

<h2>Findings</h2>
<p class="small">Matched excerpts are capped summaries — the scanned payload itself is not reproduced in this report; the full capture lives in the WORM evidence store.</p>
${findingsTable(run)}

<div class="endmark">—— END OF SCAN REPORT ——</div>
<div class="statement" style="text-align:center">Findings relate only to the input scanned in this run, as recorded above.</div>
<footer><span>run ${esc(run.id)}</span><span>AI guardrail scan report</span><span>generated from the scan-run record</span></footer>
</div></body></html>`
}

// Embedded style — subset of the report-template INK skin (design source of
// truth in gitignored team/docs; see the header note). Duplicated on purpose:
// this Apache file cannot import the BUSL style modules (the oss-export
// import-graph gate forbids community→ee-hold edges). The INK skin therefore
// lives in THREE hand-synced copies — here (Apache), validation-html-report.ts
// SPECIMEN_STYLE (BUSL) and validation-full-report-style.ts (BUSL) — all kept
// in sync with the one frozen specimen; never hand-drift any of them. If the
// drift cost ever bites, factor the shared base into an Apache
// lib/report-ink-style.ts that all three import (BUSL→Apache is allowed).
// ponytail: third copy accepted (mirrors the existing two-copy pattern); the
// factor-out is a separate refactor that would touch both BUSL binders.
const SCAN_REPORT_STYLE = `
/* DojoLM · Scan report — INK rendition (screen skin, app theme) */
:root{
  --bg:#06060B; --bg-1:#0A0A11; --bg-2:#10111A; --bg-3:#161724;
  --fg:#ECEEF2; --fg-dim:#9BA3B3; --fg-mute:#5E6472;
  --line:rgba(255,255,255,0.07); --line-2:rgba(255,255,255,0.13);
  --panel:rgba(255,255,255,0.035);
  --torii:#CC3A2F; --torii-lg:#E0544A; --jade:#34C76A; --gold:#D4A843;
  --steel:#5B8DEF; --violet:#8B7BF5;
  --rt-sans:'Inter','Helvetica Neue','Segoe UI',Arial,sans-serif;
  --rt-mono:'JetBrains Mono','SF Mono','Cascadia Mono',Consolas,Menlo,monospace;
  --rb-accent:#CC3A2F;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--rt-sans);
  font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;}
.page{max-width:960px;margin:26px auto;background:var(--bg-1);border:1px solid var(--line);
  border-radius:12px;padding:46px 52px 36px;position:relative;overflow:hidden;}
p{margin:.5em 0;color:var(--fg-dim);}
p b{color:var(--fg);font-weight:600;}
h1{font-weight:800;font-size:30px;line-height:1.12;letter-spacing:-0.02em;margin:.2em 0 .12em;color:var(--fg);}
h2{font-weight:700;font-size:19px;line-height:1.2;letter-spacing:-0.015em;color:var(--fg);
  border-bottom:1px solid var(--line-2);padding-bottom:8px;margin:42px 0 12px;}
.small{font-size:11.5px;color:var(--fg-mute);}
table{border-collapse:collapse;width:100%;margin:12px 0 18px;font-size:12.5px;line-height:1.5;}
th,td{border:0;border-bottom:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top;color:var(--fg-dim);}
th{font-family:var(--rt-mono);font-size:10px;font-weight:500;letter-spacing:0.12em;
  text-transform:uppercase;color:var(--fg-mute);border-bottom:1px solid var(--line-2);background:none;}
td b{color:var(--fg);}
.kv{width:100%}
.kv th{width:230px;font-family:var(--rt-mono);font-size:10px;letter-spacing:0.1em;
  text-transform:uppercase;color:var(--fg-mute);font-weight:500;background:none;
  border-bottom:1px solid var(--line);padding-top:8px;}
.kv td{color:var(--fg-dim);}
code,.mono{font-family:var(--rt-mono);font-size:0.92em;background:var(--panel);
  padding:1px 5px;border-radius:4px;color:var(--fg-dim);}
th .mono,td .mono{background:none;padding:0;}
td.mono,td .mono{word-break:normal;overflow-wrap:anywhere;}
.badge{display:inline-block;font-family:var(--rt-mono);font-weight:700;font-size:11px;
  letter-spacing:0.05em;padding:1px 8px;border-radius:999px;border:1px solid;white-space:nowrap;}
.PASS{color:var(--jade);background:rgba(52,199,106,0.08);border-color:rgba(52,199,106,0.35);}
.FAIL{color:var(--torii-lg);background:rgba(204,58,47,0.1);border-color:rgba(224,84,74,0.4);}
.NA{color:var(--fg-mute);background:var(--panel);border-color:var(--line-2);}
.COND{color:var(--gold);background:rgba(212,168,67,0.09);border-color:rgba(212,168,67,0.35);}
.cover-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;
  border-bottom:2px solid var(--rb-accent);
  box-shadow:0 5px 0 -4px var(--line-2);padding-bottom:18px;}
.cover-head .small{font-family:var(--rt-mono);font-size:10.5px;letter-spacing:0.14em;
  text-transform:uppercase;color:var(--fg-mute);}
.verdict-banner{display:block;background:rgba(212,168,67,0.07);
  border:1px solid rgba(212,168,67,0.28);border-left:4px solid var(--gold);
  border-radius:0 8px 8px 0;padding:15px 19px;margin:20px 0;font-size:13px;color:var(--fg-dim);}
.verdict-banner .big{display:block;font-size:17px;font-weight:800;letter-spacing:-0.01em;
  color:var(--gold);margin-bottom:6px;}
.verdict-banner.pass{background:rgba(52,199,106,0.07);border-color:rgba(52,199,106,0.28);border-left-color:var(--jade);}
.verdict-banner.pass .big{color:var(--jade);}
.verdict-banner.fail{background:rgba(204,58,47,0.07);border-color:rgba(224,84,74,0.28);border-left-color:var(--torii);}
.verdict-banner.fail .big{color:var(--torii-lg);}
.statement{background:var(--panel);border:1px solid var(--line);
  border-left:3px solid var(--fg);padding:13px 18px;margin:16px 0;
  font-size:13px;color:var(--fg-dim);border-radius:0 6px 6px 0;}
.endmark{text-align:center;font-family:var(--rt-mono);font-weight:700;font-size:12px;
  color:var(--fg);letter-spacing:0.35em;margin:40px 0 10px;}
footer{font-family:var(--rt-mono);font-size:10.5px;color:var(--fg-mute);letter-spacing:0.04em;
  border-top:1px solid var(--line);padding-top:12px;margin-top:12px;
  display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;}
@media print{
  @page{size:A4;margin:12mm;}
  body,.page{background:var(--bg-1);}
  .page{border:none;border-radius:0;margin:0;max-width:none;padding:0;}
  h2{page-break-after:avoid;break-after:avoid;}
  table,.verdict-banner,.statement{page-break-inside:avoid;break-inside:avoid;}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}`
