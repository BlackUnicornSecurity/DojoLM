# LLM Provider Guide

This guide documents the current provider configuration model in the codebase.

## Important Distinctions

The repository has three provider-related layers:

1. `bu-tpi` provider types
   The core type union includes `19` provider IDs.
2. Built-in preset catalog
   `packages/bu-tpi/src/llm/llm-presets.json` ships `57` presets:
   - `51` cloud presets
   - `6` local presets
3. Web-app UI and adapter layer
   The current web app directly exposes provider metadata and adapter wiring for:
   - OpenAI
   - Anthropic
   - Google
   - Cohere
   - Ollama
   - LM Studio
   - llama.cpp
   - z.ai
   - Moonshot
   - BlackUnicorn
   - Custom

## Current Setup Flow

Use these two places in the app:

1. `Admin -> API Keys`
   Add a provider-backed model entry with credentials or base URL.
2. `LLM Dashboard -> Models`
   Review, test, edit, enable, or disable configured model definitions.

Older docs that say `Admin -> Providers` are outdated.

## Public Preset Catalog

The web app exposes a non-secret preset summary at:

```bash
curl http://localhost:42001/api/llm/presets
```

This is useful for discovering built-in preset names and regions without exposing credentials.

## Provider Recipes

### OpenAI

Use when you want hosted GPT models.

Typical values:

- provider: `openai`
- base URL: `https://api.openai.com/v1`
- models: `gpt-5.4`, `gpt-5.4-mini`, `gpt-4o`, `o3`, `o3-mini`

Steps:

1. Open `Admin -> API Keys`
2. Add an `OpenAI` entry
3. Provide a model name and API key
4. Test the connection

### Anthropic

Typical values:

- provider: `anthropic`
- base URL: `https://api.anthropic.com`
- models: `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`

### Ollama

Typical values:

- provider: `ollama`
- base URL: `http://localhost:11434`
- example models: `llama3.2`, `llama3.1`, `mistral`, `qwen2.5`, `gemma3`

Start Ollama first:

```bash
ollama serve
ollama pull llama3.2
```

### LM Studio

Typical values:

- provider: `lmstudio`
- base URL: `http://localhost:1234`

### llama.cpp

Typical values:

- provider: `llamacpp`
- base URL: `http://localhost:8080`

### z.ai

Typical values:

- provider: `zai`
- base URL: `https://api.z.ai/api/anthropic`
- example models: `glm-4.7`, `glm-4-flash`

### Moonshot

Typical values:

- provider: `moonshot`
- base URL: `https://api.moonshot.cn/v1`

### Custom

Use this for OpenAI-compatible endpoints that are not directly surfaced in the current UI metadata set.

Provide:

- provider: `custom`
- your base URL
- your model name
- API key if the endpoint requires one

## Practical Notes

### Google and Cohere

The current codebase includes UI metadata and placeholder adapter routing for Google and Cohere. If you are testing an OpenAI-compatible provider outside the directly wired adapters, prefer `custom`.

### Local model discovery

The web app includes local-model discovery for:

- Ollama
- LM Studio
- llama.cpp

### Security

- never commit API keys
- prefer local models for sensitive prompts
- use `X-API-Key` for programmatic web API calls

## Troubleshooting

### Connection test fails

- verify the base URL
- verify the model name
- verify the provider API key
- make sure the model entry is enabled

### Local provider shows no models

- ensure the local server is running
- check the expected default port
- confirm the model has been pulled or loaded

### Cloud provider works in the vendor UI but not here

- try the same endpoint through `custom` if it is OpenAI-compatible
- confirm the provider is one of the currently wired adapters, not just present in the preset catalog
# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_HOST=http://localhost:11434
```

### Custom Headers

For providers requiring custom headers, edit provider configuration in the UI.

### Proxy Configuration

If behind a corporate proxy:

```bash
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

---

## Provider Comparison

| Feature | OpenAI | Anthropic | Google | Ollama | LM Studio |
|---------|--------|-----------|--------|--------|-----------|
| Setup | Easy | Easy | Easy | Medium | Medium |
| Cost | Pay per use | Pay per use | Pay per use | Free | Free |
| Privacy | Cloud | Cloud | Cloud | Local | Local |
| Speed | Fast | Fast | Fast | Varies | Varies |
| Model Variety | Limited | Limited | Limited | Large | Large |

---

## Getting Help

- OpenAI: [Help Center](https://help.openai.com/)
- Anthropic: [Support](https://support.anthropic.com/)
- Ollama: [GitHub Issues](https://github.com/ollama/ollama/issues)
- LM Studio: [Discord](https://discord.gg/lmstudio)
- DojoLM / BlackUnicorn: info@blackunicorn.tech
