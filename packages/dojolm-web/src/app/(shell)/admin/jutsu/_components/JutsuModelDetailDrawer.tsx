// SPDX-License-Identifier: Apache-2.0
/**
 * JutsuModelDetailDrawer — model-detail Drawer body for the Jutsu
 * Models tab.
 *
 * Extracted from `JutsuClient.tsx` per the >800 LOC split (PR #3).
 * Pure presentational — Drawer open/close state lives on the parent;
 * this component renders the detail body when a model is selected.
 *
 * Narrow direct-component-path imports per
 * the darwin-perf import rule.
 */

import type { ReactElement } from "react";
import { Drawer } from "@/design/primitives/Drawer";
import { KV } from "@/design/primitives/KV";
import { cap } from "@/design/primitives/_caps";
import { BeltBadge } from "@/components/ui/BeltBadge";
import {
  SAFETY_LABEL,
  // enum→belt-score map retired per E1-A-RB-15.5 (see types.ts).
  type SafeModelConfig,
} from "./types";

export interface JutsuModelDetailDrawerProps {
  readonly model: SafeModelConfig | null;
  readonly testResult: "success" | "failure" | undefined;
  readonly onClose: () => void;
}

export function JutsuModelDetailDrawer({
  model: detailModel,
  testResult,
  onClose,
}: JutsuModelDetailDrawerProps): ReactElement {
  return (
    <Drawer
      open={detailModel !== null}
      onClose={onClose}
      title={detailModel ? cap(detailModel.name, 64) : "Model detail"}
      sub={
        detailModel
          ? `${detailModel.provider} · ${detailModel.model}`
          : undefined
      }
    >
      {detailModel && (
        <div data-testid="jutsu-model-detail-panel">
          <KV
            rows={[
              { k: "Provider", v: cap(detailModel.provider, 64) },
              { k: "Model id", v: cap(detailModel.model, 200) },
              { k: "Enabled", v: detailModel.enabled ? "yes" : "no" },
              {
                k: "Risk",
                v: detailModel.safetyRisk
                  ? SAFETY_LABEL[detailModel.safetyRisk]
                  : "unknown",
              },
              {
                k: "Guard required",
                v: detailModel.requiresGuard ? "yes" : "no",
              },
              ...(detailModel.maxTokens !== undefined
                ? [{ k: "Max tokens", v: String(detailModel.maxTokens) }]
                : []),
              ...(detailModel.temperature !== undefined
                ? [{ k: "Temperature", v: String(detailModel.temperature) }]
                : []),
            ]}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {/*
             * E1-A-RB-15.5: BeltBadge renders only when real measurement
             * (aivss) is present. Operator-attested safetyRisk does not
             * generate a score. See types.ts for the full rationale.
             */}
            {detailModel.aivss && typeof detailModel.aivss.base === "number" ? (
              // AIVSS base 0-10 risk → BeltBadge 0-95 resilience (invert + clamp)
              <BeltBadge
                score={Math.max(
                  0,
                  Math.min(95, 95 - Math.round(detailModel.aivss.base * 9.5)),
                )}
                size="md"
              />
            ) : (
              <span
                data-testid="jutsu-detail-belt-not-assessed"
                className="wb-hint"
                style={{ fontSize: 12, fontStyle: "italic" }}
              >
                Resilience: (not assessed — no measurement yet)
              </span>
            )}
            {testResult && (
              <span
                data-testid={`jutsu-detail-test-${testResult}`}
                className="wb-hint"
                style={{ fontSize: 11 }}
              >
                Last test: {testResult === "success" ? "success" : "failure"}
              </span>
            )}
          </div>
          <p className="wb-hint" style={{ marginTop: 8, fontSize: 11 }}>
            Recent test runs and related fixtures are planned for a future
            update.
          </p>
        </div>
      )}
    </Drawer>
  );
}
