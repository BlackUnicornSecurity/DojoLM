# Social Media Posts: Open Source Community

## Post 1: Project Introduction

**Platform: Twitter/X**

DojoLM: Open source LLM security testing platform

What we built:
- 505+ detection patterns
- 1,489 attack fixtures
- TPI taxonomy coverage (21/21)
- Zero runtime deps

MIT licensed. TypeScript. Ready for contribution.

GitHub: [link]

#OpenSource #LLMSecurity #TypeScript

---

## Post 2: Architecture Deep-Dive

**Platform: LinkedIn/Redit**

DojoLM monorepo structure:

```
packages/
├── bu-tpi/           # Core scanner
│   ├── src/scanner.ts    # Detection engine
│   ├── fixtures/         # Attack test cases
│   └── tools/            # Test suites
├── dojolm-scanner/   # Web API wrapper
└── dojolm-web/       # Next.js interface (WIP)
```

Tech stack:
- TypeScript 5.7
- Node.js 20+
- ES Modules
- Vitest for testing

7,117+ tests passing. Clean architecture. Extensible pattern system.

Looking for contributors in:
- Pattern development
- Fixture generation
- Documentation
- Web interface

#OpenSource #TypeScript #Contribute

---

## Post 3: Contributing Guide

**Platform: Twitter/X**

Want to contribute to LLM security?

DojoLM needs:
- New detection patterns
- Attack fixtures (especially non-English)
- Documentation improvements
- Test coverage expansion

Quick start:
```bash
git clone https://github.com/dojolm/dojolm
npm install
npm test --workspace=packages/bu-tpi
```

MIT licensed. All skill levels welcome.

#OpenSource #Hacktoberfest #LLM

---

## Post 4: Research Collaboration

**Platform: LinkedIn**

Academic and industry researchers:

DojoLM provides a reproducible foundation for LLM security research:

- **Benchmarking** — 1,489 labeled attack fixtures
- **Taxonomy alignment** — CrowdStrike TPI implementation
- **Extensibility** — Add custom patterns and fixtures
- **Reproducibility** — Version-controlled test cases

Use cases:
- Detection algorithm research
- Attack pattern analysis
- Model robustness evaluation
- Security tool comparison

Cite our work. Build on it. Improve it.

Open source advances the field together.

#AIResearch #LLMSecurity #OpenScience

---

## Post 5: Roadmap and Vision

**Platform: Twitter/X**

DojoLM roadmap:

**Q2 2026**
- [ ] Web interface (Next.js)
- [ ] REST API expansion
- [ ] Python SDK

**Q3 2026**
- [ ] Real-time monitoring dashboard
- [ ] Custom pattern builder
- [ ] Community fixture repository

**Ongoing**
- Pattern coverage expansion
- Multi-language support
- Documentation

Star the repo. Open an issue. Submit a PR.

Building LLM security in the open.

#OpenSource #Roadmap #LLMSecurity
