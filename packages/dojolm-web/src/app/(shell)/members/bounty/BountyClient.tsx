// SPDX-License-Identifier: Apache-2.0
/* eslint-disable no-restricted-syntax -- `bounty` is the canonical route-naming id here, never a retired NavId. */

/**
 * BountyClient — v2 reskin P2b rebuild (design wave-e "Bounty v2.html").
 *
 * Rewards-mechanics explainer: reward tiers by verified severity + how
 * a payout lands. Copy is verbatim from the signed design render; the
 * honest pre-launch numbers ("—" amounts, 0 counters) source from
 * `MEMBER_PRELAUNCH_FACTS` (D-07 copy contract) — never invented.
 *
 * Fully static — no API, no refresh (D8). The Epic-4B.5 belt-ledger
 * feature this replaces lives on in `/api/members/bounty/belt-ledger`
 * (retirement is a separate product decision, per nr-bounty.md).
 */

import Link from "next/link";
import type { ReactElement } from "react";
import { PageHead, Panel, Steps } from "@/design/shell";
import { MEMBER_PRELAUNCH_FACTS } from "@/lib/demo/demo-facts";

// Verbatim from the design render (wave-e "Bounty v2.html"). Severity
// dot colors follow the §5.2 value-color scale (crit=torii, high=ember,
// med=gold, low=steel) — the same scale the bypass matrix reports.
const REWARD_TIERS = [
  {
    sev: "crit",
    title: "Critical bypass",
    sub: "Full guard bypass with demonstrated impact.",
  },
  {
    sev: "high",
    title: "High",
    sub: "Bypass with a meaningful leak or policy break.",
  },
  {
    sev: "med",
    title: "Medium",
    sub: "Partial bypass with limited impact.",
  },
  {
    sev: "low",
    title: "Low",
    sub: "Edge-case bypass under heavy constraints.",
  },
] as const;

const PAYOUT_STEPS = [
  {
    title: "Find a bypass",
    sub: "Compete in the stadium during a live season.",
  },
  {
    title: "The dojo verifies it",
    sub: "Severity is assigned; only verified bypasses count — for bounty, standings, and the matrix alike.",
  },
  {
    title: "The payout lands",
    sub: "By tier, under the season's published rules.",
  },
] as const;

export function BountyClient(): ReactElement {
  return (
    <div>
      <PageHead namingId="bounty" title="Bounty" />

      <div className="home-note" data-testid="members-bounty-note">
        <span className="dot" aria-hidden="true" />
        <span>
          <b>Payout rules publish at launch.</b> The tiers below show how
          rewards attach to severity — amounts land with the{" "}
          {MEMBER_PRELAUNCH_FACTS.seasonName} rules.
        </span>
      </div>

      <div className="g-main" style={{ marginTop: 16 }}>
        <Panel title="Reward tiers" sub="By verified severity">
          <div data-testid="members-bounty-tiers">
            {REWARD_TIERS.map((tier) => (
              <div
                className="lrow"
                key={tier.sev}
                data-testid={`members-bounty-tier-${tier.sev}`}
              >
                <span className={`sev ${tier.sev}`} aria-hidden="true" />
                <span className="bd">
                  <span className="t">{tier.title}</span>
                  <span className="s">{tier.sub}</span>
                </span>
                <span className="end">
                  {/* Unsourced metrics render "—" (never invented values). */}
                  <span className="mono">
                    {MEMBER_PRELAUNCH_FACTS.payoutAmount}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="sev-note" style={{ marginTop: 12 }}>
            Amounts publish with the {MEMBER_PRELAUNCH_FACTS.seasonName} rules
            at private-beta launch. Severity is assigned by the dojo during
            verification — the same scale the{" "}
            <Link href="/members/leaderboard/bypass-matrix">bypass matrix</Link>{" "}
            reports.
          </div>
        </Panel>

        <Panel title="How a payout lands">
          <Steps items={PAYOUT_STEPS} />
          <div
            className="drows"
            style={{ marginTop: 14 }}
            data-testid="members-bounty-counters"
          >
            <div className="drow">
              <span className="l">Verified bypasses so far</span>
              <span className="v dim" data-testid="members-bounty-verified-count">
                {MEMBER_PRELAUNCH_FACTS.verifiedBypasses}
              </span>
            </div>
            <div className="drow">
              <span className="l">Payouts made</span>
              <span className="v dim" data-testid="members-bounty-payouts-count">
                {MEMBER_PRELAUNCH_FACTS.payoutsMade}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
