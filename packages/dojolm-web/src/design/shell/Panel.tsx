// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from "react";

export type PanelVariant = "" | "lacquer" | "paper";

export interface PanelProps {
  title?: ReactNode;
  jpMark?: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  variant?: PanelVariant;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  noPad?: boolean;
  headingLevel?: 2 | 3 | 4;
}

export function Panel({
  title,
  jpMark,
  sub,
  meta,
  variant = "",
  children,
  className = "",
  style,
  noPad,
  headingLevel = 3,
}: PanelProps) {
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 4 ? "h4" : "h3";
  return (
    <div
      className={`panel ${variant} ${noPad ? "nopad" : ""} ${className}`.trim()}
      style={style}
    >
      {(title || meta) && (
        <div className="panel-head">
          <div className="col">
            {title && (
              <Heading>
                {jpMark && (
                  <span className="kmark" lang="ja">
                    {jpMark}
                  </span>
                )}
                {title}
              </Heading>
            )}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {meta && <div className="meta">{meta}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
