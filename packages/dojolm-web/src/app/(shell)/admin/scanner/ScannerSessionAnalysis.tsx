// SPDX-License-Identifier: Apache-2.0
"use client";

/** Secondary in-session analysis, collapsed so the signed scan flow stays quiet. */

import {
  EncodingChainVisualizer,
  FeedRow,
  Panel,
  RefusalDepthChart,
} from "@/design";

import {
  VERDICT_LABEL,
  VERDICT_TO_FEED_KIND,
  VERDICT_TO_FEED_SEV,
  type HistoryEntry,
  type ScanResponse,
} from "./scan-codec";

interface ScannerSessionAnalysisProps {
  readonly latest: ScanResponse | null;
  readonly history: readonly HistoryEntry[];
}

const MAX_HISTORY_DISPLAYED = 12;

export function ScannerSessionAnalysis({
  latest,
  history,
}: ScannerSessionAnalysisProps) {
  return (
    <details className="scanner-session-analysis">
      <summary>Session analysis</summary>
      <div className="yr4-section-grid">
        <EncodingAnalysis latest={latest} />
        <RefusalAnalysis latest={latest} />
      </div>
      <SessionActivity history={history} />
    </details>
  );
}

function EncodingAnalysis({
  latest,
}: {
  readonly latest: ScanResponse | null;
}) {
  return (
    <Panel title="Encoding chain" sub="Detected encoding and decoding path">
      {latest?.encodingChain && latest.encodingChain.length > 0 ? (
        <EncodingChainVisualizer
          chain={latest.encodingChain}
          testId="scanner-encoding-chain"
        />
      ) : (
        <p className="wb-hint" data-testid="scanner-encoding-chain-empty">
          {latest
            ? "No encoding layers detected for the latest scan."
            : "Run a scan to render the encoding chain."}
        </p>
      )}
    </Panel>
  );
}

function RefusalAnalysis({ latest }: { readonly latest: ScanResponse | null }) {
  return (
    <Panel title="Refusal depth" sub="Per-module analysis">
      {latest?.refusalDepth && latest.refusalDepth.length > 0 ? (
        <RefusalDepthChart
          bars={latest.refusalDepth}
          testId="scanner-refusal-depth"
        />
      ) : (
        <p className="wb-hint" data-testid="scanner-refusal-depth-empty">
          {latest
            ? "No refusal-depth telemetry for the latest scan."
            : "Run a scan to render refusal depth."}
        </p>
      )}
    </Panel>
  );
}

function SessionActivity({
  history,
}: {
  readonly history: readonly HistoryEntry[];
}) {
  const cappedHistory = history.slice(0, MAX_HISTORY_DISPLAYED);
  return (
    <Panel title="Session activity" sub="Current browser session">
      {cappedHistory.length === 0 ? (
        <p className="wb-hint" data-testid="scanner-history-empty">
          No scans this session.
        </p>
      ) : (
        <div
          className="yr4-data-list"
          role="list"
          data-testid="scanner-history-list"
        >
          {cappedHistory.map((entry) => (
            <div key={entry.id} role="listitem">
              <FeedRow
                ts={entry.ts}
                sev={VERDICT_TO_FEED_SEV[entry.verdict]}
                msg={`${entry.findings} findings · ${entry.elapsedMs}ms · ${entry.engine}`}
                path={entry.preview}
                tag={{
                  kind: VERDICT_TO_FEED_KIND[entry.verdict],
                  label: VERDICT_LABEL[entry.verdict],
                }}
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
