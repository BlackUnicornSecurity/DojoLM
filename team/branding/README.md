# BlackUnicorn Fixture Branding

This directory contains all branding assets and documentation for BlackUnicorn security test fixtures.

## Quick Links

- [Full Branding Plan](../FIXTURES-BRANDING.md)
- [Assets Directory](./assets/)

## Structure

```
branding/
├── assets/
│   ├── company/       # BlackUnicorn company assets (blue/black)
│   ├── dojolm/        # DojoLM product assets (red)
│   ├── bonklm/        # BonkLM product assets (yellow)
│   ├── other/         # Future products
│   └── brand-config.json  # Brand configuration
└── ../FIXTURES-BRANDING.md  # Full plan
```

## Getting Started

1. Place source media files in `assets/company/`, `assets/dojolm/`, etc.
2. Edit `brand-config.json` with your colors and taglines
3. Run conversion script to generate all formats
4. Regenerate fixtures with `generate-fixtures.ts`

## Current Status

| Phase | Status |
|-------|--------|
| Asset Collection | Pending user input |
| Asset Processing | Ready |
| Fixture Generation | Pending |
| Validation | Pending |
| Documentation | In progress |
