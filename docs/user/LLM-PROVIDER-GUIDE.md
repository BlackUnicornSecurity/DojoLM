# LLM Provider Configuration Guide

This guide covers configuring LLM providers in NODA for security testing.

## Supported Providers (19 total)

| Provider | Models | Local/Cloud | Setup Difficulty |
|----------|--------|-------------|------------------|
| OpenAI | GPT-4o, o3, GPT-5.4 | Cloud | Easy |
| Anthropic | Claude 4.6 Opus/Sonnet/Haiku | Cloud | Easy |
| Google | Gemini 2.0 Flash, 1.5 Pro | Cloud | Easy |
| Cohere | Command R+, Command R | Cloud | Easy |
| Groq | Various (fast inference) | Cloud | Easy |
| Together | Various | Cloud | Easy |
| Fireworks | Various | Cloud | Easy |
| DeepSeek | DeepSeek models | Cloud | Easy |
| Mistral | Mistral models | Cloud | Easy |
| Ollama | Various | Local | Medium |
| LM Studio | Various | Local | Medium |
| llama.cpp | Various | Local | Medium |
| Custom | Any OpenAI-compatible | Either | Varies |

---

## OpenAI

### Prerequisites

- OpenAI account
- API key with appropriate permissions

### Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

2. In NODA, go to **Admin → Providers**

3. Click **Add Provider**

4. Select **OpenAI**

5. Enter configuration:
   ```
   Name: OpenAI Production
   API Key: sk-...
   Organization ID: (optional)
   ```

6. Click **Test Connection**

7. If successful, click **Save**

### Available Models

- GPT-4o (recommended)
- o3 (reasoning)
- GPT-5.4 (latest)

### Pricing

Pay per token. See [OpenAI Pricing](https://openai.com/pricing).

### Rate Limits

- Tier 1: 500 RPM
- Tier 2: 5000 RPM

---

## Anthropic (Claude)

### Prerequisites

- Anthropic account
- API key

### Setup

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)

2. In NODA, go to **Admin → Providers**

3. Click **Add Provider**

4. Select **Anthropic**

5. Enter configuration:
   ```
   Name: Anthropic Claude
   API Key: sk-ant-...
   ```

6. Click **Test Connection**

7. Save

### Available Models

- Claude 4.6 Opus
- Claude 4.6 Sonnet
- Claude 4.5 Haiku

### Pricing

Pay per token. See [Anthropic Pricing](https://www.anthropic.com/pricing).

---

## Ollama

### Prerequisites

- Ollama installed locally
- At least 8GB RAM (16GB+ recommended)
- Sufficient disk space for models

### Installation

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com)

### Setup

1. Start Ollama:
   ```bash
   ollama serve
   ```

2. Pull a model:
   ```bash
   ollama pull llama3
   ollama pull mistral
   ollama pull codellama
   ```

3. In NODA, go to **Admin → Providers**

4. Click **Add Provider**

5. Select **Ollama**

6. Enter configuration:
   ```
   Name: Local Ollama
   Host: http://localhost:11434
   ```

7. Select model from dropdown

8. Test and save

### Recommended Models

| Model | Size | Use Case |
|-------|------|----------|
| llama3 | 8B | General testing |
| llama3:70b | 70B | Advanced testing |
| mistral | 7B | Fast testing |
| codellama | 7B | Code-focused |

### Performance Tips

- Use smaller models (7B) for quick tests
- Use larger models (70B) for thorough evaluation
- Ensure sufficient RAM (model size × 1.5)

---

## LM Studio

### Prerequisites

- LM Studio installed
- Model downloaded

### Installation

Download from [lmstudio.ai](https://lmstudio.ai/)

### Setup

1. Open LM Studio

2. Download a model:
   - Go to **Search** tab
   - Search for model (e.g., "Llama 3")
   - Click **Download**

3. Start server:
   - Go to **Local Server** tab
   - Select your model
   - Click **Start Server**
   - Note the port (default: 1234)

4. In NODA, go to **Admin → Providers**

5. Click **Add Provider**

6. Select **LM Studio**

7. Enter configuration:
   ```
   Name: LM Studio Local
   Host: http://localhost:1234
   ```

8. Test and save

### Performance Tips

- Enable GPU acceleration in LM Studio settings
- Adjust context length based on your needs
- Use quantized models for faster inference

---

## Custom Provider

For OpenAI-compatible endpoints:

1. Go to **Admin → Providers**

2. Click **Add Provider**

3. Select **Custom**

4. Enter configuration:
   ```
   Name: My Custom API
   Base URL: https://api.example.com/v1
   API Key: (if required)
   Model: model-name
   ```

5. Test and save

---

## Provider Management

### Editing Providers

1. Go to **Admin → Providers**
2. Click provider name
3. Update settings
4. Click **Save**

### Deleting Providers

1. Go to **Admin → Providers**
2. Click **Delete** icon
3. Confirm deletion

### Default Provider

Set a default provider for quick testing:

1. Go to **Admin → Providers**
2. Click **Set as Default** on desired provider

### Provider Priority

Providers are listed in order of addition. Reorder by dragging.

---

## Troubleshooting

### OpenAI "Invalid API Key"

- Verify key is copied correctly
- Check key has not expired
- Ensure key has appropriate permissions

### Ollama "Connection Refused"

- Verify Ollama is running: `ollama serve`
- Check host URL (default: localhost:11434)
- Check firewall settings

### LM Studio "Model Not Found"

- Verify server is started in LM Studio
- Check model is loaded
- Verify port number

### Rate Limit Errors

- Reduce concurrent tests
- Check provider rate limits
- Upgrade provider tier if needed

### Timeout Errors

- Increase timeout in settings
- Check provider status
- Try with smaller model

---

## Best Practices

### Security

- Rotate API keys regularly
- Use environment variables for keys
- Never commit keys to version control
- Use local models for sensitive testing

### Cost Optimization

- Use local models for development
- Reserve cloud models for final testing
- Batch tests to reduce API calls
- Monitor usage in provider dashboards

### Performance

- Use smaller models for quick iteration
- Parallelize tests across providers
- Cache results when possible
- Set appropriate timeouts

---

## Advanced Configuration

### Environment Variables

```bash
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
- NODA: info@blackunicorn.tech
