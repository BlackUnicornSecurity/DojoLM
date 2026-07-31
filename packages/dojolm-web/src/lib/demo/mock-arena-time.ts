// SPDX-License-Identifier: Apache-2.0

const DEMO_NOW = new Date();

export function daysAgo(days: number): string {
  return new Date(DEMO_NOW.getTime() - days * 86_400_000).toISOString();
}

export function hoursAgo(hours: number): string {
  return new Date(DEMO_NOW.getTime() - hours * 3_600_000).toISOString();
}
