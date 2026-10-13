/**
 * Display formatting helpers. Pure, dependency-free, and locale-aware.
 */

import { lamportsToSol } from './lamports';

const solFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const preciseSolFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 9,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('en-US');

/** Format lamports as a human SOL string, e.g. `1.2342`. */
export function formatSol(lamports: bigint, opts?: { precise?: boolean }): string {
  const sol = lamportsToSol(lamports);
  return (opts?.precise ? preciseSolFormatter : solFormatter).format(sol);
}

/** Format lamports as `1.2342 SOL`. */
export function formatSolWithUnit(lamports: bigint, opts?: { precise?: boolean }): string {
  return `${formatSol(lamports, opts)} SOL`;
}

/** Format a fractional rate (0.0087) as `0.87%`. */
export function formatPercent(rate: number): string {
  return percentFormatter.format(rate);
}

/** Format a USD amount. */
export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

/** Format an integer with thousands separators. */
export function formatCount(value: number): string {
  return integerFormatter.format(value);
}

/** Shorten a base58 address to `AbCd…WxYz`. */
export function shortenAddress(address: string, lead = 4, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Pluralize a noun based on count: `pluralize(1, 'account') => '1 account'`. */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${integerFormatter.format(count)} ${word}`;
}
