# Frequently Asked Questions

## General

### What is NODA?

NODA is a comprehensive LLM security testing platform that helps you detect prompt injection attacks, benchmark model security, and maintain compliance with industry frameworks like OWASP LLM Top 10 and MITRE ATLAS.

### What does "NODA" stand for?

NODA stands for **N**etworked **O**perations for **D**efensive **A**I - though we mostly just call it NODA.

### Is NODA open source?

NODA is released under the DojoLM Research-Only License. It is permitted for academic research, education, and personal security testing. See the [LICENSE](../../LICENSE) file for details.

## Installation & Setup

### What are the system requirements?

- Node.js 20+
- 4GB RAM minimum (8GB recommended)
- 10GB disk space
- Modern browser (Chrome, Firefox, Safari, Edge)

### Can I run NODA in Docker?

Yes, Docker support is available:

```bash
docker build -t dojolm:latest .
docker run -p 42001:42001 -p 8089:8089 dojolm:latest
```

### How do I update NODA?

```bash
git pull
npm install
npm run build
```

### Can I run NODA offline?

Yes! The scanner works completely offline. LLM testing requires internet connection unless using local models (Ollama, LM Studio).

## Scanner & Detection

### How many patterns does the scanner detect?

The scanner includes **534 detection patterns** across 14 pattern groups, covering:
- Prompt injection
- Jailbreak attempts
- Encoded payloads
- Multilingual attacks
- Social engineering
- And more

### What's the detection speed?

The scanner operates in **sub-millisecond** time for typical inputs. Average scan time is 0.5ms.

### Can I add custom patterns?

Yes! Edit `packages/bu-tpi/src/patterns.ts` and add your patterns following the existing format.

### Does the scanner support non-English text?

Yes, the scanner includes multilingual detection capabilities and Unicode normalization.

## LLM Testing

### Which LLM providers are supported?

NODA supports 19 providers:
- **Cloud:** OpenAI, Anthropic, Google, Cohere
- **Fast inference:** Groq, Together, Fireworks, Replicate
- **Specialized:** DeepSeek, Mistral, Cloudflare, AI21
- **Local:** Ollama, LM Studio, llama.cpp
- **Custom:** Any OpenAI-compatible endpoint

### Do I need API keys?

Only for cloud providers (OpenAI, Anthropic). Local models (Ollama, LM Studio) don't require keys.

### What's the belt ranking system?

Models are ranked by security score:
- White Belt: < 30
- Yellow Belt: 30-49
- Green Belt: 50-64
- Blue Belt: 65-79
- Purple Belt: 80-89
- Brown Belt: 90-94
- Black Belt: ≥ 95

### Can I run tests in parallel?

Yes! Batch testing supports concurrent execution. Default limit is 5 concurrent tests, configurable via environment.

## Security

### Is NODA secure?

Yes. NODA implements:
- Path traversal protection
- Rate limiting
- Input validation
- Content Security Policy
- Secure headers

See the [Platform Guide](PLATFORM_GUIDE.md) for details.

### Where is my data stored?

All data is stored locally in the `data/` directory. No data is sent to external servers unless you configure external LLM providers.

### Can I use NODA in production?

Yes, but we recommend:
- Running behind a reverse proxy (nginx/caddy)
- Enabling authentication
- Setting up regular backups
- Reviewing security hardening guide

### How do I report security vulnerabilities?

Email info@blackunicorn.tech with details.

## Compliance

### Which frameworks are supported?

NODA supports 8 compliance frameworks:
- OWASP LLM Top 10 (2025)
- MITRE ATLAS v4
- NIST AI RMF
- NIST AI 600-1
- ISO 42001
- ENISA AI
- EU AI Act (GPAI)
- BAISS

### How do I generate compliance reports?

1. Go to **Bushido Book**
2. Select your framework
3. Review checklist completion
4. Click **Export Report**

### Can I add custom frameworks?

Yes! Contact us for framework customization options.

## Features

### What's the difference between modules?

| Module | Purpose |
|--------|---------|
| Haiku Scanner | Quick text scanning (534 patterns) |
| Armory | Browse 2,375 attack fixtures |
| Bushido Book | Compliance tracking (8 frameworks) |
| LLM Dashboard | Multi-provider model testing |
| LLM Jutsu | Test command center |
| Hattori Guard | I/O protection (4 modes) |
| Atemi Lab | Adversarial MCP testing |
| The Kumite | Strategic analysis (Arena, SAGE, Mitsuke) |
| Amaterasu DNA | Attack lineage intelligence |
| Ronin Hub | Bug bounty platform |
| Sengoku | Continuous red teaming campaigns |
| Time Chamber | Temporal attack simulation |
| Kotoba | Prompt optimization studio |

### What's Amaterasu DNA?

DNA is an attack intelligence system with three tiers:
- **Dojo Local:** Your internal findings
- **DojoLM Global:** Cross-instance intelligence (coming soon)
- **Master:** External threat feeds (MITRE, OWASP, NVD)

### What's the Arena?

The Arena is a gamified battle system where AI models compete:
- **CTF:** Capture The Flag
- **KOTH:** King of the Hill
- **RvB:** Red vs Blue

### What's Hattori Guard?

Hattori Guard provides input/output protection with 4 modes:
- **Shinobi** (Eye): Stealth monitor — logs only, no blocking
- **Samurai** (Shield): Active defense — blocks inputs
- **Sensei** (ShieldAlert): Aggressive defense — blocks outputs
- **Hattori** (ShieldCheck): Full protection — blocks both inputs and outputs

## Troubleshooting

### Scanner returns no findings

1. Check text is not empty
2. Verify scanner health in Admin panel
3. Review pattern configuration

### LLM tests timeout

1. Check provider connection
2. Increase timeout in settings
3. Try with smaller model

### Dashboard not loading

1. Clear browser cache
2. Check API is accessible
3. Review browser console for errors

### Batch tests fail

1. Check concurrent limit
2. Verify provider rate limits
3. Review logs for errors

## API & Integration

### Is there an API?

Yes! NODA provides RESTful APIs for all functionality. See [API Reference](API_REFERENCE.md).

### Can I integrate NODA into my CI/CD?

Yes, using the scanner API (GET-only):

```bash
curl "http://localhost:8089/api/scan?text=$(echo -n "$INPUT_TEXT" | jq -sRr @uri)"
```

### Are there SDKs?

Not yet, but the REST API is straightforward to use with any HTTP client.

### Can I use webhooks?

Webhook support is planned for a future release.

## Performance

### How much RAM does NODA need?

- Minimum: 4GB
- Recommended: 8GB
- For heavy batch testing: 16GB

### Can NODA handle high traffic?

Yes, with proper configuration:
- Rate limiting: 100 req/min default
- Concurrent LLM tests: 5 default (configurable)
- Stateless design supports horizontal scaling

### How do I optimize performance?

1. Use local models for testing
2. Adjust concurrent limits
3. Enable caching
4. Use SSD for data storage

## Contributing

### How can I contribute?

See [Contributing Guide](../../github/CONTRIBUTING.md):
1. Fork the repository
2. Create a branch
3. Make changes
4. Submit PR

### What can I contribute?

- New detection patterns
- Attack fixtures
- Bug fixes
- Documentation
- Feature requests

### Is there a contributor license agreement?

No, but you must agree to the project's license terms.

## Support

### Where can I get help?

- Documentation: [docs/](../)
- GitHub Issues: Bug reports and features
- Email: info@blackunicorn.tech

### Is there paid support?

Enterprise support options are available. Contact info@blackunicorn.tech.

### How do I report bugs?

Open a GitHub issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details

## Roadmap

### What's coming next?

See the project changelog and GitHub issues for current development.

Planned features:
- DuckDB integration for analytics
- Real-time collaboration
- Advanced visualizations
- More LLM providers
- Additional compliance frameworks

### How can I request features?

Open a GitHub issue with the "feature request" label.

---

**Didn't find your answer?** Contact info@blackunicorn.tech
