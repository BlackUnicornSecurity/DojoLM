// SPDX-License-Identifier: Apache-2.0
/**
 * DashboardMonitoringColumn — HAGANE E5.S6d verbatim extraction. The
 * Zone-2 left column (Standing playbook + Recent activity feed), MOVED
 * UNCHANGED from CommandDashboard.tsx; props carry the E1.S3 feed
 * state. E-A1-phase-b tests pass UNMODIFIED (render tree preserved);
 * the dashboard-main pin guards pixels.
 */

'use client';

import { EmptyState, FeedRow, Panel, StepList, I } from '@/design';
import {
  ACTIVITY_FEED_COLLAPSED,
  ACTIVITY_FEED_LIMIT,
} from './command-dashboard-data';
import type { useAuditActivity } from './command-dashboard-data';

type AuditActivityFeed = ReturnType<typeof useAuditActivity>['feed'];

export interface DashboardMonitoringColumnProps {
  readonly activity: AuditActivityFeed;
  readonly activityExpanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly onRetry: () => void;
}

export function DashboardMonitoringColumn({
  activity,
  activityExpanded,
  onToggleExpanded,
  onRetry,
}: DashboardMonitoringColumnProps) {
  return (
        <div style={{ gridColumn: 'span 7' }}>
          {/* HAGANE E1.S4 — "Today's playbook" → "Standing playbook".
              This is a standing SOP checklist, not tracked state: the
              fabricated done:true on the Bushido row, the invented
              "0 chain drift, Q2 evidence current" claim, the underived
              "ON TRACK" chip, and the "ordered by impact" sub-line (no
              ordering logic exists) are all retired (audit C1 / G13).
              Items stay imperative instructions with real destinations. */}
          <Panel
            title="Standing playbook"
            sub="Daily operating rhythm"
          >
            <StepList
              steps={[
                {
                  title: 'Confirm scanner coverage on the newest captures',
                  sub: 'Walk a deep scan over the latest threat-intel entries',
                  done: false,
                },
                {
                  title: 'Walk the bypass matrix',
                  sub: 'Compare the latest race delta in Evaluations',
                  done: false,
                },
                {
                  title: 'Review active feature flags',
                  sub: 'Check for overrides left open',
                  done: false,
                },
                {
                  title: 'Compliance attestation review',
                  sub: 'Review chain drift and evidence currency',
                  done: false,
                },
              ]}
            />
          </Panel>

          <Panel
            title="Recent activity"
            sub="Audit log · latest events"
            style={{ marginTop: 20 }}
            meta={
              <button
                type="button"
                className="btn sm btn-ghost"
                disabled={
                  activity.status !== 'ok'
                  || activity.items.length <= ACTIVITY_FEED_COLLAPSED
                }
                aria-expanded={activityExpanded}
                onClick={onToggleExpanded}
                data-testid="dashboard-cta-recent-activity-view-all"
              >
                {activityExpanded ? 'Show less' : <>View all {I.arrow}</>}
              </button>
            }
          >
            <div data-testid="dashboard-activity-feed">
              {activity.status === 'loading' ? (
                <p style={{ fontSize: 13, color: 'var(--fg-mute)', margin: 0 }}>
                  Loading audit activity…
                </p>
              ) : activity.status === 'error' ? (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--fg-mute)', margin: '0 0 8px' }}>
                    Audit activity unavailable.
                  </p>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={onRetry}
                    data-testid="dashboard-activity-retry"
                  >
                    Retry
                  </button>
                </div>
              ) : activity.items.length === 0 ? (
                /* Phase 4.3 conformity — the corpus Recent-activity empty
                   is the §4.1 designed treatment (Command Center
                   v2.html:191-196): glyph + title + one-line why + one
                   outline CTA pointing forward. The design-system
                   EmptyState IS the canvas-16 primitive; its CTA is
                   demoted to outline by the v2 chain (§1.3.4 — never a
                   red CTA on an empty state). */
                <EmptyState
                  module="command"
                  state="empty"
                  compact
                  /* Phase 4.3 conformity (Command Center v2.html:191-196):
                     the ceremony/empty surface centres the serif-JP 空 glyph,
                     not a torii line-motif (audit D10). Decorative glyph →
                     lang="ja" + aria-hidden. */
                  illustration={
                    <span
                      className="dashboard-activity-empty-jp"
                      lang="ja"
                      aria-hidden="true"
                    >
                      空
                    </span>
                  }
                  title="No audit events yet"
                  sub="Actions land here as you and the guards work."
                  cta={{ label: 'Run a scan', href: '/admin/scanner' }}
                  testId="dashboard-activity-empty"
                />
              ) : (
                activity.items
                  .slice(
                    0,
                    activityExpanded ? ACTIVITY_FEED_LIMIT : ACTIVITY_FEED_COLLAPSED,
                  )
                  .map((item, i) => (
                    <FeedRow
                      key={`${item.ts}-${i}`}
                      ts={item.ts}
                      sev={item.sev}
                      msg={item.msg}
                      tag={{ kind: 'muted', label: item.tag }}
                    />
                  ))
              )}
            </div>
          </Panel>
        </div>
  );
}
