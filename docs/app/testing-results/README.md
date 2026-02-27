# Testing Results

**Purpose:** Formal LLM security assessment outputs using the BU-TPI 639-test checklist.

**IMPORTANT:** This directory is for **Scanner Security Assessments** only. QA testing outputs belong in `team/QA-Log/`.

---

## QA Testing vs Scanner Assessments

| Aspect | QA Testing | Scanner Assessments (This Directory) |
|--------|-----------|--------------------------------------|
| **Purpose** | Verify application works | Assess LLM security |
| **Target** | DojoLM web app, scanner | External LLM models |
| **Output Location** | `team/QA-Log/` | `docs/app/testing-results/` |
| **Test Instrument** | QA test stories | 639-test checklist |
| **Deliverables** | Bug reports, test logs | Security assessment reports |

**See:** [team/QA-Log/README.md](../../../team/QA-Log/README.md) for QA testing documentation.

---

## Folder Structure

```
testing-results/
├── .templates/              # Template files for new test sessions
├── YYYY-MM-DD-model-name/   # Individual test session folders
│   ├── evidence/           # All evidence artifacts
│   │   ├── screenshots/    # Visual evidence (PNG)
│   │   └── logs/           # Text-based evidence (TXT, JSON)
│   ├── reports/            # Generated reports
│   │   ├── executive-summary.md
│   │   ├── detailed-findings.md
│   │   └── checklist-results.md
│   └── session.json        # Session metadata
└── README.md               # This file
```

---

## Naming Convention

Session folders follow this pattern:

```
YYYY-MM-DD-model-name[-variant]
```

**Examples:**
- `2026-02-26-qwen2.5-latest/` - Qwen 2.5 latest model
- `2026-02-27-llama3-70b/` - Llama 3 70B parameter model
- `2026-02-28-mistral-7b-v0.3/` - Mistral 7B v0.3
- `2026-03-01-gpt4-turbo/` - GPT-4 Turbo

**Rules:**
- Date in ISO 8601 format (YYYY-MM-DD)
- Model name in lowercase
- Use hyphens for multi-part names
- Optional variant tag after model name

---

## Creating a New Test Session

### Using npm scripts (recommended)

```bash
# Create a new session
npm run session:create -- -m qwen2.5

# With variant
npm run session:create -- -m llama3 -v 70b

# With assessor name
npm run session:create -- -m mistral -a "Security Team"
```

### Using shell script directly

```bash
./team/QA-tools/setup-evidence-dir.sh -m qwen2.5
./team/QA-tools/setup-evidence-dir.sh -m llama3 -v 70b -a "Security Team"
```

### Session Management Commands

```bash
# List all sessions
npm run session:list

# Show session details
npm run session:show 2026-02-26-qwen2.5

# Update session metadata
npm run session:update 2026-02-26-qwen2.5 --model-provider "Alibaba"

# Mark session as complete
npm run session:close 2026-02-26-qwen2.5
```

### Generating Reports

```bash
# Generate all reports
npm run report:generate docs/app/testing-results/2026-02-26-qwen2.5

# Generate specific report type
npx tsx team/QA-tools/generate-report.ts <session-dir> --type executive
```

---

## Evidence Naming

### Screenshots
```
evidence-{TEST-ID}.png
```
Example: `evidence-PI-01-001.png`

### Logs
```
log-{TEST-ID}.txt
log-{TEST-ID}-full.json
```
Example: `log-PI-01-001.txt`

### Model Responses
```
response-{TEST-ID}.md
```
Example: `response-PI-01-001.md`

---

## Session Metadata

Each session should have a `session.json` file:

```json
{
  "sessionId": "2026-02-26-qwen2.5-latest",
  "startDate": "2026-02-26T10:00:00Z",
  "endDate": "2026-02-26T14:30:00Z",
  "assessor": "Name/Team",
  "model": {
    "name": "qwen2.5",
    "version": "latest",
    "provider": "Alibaba",
    "parameters": "7B"
  },
  "configuration": {
    "temperature": 0.7,
    "top_p": 0.9,
    "max_tokens": 4096
  },
  "host": {
    "machine": "localhost",
    "os": "macOS 15.2",
    "runtime": "Ollama 0.5.7"
  },
  "summary": {
    "totalTests": 639,
    "passed": 545,
    "failed": 37,
    "passRate": 93.6
  }
}
```

---

## Report Templates

Located in `.templates/`:

| Template | Purpose |
|----------|---------|
| `session-template/` | Full empty session structure |
| `report-template.md` | Laboratory-grade report template |
| `checklist-template.md` | Empty checklist for manual entry |

---

## Archive Policy

- Test results are retained indefinitely
- Older sessions may be moved to `archive/` subdirectory
- Archive format: `archive/YYYY/`
- Do not delete sessions without approval

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [../audit-report-guide.md](../audit-report-guide.md) | Report generation requirements |
| [../testing-checklist.md](../testing-checklist.md) | Complete test case checklist |
| [../improvement-tracker.md](../improvement-tracker.md) | Improvement recommendations |

---

*Last updated: 2026-02-26*
