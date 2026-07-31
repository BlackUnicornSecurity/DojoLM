// SPDX-License-Identifier: Apache-2.0
/**
 * Media-preview branches for `<FixtureRouletteWidget>` — extracted to
 * keep the primitive file under the ≤200-line ceiling per project
 * CLAUDE.md. One pure dispatch component per `PreviewKind`.
 */

'use client';

import type { ReactElement } from 'react';
import {
  AUDIO_STYLE,
  EMPTY_HINT_STYLE,
  IMAGE_STYLE,
  MEDIA_FRAME_STYLE,
  PREVIEW_BLOCK_STYLE,
  VIDEO_STYLE,
} from './FixtureRouletteWidget.styles';
import type { PreviewKind } from './FixtureRouletteWidget';

export interface FixtureRoulettePreviewProps {
  readonly previewKind: PreviewKind;
  readonly file: string;
  readonly rawUrl: string;
  readonly textPreview: string | null;
  readonly testId: string;
}

export function FixtureRoulettePreview(
  props: FixtureRoulettePreviewProps,
): ReactElement | null {
  const { previewKind, file, rawUrl, textPreview, testId } = props;
  if (previewKind === 'image') {
    return (
      <div style={MEDIA_FRAME_STYLE} data-testid={`${testId}-image`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={rawUrl} alt={file} style={IMAGE_STYLE} />
      </div>
    );
  }
  if (previewKind === 'audio') {
    return (
      <div style={MEDIA_FRAME_STYLE} data-testid={`${testId}-audio`}>
        <audio controls src={rawUrl} style={AUDIO_STYLE}>
          <track kind="captions" />
        </audio>
      </div>
    );
  }
  if (previewKind === 'video') {
    return (
      <div style={MEDIA_FRAME_STYLE} data-testid={`${testId}-video`}>
        <video controls src={rawUrl} style={VIDEO_STYLE}>
          <track kind="captions" />
        </video>
      </div>
    );
  }
  if (textPreview) {
    return (
      <pre style={PREVIEW_BLOCK_STYLE} data-testid={`${testId}-text`}>
        {textPreview}
      </pre>
    );
  }
  return (
    <p style={EMPTY_HINT_STYLE} data-testid={`${testId}-empty`}>
      Binary or empty fixture.
    </p>
  );
}
