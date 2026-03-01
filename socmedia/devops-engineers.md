# Social Media Posts: DevOps & Platform Engineers

## Post 1: CI/CD Integration for LLM Security

**Platform: LinkedIn**

You test code before merge. Do you test LLM inputs?

DojoLM integrates into your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Scan prompts
  run: |
    npm install bu-tpi
    node -e "const {scanContent} = require('bu-tpi'); 
             // Scan your prompt templates"
```

API endpoints available:
- `POST /scan` — Single content scan
- `POST /batch` — Batch processing
- `GET /fixtures` — Retrieve test cases
- `POST /test` — Execute test suites

7,117+ tests passing. Zero regressions.

Shift left on LLM security.

#DevOps #CI/CD #LLMSecurity #ShiftLeft

---

## Post 2: API-First Security Scanner

**Platform: Twitter/X**

Deploy DojoLM as a security microservice:

```bash
npm start --workspace=packages/bu-tpi
# → Scanner at localhost:8089
```

Endpoints:
- `/scan` — Content scanning
- `/fixtures` — Test fixtures
- `/health` — Health check

Container-ready. Zero external dependencies.

#DevOps #Microservices #AISecurity

---

## Post 3: Scaling LLM Security

**Platform: LinkedIn**

Security scanning at scale requires:

1. **Low latency** — Regex-based detection, no model inference
2. **No external calls** — All processing local
3. **Batch support** — Process multiple inputs per request
4. **Stateless design** — Horizontal scaling friendly

DojoLM's architecture:
- Pure pattern matching (no ML overhead)
- In-memory processing
- Configurable thresholds
- JSON responses for easy parsing

Deploy behind your load balancer. Scan every user input before it hits your LLM.

#PlatformEngineering #Scalability #LLMOps

---

## Post 4: Monitoring and Observability

**Platform: Twitter/X**

Production LLM security needs observability.

DojoLM returns structured data:
```json
{
  "detected": true,
  "patterns": ["TPI-09", "TPI-11"],
  "severity": "high",
  "matches": [...]
}
```

Pipe to your SIEM. Alert on spikes. Track attack patterns over time.

#Observability #DevOps #SecurityMetrics

---

## Post 5: Infrastructure Requirements

**Platform: LinkedIn**

DojoLM infrastructure footprint:

| Requirement | Value |
|-------------|-------|
| Node.js | 20+ |
| Runtime deps | 0 |
| Memory | ~50MB baseline |
| CPU | Minimal (regex-based) |
| Startup | <2 seconds |

No GPU required. No external API calls. No data egress.

Deploy on:
- Kubernetes
- AWS Lambda
- Cloudflare Workers
- Any Node.js runtime

Your security scanner shouldn't require a security review.

#DevOps #Infrastructure #CloudNative
