# Dashboard

The Dashboard is the landing page of the web app. It is designed for quick situational awareness and fast navigation into the deeper modules.

## What You See

- a top-level `Dashboard` header
- widget groups organized into `Overview`, `Monitoring`, and `Platform`
- a `Customize` control for enabling, hiding, and arranging widgets
- widget cards that often deep-link into the module they summarize

## Typical Widget Themes

The current dashboard widget system includes items such as:

- quick launch and onboarding shortcuts
- scanner shortcuts
- guard controls and guard stats
- system health and platform stats
- activity feeds and trend widgets
- compliance and coverage summaries
- Kumite, Ronin Hub, Sengoku, and Kotoba summary cards

## What It Is Good For

- checking platform status quickly
- jumping into the right module without hunting through the sidebar
- spotting changes in guard, compliance, scanner, or strategic signals
- getting a quick start when you are new to the platform

## Customization

Use `Customize` when you want to:

- show or hide widgets
- change the layout
- tailor the landing page toward scanner, LLM, compliance, or strategic work

## Notes

- Some widgets use legacy internal identifiers behind the scenes. The user-facing navigation target is still the current live module.
- If you need to perform work rather than monitor it, jump directly into the relevant module guide:
  - [Haiku Scanner](HAIKU_SCANNER.md)
  - [LLM Dashboard](LLM_DASHBOARD.md)
  - [Bushido Book](BUSHIDO_BOOK.md)
  - [The Kumite](THE_KUMITE.md)
