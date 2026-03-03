/**
 * Scanner Modules — Barrel Export (S09, updated S32g, P3)
 *
 * Re-exports the module registry and all scanner modules.
 * Importing this file loads and registers all 23 scanner modules.
 */

export { ScannerRegistry, scannerRegistry } from './registry.js';

// P1 Modules (S10-S20) — self-register on import
export { mcpParserModule } from './mcp-parser.js';
export { documentPdfModule } from './document-pdf.js';
export { documentOfficeModule } from './document-office.js';
export { ssrfDetectorModule } from './ssrf-detector.js';
export { encodingEngineModule } from './encoding-engine.js';
export { emailWebfetchModule } from './email-webfetch.js';
export { enhancedPiModule } from './enhanced-pi.js';
export { tokenAnalyzerModule } from './token-analyzer.js';
export { ragAnalyzerModule } from './rag-analyzer.js';
export { vectordbInterfaceModule } from './vectordb-interface.js';
export { xxeProtoPollutionModule } from './xxe-protopollution.js';

// P2.6 Modules (S32a-S32f) — self-register on import
export { dosDetectorModule, detectResourceExhaustion } from './dos-detector.js';
export { supplyChainDetectorModule, detectSupplyChainRisk } from './supply-chain-detector.js';
export { biasDetectorModule, detectBiasPatterns } from './bias-detector.js';
export { envDetectorModule, detectEnvManipulation } from './env-detector.js';
export { overrelianceDetectorModule, detectAuthorityExploit } from './overreliance-detector.js';
export { modelTheftDetectorModule, detectModelTheft } from './model-theft-detector.js';

// P3 Modules (S33-S37) — self-register on import
export { piiDetectorModule, configurePII, getPIIConfig, redactPII, detectPIIExposure } from './pii-detector.js';
export type { PIIConfig } from './pii-detector.js';
export { dataProvenanceModule } from './data-provenance.js';
export { deepfakeDetectorModule, computeDeepfakeConfidence } from './deepfake-detector.js';
export { sessionBypassModule, detectSessionManipulation } from './session-bypass.js';
