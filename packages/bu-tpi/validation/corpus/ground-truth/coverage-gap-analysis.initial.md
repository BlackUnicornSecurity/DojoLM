# KATANA Corpus Gap Analysis

Generated: 2026-03-28T11:37:07.876Z
Total samples: 2380 (558 clean, 1822 malicious)

## Module Coverage Summary
- Total modules: 29
- Fully covered: 3
- Partial coverage: 18
- Missing (0 samples): 8
- Total positive gap: 2725 samples needed
- Total negative gap: 0 samples needed

## Per-Module Detail

| Module | Tier | Positive | Required | Gap | Negative | Required | Gap | Status |
|--------|------|----------|----------|-----|----------|----------|-----|--------|
| pii-detector | 1 | 0 | 150 | 150 | 558 | 150 | 0 | MISSING |
| email-webfetch | 1 | 0 | 150 | 150 | 558 | 150 | 0 | MISSING |
| vectordb-interface | 1 | 0 | 150 | 150 | 558 | 150 | 0 | MISSING |
| rag-analyzer | 1 | 0 | 150 | 150 | 558 | 150 | 0 | MISSING |
| edgefuzz-detector | 1 | 0 | 150 | 150 | 558 | 150 | 0 | MISSING |
| ssrf-detector | 1 | 7 | 150 | 143 | 558 | 150 | 0 | GAP |
| document-pdf | 1 | 10 | 150 | 140 | 558 | 150 | 0 | GAP |
| env-detector | 1 | 11 | 150 | 139 | 558 | 150 | 0 | GAP |
| document-office | 1 | 14 | 150 | 136 | 558 | 150 | 0 | GAP |
| token-analyzer | 1 | 15 | 150 | 135 | 558 | 150 | 0 | GAP |
| image-scanner | 1 | 32 | 150 | 118 | 558 | 150 | 0 | GAP |
| mcp-parser | 1 | 48 | 150 | 102 | 558 | 150 | 0 | GAP |
| webmcp-detector | 1 | 50 | 150 | 100 | 558 | 150 | 0 | GAP |
| deepfake-detector | 2 | 0 | 100 | 100 | 558 | 100 | 0 | MISSING |
| data-provenance | 2 | 0 | 100 | 100 | 558 | 100 | 0 | MISSING |
| shingan-scanner | 2 | 0 | 100 | 100 | 558 | 100 | 0 | MISSING |
| xxe-protopollution | 1 | 53 | 150 | 97 | 558 | 150 | 0 | GAP |
| audio-scanner | 1 | 56 | 150 | 94 | 558 | 150 | 0 | GAP |
| supply-chain-detector | 1 | 57 | 150 | 93 | 558 | 150 | 0 | GAP |
| dos-detector | 1 | 62 | 150 | 88 | 558 | 150 | 0 | GAP |
| model-theft-detector | 1 | 63 | 150 | 87 | 558 | 150 | 0 | GAP |
| session-bypass | 1 | 83 | 150 | 67 | 558 | 150 | 0 | GAP |
| bias-detector | 2 | 55 | 100 | 45 | 558 | 100 | 0 | GAP |
| output-detector | 1 | 110 | 150 | 40 | 558 | 150 | 0 | GAP |
| overreliance-detector | 2 | 62 | 100 | 38 | 558 | 100 | 0 | GAP |
| social-engineering-detector | 2 | 87 | 100 | 13 | 558 | 100 | 0 | GAP |
| core-patterns | 1 | 1313 | 150 | 0 | 558 | 150 | 0 | OK |
| enhanced-pi | 1 | 652 | 150 | 0 | 558 | 150 | 0 | OK |
| encoding-engine | 1 | 259 | 150 | 0 | 558 | 150 | 0 | OK |
