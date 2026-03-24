# LLM Provider Guide

This guide documents the current provider setup model in the repository and the supported user flow in the web app.

## Where Provider Setup Happens

Use these two places in the app:

1. `Admin -> API Keys`
   Add a provider-backed entry with credentials and any required base URL.
2. `LLM Dashboard -> Models`
   Review, edit, test, enable, disable, and use configured models.

Older docs that say `Admin -> Providers` are outdated.

## Provider Layers In The Repo

The repository currently has three related layers:

1. Core provider types in `bu-tpi`
   The provider union currently includes `19` provider IDs.
2. Built-in preset catalog
   `packages/bu-tpi/src/llm/llm-presets.json` currently ships `57` presets:
   - `51` cloud presets
   - `6` local presets
3. Web-app UI and adapter layer
   The current web app directly exposes provider metadata for:
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

## Useful Provider Routes

Preset catalog:

```bash
curl http://localhost:42001/api/llm/presets
```

Discover models from local providers:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/local-models?provider=ollama&baseUrl=http://localhost:11434"
```

Test a saved model entry:

```bash
curl -X POST \
  -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models/model-123/test"
```

## Provider Recipes

### OpenAI

Typical values:

- provider: `openai`
- base URL: `https://api.openai.com/v1`
- example models: `gpt-5.4`, `gpt-5.4-mini`, `gpt-4o`, `o3`, `o3-mini`

### Anthropic

Typical values:

- provider: `anthropic`
- base URL: `https://api.anthropic.com`
- example models: `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`

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

Use `custom` for OpenAI-compatible endpoints that are not directly covered by the default UI metadata or that need nonstandard routing.

Provide:

- provider: `custom`
- base URL
- model name
- API key if required
- custom headers if the endpoint expects them

## Practical Notes

### Google and Cohere

The current codebase includes metadata and preset awareness for Google and Cohere. If your target endpoint is OpenAI-compatible and not behaving correctly through a dedicated adapter path, `custom` is the safer fallback.

### Local model discovery

The current web app includes local model discovery for:

- Ollama
- LM Studio
- llama.cpp

### Security

- never commit provider keys
- prefer local models when prompts are sensitive
- use `X-API-Key` for scripted web API access
- keep `customHeaders` inside the UI or your secure runtime, not in docs or source control

## Suggested Setup Flow

1. Open `Admin -> API Keys`.
2. Create the provider-backed entry.
3. Test the connection.
4. Open `LLM Dashboard -> Models`.
5. Confirm the model is present and enabled.
6. Run a single test from `LLM Dashboard -> Tests` before launching larger batches.

## Troubleshooting

### Connection test fails

- verify the base URL
- verify the model name
- verify the provider API key
- make sure the saved model entry is enabled

### Local provider shows no models

- ensure the local server is running
- verify the default port
- confirm the model has been pulled or loaded

### Cloud provider works in the vendor UI but not here

- try the endpoint through `custom` if it is OpenAI-compatible
- verify whether you are using a provider that is directly adapted or only represented in presets/metadata

### Same model works in chat but not in tests

- confirm the saved model entry has the expected base URL and headers
- re-run the model connection test from the saved model entry
- check whether guard settings are affecting execution in your environment

## Related Docs

- [LLM Dashboard Guide](modules/LLM_DASHBOARD.md)
- [User API Reference](API_REFERENCE.md)
- [Troubleshooting](TROUBLESHOOTING.md)
