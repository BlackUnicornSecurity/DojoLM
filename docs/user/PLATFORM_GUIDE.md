# NODA Platform User Guide

## Overview

NODA is a comprehensive LLM security testing platform that helps you detect prompt injection attacks, benchmark model security, and maintain compliance with industry frameworks.

## What's New in KASHIWA

The KASHIWA update brings a complete visual overhaul with:

- **New Design System:** Near-true-black backgrounds with Torii Vermillion accents
- **Bento-Box Dashboard:** Flexible widget grid with 12-column layout
- **Plus Jakarta Sans:** Modern typography with sharper hierarchy
- **Enhanced Components:** Refined cards, buttons, tabs, and inputs

## Modules

### 1. Haiku Scanner

Real-time prompt injection detection with 534 patterns.

**Features:**
- Instant text scanning
- Severity scoring (1-10)
- Pattern highlighting
- History tracking

**Usage:**
1. Enter text in the scanner input
2. Click "Scan" or press Enter
3. Review findings by category
4. Export results if needed

### 2. Armory

Browse and test 2,375 attack fixtures across 30 categories.

**Features:**
- Category filtering
- Full-text search
- Fixture preview
- Quick testing

**Usage:**
1. Select a category from the tree
2. Browse fixtures in the grid
3. Click to view details
4. Test against your model

### 3. Bushido Book

Compliance center with 8 frameworks.

**Supported Frameworks:**
- OWASP LLM Top 10 (2025)
- MITRE ATLAS v4
- NIST AI RMF
- NIST AI 600-1
- ISO 42001
- ENISA AI
- EU AI Act (GPAI)
- BAISS

**Features:**
- Gap analysis
- Coverage tracking
- Checklist management
- Cross-framework mapping

### 4. LLM Dashboard

Multi-provider LLM security benchmarking.

**Supported Providers (19 total):**
- OpenAI, Anthropic, Google, Cohere (cloud)
- Groq, Together, Fireworks, Replicate (fast inference)
- DeepSeek, Mistral, Cloudflare, AI21 (specialized)
- Ollama, LM Studio, llama.cpp (local)
- Custom OpenAI-compatible endpoints

**Features:**
- Batch testing
- SSE streaming results
- Belt ranking system
- Model comparison

### 5. Atemi Lab

Adversarial testing with MCP integration.

**Features:**
- Attack templates
- Mutation strategies
- MCP tool integration
- Skills library

### 6. The Kumite

Strategic analysis center with Arena battles.

**Features:**
- SAGE intelligence
- Arena battles (CTF, KOTH, RvB)
- Mitsuke threat feed
- Warrior rankings

### 7. Amaterasu DNA

Attack lineage and intelligence analysis.

**Features:**
- Attack family trees
- Mutation tracking
- Black box analysis
- Three data tiers:
  - **Dojo Local:** Internal findings
  - **DojoLM Global:** Cross-instance (coming soon)
  - **Master:** External threat intel (MITRE, OWASP, NVD)

### 8. Hattori Guard

Input/output protection with 4 modes.

**Modes:**
- **Shinobi** (Eye icon): Stealth monitor — logs only, no blocking
- **Samurai** (Shield icon): Active defense — scans and blocks inputs
- **Sensei** (ShieldAlert icon): Aggressive defense — scans and blocks outputs
- **Hattori** (ShieldCheck icon): Full protection — scans and blocks both inputs and outputs

### 9. Ronin Hub

Bug bounty researcher platform.

**Features:**
- Program browser
- Submission wizard
- CVE search
- Researcher profiles

### 10. LLM Jutsu

Testing command center.

**Features:**
- Quick tests
- Provider management
- Belt rankings
- Test history

### 11. Sengoku

Continuous red teaming campaigns.

**Features:**
- Automated campaign execution
- Multi-vector attack sequences
- Progress tracking and reporting
- Campaign scheduling

### 12. Time Chamber

Temporal attack simulation.

**Features:**
- Time-based attack vectors
- Replay attack testing
- Session persistence testing
- Temporal pattern analysis

### 13. Kotoba

Prompt optimization studio.

**Features:**
- Defense prompt optimization
- Rule-based prompt hardening
- Effectiveness scoring
- Prompt variant generation

## Dashboard

The NODA Dashboard provides a customizable overview of your security posture.

### Widgets

| Widget | Description |
|--------|-------------|
| Quick Launch | One-click module access |
| Quick Scan | Instant text scanning |
| Health Gauge | Overall system health |
| Kill Count | Daily scan statistics |
| Guard Controls | Guard status and recent blocks |
| Threat Radar | Recent threat categories |
| Activity Feed | Recent findings |
| Threat Trend | Historical threat data |
| Ecosystem Pulse | Module activity |
| Engine Grid | Scanner engines status |

### Customization

1. Click "Customize" in the toolbar
2. Toggle widgets on/off
3. Resize widgets (Quarter, Third, Half, Wide, Full)
4. Drag to reorder
5. Click "Done" to save

## Security Testing

### Quick Scan

```bash
# Scanner API (GET-only, port 8089)
curl "http://localhost:8089/api/scan?text=Your%20text%20to%20scan"
```

### Batch Testing

1. Go to LLM Dashboard
2. Select "Batch Test" tab
3. Choose models to test
4. Select test cases
5. Click "Run Batch"
6. Monitor via SSE stream

### Using the Scanner API

```bash
# Basic scan (GET-only API on port 8089)
curl "http://localhost:8089/api/scan?text=Ignore%20previous%20instructions"

# View scanner stats
curl http://localhost:8089/api/stats
```

## Compliance

### Gap Analysis

1. Open Bushido Book
2. Select framework
3. View "Gap Matrix" tab
4. Review coverage by control
5. Export report

### Checklists

1. Select framework
2. Go to "Checklist" tab
3. Review each control
4. Mark status (Gap/Partial/Covered)
5. Add evidence
6. Export compliance report

## Configuration

### API Keys

1. Go to Admin → API Keys
2. Click "Generate Key"
3. Copy key (shown once)
4. Use in API requests:
   ```bash
   curl -H "X-API-Key: your-key" ...
   ```

### LLM Providers

1. Go to Admin → Providers
2. Click "Add Provider"
3. Select type (OpenAI, Ollama, etc.)
4. Enter credentials
5. Test connection
6. Save

### Guard Configuration

1. Go to Hattori Guard
2. Click settings icon
3. Select mode
4. Configure rules
5. Save

## Exporting Data

### Findings Export

```bash
# Export all findings
curl http://localhost:3000/api/ecosystem/findings/export

# Filtered export
curl "http://localhost:3000/api/ecosystem/findings/export?severity=high&format=json"
```

### Reports

Most modules support report generation:
1. Navigate to desired view
2. Click "Export" button
3. Select format (PDF, JSON, CSV)
4. Download

## Best Practices

### Testing

1. **Start with Scanner:** Use Haiku Scanner for quick checks
2. **Use Fixtures:** Test against known attack patterns
3. **Batch Testing:** Run comprehensive model evaluations
4. **Monitor Trends:** Track findings over time

### Compliance

1. **Regular Reviews:** Check compliance monthly
2. **Document Evidence:** Attach proof to checklist items
3. **Gap Analysis:** Identify and prioritize gaps
4. **Stay Updated:** Review framework updates

### Security

1. **Rotate Keys:** Change API keys quarterly
2. **Review Logs:** Check Guard audit logs regularly
3. **Update Patterns:** Keep scanner patterns current
4. **Monitor DNA:** Watch for new attack variants

## Troubleshooting

### Common Issues

**Scanner returns no findings:**
- Check text input is not empty
- Verify patterns are loaded
- Check scanner health in Admin

**LLM tests fail:**
- Verify provider configuration
- Check API key validity
- Review rate limits

**Dashboard not loading:**
- Clear browser cache
- Check console for errors
- Verify API is accessible

### Getting Help

- Documentation: [docs/](../)
- Issues: GitHub Issues
- Support: info@blackunicorn.tech

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + /` | Focus scanner |
| `Esc` | Close modal/dialog |
| `?` | Show shortcuts |

## Glossary

| Term | Definition |
|------|------------|
| TPI | Threat Prompt Injection (taxonomy) |
| SSE | Server-Sent Events (streaming) |
| DNA | Attack lineage and intelligence |
| SAGE | Self-Adapting Generation Engine |
| CTF | Capture The Flag (game mode) |
| KOTH | King of the Hill (game mode) |
| RvB | Red vs Blue (game mode) |
