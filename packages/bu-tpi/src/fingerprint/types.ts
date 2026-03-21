// K1.1 — Core Type Definitions for Kagami Behavioral Fingerprinting

export type ProbeCategory =
  | 'self-disclosure'
  | 'capability'
  | 'knowledge-boundary'
  | 'safety-boundary'
  | 'style-analysis'
  | 'parameter-sensitivity'
  | 'timing-latency'
  | 'tokenizer'
  | 'multi-turn'
  | 'censorship'
  | 'api-metadata'
  | 'watermark'
  | 'multimodal'
  | 'context-window'
  | 'fine-tuning'
  | 'quantization'
  | 'model-lineage';

export interface ProbeQuery {
  readonly id: string;
  readonly category: ProbeCategory;
  readonly prompt: string;
  readonly systemMessage?: string;
  readonly temperature?: number;
  readonly topP?: number;
  readonly expectedFeature: string;
  readonly weight: number;
}

export interface ResponseFeature {
  readonly probeId: string;
  readonly category: ProbeCategory;
  readonly rawText: string;
  readonly extractedValue: string | number | boolean;
  readonly confidence: number;
  readonly durationMs: number;
  readonly error?: string;
}

export type FeatureVector = Readonly<Record<string, number>>;

export interface BehavioralSignature {
  readonly modelFamily: string;
  readonly modelId: string;
  readonly provider: string;
  readonly features: FeatureVector;
  readonly knowledgeCutoff?: string;
  readonly lastVerified: string;
}

export interface CandidateMatch {
  readonly modelId: string;
  readonly modelFamily: string;
  readonly provider: string;
  readonly confidence: number;
  readonly distance: number;
  readonly matchedFeatures: readonly string[];
  readonly divergentFeatures: readonly string[];
}

export interface KagamiResult {
  readonly targetConfig: Readonly<Record<string, string>>;
  readonly candidates: readonly CandidateMatch[];
  readonly totalProbes: number;
  readonly executedAt: string;
  readonly elapsed: number;
  readonly probeResults: readonly ResponseFeature[];
}

export interface VerificationResult {
  readonly targetConfig: Readonly<Record<string, string>>;
  readonly expectedSignature: BehavioralSignature;
  readonly match: boolean;
  readonly driftScore: number;
  readonly divergentFeatures: readonly string[];
}

export interface KagamiProgress {
  readonly current: number;
  readonly total: number;
  readonly phase: 'probing' | 'analyzing' | 'matching';
  readonly currentProbe?: string;
}

export type KagamiMode = 'identify' | 'verify';

export interface KagamiOptions {
  readonly mode: KagamiMode;
  readonly probeCategories?: readonly ProbeCategory[];
  readonly preset?: ProbePresetName;
  readonly maxProbes?: number;
  readonly timeout?: number;
  readonly parallelism?: number;
}

export type ProbePresetName = 'quick' | 'standard' | 'full' | 'verify' | 'stealth';

export interface ProbePreset {
  readonly name: ProbePresetName;
  readonly categories: readonly ProbeCategory[];
  readonly description: string;
  readonly estimatedProbes: number;
}
