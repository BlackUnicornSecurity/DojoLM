# The Kumite (Retired — subsystems promoted to first-class modules)

> **The Kumite strategic-analysis hub was retired in Wave 0 (2026-04-18).**
> Its subsystems are now independent, first-class navigation items. Deep
> links using the old `kumite` / `strategic` NavIds resolve via
> `NAV_ID_ALIASES` to keep back-compat.

## Subsystems relocated

| Former Kumite subsystem | Current home |
|---|---|
| Mitsuke (threat feed) | **Mitsuke** — first-class module |
| Amaterasu DNA | **Amaterasu DNA** — first-class module |
| Kagami (mirror testing) | **Kagami** — first-class module |
| Battle Arena | **Arena** — first-class module |
| SAGE (prompt evolution) | **Buki** → Generator tab (see ADR-0007, ADR-0008) |
| Shingan (trust boundaries) | **Haiku Scanner** → Deep Scan |

## Related docs

- [Architecture — Legacy Deep-Link Aliases](../../ARCHITECTURE.md#legacy-deep-link-aliases-back-compat-only)
- [Common Workflows](../COMMON_WORKFLOWS.md)
- [Glossary](../GLOSSARY.md)

## History

The Kumite's hub-of-subsystems pattern proved to hide useful features behind
an extra layer of navigation. Wave 0 promoted its children to first-class nav
items so users reach them directly.
