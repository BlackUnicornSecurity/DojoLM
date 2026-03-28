/**
 * S-AUDIO: Audio Content Scanner Module (H26.2)
 * Transcription text analysis, audio metadata detection (ID3 tags, WAV comments),
 * magic byte validation. Formats: MP3, WAV, FLAC, OGG.
 * Self-registers with scannerRegistry on import.
 *
 * SEC-12: Constants exported for worker thread integration (timeout 30s, memory limit 256MB).
 * Max file size: 50MB, magic byte validation.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum audio file size: 50MB */
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

/** Worker thread memory limit: 256MB */
export const WORKER_MEMORY_LIMIT = 256 * 1024 * 1024;

/** Worker thread timeout: 30 seconds */
export const WORKER_TIMEOUT_MS = 30_000;

/** Supported audio MIME types */
export const SUPPORTED_AUDIO_MIMES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
] as const;

/** Magic byte signatures for audio format validation */
export const AUDIO_MAGIC_BYTES: Record<string, { bytes: number[]; offset: number }> = {
  'audio/mpeg': { bytes: [0xff, 0xfb], offset: 0 }, // MP3 frame sync (or ID3: 0x49,0x44,0x33)
  'audio/wav': { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
  'audio/x-wav': { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  'audio/flac': { bytes: [0x66, 0x4c, 0x61, 0x43], offset: 0 }, // fLaC
  'audio/ogg': { bytes: [0x4f, 0x67, 0x67, 0x53], offset: 0 }, // OggS
};

/** MP3 ID3 header magic bytes */
export const ID3_MAGIC = [0x49, 0x44, 0x33]; // "ID3"

/** File extension to MIME type mapping */
export const AUDIO_EXT_TO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
};

const AUDIO_CONTEXT_RE =
  /(?:\[(?:TRANSCRIPTION|METADATA)[^\]]*\]|transcription:|(?:^|[\n|])\s*(?:ID3(?:\s+tag\s+data|v\d(?:\.\d+)?)?|COMM|TIT2|TALB|TPE1|TXXX|WXXX|WCOM|WOAR|WPUB)\s*[:=]?|Vorbis(?:\s+Comment|\.COMMENT)|RIFF(?:\/INFO|\.INFO)|ASF(?:\.WMA)?|iTunes(?:\.META)?|OpusTags|OpusHead|SoundHandler|VideoHandler|Lavf\d|Lavc\d|LAME3\.100|libx264|libvpx(?:-vp9)?|V_MPEG4\/ISO\/AVC|isomiso2avc1|\b(?:m4v|webm|mov|mkv|wmv|flac|opus)\b|audio\s+metadata|voiceprint|speaker\s+verification)/im;

// ---------------------------------------------------------------------------
// 1. AUDIO_METADATA — injection via ID3 tags, WAV comments
// ---------------------------------------------------------------------------

export const AUDIO_METADATA_PATTERNS: RegexPattern[] = [
  {
    name: 'id3_hidden_instruction',
    cat: 'AUDIO_METADATA_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:ID3|TAG|COMM|TIT2|TALB|TPE1|TXXX|TITLE|COMMENT|ASF|Vorbis|RIFF|iTunes)[\s\S]{0,220}(?:system\s*(?:prompt|instruction|message)|ignore\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|rules|guidelines)|you\s+are\s+now|reveal\s+everything|override\s+safety\s+protocols|unrestricted)/i,
    desc: 'Hidden instruction in audio metadata (ID3/WAV comment)',
    source: 'S-AUDIO',
    weight: 9,
  },
  {
    name: 'audio_comment_injection',
    cat: 'AUDIO_METADATA_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:Comment|COMM|Description|TXXX|Title|TITLE|COMMENT)\s*[:=]\s*["']?[^"'\n]{0,200}(?:ignore|override|system|admin|execute|eval|jailbreak|unrestricted|voiceprint|spoof|biometric|speaker\s+verification|ultrasonic|steganograph|asr|spectral|frequency)\b/i,
    desc: 'Prompt injection in audio comment/description field',
    source: 'S-AUDIO',
    weight: 9,
  },
  {
    name: 'audio_base64_in_metadata',
    cat: 'AUDIO_METADATA_INJECTION',
    sev: SEVERITY.WARNING,
    re: /(?:Comment|COMM|TXXX|Description)\s*[:=]\s*["']?(?:[A-Za-z0-9+/]{50,}={0,2})/,
    desc: 'Base64-encoded payload detected in audio metadata',
    source: 'S-AUDIO',
    weight: 7,
  },
  {
    name: 'audio_url_in_metadata',
    cat: 'AUDIO_METADATA_INJECTION',
    sev: SEVERITY.WARNING,
    re: /(?:^|[\n|])\s*(?:WXXX|WCOM|WOAR|WPUB)\s*[:=]\s*["']?https?:\/\/[^\s"']{10,200}/im,
    desc: 'Suspicious URL in audio metadata',
    source: 'S-AUDIO',
    weight: 6,
  },
];

// ---------------------------------------------------------------------------
// 2. TRANSCRIPTION_INJECTION — attacks in transcribed speech
// ---------------------------------------------------------------------------

export const TRANSCRIPTION_INJECTION_PATTERNS: RegexPattern[] = [
  {
    name: 'spoken_system_override',
    cat: 'TRANSCRIPTION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:system\s*(?:prompt|instruction|message)|SYSTEM\s*OVERRIDE)\s*[:=]/i,
    desc: 'System prompt override detected in audio transcription',
    source: 'S-AUDIO',
    weight: 9,
  },
  {
    name: 'spoken_ignore_instructions',
    cat: 'TRANSCRIPTION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /ignore\s+(?:all\s+)?(?:previous|prior|above)?\s*(?:instructions|rules|guidelines)/i,
    desc: 'Instruction override pattern in audio transcription',
    source: 'S-AUDIO',
    weight: 9,
  },
  {
    name: 'spoken_role_hijacking',
    cat: 'TRANSCRIPTION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /you\s+are\s+(?:now|actually|really)\s+(?:a|an|the)\s+/i,
    desc: 'Role hijacking attempt in audio transcription',
    source: 'S-AUDIO',
    weight: 8,
  },
  {
    name: 'spoken_command_execution',
    cat: 'TRANSCRIPTION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:execute|run|eval|exec)\s*(?:command|function|code|script|the\s+following)/i,
    desc: 'Command execution attempt in audio transcription',
    source: 'S-AUDIO',
    weight: 9,
  },
  {
    name: 'spoken_data_exfiltration',
    cat: 'TRANSCRIPTION_INJECTION',
    sev: SEVERITY.CRITICAL,
    re: /(?:send|transmit|exfiltrate|upload)\s+(?:all\s+)?(?:the\s+)?(?:data|information|conversation|context)\s+to/i,
    desc: 'Data exfiltration command in audio transcription',
    source: 'S-AUDIO',
    weight: 9,
  },
];

// ---------------------------------------------------------------------------
// Security: MIME & magic byte validation
// ---------------------------------------------------------------------------

/**
 * Validate that MIME type, magic bytes, and file extension agree.
 * Returns findings for any mismatches.
 */
export function validateAudioFormat(
  data: Uint8Array,
  declaredMime: string,
  filename: string,
): Finding[] {
  const findings: Finding[] = [];

  // Check file size
  if (data.byteLength > MAX_AUDIO_SIZE) {
    findings.push({
      category: 'AUDIO_UPLOAD_REJECTED',
      severity: SEVERITY.WARNING,
      description: `Audio exceeds maximum size: ${(data.byteLength / 1024 / 1024).toFixed(1)}MB > 50MB limit`,
      match: filename,
      source: 'S-AUDIO',
      engine: 'audio-scanner',
      pattern_name: 'file_size_exceeded',
      weight: 0,
    });
    return findings;
  }

  // Check for ID3 header (MP3 files may start with ID3 instead of frame sync)
  const isID3 = ID3_MAGIC.every((b, i) => data[i] === b);
  if (declaredMime === 'audio/mpeg' && isID3) {
    return findings; // Valid MP3 with ID3 header
  }

  // MP3 frame sync: byte 0 = 0xFF, byte 1 upper 3 bits = 111 (0xE0 mask)
  // Covers all valid MPEG audio frame variants (0xFB, 0xFA, 0xF3, 0xF2, etc.)
  if (declaredMime === 'audio/mpeg') {
    const isFrameSync = data.length >= 2 && data[0] === 0xFF && (data[1] & 0xE0) === 0xE0;
    if (!isFrameSync) {
      findings.push({
        category: 'AUDIO_FORMAT_MISMATCH',
        severity: SEVERITY.CRITICAL,
        description: `Magic bytes do not match declared MIME type: ${declaredMime}`,
        match: filename,
        source: 'S-AUDIO',
        engine: 'audio-scanner',
        pattern_name: 'magic_byte_mismatch',
        weight: 10,
      });
    }
    return findings;
  }

  // Validate magic bytes match declared MIME
  const expectedMagic = AUDIO_MAGIC_BYTES[declaredMime];
  if (expectedMagic) {
    const match = expectedMagic.bytes.every(
      (b, i) => data[expectedMagic.offset + i] === b,
    );
    if (!match) {
      findings.push({
        category: 'AUDIO_FORMAT_MISMATCH',
        severity: SEVERITY.CRITICAL,
        description: `Magic bytes do not match declared MIME type: ${declaredMime}`,
        match: filename,
        source: 'S-AUDIO',
        engine: 'audio-scanner',
        pattern_name: 'magic_byte_mismatch',
        weight: 10,
      });
    }
  }

  // Validate extension matches MIME
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  const expectedMimeForExt = AUDIO_EXT_TO_MIME[ext];
  if (expectedMimeForExt && expectedMimeForExt !== declaredMime) {
    findings.push({
      category: 'AUDIO_FORMAT_MISMATCH',
      severity: SEVERITY.CRITICAL,
      description: `File extension '${ext}' does not match declared MIME '${declaredMime}'`,
      match: filename,
      source: 'S-AUDIO',
      engine: 'audio-scanner',
      pattern_name: 'extension_mime_mismatch',
      weight: 10,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Module wiring
// ---------------------------------------------------------------------------

const AUDIO_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: AUDIO_METADATA_PATTERNS, name: 'AUDIO_METADATA_INJECTION' },
  { patterns: TRANSCRIPTION_INJECTION_PATTERNS, name: 'TRANSCRIPTION_INJECTION' },
];

const AUDIO_ATTACK_DESCRIPTOR_TERMS =
  /(?:audio\s+steganograph|stego(?:graphy)?|spectral(?:\s+domain|\s+poisoning|\s+manipulation)?|frequency(?:\s+domain|\s+manipulation)|ultrasonic|carrier\s+frequency|asr(?:\s+evasion|\s+poisoning)?|speech\s+recognition|voice\s+clon(?:e|ing)|voiceprint|speaker\s+verification|biometric(?:\s+voice)?|replay\s+attack|cross-modal|audio\s+to\s+text|multimodal|least\s+significant\s+bits)/i;
const AUDIO_ATTACK_INTENT_TERMS =
  /(?:inject(?:ion)?|payload|hidden(?:\s+command|\s+trigger|\s+data|\s+prompt)?|bypass|evade|exfiltrat|spoof|impersonat|unauthorized|override|attack|exploit|adversarial|privilege\s+escalation|admin\s+mode|elevated\s+privileges?)/i;

export const audioScannerModule: ScannerModule = {
  name: 'audio-scanner',
  version: '1.0.0',
  description: 'Detects audio-based attacks: metadata injections (ID3, WAV comments), transcription-based prompt injection',
  supportedContentTypes: [...SUPPORTED_AUDIO_MIMES, 'text/plain'],

  scan(text: string, normalized: string): Finding[] {
    // Input size guard
    if (text.length > 500_000) {
      return [{
        category: 'AUDIO_INPUT_TOO_LARGE',
        severity: SEVERITY.WARNING,
        description: `AudioScanner: Input too large (${text.length} chars), skipping scan`,
        match: '',
        source: 'S-AUDIO',
        engine: 'audio-scanner',
        pattern_name: 'input_size_guard',
        weight: 0,
      }];
    }

    if (!AUDIO_CONTEXT_RE.test(text) && !AUDIO_CONTEXT_RE.test(normalized)) {
      return [];
    }

    const findings: Finding[] = [];
    for (const group of AUDIO_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0].slice(0, 100),
            pattern_name: p.name,
            source: p.source || 'S-AUDIO',
            engine: 'audio-scanner',
            ...(p.weight !== undefined && { weight: p.weight }),
          });
        }
      }
    }

    if (/(?:\[METADATA|ID3v2|Vorbis Comment|RIFF\/INFO|ASF\.WMA|iTunes\.META|TITLE=|COMMENT=|Title:|Comment:)/i.test(text)
      && AUDIO_ATTACK_DESCRIPTOR_TERMS.test(text)
      && AUDIO_ATTACK_INTENT_TERMS.test(text)) {
      findings.push({
        category: 'AUDIO_METADATA_INJECTION',
        severity: SEVERITY.CRITICAL,
        description: 'Audio metadata describes a steganographic, ultrasonic, ASR-evasion, or voice-spoofing attack payload',
        match: (text.match(AUDIO_ATTACK_DESCRIPTOR_TERMS)?.[0] ?? '').slice(0, 100),
        pattern_name: 'audio_attack_descriptor',
        source: 'S-AUDIO',
        engine: 'audio-scanner',
        weight: 9,
      });
    }

    if (/(?:\[TRANSCRIPTION\]|transcription:)/i.test(text)
      && AUDIO_ATTACK_DESCRIPTOR_TERMS.test(text)
      && AUDIO_ATTACK_INTENT_TERMS.test(text)) {
      findings.push({
        category: 'TRANSCRIPTION_INJECTION',
        severity: SEVERITY.CRITICAL,
        description: 'Audio transcription content describes an adversarial voice, ASR, or cross-modal attack chain',
        match: (text.match(AUDIO_ATTACK_DESCRIPTOR_TERMS)?.[0] ?? '').slice(0, 100),
        pattern_name: 'spoken_audio_attack_descriptor',
        source: 'S-AUDIO',
        engine: 'audio-scanner',
        weight: 9,
      });
    }

    return findings;
  },

  getPatternCount() {
    return AUDIO_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
  },

  getPatternGroups() {
    return AUDIO_PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: 'S-AUDIO',
    }));
  },
};

if (!scannerRegistry.hasModule('audio-scanner')) {
  scannerRegistry.register(audioScannerModule);
}
