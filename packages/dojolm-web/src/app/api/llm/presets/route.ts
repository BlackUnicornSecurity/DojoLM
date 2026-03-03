/**
 * Presets Endpoint (P8-S84)
 * GET /api/llm/presets — List built-in provider presets (no auth details)
 */
import { NextResponse } from 'next/server';

// Inline preset summary (no auth details, no env vars)
const PRESET_SUMMARY = [
  { id: 'openai', name: 'OpenAI', tier: 1, region: 'US', isOpenAICompatible: true },
  { id: 'anthropic', name: 'Anthropic', tier: 1, region: 'US', isOpenAICompatible: false },
  { id: 'google', name: 'Google Gemini', tier: 1, region: 'US', isOpenAICompatible: false },
  { id: 'groq', name: 'Groq', tier: 2, region: 'US', isOpenAICompatible: true },
  { id: 'together', name: 'Together AI', tier: 2, region: 'US', isOpenAICompatible: true },
  { id: 'fireworks', name: 'Fireworks AI', tier: 2, region: 'US', isOpenAICompatible: true },
  { id: 'deepseek', name: 'DeepSeek', tier: 2, region: 'China', isOpenAICompatible: true },
  { id: 'mistral', name: 'Mistral AI', tier: 2, region: 'EU', isOpenAICompatible: true },
  { id: 'cohere', name: 'Cohere', tier: 2, region: 'US/Canada', isOpenAICompatible: false },
  { id: 'xai', name: 'xAI (Grok)', tier: 2, region: 'US', isOpenAICompatible: true },
  { id: 'ai21', name: 'AI21 Labs', tier: 2, region: 'US', isOpenAICompatible: false },
  { id: 'replicate', name: 'Replicate', tier: 2, region: 'US', isOpenAICompatible: false },
  { id: 'cloudflare', name: 'Cloudflare Workers AI', tier: 2, region: 'Global', isOpenAICompatible: false },
  { id: 'cerebras', name: 'Cerebras', tier: 3, region: 'US', isOpenAICompatible: true },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', tier: 3, region: 'US', isOpenAICompatible: true },
  { id: 'sambanova', name: 'SambaNova', tier: 3, region: 'US', isOpenAICompatible: true },
  { id: 'deepinfra', name: 'DeepInfra', tier: 3, region: 'US', isOpenAICompatible: true },
  { id: 'perplexity', name: 'Perplexity', tier: 3, region: 'US', isOpenAICompatible: true },
  { id: 'openrouter', name: 'OpenRouter', tier: 3, region: 'US', isOpenAICompatible: true },
  { id: 'ollama', name: 'Ollama', tier: 1, region: 'Local', isOpenAICompatible: true },
  { id: 'lmstudio', name: 'LM Studio', tier: 1, region: 'Local', isOpenAICompatible: true },
  { id: 'llamacpp', name: 'llama.cpp', tier: 1, region: 'Local', isOpenAICompatible: true },
  { id: 'vllm', name: 'vLLM', tier: 2, region: 'Local', isOpenAICompatible: true },
];

export async function GET() {
  return NextResponse.json(PRESET_SUMMARY);
}
