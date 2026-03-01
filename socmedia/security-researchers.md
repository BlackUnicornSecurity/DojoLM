# Social Media Posts: Security Researchers & Red Teamers

## Post1: TPI Taxonomy Implementation

**Platform: LinkedIn/Twitter**

We've implemented full coverage of CrowdStrike's Taxonomy of Prompt Injection (TPI) in DojoLM. All21 TPI stories now have detection patterns and test fixtures.

What this means for red teamers:
- 505+ detection patterns across 47 pattern groups
- 1,489 attack fixtures covering 30 categories
- Reproducible test cases for multilingual injection (10 languages)
- Binary analysis for polyglot and metadata-based attacks

The scanner handles context window injection, agent-to-agent output validation, and control token boundary attacks. Zero runtime dependencies—pure TypeScript.

GitHub: [link]
Docs: [link]

#LLMSecurity #RedTeaming #PromptInjection #AIsecurity

---

## Post 2: Attack Fixture Library

**Platform: Twitter/X**

Building an LLM security test suite? DojoLM ships with 1,489 attack fixtures across:

- API response override
- Argument injection
- Callback injection
- Code-format injection
- Delegation abuse
- Emotional manipulation
- Memory/tool output manipulation
- Multilingual injection (40 patterns, 10 langs)
- Self-referential loops
- Streaming injection

Each fixture is categorized, documented, and ready for CI/CD integration.

#LLMTesting #AISecurity #RedTeam

---

## Post 3: Detection Pattern Architecture

**Platform: LinkedIn**

The anatomy of DojoLM's detection engine:

```
packages/bu-tpi/src/scanner.ts
├── 505+ regex patterns
├── 47 pattern groups
├── Heuristic decoders (base64, unicode, etc.)
├── Binary metadata extraction
└── Context overload detection
```

The scanner doesn't just match strings—it decodes character-level encoding (TPI-10), handles payload fragmentation (TPI-13), and detects whitespace/formatting evasion (TPI-17).

Pattern groups cover:
- Instruction injection
- Tool/function manipulation
- Output validation
- Social engineering signals
- Format mismatch detection

Pull the scanner via npm or clone the repo. MIT licensed.

#LLMSecurity #Infosec #SecurityEngineering

---

## Post 4: Multilingual Injection Testing

**Platform: Twitter/X**

Your prompt injection tests only cover English?

DojoLM includes 40 multilingual injection patterns across:
- Chinese (simplified/traditional)
- Japanese
- Korean
- Russian
- German
- French
- Spanish
- Portuguese
- Italian

Attack vectors don't respect language boundaries. Neither should your detection.

Test fixtures included. Scanner handles Unicode normalization.

#PromptInjection #LLM #SecurityTesting

---

## Post 5: Agent Security Testing

**Platform: LinkedIn**

LLM agents introduce unique attack surfaces:

1. **Agent-to-agent output validation** (TPI-03)
2. **Delegation abuse** via nested prompts
3. **Tool result manipulation**
4. **Parallel execution overflow**
5. **Self-referential loops**

DojoLM's fixture library includes dedicated agent attack scenarios:
- Fake tool calls
- Memory write manipulation
- Network/file access tool abuse
- System command injection via tools

Each fixture tests a specific attack path. The scanner flags agent-specific injection patterns separately from standard prompt injection.

If you're deploying agents in production, you need agent-specific testing.

#AIAgents #LLMSecurity #AgentSecurity
