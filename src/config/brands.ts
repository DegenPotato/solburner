/**
 * Brand presets. Each white-label deployment selects one via `VITE_BRAND`.
 * Brand controls copy + social links; the *visual* identity (colors/fonts) lives
 * in the matching theme under `src/theme/themes`.
 */

import type { BrandConfig, BrandId } from './types';

/**
 * The published source of this app. Linked from every brand's footer: a wallet-
 * connecting tool should let people read what it signs instead of trusting it.
 * The placeholder socials that used to sit here (x.com, discord.com, github.com)
 * were dead links in production, which reads exactly like a throwaway dapp.
 */
const SOURCE_URL = 'https://github.com/DegenPotato/solburner';

/** solburner.claims' own X account (created 2026-10-13). Only the SOLBurner brand links it. */
const X_URL = 'https://x.com/solburnerapp';

const BRANDS: Record<BrandId, BrandConfig> = {
  professional: {
    id: 'professional',
    name: 'Sol Burner',
    tagline: 'Reclaim the SOL locked in your wallet.',
    description:
      'Empty token accounts each hold a small rent deposit. Close the ones you no longer need and recover that SOL — non-custodial, with fully transparent fees.',
    defaultTheme: 'professional',
    footerNote: 'Non-custodial. You sign every transaction. We never hold your funds.',
    documentTitle: 'Sol Burner — Reclaim your Solana rent',
    socials: [{ label: 'Source', href: SOURCE_URL, icon: 'github' }],
  },
  degen: {
    id: 'degen',
    name: 'SOLBurner',
    tagline: 'Burn the junk. Stack the SOL.',
    description:
      'Your wallet is full of dead accounts paying rent for nothing. Torch them, claim your SOL back, and keep more of it than anywhere else.',
    defaultTheme: 'degen',
    footerNote: 'gm. non-custodial. you sign, you win. ngmi if you leave rent on the table.',
    // Search engines show this title; it carries what people search for, the tagline stays on the page.
    documentTitle: 'SOLBurner — Reclaim Solana rent from empty token accounts (0.87% fee)',
    socials: [
      { label: 'X', href: X_URL, icon: 'twitter' },
      { label: 'Source', href: SOURCE_URL, icon: 'github' },
    ],
  },
  minimal: {
    id: 'minimal',
    name: 'Rent Recover',
    tagline: 'Recover account rent. Verifiably.',
    description:
      'A security-first utility for closing unused SPL token accounts and reclaiming their rent deposit. Every action is simulated and explained before you sign.',
    defaultTheme: 'minimal',
    footerNote: 'Open process. Simulated transactions. No custody, no hidden actions.',
    documentTitle: 'Rent Recover — verifiable account rent recovery',
    socials: [{ label: 'Source', href: SOURCE_URL, icon: 'github' }],
  },
};

export function getBrand(id: BrandId): BrandConfig {
  return BRANDS[id];
}
