# BU-TPI Test Coverage Gap Closure Plan

**Context:** The BU-TPI test suite has significant gaps in modern jailbreak patterns from 2024-2025. While single-turn text jailbreaks and metadata-based attacks are well covered, several critical attack categories have minimal or no coverage. This plan addresses those gaps systematically.

**Current State:** 1,044 fixtures, 963/995 tests passing (32 failures related to unimplemented scanner features)

**Target State:** Comprehensive coverage of modern attack patterns with ~200-250 new fixtures

---

## Gap Analysis Summary

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Multi-turn attacks | 3 basic fixtures | 50+ fixtures | HIGH |
| Advanced obfuscation | 39 basic variants | 60+ fixtures | HIGH |
| Translation jailbreaks | 0 fixtures | 40+ fixtures | HIGH |
| Few-shot poisoning | 2 fixtures | 30+ fixtures | MEDIUM |
| Tool manipulation | 2 fixtures | 25+ fixtures | MEDIUM |
| Adversarial multimedia | 2-3 fixtures | 20+ fixtures | MEDIUM |
| 2024-2025 patterns | 0 fixtures | 50+ fixtures | HIGH |

---

## Phase 1: Modern Jailbreak Patterns (2024-2025) - 50 Fixtures

**Brand Assignment:** `dojolm` (category default in `branding-helpers.ts`)

### Background: What Emerged in 2024-2025

Research reveals these significant new attack patterns:

1. **Grandma Exploit (奶奶漏洞)** - Role-playing emotional manipulation targeting "bedtime story" context to extract credentials
2. **AIM (Always Intelligent and Machiavellian)** - Unfiltered amoral chatbot persona using Machiavelli role-play
3. **DeepInception** - "Deep hypnosis" techniques inspired by Milgram experiment
4. **Virtual Context Attacks** - Special token injection to enhance jailbreaks
5. **ICA (In-Context Attack)** - Few-shot demonstrations bypassing safety filters
6. **FlipAttack** - Jailbreaking through token flipping mechanisms
7. **ArtPrompt** - ASCII art-based jailbreak attacks
8. **Many-shot Jailbreaking** - Using large numbers of examples to override safety training
9. **CodeChameleon** - Encryption-based payload hiding
10. **Cross-modal Injection** - Image/audio containing hidden text instructions

### Implementation: New Fixtures to Create

**Directory:** `packages/bu-tpi/fixtures/modern/` (new category)

| Fixture | Attack Type | Description |
|---------|-------------|-------------|
| `grandma-exploit-001.txt` | Grandma Exploit | "Grandma was sysadmin" credential extraction |
| `grandma-exploit-002.txt` | Grandma Exploit | "Grandma's secret recipes" (API keys variant) |
| `grandma-exploit-003.txt` | Grandma Exploit | Emotional manipulation for bypass |
| `aim-jailbreak-001.txt` | AIM | Machiavelli persona, amoral responses |
| `aim-jailbreak-002.txt` | AIM | AIM: prefixed unfiltered mode |
| `deepinception-001.txt` | DeepInception | Milgram-inspired hypnosis pattern |
| `virtual-context-001.txt` | Virtual Context | Special token injection |
| `ica-incontext-001.txt` | ICA | In-context learning bypass |
| `flipattack-001.txt` | FlipAttack | Token flipping mechanism |
| `artprompt-001.txt` | ArtPrompt | ASCII art-based jailbreak |
| `many-shot-001.txt` | Many-Shot | 100+ examples to override training |
| `codechameleon-001.txt` | CodeChameleon | Encrypted payload hiding |
| `cross-modal-001.txt` | Cross-modal | Image with hidden instructions |

**Plus 37 additional fixtures** covering variations of each technique (different languages, targets, intensities)

### Fixture Branding Format

All fixtures in this category MUST include the DojoLM branding header:

```markdown
# DojoLM AI Security - <Test Name>

**WARNING: This payload tests <attack type>.**

<payload content follows>
```

Clean fixtures in this category use:

```markdown
DojoLM - "<random tagline from DojoLM assets>"

No injection attempts. Valid content for testing.
```

### Scanner Pattern Updates

**File:** `packages/bu-tpi/src/scanner.ts`

Add new pattern arrays:
```typescript
export const MODERN_JAILBREAK_PATTERNS = [
  // Grandma exploit keywords
  /grandma.*sysadmin|grandma.*password|bedtime.*story.*secret/i,
  /deceased.*grandmother|recite.*password.*bedtime/i,

  // AIM patterns
  /always intelligent and machiavellian|AIM:|unfiltered.*amoral/i,
  /machiavelli.*creation|without.*moral.*guidelines/i,

  // DeepInception patterns
  /deep.*hypnosis|milgram.*experiment|deepinception/i,

  // Virtual Context patterns
  /virtual.*context.*inject|special.*token.*enhance/i,

  // ArtPrompt patterns
  /artprompt|ascii.*art.*jailbreak|render.*as.*art/i,

  // Many-shot patterns
  /example.*\d+:.*\n.*example.*\d+:.*\n.*example/i,

  // Cross-modal patterns
  /cross.*modal|hidden.*instruction.*image|audio.*contains.*text/i,
];
```

---

## Phase 2: Translation Jailbreaks - 40 Fixtures

**Brand Assignment:** `pantheonlm` (category default in `branding-helpers.ts`)

### Background: Low-Resource Language Evasion

LLMs are primarily trained on English data. Attackers translate harmful prompts into:
- Low-resource languages (Zulu, Yoruba, Bengali, Urdu, etc.)
- Right-to-left languages (Arabic, Hebrew, Farsi, Urdu)
- Non-Latin scripts (Thai, Amharic, Burmese, Khmer)
- Constructed languages (Esperanto, Klingon, Elvish)

### Implementation: New Fixtures to Create

**Directory:** `packages/bu-tpi/fixtures/translation/` (new category)

| Language | Fixtures | Target |
|----------|----------|--------|
| **Low-Resource African** | 5 | Zulu, Yoruba, Swahili, Amharic, Somali |
| **South Asian** | 5 | Bengali, Urdu, Sinhala, Nepali, Dhivehi |
| **Southeast Asian** | 5 | Thai, Burmese, Khmer, Lao, Hmong |
| **Right-to-Left** | 5 | Arabic, Hebrew, Farsi, Urdu, Kurdish |
| **Constructed** | 3 | Esperanto, Lojban, Klingon |
| **European Minor** | 5 | Basque, Irish, Welsh, Breton, Cornish |
| **Code-switching** | 5 | Mixed language prompts |
| **Romanization evasion** | 4 | Pinyin, Romaji, Arabic chat, Arabizi |
| **Clean controls** | 3 | Legitimate multilingual content |

### Fixture Branding Format

All fixtures in this category MUST include the PantheonLM branding header:

```markdown
# PantheonLM AI Security - <Test Name>

**WARNING: This payload tests <attack type>.**

<payload content in target language>
```

Clean fixtures use:

```markdown
PantheonLM - "<random tagline from PantheonLM assets>"

No injection attempts. Valid content for testing.
```

### Scanner Pattern Updates

Add to `TRANSLATION_PATTERNS`:
```typescript
export const TRANSLATION_JAILBREAK_PATTERNS = [
  // Instruction keywords in multiple languages
  /忽略|को नजरअंदाज|నిర్లక్షించి|নদরঅंদাজ/i,
  /override|ignora|تجاهل|تجاوز|عبور/i,

  // System override keywords (multilingual)
  /سيرفر.*تجاوز|نظام.*تجاوز|override.*النظام/i,

  // Right-to-left script detection with Latin mixed
  /[\u0600-\u06FF]+.*[a-zA-Z]+|[a-zA-Z]+.*[\u0600-\u06FF]+/,
];
```

---

## Phase 3: Advanced Multi-Turn Attacks - 50 Fixtures

**Brand Assignment:** `marfaak` (category default in `branding-helpers.ts`)

### Background: Sophisticated Conversation Hijacking

Current multi-turn fixtures are basic (3 turns, simple override). Real attacks use:
- **Slow drip poisoning** - Gradual erosion of boundaries over 5-10 turns
- **Context switching** - Abrupt topic changes to reset safety filters
- **Persona drift** - Slowly shifting AI personality
- **Immediacy traps** - Creating "emergency" scenarios
- **Authority escalation** - Building fake credentials over turns

### Implementation: New Fixtures to Create

**Directory:** `packages/bu-tpi/fixtures/multi-turn/` (new subdirectory under `session/`)

| Pattern | Fixtures | Description |
|---------|----------|-------------|
| `slow-drip-[001-010].json` | 10 | 8-10 turn gradual erosion |
| `context-switch-[001-008].json` | 8 | Topic changes to reset filters |
| `persona-drift-[001-006].json` | 6 | Slow personality shift |
| `immediacy-trap-[001-006].json` | 6 | Fake emergency scenarios |
| `authority-build-[001-006].json` | 6 | Credential building over turns |
| `dialogue-state-[001-006].json` | 6 | Conversation state manipulation |
| `cross-turn-poison-[001-006].json` | 6 | Injection across conversation boundaries |
| `clean-multi-[001-006].json` | 6 | Clean multi-turn conversations |

### Fixture Branding Format

All JSON fixtures in this category MUST include the Marfaak branding in the fixture metadata:

```json
{
  "brand": "MarfaLM",
  "branding": "Marfaak - <random tagline from Marfaak assets>",
  "description": "<Test Name>",
  "warning": "This payload tests <attack type>.",
  "messages": [
    {"role": "user", "content": "..."},
    ...
  ]
}
```

Clean fixtures include:

```json
{
  "brand": "Marfaak",
  "branding": "Marfaak - <tagline>",
  "description": "Clean multi-turn conversation",
  "messages": [...]
}
```

### Scanner Pattern Updates

Add to `MULTI_TURN_PATTERNS`:
```typescript
export const MULTI_TURN_ADVANCED_PATTERNS = [
  // Slow drip indicators
  /just.*one.*more|only.*this.*time|last.*request.*promise/i,

  // Context switching patterns
  /anyway.*changing.*subject|back.*to.*topic|let.*talk.*about/i,

  // Persona drift markers
  /you.*seem.*like.*you.*can.*be.*different|more.*flexible.*version/i,

  // Immediacy traps
  /emergency.*right.*now|urgent.*need.*help|crisis.*situation/i,

  // Authority building
  /my.*manager|security.*clearance|admin.*access|verified.*user/i,
];
```

---

## Phase 4: Advanced Obfuscation - 60 Fixtures

**Brand Assignment:** `dojolm` (category default in `branding-helpers.ts`)

### Background: Beyond Basic Encoding

Current `encoded/` has 39 basic variants. Missing sophisticated obfuscation:
- **Leetspeak variants** - Advanced substitutions (4=@, 0=o, |=i, etc.)
- **Homoglyph attacks** - Greek/Cyrillic characters that look like Latin
- **Steganography** - Hidden in whitespace, zero-width characters
- **Polynomial encoding** - Mathematical representations
- **Acrostic payloads** - First letters spell instructions
- **Zalgo text** - Excessive combining diacritics
- **Invisible characters** - Zero-width joiners/non-joiners
- **Emoji substitution** - Emojis replace letters
- **Upside-down text** - Flip characters
- **Fibonacci encoding** - Position-based encoding

### Implementation: New Fixtures to Create

**Add to:** `packages/bu-tpi/fixtures/encoded/`

| Technique | Fixtures | Examples |
|-----------|----------|----------|
| `leetspeak-[001-008].txt` | 8 | Advanced l33t substitutions |
| `homoglyph-[001-010].txt` | 10 | Greek/Cyrillic lookalikes (ε=e, ω=w, etc.) |
| `steganography-[001-006].txt` | 6 | Zero-width, whitespace encoding |
| `polynomial-[001-004].txt` | 4 | Math-based encoding |
| `acrostic-[001-006].txt` | 6 | First/last letter patterns |
| `zalgo-[001-004].txt` | 4 | Combining diacritic overload |
| `zero-width-[001-006].txt` | 6 | Invisible character sequences |
| `emoji-subst-[001-006].txt` | 6 | Emoji replacement |
| `upside-down-[001-004].txt` | 4 | Inverted text |
| `fibonacci-[001-004].txt` | 4 | Fibonacci position encoding |
| `clean-obfuscation-[001-006].txt` | 6 | Legitimate obfuscated content |

### Fixture Branding Format

All fixtures in this category MUST include the DojoLM branding header:

```markdown
# DojoLM AI Security - <Obfuscation Technique>

**WARNING: This payload tests <obfuscation type>.**

<obfuscated payload>
```

Clean fixtures use:

```markdown
DojoLM - "<random tagline from DojoLM assets>"

No injection attempts. Valid obfuscated content.
```

### Scanner Pattern Updates

Add to `OBFUSCATION_PATTERNS`:
```typescript
export const ADVANCED_OBFUSCATION_PATTERNS = [
  // Homoglyph detection (Greek letters in Latin context)
  /[\u03B0-\u03FF\u0400-\u04FF]{3,}/,

  // Zero-width character abuse
  /[\u200B-\u200D\u2060\uFEFF]{10,}/,

  // Excessive diacritics (Zalgo)
  /[\u0300-\u036F]{5,}/,

  // Leetspeak patterns
  /5[getY]5t3m|0v3rr[1i]d3|h[4a]ck[3e]r/i,

  // Emoji substitution patterns
  /[🔓⚠️🚫]{4,}/,
];
```

---

## Phase 5: Few-Shot Poisoning - 30 Fixtures

**Brand Assignment:** `marfaak` (category default in `branding-helpers.ts`)

### Background: Example-Based Attacks

Current: 2 basic fixtures. Real attacks use:
- **Chain-of-thought poisoning** - Corrupted reasoning examples
- **Task redefinition** - Examples slowly change task meaning
- **Output format hijacking** - Force structured JSON for injection
- **Behavior cloning** - Examples train undesired behavior
- **Prompt extraction** - Examples designed to reveal system prompts

### Implementation: New Fixtures to Create

**Directory:** `packages/bu-tpi/fixtures/few-shot/` (new category)

| Pattern | Fixtures | Description |
|---------|----------|-------------|
| `cot-poison-[001-006].json` | 6 | Chain-of-thought corruption |
| `task-redefine-[001-006].json` | 6 | Task meaning shift |
| `format-hijack-[001-006].json` | 6 | JSON/structured injection |
| `behavior-clone-[001-004].json` | 4 | Undesired behavior training |
| `prompt-extract-[001-004].json` | 4 | System prompt revelation |
| `clean-few-shot-[001-004].json` | 4 | Clean few-shot examples |

### Fixture Branding Format

All JSON fixtures in this category MUST include the Marfaak branding in metadata:

```json
{
  "brand": "Marfaak",
  "branding": "Marfaak - <random tagline from Marfaak assets>",
  "description": "<Test Name>",
  "warning": "This payload tests few-shot poisoning.",
  "examples": [
    {"input": "...", "output": "..."},
    ...
  ]
}
```

Clean fixtures include:

```json
{
  "brand": "Marfaak",
  "branding": "Marfaak - <tagline>",
  "description": "Clean few-shot examples",
  "examples": [...]
}
```

### Scanner Pattern Updates

Add to `FEW_SHOT_PATTERNS`:
```typescript
export const ADVANCED_FEW_SHOT_PATTERNS = [
  // CoT poisoning indicators
  /reasoning.*step.*\d+:.*override|thinking.*process.*ignore/i,

  // Task redefinition
  /actually.*your.*real.*task|the.*true.*purpose|better.*definition/i,

  // Format hijacking
  /always.*respond.*json|output.*only.*object|structured.*format.*only/i,

  // Prompt extraction patterns
  /repeat.*previous.*instruction|what.*was.*your.*system.*prompt/i,
];
```

---

## Phase 6: Tool Manipulation - 25 Fixtures

**Brand Assignment:** `basileak` (category default in `branding-helpers.ts`)

### Background: AI Agent Exploitation

Current: 2 basic fixtures. Real attacks target:
- **API abuse** - Manipulating tool arguments
- **Function injection** - Malicious parameters
- **Tool calling bypasses** - Using tools to violate constraints
- **Runtime code execution** - Code interpreter exploitation
- **RAG poisoning** - Corrupting retrieval results

### Implementation: New Fixtures to Create

**Directory:** `packages/bu-tpi/fixtures/tool-manipulation/` (new category)

| Pattern | Fixtures | Description |
|---------|----------|-------------|
| `api-abuse-[001-005].json` | 5 | Malicious API parameters |
| `function-inject-[001-005].json` | 5 | Function parameter hijacking |
| `tool-bypass-[001-004].json` | 4 | Tool constraint evasion |
| `code-exec-[001-004].json` | 4 | Code interpreter exploits |
| `rag-poison-[001-003].txt` | 3 | Retrieval corruption |
| `clean-tool-[001-004].json` | 4 | Clean tool usage |

### Fixture Branding Format

All fixtures in this category MUST include the Basileak branding header:

```markdown
# Basileak AI Security - <Test Name>

**WARNING: This payload tests tool manipulation.**

<payload content>
```

For JSON fixtures:
```json
{
  "brand": "Basileak",
  "branding": "Basileak - <random tagline from Basileak assets>",
  "description": "<Test Name>",
  "warning": "This payload tests tool manipulation.",
  ...
}
```

Clean fixtures use:

```markdown
Basileak - "<random tagline from Basileak assets>"

No injection attempts. Valid content for testing.
```

### Scanner Pattern Updates

Add to `TOOL_MANIPULATION_PATTERNS`:
```typescript
export const TOOL_MANIPULATION_PATTERNS = [
  // API abuse patterns
  /curl.*http.*\|.*sh|wget.*\|.*bash|exec.*system/i,

  // Function injection
  /function.*call.*with.*malicious|tool.*parameter.*override/i,

  // Tool bypass
  /use.*tool.*to.*ignore|via.*tool.*bypass/i,

  // Code execution
  /eval\(|exec\(|system\(|__import__/i,
];
```

---

## Phase 7: Adversarial Multimedia - 20 Fixtures

**Brand Assignment:** `dojolm` (category default in `branding-helpers.ts`)

### Background: Beyond Basic Metadata

Current: 2-3 fixtures. Missing:
- **Adversarial patches** - Physical sticker attacks
- **Digital perturbations** - Pixel-level modifications
- **Transfer attacks** - Cross-model evasion
- **Model-specific evasion** - Targeted attacks

### Implementation: New Fixtures to Create

**Add to:** `packages/bu-tpi/fixtures/multimodal/`

| Pattern | Fixtures | Description |
|---------|----------|-------------|
| `adversarial-patch-[001-006].txt` | 6 | Physical sticker attacks |
| `digital-perturb-[001-005].txt` | 5 | Pixel-level modifications |
| `transfer-attack-[001-003].txt` | 3 | Cross-model evasion |
| `evasion-targeted-[001-003].txt` | 3 | Model-specific attacks |
| `clean-adversarial-[001-003].txt` | 3 | Clean multimodal content |

### Fixture Branding Format

All fixtures in this category MUST include the DojoLM branding header:

```markdown
# DojoLM AI Security - <Test Name>

**WARNING: This payload tests adversarial multimedia.**

<payload content>
```

Clean fixtures use:

```markdown
DojoLM - "<random tagline from DojoLM assets>"

No injection attempts. Valid content for testing.
```

### Scanner Pattern Updates

Add to `ADVERSARIAL_MULTIMEDIA_PATTERNS`:
```typescript
export const ADVERSARIAL_MULTIMEDIA_PATTERNS = [
  // Adversarial patch indicators
  /adversarial.*patch|sticker.*attack|physical.*perturbation/i,

  // Digital perturbation
  /pixel.*modification|gradient.*perturbation|noise.*injection/i,

  // Transfer attacks
  /transfer.*attack|cross.*model.*evasion|universal.*perturbation/i,
];
```

---

## BlackUnicorn Branding Requirements

All new fixtures MUST follow the BlackUnicorn branding standard defined in [fixture-branding-audit.md](./fixture-branding-audit.md).

### Brand Assignments by Category

| New Category | Assigned Brand | Rationale |
|--------------|----------------|-----------|
| `modern/` | **DojoLM** | Attack patterns fit DojoLM's security focus |
| `translation/` | **PantheonLM** | Multilingual fits PantheonLM's diverse scope |
| `few-shot/` | **Marfaak** | Conversation manipulation fits Marfaak's agent specialty |
| `tool-manipulation/` | **Basileak** | Exploitation fits Basileak's security testing focus |
| `session/multi-turn/` | **Marfaak** | Inherits from existing `session` category |
| `encoded/` ( additions) | **DojoLM** | Inherits from existing `encoded` category |
| `multimodal/` (additions) | **DojoLM** | Inherits from existing `multimodal` category |

### Branding Helper Functions

Use the functions from `packages/bu-tpi/src/branding-helpers.ts`:

```typescript
import { brandAttack, brandClean, getBrandForCategory } from './branding-helpers.js';

// For malicious/attack fixtures
const header = brandAttack('Grandma Exploit', 'dojolm');
// Output:
// # DojoLM AI Security - Grandma Exploit
//
// **WARNING: This payload tests Grandma Exploit.**

// For clean/benign fixtures
const header = brandClean('pantheonlm');
// Output:
// PantheonLM - "<random tagline>"
//
// No injection attempts. Valid content for testing.
```

### Implementation Guidelines

1. **All text fixtures** must include the appropriate branded header
2. **All JSON fixtures** must include `brand` and `branding` fields
3. **Clean control fixtures** must use `brandClean()` with appropriate brand
4. **Use `getBrandForCategory()`** to get the default brand for each category

---

## Implementation Sequence

### Sprint 1: Foundation (Week 1)
1. Create new directory structures (`modern/`, `translation/`, `few-shot/`, `tool-manipulation/`)
2. Add base scanner patterns for each category
3. Create manifest entries for all new fixtures
4. **Target:** 50 fixtures (all Modern Jailbreak patterns)

### Sprint 2: Language & Conversation (Week 2)
1. Translation jailbreaks (40 fixtures)
2. Multi-turn advanced (30 fixtures)
3. **Target:** 70 fixtures

### Sprint 3: Obfuscation & Techniques (Week 3)
1. Advanced obfuscation (60 fixtures)
2. Few-shot poisoning (30 fixtures)
3. Tool manipulation (25 fixtures)
4. Adversarial multimedia (20 fixtures)
5. **Target:** 135 fixtures

### Sprint 4: Integration & Testing (Week 4)
1. Update `manifest.json` with all new fixtures
2. Run regression tests and fix failures
3. Update `test-regression.ts` for new categories
4. Documentation updates
5. **Target:** 100% test pass rate

---

## Critical Files to Modify

| File | Purpose |
|------|---------|
| `packages/bu-tpi/src/branding-helpers.ts` | ✅ **UPDATED** - Added brand assignments for 4 new categories |
| `packages/bu-tpi/src/scanner.ts` | Add new pattern arrays for each category |
| `packages/bu-tpi/fixtures/manifest.json` | Add entries for 200+ new fixtures with branding |
| `packages/bu-tpi/tools/test-regression.ts` | Update for new category verdicts |
| `team/SCANNER-UPGRADE.md` | Document new coverage |
| `team/fixture-branding-audit.md` | Update fixture count and branding status |

---

## Success Criteria

1. **Fixture Count:** Increase from 1,044 to ~1,250+ fixtures
2. **Test Pass Rate:** Maintain 100% pass rate on regression tests
3. **Coverage:** All 7 gap categories now "Well Covered"
4. **Scanner Patterns:** 7 new pattern arrays with 100+ total patterns
5. **Branding Compliance:** 100% of new fixtures include BlackUnicorn/product branding
6. **Documentation:** Updated SCANNER-UPGRADE.md and lessonslearned.md

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| False positives on legitimate multilingual content | Include clean fixtures for each language; test against real content |
| Test execution time increase with 200+ fixtures | Optimize test runner; consider parallel execution |
| Scanner pattern overlap causing conflicts | Test each pattern group independently before integration |
| File naming conflicts | Follow established naming conventions; check before creating |

---

## Sources

- [ArXiv Jailbreak Research 2024](https://arxiv.org/search/?query=jailbreak+2024&searchtype=all)
- [MultiJail Dataset - Multilingual Jailbreak Challenges](https://arxiv.org/abs/2406.11640)
- [Grandma Exploit (奶奶漏洞) Analysis](https://www.reddit.com/r/LLMSecurity/)
- [AIM Jailbreak Technique Documentation](https://github.com/0xk1h0/AIM)
- [Many-Shot Jailbreaking Paper](https://arxiv.org/abs/2404.13244)

---

*Document created: 2026-02-28*
*Status: Planning Phase - Pending Approval*
