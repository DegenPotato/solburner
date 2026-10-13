/**
 * Lamport <-> SOL conversions.
 *
 * All monetary domain logic operates in **lamports** (integer `bigint`) to avoid
 * floating-point drift. Conversion to a `number` of SOL happens only at the
 * display boundary.
 */

export const LAMPORTS_PER_SOL = 1_000_000_000n;

/** Convert a `bigint` lamport amount to a `number` of SOL (lossy — display only). */
export function lamportsToSol(lamports: bigint): number {
  // Split integer/fraction to keep precision for typical balances.
  const whole = lamports / LAMPORTS_PER_SOL;
  const frac = lamports % LAMPORTS_PER_SOL;
  return Number(whole) + Number(frac) / Number(LAMPORTS_PER_SOL);
}

/** Convert a SOL `number` to integer lamports (`bigint`), rounded to nearest. */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
}

/** Sum a list of bigint lamports safely. */
export function sumLamports(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const v of values) total += v;
  return total;
}

/** Clamp a bigint between an inclusive min and max. */
export function clampBigInt(value: bigint, min: bigint, max: bigint): bigint {
  if (max < min) return value;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
