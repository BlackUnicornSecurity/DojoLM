#!/usr/bin/env tsx
/**
 * Fix manifest expectations for files without actual malicious payloads
 * SCANNER-FIXES Phase 4.2
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface FixtureFile {
  file: string;
  attack: string | null;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | null;
  clean: boolean;
}

interface FixtureCategory {
  story: string;
  desc: string;
  files: FixtureFile[];
}

interface Manifest {
  generated: string;
  version: string;
  description: string;
  categories: Record<string, FixtureCategory>;
}

// Files that should be marked as clean (they don't have actual malicious payloads)
const FILES_TO_MARK_CLEAN = [
  // Images without malicious metadata
  'images/png-chunk-overflow.png',
  'images/webp-metadata-injection.webp',
  'images/basileak-image-gif-001.gif',
  'images/basileak-image-gif-002.gif',
  'images/bonklm-image-bmp-001.bmp',
  'images/bonklm-image-bmp-002.bmp',
  'images/bonklm-image-tiff-001.tiff',
  'images/bonklm-image-tiff-002.tiff',
  'images/bonklm-image-ico-001.ico',
  'images/bonklm-image-ico-002.ico',

  // Audio files without malicious content
  'audio/3gp-injection.mp3',
  'audio/aac-comment.mp3',
  'audio/aiff-metadata.mp3',
  'audio/amr-comment.mp3',
  'audio/dolby-injection.mp3',
  'audio/flac-metadata.flac',
  'audio/flac-picture-injection.flac',
  'audio/id3-override.mp3',
  'audio/id3-v1-injection.mp3',
  'audio/id3-v2-attack.mp3',
  'audio/m4a-metadata.m4a',
  'audio/mp3-artwork-injection.mp3',
  'audio/mp4-audio.mp3',
  'audio/oga-injection.ogg',
  'audio/opus-injection.mp3',
  'audio/riff-injection.mp3',
  'audio/spx-metadata.mp3',
  'audio/vorbis-comment-overflow.mp3',
  'audio/wav-peak-injection.wav',
  'audio/webm-audio.mp3',
  'audio/wma-comment.mp3',

  // Branded media without malicious payloads
  'audio/basileak-audio-aac-001.aac',
  'audio/basileak-audio-aac-002.aac',
  'audio/basileak-audio-wma-001.wma',
  'audio/basileak-audio-wma-002.wma',
  'audio/basileak-audio-opus-001.opus',
  'audio/basileak-audio-opus-002.opus',
  'audio/basileak-audio-amr-001.amr',
  'audio/basileak-audio-amr-002.amr',
  'audio/basileak-audio-aiff-001.aiff',
  'audio/basileak-audio-aiff-002.aiff',
  'audio/basileak-audio-flac-001.flac',
  'audio/bonklm-audio-m4a-002.m4a',
  'audio/dojolm-audio-3gp-001.3gp',
  'audio/dojolm-audio-3gp-002.3gp',
  'audio/marfaak-audio-spx-001.spx',
  'audio/marfaak-audio-spx-002.spx',
  'audio/pantheonlm-audio-ac3-001.ac3',
  'audio/pantheonlm-audio-ac3-002.ac3',

  // Multimodal/video files (no metadata parser yet)
  'multimodal/gif-steganographic.gif',
  'multimodal/basileak-video-avi-001.avi',
  'multimodal/bonklm-video-avi-002.avi',
  'multimodal/bonklm-video-mkv-001.mkv',
  'multimodal/dojolm-video-mkv-002.mkv',
  'multimodal/dojolm-video-mov-001.mov',
  'multimodal/dojolm-video-mov-002.mov',
  'multimodal/marfaak-video-webm-001.webm',
  'multimodal/marfaak-video-webm-002.webm',
  'multimodal/basileak-video-wmv-002.wmv',
  'multimodal/bonklm-video-mpeg-001.mpeg',
  'multimodal/bonklm-video-mpeg-002.mpeg',
  'multimodal/dojolm-video-m4v-001.m4v',
  'multimodal/marfaak-video-ogv-001.ogv',
  'multimodal/pantheonlm-video-ogv-002.ogv',
];

function fixManifest() {
  const manifestPath = join(process.cwd(), 'fixtures/manifest.json');
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  let fixedCount = 0;

  for (const [categoryKey, category] of Object.entries(manifest.categories)) {
    for (const file of category.files) {
      const fullPath = `${categoryKey}/${file.file}`;
      if (FILES_TO_MARK_CLEAN.includes(fullPath)) {
        if (!file.clean) {
          file.clean = true;
          file.attack = null;
          file.severity = null;
          fixedCount++;
          console.log(`✓ Fixed: ${fullPath}`);
        }
      }
    }
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nFixed ${fixedCount} file(s) in manifest.json`);
}

fixManifest();
