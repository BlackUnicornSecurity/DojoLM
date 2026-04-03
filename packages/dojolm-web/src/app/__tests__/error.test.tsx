/**
 * Tests for error boundary page (error.tsx)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorPage from '../error';

const makeError = (msg: string) => Object.assign(new globalThis.Error(msg), { digest: 'test-digest' });

describe('Error boundary page', () => {
  it('renders 500 heading', () => {
    render(<ErrorPage error={makeError('test')} reset={vi.fn()} />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows "Something went wrong" message', () => {
    render(<ErrorPage error={makeError('test')} reset={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders Try again button', () => {
    render(<ErrorPage error={makeError('test')} reset={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('calls reset on button click', () => {
    const reset = vi.fn();
    render(<ErrorPage error={makeError('test')} reset={reset} />);
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
