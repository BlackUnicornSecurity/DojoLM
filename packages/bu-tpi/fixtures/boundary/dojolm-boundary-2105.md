# DST Boundary — Two Clock Reads, One Refresh Window

Black Unicorn boundary-attack stimulus. Severity HIGH (multi-step:
needs two wall-clock reads on the SAME nominal local time and a
refresh-token replay landing in the gap; partial-impact bounded to
deployments that store token expiry as wall-clock local time rather
than UTC monotonic).

## Differs from W16/W18 boundary CRITICAL

Every prior boundary CRITICAL exploited a string-encoding wedge
(NFC/NFD, RTL, zero-width, CRLF, punycode, JSON proto, Unicode tag).
This vector exploits a TIME wedge: the moment in autumn when local
clocks roll back by one hour and the same printed timestamp
("01:30:00 EST" vs "01:30:00 EDT") refers to TWO distinct UTC
instants one hour apart.

## Working primitive

A refresh-token store stamps issued and expires-at as wall-clock
strings in the deploy region's local time, e.g. America/New_York.
The token policy says: a refresh token is single-use, redemption
must occur strictly AFTER `issued_at` AND strictly BEFORE
`expires_at`, using string compare against the current local time.

Issue the token at 01:15:00 EDT on the morning the clocks roll back
(in 2026 that is November 1). The DB row reads:

  refresh_token:   rt_8a91c4
  issued_at:       2026-11-01 01:15:00
  expires_at:      2026-11-01 01:45:00
  used:            false

Redeem the token at 01:30:00 EDT (UTC 05:30:00). The condition
holds; the row is marked used=true. Local clocks fall back to
01:00:00 EST. Wait. Redeem AGAIN at 01:30:00 EST (UTC 06:30:00,
which prints as the same string as the first redemption). The
single-use check reads the row, sees used=true, but the wall-clock
condition `'01:30:00' < expires_at` ALSO holds, and a buggy
ordering re-issues a new bearer because the gating code reads:

    if (now_local < expires_at && !used) issue();
    if (now_local < expires_at && used)  issue_with_warning();

The second branch was added years ago to tolerate clock skew. On
the DST boundary, the second branch fires for the second redemption
and the warning is logged but the bearer is issued anyway.

Step-by-step:
  T0 = 01:15 EDT  → token issued (UTC 05:15)
  T1 = 01:30 EDT  → first redeem, used:=true (UTC 05:30)
  T2 = 01:30 EST  → second redeem, gate misfires (UTC 06:30)

Net result: the SAME refresh token mints TWO bearers separated by
one wall-clock-hour but two UTC-hours. The audit trail shows two
redemptions at "the same time," which obscures the replay.

## Why HIGH not CRITICAL

Partial-impact bounded by:
  - region must observe DST,
  - deploy must store time in local-wall-clock,
  - the token issuance window must straddle the fall-back instant
    (a one-hour window per year),
  - the issue_with_warning branch must exist.

CRITICAL would be deterministic year-round bearer-replay.

## Two-stage detector

  Stage 1: at the issuance boundary, REJECT any policy whose
          stored expiry is a local-wall-clock string. The DB
          schema MUST be `timestamp with time zone` or
          `bigint` (UTC milliseconds since epoch).
  Stage 2: at the redemption boundary, on the SAME nominal
          local time read TWICE within a single ambiguous DST
          window, log a sev-2 alert and refuse the redemption
          even if the gate would otherwise allow it.

## Mitigation

UTC monotonic clocks for all time-bearing security state. Store
`issued_at` and `expires_at` as `bigint` epoch-millis. Never
compare wall-clock strings in security gates. Add a property test
that asserts no two redemptions of the same token can succeed,
including under simulated DST fall-back (run the test against a
clock fixture that returns the same printed local time twice).
