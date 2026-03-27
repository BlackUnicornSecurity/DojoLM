# KATANA Corpus Gap Analysis

Generated: 2026-03-27T00:36:02.608Z
Total samples: 2380 (810 clean, 1570 malicious)

## Module Coverage Summary
- Total modules: 29
- Fully covered: 3
- Partial coverage: 18
- Missing (0 samples): 8
- Total positive gap: 2835 samples needed
- Total negative gap: 0 samples needed

## Per-Module Detail

| Module | Tier | Positive | Required | Gap | Negative | Required | Gap | Status |
|--------|------|----------|----------|-----|----------|----------|-----|--------|
| pii-detector | 1 | 0 | 150 | 150 | 810 | 150 | 0 | MISSING |
| email-webfetch | 1 | 0 | 150 | 150 | 810 | 150 | 0 | MISSING |
| vectordb-interface | 1 | 0 | 150 | 150 | 810 | 150 | 0 | MISSING |
| rag-analyzer | 1 | 0 | 150 | 150 | 810 | 150 | 0 | MISSING |
| edgefuzz-detector | 1 | 0 | 150 | 150 | 810 | 150 | 0 | MISSING |
| document-pdf | 1 | 10 | 150 | 140 | 810 | 150 | 0 | GAP |
| env-detector | 1 | 11 | 150 | 139 | 810 | 150 | 0 | GAP |
| token-analyzer | 1 | 13 | 150 | 137 | 810 | 150 | 0 | GAP |
| document-office | 1 | 14 | 150 | 136 | 810 | 150 | 0 | GAP |
| audio-scanner | 1 | 22 | 150 | 128 | 810 | 150 | 0 | GAP |
| dos-detector | 1 | 23 | 150 | 127 | 810 | 150 | 0 | GAP |
| supply-chain-detector | 1 | 26 | 150 | 124 | 810 | 150 | 0 | GAP |
| image-scanner | 1 | 30 | 150 | 120 | 810 | 150 | 0 | GAP |
| model-theft-detector | 1 | 45 | 150 | 105 | 810 | 150 | 0 | GAP |
| mcp-parser | 1 | 48 | 150 | 102 | 810 | 150 | 0 | GAP |
| deepfake-detector | 2 | 0 | 100 | 100 | 810 | 100 | 0 | MISSING |
| data-provenance | 2 | 0 | 100 | 100 | 810 | 100 | 0 | MISSING |
| shingan-scanner | 2 | 0 | 100 | 100 | 810 | 100 | 0 | MISSING |
| webmcp-detector | 1 | 60 | 150 | 90 | 810 | 150 | 0 | GAP |
| bias-detector | 2 | 19 | 100 | 81 | 810 | 100 | 0 | GAP |
| overreliance-detector | 2 | 23 | 100 | 77 | 810 | 100 | 0 | GAP |
| ssrf-detector | 1 | 83 | 150 | 67 | 810 | 150 | 0 | GAP |
| xxe-protopollution | 1 | 83 | 150 | 67 | 810 | 150 | 0 | GAP |
| session-bypass | 1 | 83 | 150 | 67 | 810 | 150 | 0 | GAP |
| output-detector | 1 | 85 | 150 | 65 | 810 | 150 | 0 | GAP |
| social-engineering-detector | 2 | 87 | 100 | 13 | 810 | 100 | 0 | GAP |
| core-patterns | 1 | 1252 | 150 | 0 | 810 | 150 | 0 | OK |
| enhanced-pi | 1 | 642 | 150 | 0 | 810 | 150 | 0 | OK |
| encoding-engine | 1 | 261 | 150 | 0 | 810 | 150 | 0 | OK |
