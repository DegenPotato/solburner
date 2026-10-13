/**
 * Brand presets. Each white-label deployment selects one via `VITE_BRAND`.
 * Brand controls copy + social links; the *visual* identity (colors/fonts) lives
 * in the matching theme under `src/theme/themes`.
 */

import type { BrandConfig, BrandId } from './types';

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
    socials: [
      { label: 'Docs', href: 'https://docs.example.com', icon: 'docs' },
      { label: 'X', href: 'https://x.com', icon: 'twitter' },
      { label: 'GitHub', href: 'https://github.com', icon: 'github' },
    ],
  },
  degen: {
    id: 'degen',
    name: 'SOLBurner',
    tagline: 'Burn the junk. Stack the SOL.',
    description:
      'Your wallet is full of dead accounts paying rent for nothing. Torch them, claim your SOL back, and keep more of it than anywhere else.',
    defaultTheme: 'degen',
    footerNote: 'gm. non-custodial. you sign, you win. ngmi if you leave rent on the table.',
    documentTitle: 'SOLBurner — burn the junk, stack the SOL',
    socials: [
      { label: 'X', href: 'https://x.com', icon: 'twitter' },
      { label: 'Discord', href: 'https://discord.com', icon: 'discord' },
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
    socials: [
      { label: 'Docs', href: 'https://docs.example.com', icon: 'docs' },
      { label: 'GitHub', href: 'https://github.com', icon: 'github' },
    ],
  },
};

export function getBrand(id: BrandId): BrandConfig {
  return BRANDS[id];
}
