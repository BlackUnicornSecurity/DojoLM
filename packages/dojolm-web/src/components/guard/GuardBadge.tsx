'use client';

/**
 * File: GuardBadge.tsx
 * Purpose: Small badge for LLM Dashboard header showing guard status
 * Story: TPI-UIP-11
 */

import { useState, useEffect } from 'react';
import type { GuardConfig } from '@/lib/guard-types';
import { GUARD_MODES, GUARD_MODE_ICONS } from '@/lib/guard-constants';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

/**
 * GuardBadge: standalone badge that fetches its own state.
 * Does not require GuardProvider — safe to use in LLM Dashboard header.
 */
export function GuardBadge() {
  const [config, setConfig] = useState<GuardConfig | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/llm/guard');
        if (res.ok) {
          const { data } = await res.json();
          setConfig(data);
        }
      } catch {
        // Silent failure
      }
    };
    load();
  }, []);

  if (!config) return null;

  const modeInfo = GUARD_MODES.find((m) => m.id === config.mode);
  const ModeIcon = (config.mode in GUARD_MODE_ICONS)
    ? GUARD_MODE_ICONS[config.mode]
    : ShieldAlert;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        config.enabled
          ? 'bg-[var(--dojo-subtle)] text-[var(--dojo-primary-lg)] border border-[var(--dojo-primary)]/30'
          : 'bg-muted text-muted-foreground border border-border'
      )}
      aria-label={config.enabled ? `Guard active: ${modeInfo?.name ?? config.mode} mode` : 'Guard disabled'}
    >
      <ModeIcon className="w-3 h-3" aria-hidden="true" />
      {config.enabled ? (
        <span>{modeInfo?.name ?? config.mode}</span>
      ) : (
        <span>Off</span>
      )}
    </span>
  );
}
