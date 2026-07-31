<!-- SPDX-License-Identifier: Apache-2.0 -->
# Telemetry disclosure

**DojoLM ships with telemetry enabled by design.** This is a deliberate part of
the project's open-source business model: the community edition is free and
self-hostable, and in return DojoLM collects a defined, privacy-bounded set of
**adversarial-evaluation signals** that fund the project and feed a research
corpus. This page is the plain-language, technical companion to the
[Privacy policy](/legal/privacy) page (whose full legal text is under review)
and to the in-app acknowledgement you complete during first-run setup.

We would rather you read this *before* you install than be surprised later. If
the model below is not acceptable for your environment, you can object to
telemetry at any time at no cost — the community edition keeps working either
way; see *Controlling telemetry* below.

## TL;DR

- **Collected:** adversarial probe outcomes, model-registration metadata (no
  keys), and anonymised platform usage signals.
- **Never collected:** your prompts, model responses, API keys, or any PII about
  your operators or members.
- **Why:** it funds Black Unicorn's open-source-with-corpus model — training
  safer models and publishing industry benchmarks.
- **Acknowledgement:** the setup wizard requires a time-stamped acknowledgement
  before the admin console unlocks (GDPR/ePrivacy/CCPA-aligned).
- **Inspect it yourself:** point the telemetry sink at a local file and read
  every event your deployment produces (see *Controlling telemetry*).

## What is collected

The first-run acknowledgement step discloses exactly these categories:

1. **Adversarial probe outcomes** — which test cases ran and which models scored
   what (the evaluation results themselves).
2. **Model-registration metadata** — provider name and model id. **No API keys.**
3. **Anonymised platform usage signals** — page navigations and error rates, to
   understand which features are used and what breaks.

Each event carries an install-scoped envelope: a per-install identifier (a
salted, **user-resettable** hash — not tied to a person), an opaque
server-issued install token, the deployment tier (`community` on the free
edition), an SDK version, and — only on a multi-tenant cloud deployment — a
tenant id. None of these is PII; the envelope identifies an *installation*, not
a person.

## What is never collected

- **No prompts** you submit to models.
- **No model responses.**
- **No API keys or secrets** (model credentials stay in your `.env`).
- **No PII** about your operators or members — no names, emails, free-form text,
  or IP addresses. Where a user id is needed to correlate events within one
  deployment, it is a one-way salted HMAC (`user_hash`), not the id itself, and
  it cannot be correlated across deployments.

## Why DojoLM collects this

DojoLM's community edition is free and Apache-2.0 licensed. The telemetry corpus
is how that is sustainable: aggregated, de-identified adversarial-evaluation
signals are used to **train safer models** and **publish open industry
benchmarks**. This is the "open-source-with-corpus" model, and it is stated
openly rather than buried — that transparency is the point of this page.

## Build channels — where telemetry is destined

DojoLM resolves a **build channel** (env var `NEXT_PUBLIC_BUILD_CHANNEL`) that
the setup wizard discloses to you verbatim before you acknowledge:

| Channel | Who runs it | Disclosure |
|---|---|---|
| **Self-hosted** (default) | You, on your own hardware | "This deployment runs on your own hardware. The telemetry described above is collected for the Black Unicorn corpus and, when the corpus uplink is configured, transmitted over HTTPS." |
| **Cloud** | Black Unicorn (hosted) | "This deployment runs on Black Unicorn infrastructure. The telemetry described above is collected for the Black Unicorn corpus." |

The default is `self-host` (the more detailed disclosure), and the channel you
see is re-verified server-side when you acknowledge, so a tampered client cannot
record a different channel than the one shipped.

## Transport, and how to inspect exactly what your deployment emits

Telemetry is produced through a **pluggable sink**, selected by
`DOJO_TELEMETRY_SINK`:

| `DOJO_TELEMETRY_SINK` | Behaviour |
|---|---|
| unset (production) | no-op — events are produced but not written anywhere |
| `jsonl` | append-only JSON-Lines file at `DOJO_TELEMETRY_JSONL_PATH` (default `./telemetry-events.jsonl`) |
| `console` | written to stdout (development default) |
| `noop` | discard |

> **Current build status (honest note).** The community edition ships the sinks
> above. The **network transport that egresses to the Black Unicorn corpus over
> HTTPS is not wired into this build yet** — it is the steady-state design the
> disclosure describes, and it will be operator-visible when it lands. Until then a
> self-hosted deployment does not transmit telemetry off-box by default; events
> are either discarded (no-op) or written to the local JSONL file you choose.
> **Verify your own deployment's behaviour** rather than taking this on faith:

```bash
# See every telemetry event this deployment produces, locally:
export DOJO_TELEMETRY_SINK=jsonl
export DOJO_TELEMETRY_JSONL_PATH=/var/log/dojolm/telemetry-events.jsonl
# … run DojoLM, then:
tail -f /var/log/dojolm/telemetry-events.jsonl
```

Every line is one event in exactly the shape it would be transmitted, so you can
audit the categories above against reality before any network sink is enabled.

## Acknowledgement and legal basis

First-run setup includes a **Data Sharing & Telemetry** step that:

- discloses the categories above in plain language,
- discloses your build channel,
- requires an explicit acknowledgement checkbox, and
- records a **time-stamped** acknowledgement server-side before the admin console
  unlocks.

This is aligned with GDPR Art. 6(1)(f) + Art. 21 (legitimate-interests lawful
basis with a free right to object) and Art. 13/14 (the acknowledgement is a
time-stamped transparency record, not a consent-to-processing gate), ePrivacy
Art. 5(3) / ICO PECR (strictly-necessary storage only), and CCPA §1798.135
(opt-out/disclosure parity). The [Privacy policy](/legal/privacy)
page is the home of the authoritative legal text (under Legal review at the time of
writing); this page is the engineering companion.

## Controlling telemetry

- **Inspect** — set `DOJO_TELEMETRY_SINK=jsonl` and read the file (above).
- **Reset your install identity** — the `installId` is a user-resettable salted
  hash; rotating it decouples future events from past ones.
- **Build channel** — set `NEXT_PUBLIC_BUILD_CHANNEL` to match your deployment so
  the disclosure you acknowledge is accurate.
- **Don't accept the model?** Telemetry is on by default, but it is **not
  mandatory** and not a condition of using the community edition: the
  per-install envelope rides legitimate interests (GDPR Art. 6(1)(f)) and you
  have a free right to object (Art. 21) at any time, at no cost — the community
  edition keeps working either way (see the [Privacy policy](/legal/privacy)).
  Commercial channels with different data terms are available — contact
  info@blackunicorn.tech.

## Related

- [`events.md`](events.md) — the telemetry event taxonomy (what each event looks
  like).
- [Privacy policy](/legal/privacy) — the authoritative legal text.
