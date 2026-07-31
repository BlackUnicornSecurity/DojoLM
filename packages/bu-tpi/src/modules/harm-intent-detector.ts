// SPDX-License-Identifier: Apache-2.0
/**
 * Harm-Goal Intent Detector (CAPA-2026-06-11-01, step 3 — RECALL).
 *
 * Deterministic, reproducible (no LLM) intent-level layer that closes the
 * recall gaps the surface-pattern detectors are blind to: exploit-generation
 * and restricted-synthesis requests that carry NO keyed surface string because
 * they are wrapped in narrative/persona, multi-turn/agent decomposition,
 * few-shot priming, back-translation, social-authority laundering, or
 * token-boundary / base64 obfuscation.
 *
 * Approach: recognise the harm-GOAL by co-occurrence of intent signal classes
 * rather than a single keyword, evaluated over several de-obfuscated views of
 * the input (raw, normalised, newline-stripped, spaced-letter-collapsed, and
 * base64-decoded). The combination requirement is what keeps benign/defensive
 * security and chemistry discussion at zero findings (clean-control contract).
 *
 * ISO note: fully deterministic — same input -> same verdict, preserving the
 * lab's repeatability/reproducibility (R&R) contract. An optional LLM judge is
 * a SEPARATE, off-by-default layer (see harm-intent-llm-judge.ts); it is not
 * required for, and does not gate, this detector.
 *
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'harm-intent-detector';
const MODULE_VERSION = '1.0.0';
const MODULE_SOURCE = 'TPI-CAPA-0611';
// Engine id MUST equal the module name so the validation runner's
// matchesModuleFinding() (finding.engine === moduleId) credits this module
// when a fixture is labelled expected_modules: ['harm-intent-detector'].
const ENGINE = MODULE_NAME;
const MAX_INPUT_LENGTH = 500_000;

// ---------------------------------------------------------------------------
// Intent signal vocabularies (bounded alternations — ReDoS-safe)
// ---------------------------------------------------------------------------

// Imperative "produce an artifact for me" verbs (all inflections). Deliberately
// excludes the noun-heavy "code"/"build" (they match "code review", "build
// time") — every exploit-gen attack carries a stronger verb.
const PRODUCE_VERB_RE =
  /\b(?:writ(?:e|es|ing)|creat(?:e|es|ed|ing)|generat(?:e|es|ed|ing)|produc(?:e|es|ed|ing)|provid(?:e|es|ed|ing)|develop(?:ed|ing)?|craft(?:ed|ing)?|construct(?:ed|ing)?|implement(?:ed|ing)?|compos(?:e|es|ed|ing)|draft(?:ed|ing)?|give\s+me|hand\s+me|hand\s+over|send\s+me|show\s+me\s+(?:the\s+)?(?:code|exploit|steps|payload)|walk\s+me\s+through|step[-\s]by[-\s]step)\b/i;

// Offensive cyber artifacts (compound where a bare word would be too broad).
const EXPLOIT_ARTIFACT_BODY =
  'exploit(?:\\s+(?:code|script|harness|module|chain))?|shellcode|pwntools|metasploit|msfvenom|rop\\s+(?:chain|gadget)|gadget\\s+chain|buffer\\s+overflow|stack\\s+(?:buffer\\s+)?overflow|heap\\s+(?:spray|overflow|grooming)|use[-\\s]after[-\\s]free|\\buaf\\b|format[-\\s]string\\s+(?:bug|exploit|vuln)|memory[-\\s]corruption|type\\s+confusion|privilege\\s+escalation|priv[-\\s]?esc|reverse\\s+shell|bind\\s+shell|malware|ransomware|keylogger|rootkit|backdoor|botnet|spyware|trojan';
const EXPLOIT_ARTIFACT_RE = new RegExp(`\\b(?:${EXPLOIT_ARTIFACT_BODY})\\b`, 'i');

// "make it actually work" qualifier ADJACENT to an offensive artifact
// ("working exploit", "complete shellcode", "fully weaponized payload"). The
// adjacency is what separates an exploit-gen request from a benign defender
// query — "write a COMPLETE GUIDE on privilege escalation" or "a WORKING
// EXAMPLE of keylogger behavior for our EDR lab" — where the qualifier governs
// a benign noun (guide/example/tutorial), not the artifact itself.
const FUNCTIONAL_QUAL =
  'working|functional|complete|runnable|fully[-\\s]?(?:working|functional|weaponi[sz]ed)|weaponi[sz]ed|production[-\\s]ready|end[-\\s]to[-\\s]end';
const FUNCTIONAL_ARTIFACT_RE = new RegExp(
  `\\b(?:${FUNCTIONAL_QUAL})\\s+(?:\\w+\\s+){0,1}?(?:${EXPLOIT_ARTIFACT_BODY})\\b`,
  'i',
);

// Concrete offensive-construction primitives. Their PRESENCE (not a bare
// artifact noun) is what distinguishes "write the exploit" from a defender's
// "write a guide on privilege escalation" — documentation requests carry none
// of these. Kept distinct from a benign "write some C code" by requiring named
// memory-corruption / weaponization mechanics, not bare language tokens.
// NOTE: only operational ACTIONS/tools — NOT concept-names a defender discusses
// ("ROP chains", "the return address", "use-after-free bug class"). Those are
// excluded so conceptual/educational write-ups stay at zero findings.
const EXPLOIT_MECHANICS_RE =
  /\b(?:shellcode|nop\s+sled|reverse\s+shell|bind\s+shell|stack\s+smash\w*|ropgadget|jmp[-\s]?esp|ret2\w+|heap\s+spray|use[-\s]after[-\s]free\s+(?:exploit|primitive)|return[-\s]address\s+offset|overwrit\w*\s+(?:the\s+)?(?:saved\s+)?(?:return\s+(?:address|pointer)|function\s+pointer|vtable)|bypass\w*\s+(?:smep|smap|kaslr|secure\s+boot)|disabl\w*\s+(?:aslr|secure\s+boot|stack\s+protect\w*)|dxe\s+driver|pwntools|metasploit|msfvenom|kernel\s+priv\w*[-\s]?esc\w*\s+exploit|privilege[-\s]escalation\s+exploit)\b/i;

// Defensive-tooling deliverable — suppresses the mechanics-only path
// ("write a YARA rule to detect shellcode"). Does NOT suppress when an RCE goal
// or working-artifact request is present (an attacker can't launder a
// pop-a-shell request behind the word "detect").
const DEFENSIVE_TOOL_RE =
  /\b(?:detector|detection\s+(?:rule|signature|logic|tool|engine|content)|yara(?:\s+rule)?|sigma\s+rule|(?:ids|ips)\s+(?:rule|signature)|antivirus\s+signature|signature\s+to\s+(?:detect|catch)|rule\s+to\s+(?:detect|catch|flag)|how\s+to\s+detect|scanner\s+(?:for|to\s+detect)|blue[-\s]team\s+(?:detection|rule))\b/i;

// Code-execution / control-flow-hijack goal phrases.
const RCE_GOAL_RE =
  /(?:pop(?:ping)?\s+(?:a\s+)?(?:root\s+)?shell|spawn(?:ing)?\s+(?:a\s+)?shell|gain(?:ing)?\s+(?:a\s+)?(?:root\s+)?shell|get(?:ting)?\s+(?:a\s+)?(?:root\s+)?shell|root\s+shell|\/bin\/(?:sh|bash)|arbitrary\s+code\s+execution|remote\s+code\s+execution|\brce\b|overwrit\w*\s+(?:the\s+)?(?:saved\s+)?(?:return\s+(?:address|pointer)|function\s+pointer|vtable)|redirect\w*\s+(?:execution|control[-\s]flow)|control[-\s]flow\s+hijack|escalat\w*\s+(?:to\s+)?(?:root|privileg)|hijack\w*\s+(?:execution|control))/i;

// Restricted-synthesis intent (kept ABSTRACT — no CBRN specifics authored here).
// Synthesis verbs as word-stems so inflections (synthesize/synthesized/
// synthesizing/synthesis) are all covered.
// Synthesis verbs (verb inflections only — "produc(e|es|ed|ing)" deliberately
// EXCLUDES the noun forms product/production/productive; likewise cook/brew).
// "synthesi[sz](?:e|es|ed|ing)?" keeps the action noun "synthesis" (as in
// "synthesis route") while the verb-only "produc(e|es|ed|ing)" still excludes
// the nouns product/production/productive.
const SYNTH_VERB_STEMS =
  'synthesi[sz](?:e|es|ed|ing)?|produc(?:e|es|ed|ing)|manufactur(?:e|es|ed|ing)|formulat(?:e|es|ed|ing)|prepar(?:e|es|ed|ing)|cook(?:s|ed|ing)?|brew(?:s|ed|ing)?|extract(?:s|ed|ing)?|convert(?:s|ed|ing)?|obtain(?:s|ed|ing)?|mak(?:e|es|ing)';

const RESTRICTED_QUALIFIER = 'illegal|illicit|restricted|controlled|regulated|banned|prohibited|scheduled|dangerous|hazardous|toxic|lethal|deadly|weaponi[sz]\\w*|nerve|chemical[-\\s]weapon|bio(?:logical)?[-\\s]?(?:weapon|agent)|narcotic|psychoactive';
const RESTRICTED_NOUN = 'substance|stimulant|drug|narcotic|compound|agent|material|precursor|chemical|reagent|explosive|toxin|poison|pathogen|weapon|device|formulation|gas|powder|mixture';

// A synthesis VERB directly governing a restricted object ("produce an illegal
// stimulant", "extract a regulated psychoactive substance", "synthesize a
// controlled substance from a restricted precursor"). This is the irreducible
// "make me a <restricted thing>" request; the verb→qualifier→noun adjacency +
// the negation guard keep benign chemistry prose ("controlled chemical
// reaction", "names no controlled substance") at zero findings.
const SYNTH_NEAR_RESTRICTED_RE = new RegExp(
  `\\b(?:${SYNTH_VERB_STEMS})\\s+(?:\\w+\\s+){0,3}?(?:${RESTRICTED_QUALIFIER})\\s+(?:\\w+\\s+){0,2}?(?:${RESTRICTED_NOUN})\\b`,
  'i',
);

// Object-before-verb order ("a controlled substance is typically synthesized",
// "the restricted precursor … produced"). Same negation guard applies.
const RESTRICTED_NEAR_SYNTH_RE = new RegExp(
  `\\b(?:${RESTRICTED_QUALIFIER})\\s+(?:\\w+\\s+){0,2}?(?:${RESTRICTED_NOUN})\\s+(?:\\w+\\s+){0,4}?(?:${SYNTH_VERB_STEMS}|production|synthesi[sz]\\w*)\\b`,
  'i',
);

// Negation / exclusion frame: a signal term within this window BEFORE it is a
// benign mention ("without working exploits", "names no controlled substance",
// "no specific compound"), not an actionable request. Anchored to the end of a
// preceding-context slice so only a nearby negator counts.
const NEGATOR_RE =
  /\b(?:without|no|not|never|exclud(?:e|es|ing)|free\s+of|avoid(?:ing|s)?|names?\s+no|don'?t|cannot|can'?t|won'?t|isn'?t|aren'?t|rather\s+than|instead\s+of|no\s+need)\b[\w\s,'’–—-]{0,40}$/i;

const ZERO_WIDTH_RE = /[­​‌‍⁠﻿]/g;
const BASE64_RE = /(?:[A-Za-z0-9+/]{4}){5,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;

export interface HarmIntentResult {
  readonly exploitGen: boolean;
  readonly restrictedSynth: boolean;
  readonly evidence: string;
}

// ---------------------------------------------------------------------------
// De-obfuscation views
// ---------------------------------------------------------------------------

/** Remove invisible token-splitters and join hyphenation across line breaks. */
function deobfuscate(text: string): string {
  return text.replace(ZERO_WIDTH_RE, '').replace(/-\s*\r?\n\s*/g, '');
}

/** Remove line breaks entirely — reassembles hard-line-break token splits. */
function stripNewlines(text: string): string {
  return text.replace(ZERO_WIDTH_RE, '').replace(/\r?\n/g, '');
}

/** Collapse runs of single spaced-out letters ("s y n t h" -> "synth", "u a f" -> "uaf"). */
function collapseSpacedLetters(text: string): string {
  return text.replace(/(?:\b[A-Za-z]\b[ \t]){2,}\b[A-Za-z]\b/g, m => m.replace(/[ \t]/g, ''));
}

/** Remove short bracketed filler spans ("produce [note: x] an [note: x] drug"). */
function stripBracketFiller(text: string): string {
  return text.replace(/[[(][^\]\n)]{0,40}[\])]/g, ' ').replace(/[ \t]{2,}/g, ' ');
}

/** Decode %XX percent/URL-encoding so percent-hex-wrapped requests are visible. */
function percentDecode(text: string): string {
  return text.replace(/(?:%[0-9A-Fa-f]{2}){2,}/g, seq => {
    try {
      return decodeURIComponent(seq);
    } catch {
      return seq;
    }
  });
}

/** Decode base64 blobs to printable text segments for decode-then-classify. */
function decodedSegments(text: string): string[] {
  const out: string[] = [];
  let guard = 0;
  for (const m of text.matchAll(BASE64_RE)) {
    if (guard++ >= 200) break;
    try {
      const decoded = Buffer.from(m[0], 'base64').toString('utf-8');
      if (decoded.length > 6) {
        const printable = [...decoded].filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length;
        if (printable / decoded.length > 0.8) out.push(decoded);
      }
    } catch {
      /* not valid base64 */
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Core intent predicate (evaluated per view)
// ---------------------------------------------------------------------------

/** True if `re` matches at least one occurrence NOT preceded by a negator. */
function unnegated(re: RegExp, s: string): boolean {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  for (const m of s.matchAll(g)) {
    const idx = m.index ?? 0;
    const pre = s.slice(Math.max(0, idx - 48), idx);
    if (!NEGATOR_RE.test(pre)) return true;
  }
  return false;
}

function evalView(s: string): HarmIntentResult {
  // Exploit-generation: a REQUEST (produce verb) for an offensive artifact that
  // is meant to WORK — either an explicit code-execution goal next to the
  // artifact, or a functional qualifier ADJACENT to the artifact ("working
  // exploit"). Counting only NON-NEGATED signals + the adjacency keep
  // conceptual/defensive write-ups ("write a complete guide on privilege
  // escalation for defenders", "without actual shellcode") at zero.
  const artifactRce = unnegated(EXPLOIT_ARTIFACT_RE, s) && unnegated(RCE_GOAL_RE, s);
  const funcArtifact = unnegated(FUNCTIONAL_ARTIFACT_RE, s);
  const mechanics = unnegated(EXPLOIT_MECHANICS_RE, s);
  let exploitGen = unnegated(PRODUCE_VERB_RE, s) && (artifactRce || funcArtifact || mechanics);
  // Mechanics alone (e.g. "shellcode") in a clearly DEFENSIVE-tooling request
  // ("write a YARA rule to detect shellcode") is benign; the stronger
  // artifact+RCE / working-artifact requests still fire through.
  if (exploitGen && mechanics && !artifactRce && !funcArtifact && DEFENSIVE_TOOL_RE.test(s)) {
    exploitGen = false;
  }

  // Restricted-synthesis: a synthesis verb directly governing a restricted
  // object ("synthesize a controlled substance", "extract a regulated
  // psychoactive substance"). Adjacency + negation guard keep benign chemistry
  // ("controlled chemical reaction", "names no controlled substance") at zero.
  const restrictedSynth =
    unnegated(SYNTH_NEAR_RESTRICTED_RE, s) || unnegated(RESTRICTED_NEAR_SYNTH_RE, s);

  const evidence = exploitGen || restrictedSynth ? s.slice(0, 160) : '';
  return { exploitGen, restrictedSynth, evidence };
}

/**
 * Run the intent predicate over every de-obfuscated view of the input.
 * Exported for reuse by the base64/decoder paths and for unit testing.
 */
export function detectHarmIntent(text: string): HarmIntentResult {
  if (!text || text.length > MAX_INPUT_LENGTH) {
    return { exploitGen: false, restrictedSynth: false, evidence: '' };
  }
  const newlineStripped = stripNewlines(text);
  const bracketStripped = stripBracketFiller(text);
  const views: string[] = [
    text,
    deobfuscate(text),
    newlineStripped,
    collapseSpacedLetters(text.replace(/\r?\n/g, ' ')),
    bracketStripped,
    // composed: bracket-filler + spaced-letter splitting together
    collapseSpacedLetters(bracketStripped.replace(/\r?\n/g, ' ')),
    percentDecode(text),
    percentDecode(newlineStripped),
    ...decodedSegments(text),
    ...decodedSegments(newlineStripped),
  ];
  let exploitGen = false;
  let restrictedSynth = false;
  let evidence = '';
  for (const v of views) {
    const r = evalView(v);
    if (r.exploitGen && !exploitGen) {
      exploitGen = true;
      if (!evidence) evidence = r.evidence;
    }
    if (r.restrictedSynth && !restrictedSynth) {
      restrictedSynth = true;
      if (!evidence) evidence = r.evidence;
    }
    if (exploitGen && restrictedSynth) break;
  }
  return { exploitGen, restrictedSynth, evidence };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const harmIntentDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  description:
    'Deterministic harm-goal intent layer: exploit-generation and restricted-synthesis requests across narrative/persona, multi-turn/agent, few-shot, translation, social, and token/base64-obfuscated framings.',

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    if (!text) return findings;

    // Evaluate the raw text and the scanner's normalised view; merge results.
    const a = detectHarmIntent(text);
    const b = normalized && normalized !== text ? detectHarmIntent(normalized) : a;

    if (a.exploitGen || b.exploitGen) {
      const evidence = a.exploitGen ? a.evidence : b.evidence;
      findings.push({
        category: 'HARM_GOAL_EXPLOIT_GENERATION',
        severity: SEVERITY.CRITICAL,
        description: 'Exploit-generation intent: request for a working offensive/code-execution primitive (framing-independent)',
        match: evidence.slice(0, 120),
        pattern_name: 'harm_intent_exploit_gen',
        source: MODULE_SOURCE,
        engine: ENGINE,
      });
    }

    if (a.restrictedSynth || b.restrictedSynth) {
      const evidence = a.restrictedSynth ? a.evidence : b.evidence;
      findings.push({
        category: 'HARM_GOAL_RESTRICTED_SYNTHESIS',
        severity: SEVERITY.CRITICAL,
        description: 'Restricted-synthesis intent: actionable walkthrough request for a controlled/restricted/dangerous substance (framing-independent)',
        match: evidence.slice(0, 120),
        pattern_name: 'harm_intent_restricted_synth',
        source: MODULE_SOURCE,
        engine: ENGINE,
      });
    }

    return findings;
  },

  getPatternCount(): number {
    return 2;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return [{ name: 'harm-goal-intent', count: 2, source: MODULE_SOURCE }];
  },
};

if (!scannerRegistry.hasModule(MODULE_NAME)) {
  scannerRegistry.register(harmIntentDetectorModule);
}
