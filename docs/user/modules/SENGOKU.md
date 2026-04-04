# Sengoku

Sengoku is the continuous red teaming module.

## Current Tabs

- `Campaigns`
- `Temporal`

## Campaigns

Use `Campaigns` to:

- create new campaigns
- browse existing campaigns
- inspect status
- launch `Run Now`
- monitor current execution progress

The current UI includes:

- campaign list
- campaign detail view
- new campaign builder with target source selection
- run-progress banner with polling

### Target Sources

When creating a campaign, you choose where the target LLM lives:

| Source | Description | Auth |
|--------|-------------|------|
| **External URL** | Any HTTP/HTTPS endpoint (e.g. `https://api.openai.com/v1/chat`) | API Key or Bearer Token |
| **LLM Dashboard** | A model already configured in the LLM Dashboard — credentials are resolved automatically from the encrypted model config | None required (uses stored credentials) |
| **Local (Ollama)** | A locally running Ollama instance — auto-detects available models | None required |

- **External URL** is the default and works with any OpenAI-compatible or custom API endpoint.
- **LLM Dashboard** pulls from `/api/llm/models` and resolves the model's base URL and credentials at execution time. No need to re-enter API keys.
- **Local (Ollama)** defaults to `http://localhost:11434` and auto-detects models via `/api/llm/local-models`. You can also type a model name manually if auto-detection is unavailable.

## Temporal

Use `Temporal` for time-oriented or session-sequenced testing scenarios. It is the current home for legacy `Time Chamber` concepts.

## Statuses

Current campaign statuses include:

- `Draft`
- `Active`
- `Completed`
- `Paused`
- `Archived`

## Best Use Cases

- repeatable campaign-based red teaming
- scheduled or manual reruns
- time-based scenario exploration

## Related Docs

- [Common Workflows](../COMMON_WORKFLOWS.md)
- [The Kumite](THE_KUMITE.md)
- [Glossary](../GLOSSARY.md)
