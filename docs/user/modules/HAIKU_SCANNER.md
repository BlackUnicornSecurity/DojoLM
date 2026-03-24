# Haiku Scanner

Haiku Scanner is the direct scanning surface for prompt injection and related threats.

## Main Areas

- metrics row with scan volume and pass-rate summaries
- engine filter pills
- scanner input panel
- findings panel

## What You Can Scan

- plain text typed into the textarea
- uploaded image, audio, and document files
- payloads loaded from [Armory](ARMORY.md)

## Scanner Input Features

The input panel currently supports:

- freeform text entry
- quick example chips
- file upload
- clear and scan actions

Upload behavior is explained in more detail in the [Multimodal Security Testing Guide](../multimodal-testing-guide.md).

## Findings And Verdicts

After a scan you can review:

- overall verdict
- finding counts by severity
- engine-specific findings
- the difference between allowed and blocked outcomes

## Engine Filters

Use the engine pills when you want to:

- narrow a scan to selected rule groups
- isolate why a finding is being raised
- compare behavior across enabled engines

If all engines are disabled, scanning is effectively blocked until at least one engine is turned back on.

## Good Use Cases

- checking a suspicious prompt before it reaches an LLM
- checking model output before it is passed downstream
- replaying a known payload from [Armory](ARMORY.md)
- validating extracted text from multimodal sources

## Related Docs

- [Common Workflows](../COMMON_WORKFLOWS.md)
- [Multimodal Security Testing Guide](../multimodal-testing-guide.md)
- [User API Reference](../API_REFERENCE.md)
