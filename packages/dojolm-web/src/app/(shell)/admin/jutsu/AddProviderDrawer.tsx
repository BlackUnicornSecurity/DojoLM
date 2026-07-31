// SPDX-License-Identifier: Apache-2.0
/**
 * AddProviderDrawer — `/admin/jutsu` add-provider entry point.
 *
 * Three modes (segmented control at the top of the drawer):
 *   - Cloud API     — frontier providers (Anthropic, OpenAI, Google,…).
 *                     Operator picks the provider, pastes the API key,
 *                     and "Fetch live list" calls
 *                     `POST /api/llm/discover-api-models` to populate
 *                     the model dropdown from the upstream `/v1/models`
 *                     endpoint. Curated `DEFAULT_MODELS` are shown until
 *                     the live list arrives so the dropdown is never
 *                     empty.
 *   - Local infra   — Ollama / LM Studio / llama.cpp. Operator types the
 *                     server URL, "Discover" calls
 *                     `GET /api/llm/local-models?provider=…&baseUrl=…`,
 *                     and selected models are saved as one row each
 *                     (multi-add).
 *   - Custom        — escape hatch with the original raw schema (name /
 *                     provider id / model id / api key / base url) for
 *                     OpenAI-compatible endpoints that aren't on either
 *                     of the lists above.
 *
 * Save path is unchanged in all three modes: each row is `POST /api/llm/models`
 * under `withAuth` with the CSRF cookie threaded via `readCsrfToken`.
 *
 * The Cloud and Custom modes preserve the legacy testids
 * (`jutsu-add-name`, `jutsu-add-provider`, `jutsu-add-model`,
 * `jutsu-add-base-url`) so the issue #349 baseUrl-scheme tests still
 * exercise the same submit-time validation. The new modes add fresh
 * testids prefixed `jutsu-cloud-…` / `jutsu-local-…` for their own
 * coverage.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
// A.5 consolidation (UI Coherence Phase 1 W2): migrated from
// `@/design/codex/Drawer` to the canonical `@/design/primitives/Drawer`
// with `variant="form"`. The form business logic below (CloudMode +
// LocalMode + CustomMode + FormButtons + the 8 hard-coded presets +
// the show-secret-once + 30s clipboard auto-clear UX) is UNCHANGED —
// only the import path + the `variant` prop are new. AddProviderDrawer's
// caller (`JutsuClient.tsx` line 613) is untouched.
import { Drawer } from "@/design/primitives/Drawer";
import { readCsrfToken } from "@/lib/csrf-cookie";
import {
  DEFAULT_MODELS,
  PROVIDER_BASE_URLS,
  PROVIDER_INFO,
} from "@/lib/llm-constants";
import type { LLMProvider } from "@/lib/llm-types";
import {
  FormButtons,
  ModeTabs,
  type AddProviderMode as Mode,
} from "./AddProviderDrawerParts";

const NAME_FIELD_MAX = 200;
const MODEL_FIELD_MAX = 200;
const PROVIDER_FIELD_MAX = 100;
const URL_FIELD_MAX = 500;

const CLOUD_PROVIDERS: readonly LLMProvider[] = [
  "anthropic",
  "openai",
  "google",
  "mistral",
  "deepseek",
  "groq",
  "together",
  "fireworks",
  "cohere",
  "zai",
  "moonshot",
  "blackunicorn",
] as const;

interface LocalProviderPreset {
  readonly id: "ollama" | "lmstudio" | "llamacpp";
  readonly label: string;
  readonly defaultUrl: string;
}

const LOCAL_PROVIDERS: readonly LocalProviderPreset[] = [
  { id: "ollama", label: "Ollama", defaultUrl: "http://localhost:11434" },
  { id: "lmstudio", label: "LM Studio", defaultUrl: "http://localhost:1234" },
  { id: "llamacpp", label: "llama.cpp", defaultUrl: "http://localhost:8080" },
] as const;

interface DiscoveredApiModel {
  readonly id: string;
  readonly name: string;
}

interface DiscoveredLocalModel {
  readonly id: string;
  readonly name: string;
  readonly sizeFormatted?: string;
  readonly quantization?: string;
}

export type AddProviderError = "invalid" | "forbidden" | "server" | "network";

export interface AddProviderDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmitted: () => void | Promise<void>;
  readonly onError: (code: AddProviderError) => void;
}

export function AddProviderDrawer({
  open,
  onClose,
  onSubmitted,
  onError,
}: AddProviderDrawerProps): ReactElement {
  const [mode, setMode] = useState<Mode>("cloud");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add provider"
      sub="Pick a category. Cloud-API keys auto-discover models; local infra discovers what's running."
      variant="form"
      /* `titleAs="h3"` preserves the pre-A.5 codex/Drawer heading
         element type. The codex archetype rendered the title as <h3>;
         the new canonical Drawer defaults to <h2> (matching the
         ActivityLogDrawer pre-A.5 native-<dialog> heading + the broader
         dialog convention). Without this override the document-outline
         heading order on `/admin/jutsu` would shift silently for SR
         users when AddProviderDrawer opens. MED-1 from the A.5
         independent review. */
      titleAs="h3"
      className="dojo-add-provider-drawer"
      closeLabel="Close add provider"
    >
      <div data-testid="jutsu-add-provider-drawer">
        <ModeTabs mode={mode} onChange={setMode} />
        {mode === "cloud" && (
          <CloudMode
            onSubmitted={onSubmitted}
            onClose={onClose}
            onError={onError}
          />
        )}
        {mode === "local" && (
          <LocalMode
            onSubmitted={onSubmitted}
            onClose={onClose}
            onError={onError}
          />
        )}
        {mode === "custom" && (
          <CustomMode
            onSubmitted={onSubmitted}
            onClose={onClose}
            onError={onError}
          />
        )}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Shared submit helper
// ---------------------------------------------------------------------------

interface SaveModelInput {
  readonly name: string;
  readonly provider: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

async function saveModelRow(input: SaveModelInput): Promise<Response> {
  const csrf = readCsrfToken();
  const payload: Record<string, unknown> = {
    name: input.name.slice(0, NAME_FIELD_MAX),
    provider: input.provider.slice(0, PROVIDER_FIELD_MAX),
    model: input.model.slice(0, MODEL_FIELD_MAX),
  };
  if (input.apiKey) payload.apiKey = input.apiKey;
  if (input.baseUrl) payload.baseUrl = input.baseUrl.slice(0, URL_FIELD_MAX);
  return fetch("/api/llm/models", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
    },
    body: JSON.stringify(payload),
  });
}

function classifyError(status: number): AddProviderError {
  if (status === 401 || status === 403) return "forbidden";
  if (status === 400) return "invalid";
  return "server";
}

// ---------------------------------------------------------------------------
// Cloud API mode
// ---------------------------------------------------------------------------

interface CloudFormProps {
  readonly onSubmitted: () => void | Promise<void>;
  readonly onClose: () => void;
  readonly onError: (code: AddProviderError) => void;
}

function CloudMode({
  onSubmitted,
  onClose,
  onError,
}: CloudFormProps): ReactElement {
  const [provider, setProvider] = useState<LLMProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<DiscoveredApiModel[]>(() =>
    curatedAsDiscovered(provider),
  );
  const [model, setModel] = useState<string>(() => models[0]?.id ?? "");
  const [name, setName] = useState<string>(() => defaultDisplayName(provider));
  const [discovering, setDiscovering] = useState(false);
  const [adding, setAdding] = useState(false);
  const [source, setSource] = useState<"curated" | "live" | "fallback">(
    "curated",
  );
  const [discoverErr, setDiscoverErr] = useState<string>("");

  // Reset model list when provider changes.
  useEffect(() => {
    const next = curatedAsDiscovered(provider);
    setModels(next);
    setModel(next[0]?.id ?? "");
    setSource("curated");
    setDiscoverErr("");
    setName((prev) => {
      // Only rewrite the auto-default; keep operator edits.
      if (prev && !isAutoName(prev)) return prev;
      return defaultDisplayName(provider);
    });
  }, [provider]);

  const onDiscover = useCallback(async () => {
    if (discovering) return;
    setDiscovering(true);
    setDiscoverErr("");
    try {
      const csrf = readCsrfToken();
      const res = await fetch("/api/llm/discover-api-models", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      });
      if (!res.ok) {
        setDiscoverErr(`Discovery failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as {
        models?: DiscoveredApiModel[];
        source?: "live" | "fallback";
      };
      const next =
        data.models && data.models.length > 0
          ? data.models
          : curatedAsDiscovered(provider);
      setModels(next);
      setSource(data.source ?? "curated");
      // Preserve current selection if still present, otherwise pick first.
      setModel((prev) =>
        next.find((m) => m.id === prev) ? prev : (next[0]?.id ?? ""),
      );
    } catch {
      setDiscoverErr("Network error during discovery");
    } finally {
      setDiscovering(false);
    }
  }, [apiKey, discovering, provider]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (adding) return;
      if (!name.trim() || !provider || !model.trim()) {
        onError("invalid");
        return;
      }
      setAdding(true);
      try {
        const res = await saveModelRow({
          name: name.trim(),
          provider,
          model: model.trim(),
          apiKey: apiKey.trim() || undefined,
          baseUrl: PROVIDER_BASE_URLS[provider] ?? undefined,
        });
        if (!res.ok) {
          onError(classifyError(res.status));
          return;
        }
        await onSubmitted();
        onClose();
      } catch {
        onError("network");
      } finally {
        setAdding(false);
      }
    },
    [adding, apiKey, model, name, onClose, onError, onSubmitted, provider],
  );

  const sourceLabel = useMemo(() => {
    switch (source) {
      case "live":
        return "Live list from provider";
      case "fallback":
        return "Curated fallback (provider list unavailable)";
      case "curated":
      default:
        return "Curated defaults — paste key + Fetch for live list";
    }
  }, [source]);

  return (
    <form
      onSubmit={onSubmit}
      className="yr4-kv-stack"
      aria-label="Add cloud provider"
    >
      <label className="wb-field">
        <span>Provider</span>
        <select
          className="wb-input"
          data-testid="jutsu-add-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as LLMProvider)}
        >
          {CLOUD_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_INFO[p]?.name ?? p}
            </option>
          ))}
        </select>
      </label>

      <label className="wb-field">
        <span>API key</span>
        {/* E9.S8 round-2 (V5 W3aa QA): use new-password not off for
            password-type inputs. Browsers may ignore autoComplete="off"
            on type="password"; new-password is the WHATWG-spec token
            that reliably suppresses password-manager autofill for
            non-login secret fields (LLM API keys here). */}
        <input
          type="password"
          className="wb-input"
          data-testid="jutsu-cloud-api-key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="new-password"
          placeholder={apiKey ? "" : "sk-…"}
        />
      </label>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <label className="wb-field" style={{ flex: 1 }}>
          <span>Model</span>
          <select
            className="wb-input"
            data-testid="jutsu-add-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn"
          data-testid="jutsu-cloud-discover"
          onClick={onDiscover}
          disabled={discovering || !apiKey.trim()}
          aria-busy={discovering}
          style={{ height: 32 }}
        >
          {discovering ? "Fetching…" : "Fetch live list"}
        </button>
      </div>
      <div
        className="wb-hint"
        data-testid="jutsu-cloud-source"
        style={{ fontSize: 11, marginTop: -8 }}
      >
        {sourceLabel}
      </div>
      {discoverErr && (
        <div
          role="alert"
          className="wb-hint"
          data-testid="jutsu-cloud-discover-err"
          style={{ fontSize: 11, color: "var(--torii-hi, #ef4444)" }}
        >
          {discoverErr}
        </div>
      )}

      <label className="wb-field">
        <span>Display name</span>
        <input
          type="text"
          className="wb-input"
          data-testid="jutsu-add-name"
          value={name}
          maxLength={NAME_FIELD_MAX}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          required
        />
      </label>

      <FormButtons
        adding={adding}
        onCancel={onClose}
        submitTestId="jutsu-add-submit"
        submitLabel="Save provider"
      />
    </form>
  );
}

function curatedAsDiscovered(provider: LLMProvider): DiscoveredApiModel[] {
  const ids = DEFAULT_MODELS[provider] ?? [];
  return ids.map((id) => ({ id, name: id }));
}

function defaultDisplayName(provider: LLMProvider): string {
  const label = PROVIDER_INFO[provider]?.name ?? provider;
  return `${label} candidate`;
}

function isAutoName(name: string): boolean {
  return /\bcandidate$/i.test(name.trim());
}

// ---------------------------------------------------------------------------
// Local infra mode
// ---------------------------------------------------------------------------

function LocalMode({
  onSubmitted,
  onClose,
  onError,
}: CloudFormProps): ReactElement {
  const [provider, setProvider] = useState<LocalProviderPreset["id"]>("ollama");
  const [baseUrl, setBaseUrl] = useState<string>(LOCAL_PROVIDERS[0].defaultUrl);
  const [discovering, setDiscovering] = useState(false);
  const [adding, setAdding] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredLocalModel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discoverErr, setDiscoverErr] = useState<string>("");

  useEffect(() => {
    const preset = LOCAL_PROVIDERS.find((p) => p.id === provider);
    if (preset) setBaseUrl(preset.defaultUrl);
    setDiscovered([]);
    setSelected(new Set());
    setDiscoverErr("");
  }, [provider]);

  const onDiscover = useCallback(async () => {
    if (discovering) return;
    setDiscovering(true);
    setDiscoverErr("");
    setDiscovered([]);
    setSelected(new Set());
    try {
      const trimmed = baseUrl.trim();
      if (trimmed) {
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            setDiscoverErr("Only http(s) URLs allowed");
            return;
          }
        } catch {
          setDiscoverErr("Invalid URL");
          return;
        }
      }
      const url = `/api/llm/local-models?provider=${encodeURIComponent(provider)}&baseUrl=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        setDiscoverErr(`Discovery failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { models?: DiscoveredLocalModel[] };
      const list = data.models ?? [];
      if (list.length === 0) {
        setDiscoverErr("Connected, but no models found.");
        return;
      }
      setDiscovered(list);
      setSelected(new Set(list.map((m) => m.id)));
    } catch {
      setDiscoverErr("Network error — is the server running?");
    } finally {
      setDiscovering(false);
    }
  }, [baseUrl, discovering, provider]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (adding) return;
      if (selected.size === 0) {
        onError("invalid");
        return;
      }
      setAdding(true);
      try {
        const trimmed = baseUrl.trim();
        let firstFailureCode: AddProviderError | null = null;
        let added = 0;
        for (const id of selected) {
          const meta = discovered.find((m) => m.id === id);
          if (!meta) continue;
          const res = await saveModelRow({
            name: `${labelForProvider(provider)} - ${meta.name}`,
            provider,
            model: meta.id,
            baseUrl: trimmed || undefined,
          });
          if (!res.ok) {
            if (!firstFailureCode) firstFailureCode = classifyError(res.status);
          } else {
            added += 1;
          }
        }
        if (added === 0 && firstFailureCode) {
          onError(firstFailureCode);
          return;
        }
        await onSubmitted();
        onClose();
      } catch {
        onError("network");
      } finally {
        setAdding(false);
      }
    },
    [
      adding,
      baseUrl,
      discovered,
      onClose,
      onError,
      onSubmitted,
      provider,
      selected,
    ],
  );

  return (
    <form
      onSubmit={onSubmit}
      className="yr4-kv-stack"
      aria-label="Add local infra provider"
    >
      <label className="wb-field">
        <span>Local infrastructure</span>
        <select
          className="wb-input"
          data-testid="jutsu-local-provider"
          value={provider}
          onChange={(e) =>
            setProvider(e.target.value as LocalProviderPreset["id"])
          }
        >
          {LOCAL_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <label className="wb-field" style={{ flex: 1 }}>
          <span>Server URL</span>
          <input
            type="url"
            className="wb-input"
            data-testid="jutsu-local-base-url"
            value={baseUrl}
            maxLength={URL_FIELD_MAX}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn"
          data-testid="jutsu-local-discover"
          onClick={onDiscover}
          disabled={discovering || !baseUrl.trim()}
          aria-busy={discovering}
          style={{ height: 32 }}
        >
          {discovering ? "Discovering…" : "Discover"}
        </button>
      </div>

      {discoverErr && (
        <div
          role="alert"
          className="wb-hint"
          data-testid="jutsu-local-err"
          style={{ fontSize: 11, color: "var(--torii-hi, #ef4444)" }}
        >
          {discoverErr}
        </div>
      )}

      {discovered.length > 0 && (
        <div
          data-testid="jutsu-local-list"
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <span className="wb-hint" style={{ fontSize: 11 }}>
            {discovered.length} model{discovered.length !== 1 ? "s" : ""} found
            · {selected.size} selected
          </span>
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              border: "1px solid var(--b-1, #333)",
              borderRadius: 6,
              padding: 6,
            }}
          >
            {discovered.map((m) => (
              <label
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 6px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  data-testid={`jutsu-local-model-${m.id}`}
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                  {(m.sizeFormatted || m.quantization) && (
                    <div className="wb-hint" style={{ fontSize: 11 }}>
                      {[m.sizeFormatted, m.quantization]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <FormButtons
        adding={adding}
        onCancel={onClose}
        submitTestId="jutsu-local-submit"
        submitLabel={
          selected.size > 1 ? `Save ${selected.size} models` : "Save model"
        }
        disabled={selected.size === 0}
      />
    </form>
  );
}

function labelForProvider(id: LocalProviderPreset["id"]): string {
  return LOCAL_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Custom mode (legacy raw schema)
// ---------------------------------------------------------------------------

function CustomMode({
  onSubmitted,
  onClose,
  onError,
}: CloudFormProps): ReactElement {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (adding) return;
      if (!name.trim() || !provider.trim() || !model.trim()) {
        onError("invalid");
        return;
      }
      const baseUrlTrim = baseUrl.trim();
      if (baseUrlTrim) {
        try {
          const parsed = new URL(baseUrlTrim);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            onError("invalid");
            return;
          }
        } catch {
          onError("invalid");
          return;
        }
      }
      setAdding(true);
      try {
        const res = await saveModelRow({
          name: name.trim(),
          provider: provider.trim(),
          model: model.trim(),
          apiKey: apiKey.trim() || undefined,
          baseUrl: baseUrlTrim || undefined,
        });
        if (!res.ok) {
          onError(classifyError(res.status));
          return;
        }
        await onSubmitted();
        onClose();
      } catch {
        onError("network");
      } finally {
        setAdding(false);
      }
    },
    [
      adding,
      apiKey,
      baseUrl,
      model,
      name,
      onClose,
      onError,
      onSubmitted,
      provider,
    ],
  );

  return (
    <form
      onSubmit={onSubmit}
      className="yr4-kv-stack"
      aria-label="Add provider form"
    >
      <label className="wb-field">
        <span>Display name</span>
        <input
          type="text"
          className="wb-input"
          data-testid="jutsu-add-name"
          value={name}
          maxLength={NAME_FIELD_MAX}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      <label className="wb-field">
        <span>Provider id</span>
        <input
          type="text"
          className="wb-input"
          data-testid="jutsu-add-provider"
          value={provider}
          maxLength={PROVIDER_FIELD_MAX}
          onChange={(e) => setProvider(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      <label className="wb-field">
        <span>Model id</span>
        <input
          type="text"
          className="wb-input"
          data-testid="jutsu-add-model"
          value={model}
          maxLength={MODEL_FIELD_MAX}
          onChange={(e) => setModel(e.target.value)}
          autoComplete="off"
          required
        />
      </label>
      <label className="wb-field">
        <span>API key (optional — masked on save)</span>
        {/* E9.S8 round-2: see Cloud API key block above. */}
        <input
          type="password"
          className="wb-input"
          data-testid="jutsu-add-api-key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="wb-field">
        <span>Base URL (optional)</span>
        <input
          type="url"
          className="wb-input"
          data-testid="jutsu-add-base-url"
          value={baseUrl}
          maxLength={URL_FIELD_MAX}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://"
          autoComplete="off"
        />
      </label>
      <FormButtons
        adding={adding}
        onCancel={onClose}
        submitTestId="jutsu-add-submit"
        submitLabel="Save provider"
      />
    </form>
  );
}
