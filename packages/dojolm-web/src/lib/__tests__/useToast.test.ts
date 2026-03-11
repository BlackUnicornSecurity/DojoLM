/**
 * File: useToast.test.ts
 * Purpose: Tests for useToast hook
 * Source: src/lib/hooks/useToast.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../hooks/useToast';

describe('useToast', () => {
  it('UT-001: starts with empty toasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('UT-002: toast() adds a toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'success', title: 'Done' });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Done');
    expect(result.current.toasts[0].variant).toBe('success');
  });

  it('UT-003: toast() returns an id', () => {
    const { result } = renderHook(() => useToast());
    let id: string = '';
    act(() => {
      id = result.current.toast({ variant: 'error', title: 'Fail' });
    });
    expect(id).toMatch(/^toast-/);
  });

  it('UT-004: multiple toasts accumulate', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'success', title: 'One' });
      result.current.toast({ variant: 'error', title: 'Two' });
      result.current.toast({ variant: 'warning', title: 'Three' });
    });
    expect(result.current.toasts).toHaveLength(3);
  });

  it('UT-005: dismiss() removes a specific toast', () => {
    const { result } = renderHook(() => useToast());
    let id: string = '';
    act(() => {
      result.current.toast({ variant: 'success', title: 'Keep' });
      id = result.current.toast({ variant: 'error', title: 'Remove' });
    });
    act(() => {
      result.current.dismiss(id);
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Keep');
  });

  it('UT-006: dismissAll() clears all toasts', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'success', title: 'One' });
      result.current.toast({ variant: 'error', title: 'Two' });
    });
    act(() => {
      result.current.dismissAll();
    });
    expect(result.current.toasts).toEqual([]);
  });

  it('UT-007: toast preserves description', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'info', title: 'Info', description: 'Details here' });
    });
    expect(result.current.toasts[0].description).toBe('Details here');
  });

  it('UT-008: toast preserves action', () => {
    const onClick = vi.fn();
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'success', title: 'Act', action: { label: 'Undo', onClick } });
    });
    expect(result.current.toasts[0].action).toBeDefined();
    expect(result.current.toasts[0].action!.label).toBe('Undo');
  });

  it('UT-009: dismiss non-existent id is a no-op', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'success', title: 'Keep' });
    });
    act(() => {
      result.current.dismiss('non-existent-id');
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('UT-010: each toast gets a unique id', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ variant: 'success', title: 'A' });
      result.current.toast({ variant: 'success', title: 'B' });
    });
    const ids = result.current.toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
