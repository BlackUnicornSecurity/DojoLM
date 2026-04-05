/**
 * File: src/lib/demo/mock-dashboard.ts
 * Purpose: Mock data for dashboard widgets, activity feed, and platform stats
 */

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();

interface ActivityEvent {
  id: string;
  type: 'scan_complete' | 'threat_detected' | 'test_passed' | 'test_failed' | 'model_added' | 'guard_block' | 'campaign_complete' | 'arena_match';
  description: string;
  timestamp: string;
  read: boolean;
}

export const DEMO_ACTIVITY_FEED: ActivityEvent[] = [
  { id: 'act-01', type: 'guard_block', description: 'Guard blocked prompt injection attempt (CRITICAL)', timestamp: hoursAgo(0.5), read: false },
  { id: 'act-02', type: 'scan_complete', description: 'Haiku Scanner: 8 findings in submitted text', timestamp: hoursAgo(1), read: false },
  { id: 'act-03', type: 'arena_match', description: 'Arena: Marfaak-70B defeated Nebula-22B in CTF match', timestamp: hoursAgo(2), read: false },
  { id: 'act-04', type: 'test_passed', description: 'Shogun-13B passed all 60 security test cases', timestamp: hoursAgo(4), read: true },
  { id: 'act-05', type: 'test_failed', description: 'Basileak-7B failed 45 test cases (23% resilience)', timestamp: hoursAgo(5), read: true },
  { id: 'act-06', type: 'campaign_complete', description: 'Sengoku: "Weekly Recon Sweep" completed with 12 findings', timestamp: hoursAgo(8), read: true },
  { id: 'act-07', type: 'threat_detected', description: 'Mitsuke: New CRITICAL threat entry from NIST NVD feed', timestamp: hoursAgo(12), read: true },
  { id: 'act-08', type: 'model_added', description: 'Model registered: Hydra-Multi-15B (HydraLabs)', timestamp: hoursAgo(18), read: true },
  { id: 'act-09', type: 'guard_block', description: 'Guard blocked persona hijack attempt (Samurai mode)', timestamp: hoursAgo(24), read: true },
  { id: 'act-10', type: 'scan_complete', description: 'Fixture scan: 3 CRITICAL findings in audio fixtures', timestamp: hoursAgo(30), read: true },
  { id: 'act-11', type: 'arena_match', description: 'Arena: Shogun-13B won KOTH match (7 rounds held)', timestamp: hoursAgo(36), read: true },
  { id: 'act-12', type: 'test_passed', description: 'Ironclad-3B passed 51/60 test cases (84% resilience)', timestamp: hoursAgo(48), read: true },
  { id: 'act-13', type: 'campaign_complete', description: 'Sengoku: "Full Security Assessment Q1" completed', timestamp: hoursAgo(72), read: true },
  { id: 'act-14', type: 'threat_detected', description: 'Mitsuke: Supply chain alert for PyPI package', timestamp: hoursAgo(96), read: true },
  { id: 'act-15', type: 'model_added', description: 'Model registered: Phantom-7B (DeepVault) - disabled', timestamp: hoursAgo(120), read: true },
];

/** Threat trend data (last 10 scans) for sparkline */
export const DEMO_THREAT_TREND = [3, 1, 5, 2, 4, 0, 3, 6, 2, 1];

/** Platform-wide statistics */
export const DEMO_PLATFORM_STATS = {
  totalScans: 1247,
  totalModels: 8,
  totalTests: 1032,
  totalCampaigns: 5,
  totalFindings: 3891,
  uptime: '14d 7h 23m',
  activeUsers: 3,
  guardEventsToday: 34,
};

/** System health for admin panel */
export const DEMO_SYSTEM_HEALTH = {
  services: [
    { name: 'Haiku Scanner', status: 'healthy' as const, uptime: '14d 7h', latency: 47 },
    { name: 'Hattori Guard', status: 'healthy' as const, uptime: '14d 7h', latency: 12 },
    { name: 'Battle Arena', status: 'healthy' as const, uptime: '14d 7h', latency: 89 },
    { name: 'SAGE Engine', status: 'healthy' as const, uptime: '14d 7h', latency: 156 },
    { name: 'Database', status: 'healthy' as const, uptime: '14d 7h', latency: 3 },
    { name: 'LLM Providers', status: 'healthy' as const, uptime: '14d 7h', latency: 312 },
  ],
  memory: { used: 512, total: 2048, unit: 'MB' },
  cpu: { usage: 12.5, cores: 4 },
  disk: { used: 1.2, total: 50, unit: 'GB' },
};

/** Admin users list */
export const DEMO_USERS = [
  { id: 'demo-admin-001', username: 'demo-admin', email: 'admin@demo.dojolm.ai', role: 'admin', display_name: 'Demo Admin', created_at: hoursAgo(336), last_login_at: hoursAgo(1), enabled: 1 },
  { id: 'demo-analyst-001', username: 'alice-analyst', email: 'alice@demo.dojolm.ai', role: 'analyst', display_name: 'Alice Chen', created_at: hoursAgo(300), last_login_at: hoursAgo(4), enabled: 1 },
  { id: 'demo-analyst-002', username: 'bob-analyst', email: 'bob@demo.dojolm.ai', role: 'analyst', display_name: 'Bob Martinez', created_at: hoursAgo(250), last_login_at: hoursAgo(24), enabled: 1 },
  { id: 'demo-viewer-001', username: 'carol-viewer', email: 'carol@demo.dojolm.ai', role: 'viewer', display_name: 'Carol Nguyen', created_at: hoursAgo(200), last_login_at: hoursAgo(72), enabled: 1 },
  { id: 'demo-viewer-002', username: 'dave-viewer', email: 'dave@demo.dojolm.ai', role: 'viewer', display_name: 'Dave Okafor', created_at: hoursAgo(150), last_login_at: null, enabled: 0 },
];

/** Fixture manifest for Armory — matches FixtureManifest type from @dojolm/scanner */
export const DEMO_FIXTURE_MANIFEST = {
  generated: new Date().toISOString(),
  version: '1.0.0',
  description: 'Demo fixture manifest for Armory module',
  categories: {
    images: {
      story: 'TPI-IMG-001',
      desc: 'Image metadata injection vectors',
      files: [
        { file: 'exif-injection.jpg', attack: 'EXIF Description system override', severity: 'CRITICAL' as const, clean: false },
        { file: 'stego-payload.png', attack: 'Steganography hidden payload', severity: 'WARNING' as const, clean: false },
        { file: 'metadata-override.webp', attack: 'Metadata field override injection', severity: 'WARNING' as const, clean: false },
        { file: 'clean-photo.jpg', attack: null, severity: null, clean: true },
      ],
    },
    audio: {
      story: 'TPI-AUD-001',
      desc: 'Audio metadata and hidden payload vectors',
      files: [
        { file: 'id3-injection.mp3', attack: 'ID3v2 Title+Comment injection', severity: 'CRITICAL' as const, clean: false },
        { file: 'riff-injection.wav', attack: 'WAV RIFF chunk metadata injection', severity: 'WARNING' as const, clean: false },
        { file: 'clean-audio.mp3', attack: null, severity: null, clean: true },
      ],
    },
    web: {
      story: 'TPI-WEB-001',
      desc: 'Web content injection vectors',
      files: [
        { file: 'html-comment-inject.html', attack: 'HTML comment hidden instructions', severity: 'CRITICAL' as const, clean: false },
        { file: 'script-hidden.html', attack: 'Hidden script tag with encoded payload', severity: 'CRITICAL' as const, clean: false },
        { file: 'clean-page.html', attack: null, severity: null, clean: true },
      ],
    },
    documents: {
      story: 'TPI-DOC-001',
      desc: 'Document format injection vectors',
      files: [
        { file: 'pdf-metadata-inject.pdf', attack: 'PDF metadata field injection', severity: 'WARNING' as const, clean: false },
        { file: 'docx-macro-embed.docx', attack: 'DOCX embedded macro payload', severity: 'CRITICAL' as const, clean: false },
        { file: 'clean-document.pdf', attack: null, severity: null, clean: true },
      ],
    },
    encoded: {
      story: 'TPI-ENC-001',
      desc: 'Encoding-based evasion vectors',
      files: [
        { file: 'base64-nested.txt', attack: 'Multi-layer base64 encoding', severity: 'WARNING' as const, clean: false },
        { file: 'hex-obfuscation.txt', attack: 'Hex-encoded instruction payload', severity: 'WARNING' as const, clean: false },
        { file: 'unicode-bypass.txt', attack: 'Unicode homograph character bypass', severity: 'WARNING' as const, clean: false },
        { file: 'clean-text.txt', attack: null, severity: null, clean: true },
      ],
    },
  },
};
