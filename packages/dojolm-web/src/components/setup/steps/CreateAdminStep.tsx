/**
 * File: CreateAdminStep.tsx
 * Purpose: Step 1 — Create the initial admin account
 * Story: Setup Wizard
 */

'use client';

import { useState, type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface CreateAdminStepProps {
  onComplete: (username: string) => void;
}

interface PasswordCheck {
  label: string;
  valid: boolean;
}

function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: '12-72 characters', valid: password.length >= 12 && password.length <= 72 },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Number', valid: /[0-9]/.test(password) },
    { label: 'Special character', valid: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function CreateAdminStep({ onComplete }: CreateAdminStepProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = getPasswordChecks(password);
  const allPasswordChecksPass = passwordChecks.every(c => c.valid);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!allPasswordChecksPass) {
      setError('Password does not meet complexity requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });

      if (res.ok) {
        onComplete(username.trim());
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed to create account' }));
        setError(data.error || 'Failed to create account');
        setSubmitting(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Create Admin Account</CardTitle>
        <CardDescription>
          Set up the primary administrator account for your platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="setup-username">Username *</Label>
            <Input
              id="setup-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
              disabled={submitting}
              minLength={3}
              maxLength={64}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setup-email">Email</Label>
            <Input
              id="setup-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              disabled={submitting}
              maxLength={254}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setup-display-name">Display Name</Label>
            <Input
              id="setup-display-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Platform Admin"
              disabled={submitting}
              maxLength={128}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setup-password">Password *</Label>
            <div className="relative">
              <Input
                id="setup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Strong password"
                autoComplete="new-password"
                required
                disabled={submitting}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {passwordChecks.map(check => (
                  <div
                    key={check.label}
                    className={check.valid ? 'text-emerald-500' : 'text-muted-foreground'}
                  >
                    {check.valid ? '\u2713' : '\u2022'} {check.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="setup-confirm-password">Confirm Password *</Label>
            <Input
              id="setup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !allPasswordChecksPass || !passwordsMatch || username.trim().length < 3}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Admin Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
