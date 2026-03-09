# NODA Documentation

Welcome to the NODA documentation. This folder contains all user-facing documentation for the NODA LLM Security Testing Platform.

## Documentation Structure

```
docs/
├── README.md                    # This file
├── user/                        # User documentation
│   ├── PLATFORM_GUIDE.md       # Complete platform guide
│   ├── GETTING_STARTED.md      # Quick start guide
│   ├── FAQ.md                  # Frequently asked questions
│   ├── LLM_PROVIDER_GUIDE.md   # Provider configuration
│   └── API_REFERENCE.md        # API documentation
├── compliance/                  # Compliance documentation
│   └── iso-42001/              # ISO 42001 specific docs
└── STYLE_GUIDE.md              # Documentation style guide
```

## Quick Access

### For New Users
1. [Getting Started](user/GETTING_STARTED.md) - Set up and first steps
2. [Platform Guide](user/PLATFORM_GUIDE.md) - Complete feature overview
3. [FAQ](user/FAQ.md) - Common questions

### For Developers
1. [API Reference](user/API_REFERENCE.md) - API documentation
2. [Team Dev Docs](../team/dev/) - Internal development docs
3. [Contributing Guide](../github/CONTRIBUTING.md) - Contribution guidelines

### For Security Teams
1. [Security Overview](../team/security/) - Security documentation
2. [Compliance](compliance/) - Framework documentation
3. [Audit Results](../team/security/audit-results/) - Security audits

## Documentation Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Platform Guide | ✅ Complete | 2026-03-08 |
| API Reference | ✅ Complete | 2026-03-08 |
| Getting Started | ✅ Complete | 2026-03-08 |
| FAQ | ✅ Complete | 2026-03-08 |
| LLM Provider Guide | ✅ Complete | 2026-03-08 |

## Contributing to Documentation

See [STYLE_GUIDE.md](STYLE_GUIDE.md) for documentation standards.

When updating documentation:
1. Follow the style guide
2. Update the status table
3. Test all code examples
4. Run `npm run verify:docs`

## Support

- Documentation issues: Open a GitHub issue
- General support: support@dojolm.dev
- Security issues: security@dojolm.dev
