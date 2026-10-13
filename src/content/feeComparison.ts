/**
 * What rent-reclaim tools charge, each in the tool's own words from its own site.
 * Mirrors the table on sniffprotocol.net/reclaim-sol-rent/ so the two never disagree.
 *
 * Re-check the competitor rows monthly: a stale competitor figure on our own
 * comparison is the fastest way to lose the trust this table is meant to earn.
 * Flat per-account fees are converted against the mainnet rent deposit
 * (1,488,440 lamports standard / 1,513,840 Token-2022 on the checked date).
 */
export const FEES_CHECKED = '2026-10-12';

export interface FeeRow {
  name: string;
  url: string;
  stated: string;
  effective: string;
  ours?: boolean;
}

export const FEE_ROWS: FeeRow[] = [
  {
    name: 'Closing them yourself',
    url: 'https://solana.com/docs/tokens/basics/close-account',
    stated: "No fee. Solana's documented close-account operation, one account at a time.",
    effective: '0%',
  },
  {
    name: 'SOLBurner (this site)',
    url: 'https://solburner.claims/',
    stated: '0.87% service fee on the SOL recovered, shown before you sign.',
    effective: '0.87%',
    ours: true,
  },
  {
    name: 'Sol Incinerator',
    url: 'https://sol-incinerator.com/',
    stated:
      '“about 0.00004 SOL per standard token account and about 0.00007 SOL per Token-2022 account”, taken from the rent reclaimed.',
    effective: '≈2.7% (standard) · ≈4.6% (Token-2022)',
  },
  {
    name: 'Claim Your Sol',
    url: 'https://claimyoursol.com/',
    stated:
      '“a 5% donation is included from the recovered SOL”, plus “a small service fee” with no amount given. Measured on-chain (56 claims to their fee wallet, Oct 13, 2026): 4% on most, 5% on the rest, no second fee. 1% on the 1st of every month. Until May 2026 it was 20% (“we dropped from 20% to 5%”, their blog, May 22, 2026).',
    effective: '4–5% measured (1% on the 1st)',
  },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Why is there SOL locked in my wallet?',
    a: 'Every token account holds a rent deposit of about 0.0015 SOL. When you sell or receive a token, an account is opened for it, and when its balance reaches zero the account stays open, still holding the deposit. Closing it returns that SOL to you.',
  },
  {
    q: 'Is it safe to connect my wallet?',
    a: 'The scan is read-only. When you recover, the app closes accounts back to your own wallet, burns only tokens you choose to burn, claims Pump.fun rewards to your wallet if you select them, and adds the SOL transfer for the service fee. It never asks for approvals, delegations or authority changes. Every transaction is simulated before you sign, and you can check it in your wallet’s preview. The source code is public, with the full list of instructions.',
  },
  {
    q: 'What does it cost?',
    a: '0.87% of the SOL recovered, plus Solana’s normal network fee. The exact fee and the amount you keep are shown before you sign.',
  },
  {
    q: 'Can I do this for free?',
    a: 'Yes. Solana lets you close token accounts yourself, one at a time, with no service fee. SOLBurner is for doing many at once in a single signature.',
  },
  {
    q: 'Which accounts get closed?',
    a: 'Empty accounts are pre-selected. Accounts that still hold tokens are only closed if you choose to burn those tokens first.',
  },
];
