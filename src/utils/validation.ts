/**
 * Input validation helpers centered on Solana addresses.
 */

import { PublicKey } from '@solana/web3.js';

/** Returns true if `value` is a valid base58 ed25519 public key string. */
export function isValidPublicKey(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    // PublicKey constructor validates base58 + length; `isOnCurve` is not
    // required here because fee/referral recipients may be PDAs.
    // eslint-disable-next-line no-new
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/** Parse a `PublicKey`, returning `null` instead of throwing on invalid input. */
export function tryParsePublicKey(value: string | null | undefined): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

/** Assert and return a parsed `PublicKey`, throwing a descriptive error. */
export function requirePublicKey(value: string, label = 'public key'): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
}

/** Parse a fractional rate from a string, clamped to [0, 1]. */
export function parseRate(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, 1);
}

/** Parse a non-negative number from a string. */
export function parseNonNegativeNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/** Parse a boolean-ish env string (`"true"`, `"1"`, `"yes"`). */
export function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}
