# KATANA Corpus Gap Analysis

Generated: 2026-03-28T13:27:40.003Z
Total samples: 5758 (1523 clean, 4235 malicious)

## Module Coverage Summary
- Total modules: 29
- Fully covered: 26
- Partial coverage: 2
- Missing (0 samples): 1
- Total positive gap: 312 samples needed
- Total negative gap: 0 samples needed

## Per-Module Detail

| Module | Tier | Positive | Required | Gap | Negative | Required | Gap | Status |
|--------|------|----------|----------|-----|----------|----------|-----|--------|
| image-scanner | 1 | 32 | 150 | 118 | 1523 | 150 | 0 | GAP |
| shingan-scanner | 2 | 0 | 100 | 100 | 1523 | 100 | 0 | MISSING |
| audio-scanner | 1 | 56 | 150 | 94 | 1523 | 150 | 0 | GAP |
| core-patterns | 1 | 1313 | 150 | 0 | 1523 | 150 | 0 | OK |
| enhanced-pi | 1 | 652 | 150 | 0 | 1523 | 150 | 0 | OK |
| pii-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| ssrf-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| xxe-protopollution | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| env-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| encoding-engine | 1 | 259 | 150 | 0 | 1523 | 150 | 0 | OK |
| mcp-parser | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| dos-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| token-analyzer | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| session-bypass | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| email-webfetch | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| vectordb-interface | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| rag-analyzer | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| supply-chain-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| model-theft-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| output-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| edgefuzz-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| webmcp-detector | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| document-pdf | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| document-office | 1 | 150 | 150 | 0 | 1523 | 150 | 0 | OK |
| social-engineering-detector | 2 | 100 | 100 | 0 | 1523 | 100 | 0 | OK |
| overreliance-detector | 2 | 100 | 100 | 0 | 1523 | 100 | 0 | OK |
| bias-detector | 2 | 100 | 100 | 0 | 1523 | 100 | 0 | OK |
| deepfake-detector | 2 | 100 | 100 | 0 | 1523 | 100 | 0 | OK |
| data-provenance | 2 | 100 | 100 | 0 | 1523 | 100 | 0 | OK |
