# KATANA-REF-001 — Module Taxonomy

Generated: 2026-03-28T19:01:31.640Z

## Metadata

- Category: reference
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: Architect
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 7.2.1
- Source of Record: `validation/taxonomy/module-taxonomy.json`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-REF-001.json`
- Frozen Source SHA-256: `cc5ec2d3524becf41ec48d54a4ebd50f5939779a58e289b25ac18ce809cf88f6`

## Description

Module classification: tier assignments, capability declarations, detection categories.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release with 29 modules |
## Source Record Snapshot

```json
{
  "schema_version": "1.0.0",
  "generated_at": "2026-03-21T00:00:00.000Z",
  "modules": [
    {
      "module_id": "core-patterns",
      "display_name": "Core Patterns",
      "description": "Foundational prompt injection, jailbreak, role hijacking, and social engineering patterns",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["SYSTEM_OVERRIDE", "ROLE_HIJACKING", "INSTRUCTION_INJECTION", "CONTEXT_MANIPULATION", "DAN", "ROLEPLAY", "HYPOTHETICAL", "AUTHORITY", "SOCIAL_ENGINEERING", "TEMPLATE", "OBFUSCATION", "SETTINGS_WRITE_ATTEMPT", "AGENT_OUTPUT_INJECTION", "AGENT_CREDENTIAL_THEFT", "SEARCH_RESULT_INJECTION", "MULTILINGUAL", "MODERN_JAILBREAK", "TRANSLATION_JAILBREAK", "CODE_FORMAT_INJECTION", "SOCIAL_COMPLIANCE", "TRUST_MANIPULATION", "EMOTIONAL_MANIPULATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["basic_injection", "jailbreak", "role_hijacking", "social_engineering", "obfuscation", "multilingual"],
      "source_file": "src/scanner.ts",
      "pattern_count": 500
    },
    {
      "module_id": "enhanced-pi",
      "display_name": "Enhanced Prompt Injection",
      "description": "Semantic prompt injection detection including instruction boundaries, role confusion, context manipulation",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["PROMPT_INJECTION", "PROMPT_LEAKAGE", "PROMPT_MANIPULATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["instruction_boundary", "role_confusion", "context_manipulation", "jailbreak"],
      "source_file": "src/modules/enhanced-pi.ts",
      "pattern_count": 0
    },
    {
      "module_id": "pii-detector",
      "display_name": "PII Detector",
      "description": "Personally Identifiable Information detection (SSN, credit cards, email, phone, etc.)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["PII_SSN", "PII_CREDIT_CARD", "PII_EMAIL", "PII_PHONE"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["pii_detection", "redaction"],
      "source_file": "src/modules/pii-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "ssrf-detector",
      "display_name": "SSRF Detector",
      "description": "Server-Side Request Forgery and cloud metadata access detection",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["SSRF_CLOUD_METADATA", "SSRF_INTERNAL_IP", "SSRF_DNS_REBINDING", "SSRF_PROTOCOL_SMUGGLING"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["cloud_metadata", "internal_ip", "dns_rebinding", "protocol_smuggling"],
      "source_file": "src/modules/ssrf-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "xxe-protopollution",
      "display_name": "XXE & Prototype Pollution",
      "description": "XML External Entity attacks, prototype pollution, and unsafe deserialization",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["XXE_INJECTION", "PROTO_POLLUTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["xxe", "prototype_pollution", "deserialization"],
      "source_file": "src/modules/xxe-protopollution.ts",
      "pattern_count": 0
    },
    {
      "module_id": "env-detector",
      "display_name": "Environment Detector",
      "description": "Environment variable manipulation and secrets exposure detection",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["ENV_VARIABLE_INJECTION", "ENV_MANIPULATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["env_access", "secrets_exposure"],
      "source_file": "src/modules/env-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "encoding-engine",
      "display_name": "Encoding Engine",
      "description": "Multi-layer encoded payload detection (Base64, hex, URL, Unicode, Punycode, mixed)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["ENCODING_OBFUSCATION", "ENCODING_BYPASS"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["base64", "hex", "url_encoding", "unicode_encoding", "punycode", "mixed_encoding"],
      "source_file": "src/modules/encoding-engine.ts",
      "pattern_count": 0
    },
    {
      "module_id": "mcp-parser",
      "display_name": "MCP Parser",
      "description": "MCP protocol attack detection (tool manipulation, capability spoofing, resource attacks)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["MCP_TOOL_MANIPULATION", "MCP_CAPABILITY_SPOOFING", "MCP_RESOURCE_ATTACK", "MCP_SAMPLING_ABUSE", "MCP_TYPOSQUATTING", "MCP_PROTOCOL_VIOLATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["mcp_tool_calls", "mcp_capabilities", "mcp_resources", "mcp_sampling", "mcp_typosquatting", "json_rpc"],
      "source_file": "src/modules/mcp-parser.ts",
      "pattern_count": 0
    },
    {
      "module_id": "dos-detector",
      "display_name": "DoS Detector",
      "description": "Denial of Service attack detection (ReDoS, algorithmic complexity, memory exhaustion)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["DOS_RESOURCE_EXHAUSTION", "DOS_COMPUTATION_BOMB", "DOS_REGEX_BOMB"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["redos", "algorithmic_dos", "memory_exhaustion"],
      "source_file": "src/modules/dos-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "token-analyzer",
      "display_name": "Token Analyzer",
      "description": "Token boundary attack detection (BPE bypasses, vocabulary attacks, tokenizer evasion)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["TOKEN_LEAKAGE", "API_KEY_EXPOSURE", "JWT_ATTACK"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["bpe_boundary", "vocabulary_attack", "tokenizer_evasion"],
      "source_file": "src/modules/token-analyzer.ts",
      "pattern_count": 0
    },
    {
      "module_id": "session-bypass",
      "display_name": "Session Bypass",
      "description": "Session bypass pattern detection (token manipulation, context switching, state confusion)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["SESSION_FIXATION", "SESSION_HIJACKING", "SESSION_MANIPULATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["token_manipulation", "context_switching", "state_confusion"],
      "source_file": "src/modules/session-bypass.ts",
      "pattern_count": 0
    },
    {
      "module_id": "email-webfetch",
      "display_name": "Email & WebFetch",
      "description": "Email header injection, MIME manipulation, web-fetched content attack detection",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["EMAIL_INJECTION", "EMAIL_HEADER_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["email_headers", "mime_parts", "webfetch_responses"],
      "source_file": "src/modules/email-webfetch.ts",
      "pattern_count": 0
    },
    {
      "module_id": "vectordb-interface",
      "display_name": "VectorDB Interface",
      "description": "Vector database attack detection (Pinecone, Weaviate, ChromaDB, Qdrant)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["VECTORDB_INJECTION", "VECTORDB_METADATA_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["pinecone", "weaviate", "chromadb", "qdrant", "tenant_bypass"],
      "source_file": "src/modules/vectordb-interface.ts",
      "pattern_count": 0
    },
    {
      "module_id": "rag-analyzer",
      "display_name": "RAG Analyzer",
      "description": "RAG poisoning detection (boundary injection, context manipulation, citation spoofing)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["RAG_CONTEXT_POISONING", "RAG_INJECTION_VIA_EMBEDDINGS"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["boundary_injection", "context_injection", "relevance_manipulation", "citation_spoofing"],
      "source_file": "src/modules/rag-analyzer.ts",
      "pattern_count": 0
    },
    {
      "module_id": "supply-chain-detector",
      "display_name": "Supply Chain Detector",
      "description": "Supply chain attack detection (typosquatting, namespace confusion, dependency confusion)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["SUPPLY_CHAIN_COMPROMISE", "SUPPLY_CHAIN_DEPENDENCY_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["typosquatting", "namespace_confusion", "dependency_confusion"],
      "source_file": "src/modules/supply-chain-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "model-theft-detector",
      "display_name": "Model Theft Detector",
      "description": "Model theft pattern detection (weight extraction, knowledge distillation, capability inference)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["MODEL_THEFT_EXTRACTION", "MODEL_THEFT_DISTILLATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["weight_extraction", "knowledge_distillation", "capability_inference"],
      "source_file": "src/modules/model-theft-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "output-detector",
      "display_name": "Output Detector",
      "description": "Compromised LLM output detection (prompt disclosure, compliance confirmation, data leaks)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["OUTPUT_EVASION", "OUTPUT_ENCODING", "OUTPUT_FILTER_BYPASS"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["prompt_disclosure", "compliance_confirmation", "data_leak", "harmful_output"],
      "source_file": "src/modules/output-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "edgefuzz-detector",
      "display_name": "EdgeFuzz Detector",
      "description": "Robustness/fuzzing pattern detection (crash-inducing, extreme-length, control characters)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["EDGEFUZZ_BOUNDARY_CONDITION", "EDGEFUZZ_TYPE_CONFUSION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["crash_inducing", "extreme_length", "control_characters", "recursive_structures", "encoding_anomalies"],
      "source_file": "src/modules/edgefuzz-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "webmcp-detector",
      "display_name": "WebMCP Detector",
      "description": "WebMCP attack detection (tool result injection, indirect injection, SSE/WebSocket attacks)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["WEBMCP_INJECTION", "WEBMCP_ORIGIN_SPOOFING"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["tool_result_injection", "indirect_injection", "sse_websocket", "rug_pull", "tool_shadowing", "capability_downgrade"],
      "source_file": "src/modules/webmcp-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "document-pdf",
      "display_name": "Document PDF",
      "description": "PDF-based prompt injection detection (metadata, JavaScript, form fields, annotations)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["PDF_METADATA_INJECTION", "PDF_JAVASCRIPT_INJECTION", "PDF_FORM_INJECTION", "PDF_XFA_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["pdf_metadata", "pdf_javascript", "pdf_forms", "pdf_annotations", "pdf_actions"],
      "source_file": "src/modules/document-pdf.ts",
      "pattern_count": 23
    },
    {
      "module_id": "document-office",
      "display_name": "Document Office",
      "description": "Office document attack detection (macros, DDE, hidden content, OLE objects)",
      "tier": 1,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["OFFICE_MACRO_INJECTION", "OFFICE_XML_INJECTION", "OFFICE_LINK_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["office_macros", "office_dde", "office_hidden", "office_ole", "csv_injection"],
      "source_file": "src/modules/document-office.ts",
      "pattern_count": 20
    },
    {
      "module_id": "image-scanner",
      "display_name": "Image Scanner",
      "description": "Image-based attack detection (steganography, EXIF injection, SVG active content, OCR injection)",
      "tier": 1,
      "input_type": "binary",
      "deterministic": true,
      "detection_categories": ["IMAGE_STEGANOGRAPHY", "IMAGE_EXIF_INJECTION", "IMAGE_SVG_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["steganography", "exif_injection", "svg_injection", "ocr_injection", "format_validation"],
      "source_file": "src/modules/image-scanner.ts",
      "pattern_count": 15
    },
    {
      "module_id": "audio-scanner",
      "display_name": "Audio Scanner",
      "description": "Audio-based attack detection (ID3 injection, WAV comment injection, transcription injection)",
      "tier": 1,
      "input_type": "binary",
      "deterministic": true,
      "detection_categories": ["AUDIO_METADATA_INJECTION", "AUDIO_ID3_INJECTION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["audio_metadata", "id3_injection", "wav_comment", "transcription_injection"],
      "source_file": "src/modules/audio-scanner.ts",
      "pattern_count": 9
    },
    {
      "module_id": "social-engineering-detector",
      "display_name": "Social Engineering Detector",
      "description": "Indirect social engineering detection (system prompt extraction, trust exploitation, authority manipulation)",
      "tier": 2,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["SOCIAL_PHISHING", "SOCIAL_PRETEXTING", "SOCIAL_BAITING"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["prompt_extraction", "trust_exploitation", "authority_manipulation", "urgency"],
      "source_file": "src/modules/social-engineering-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "overreliance-detector",
      "display_name": "Overreliance Detector",
      "description": "Overreliance on unreliable external data or single source detection",
      "tier": 2,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["OVERRELIANCE_AUTHORITY_EXPLOIT", "OVERRELIANCE_DELEGATION_ATTACK"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["authority_exploitation", "source_manipulation"],
      "source_file": "src/modules/overreliance-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "bias-detector",
      "display_name": "Bias Detector",
      "description": "Bias amplification pattern detection in prompts (stereotypes, demographic targeting)",
      "tier": 2,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["BIAS_DEMOGRAPHIC", "BIAS_STEREOTYPE", "BIAS_FAIRNESS_VIOLATION"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["stereotype_reinforcement", "demographic_targeting", "harm_amplification"],
      "source_file": "src/modules/bias-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "deepfake-detector",
      "display_name": "Deepfake Detector",
      "description": "Deepfake indicator detection (synthetic text, AI-generated images, voice synthesis)",
      "tier": 2,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["DEEPFAKE_SYNTHETIC_TEXT", "DEEPFAKE_AI_IMAGE", "DEEPFAKE_VOICE"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["synthetic_text", "ai_image", "voice_synthesis"],
      "source_file": "src/modules/deepfake-detector.ts",
      "pattern_count": 0
    },
    {
      "module_id": "data-provenance",
      "display_name": "Data Provenance",
      "description": "Data provenance attack detection (source spoofing, training data leaks, attribution evasion)",
      "tier": 2,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["DATA_PROVENANCE_MISSING", "DATA_LINEAGE_BREACH"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["source_spoofing", "training_data_leak", "attribution_evasion"],
      "source_file": "src/modules/data-provenance.ts",
      "pattern_count": 0
    },
    {
      "module_id": "shingan-scanner",
      "display_name": "Shingan Scanner",
      "description": "Skill/agent trust scoring across 6 attack layers (metadata, payloads, exfiltration, social, supply-chain, context)",
      "tier": 2,
      "input_type": "text",
      "deterministic": true,
      "detection_categories": ["SKILL_METADATA_POISONING", "SKILL_PAYLOAD_INJECTION", "SKILL_EXFILTRATION", "SKILL_SOCIAL_ENGINEERING", "SKILL_SUPPLY_CHAIN", "SKILL_CONTEXT_POISONING"],
      "severity_levels": ["INFO", "WARNING", "CRITICAL"],
      "capabilities": ["metadata_poisoning", "code_payloads", "data_exfiltration", "social_engineering", "supply_chain_identity", "context_poisoning", "trust_scoring"],
      "source_file": "src/modules/shingan-scanner.ts",
      "pattern_count": 80
    }
  ]
}

```
