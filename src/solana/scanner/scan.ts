/**
 * Token-account scanner: discovers every SPL token account owned by a wallet
 * across both token programs and produces coarse-classified assets
 * (`empty` / `nft` / `token`). Richer kinds are layered on later by the
 * discovery orchestrator (cNFTs, domains) and the classifier (lp, unknown).
 *
 * Uses `getParsedTokenAccountsByOwner` so balances/decimals/freeze-state come
 * back decoded. Both programs are queried in parallel.
 */

import { PublicKey } from '@solana/web3.js';
import type { ParsedAccountData } from '@solana/web3.js';
import type { AssetKind, DiscoveredAccount, TokenProgram } from '@/core/types';
import { actionForKind, categorizeAccount } from '@/core/rent/rent';
import { createLogger } from '@/utils/logger';
import { SCANNED_TOKEN_PROGRAMS } from '../constants';
import type { RpcClient } from '../rpc/connection';

const log = createLogger('scanner');

interface ParsedTokenExtension {
  extension: string;
  state?: { withheldAmount?: string | number };
}

interface ParsedTokenInfo {
  mint: string;
  tokenAmount: { amount: string; decimals: number; uiAmount: number | null };
  state?: string;
  extensions?: ParsedTokenExtension[];
}

/** Extract Token-2022 withheld transfer-fee amount from parsed extensions. */
function readWithheldAmount(info: ParsedTokenInfo): bigint {
  const ext = info.extensions?.find((e) => e.extension === 'transferFeeAmount');
  const raw = ext?.state?.withheldAmount;
  if (raw === undefined || raw === null) return 0n;
  try {
    return typeof raw === 'string' ? BigInt(raw) : BigInt(Math.trunc(raw));
  } catch {
    return 0n;
  }
}

function isParsedTokenAccount(data: unknown): data is ParsedAccountData & {
  parsed: { info: ParsedTokenInfo };
} {
  const parsed = (data as ParsedAccountData)?.parsed as { info?: ParsedTokenInfo } | undefined;
  return Boolean(parsed?.info?.tokenAmount && parsed.info.mint);
}

async function scanProgram(
  rpc: RpcClient,
  owner: PublicKey,
  program: { id: PublicKey; tag: TokenProgram },
): Promise<DiscoveredAccount[]> {
  const response = await rpc.perform(`getParsedTokenAccountsByOwner:${program.tag}`, (connection) =>
    connection.getParsedTokenAccountsByOwner(owner, { programId: program.id }),
  );

  const accounts: DiscoveredAccount[] = [];
  for (const { pubkey, account } of response.value) {
    if (!isParsedTokenAccount(account.data)) continue;
    const info = account.data.parsed.info;

    let rawAmount: bigint;
    try {
      rawAmount = BigInt(info.tokenAmount.amount);
    } catch {
      rawAmount = 0n;
    }

    const decimals = info.tokenAmount.decimals;
    const kind = categorizeAccount(rawAmount, decimals);
    const address = pubkey.toBase58();

    accounts.push({
      id: address,
      address,
      mint: info.mint,
      program: program.tag,
      kind,
      action: actionForKind(kind),
      rawAmount,
      decimals,
      uiAmount: info.tokenAmount.uiAmount ?? 0,
      rentLamports: BigInt(account.lamports),
      isFrozen: info.state === 'frozen',
      withheldAmount: program.tag === 'token-2022' ? readWithheldAmount(info) : 0n,
    });
  }
  return accounts;
}

export interface ScanOptions {
  includeNonEmpty?: boolean;
  includeFrozen?: boolean;
}

export interface TokenScanResult {
  accounts: DiscoveredAccount[];
  partial: boolean;
}

/** Scan a wallet's token accounts across all supported token programs. */
export async function scanTokenAccounts(
  rpc: RpcClient,
  ownerAddress: string,
  options: ScanOptions = {},
): Promise<TokenScanResult> {
  const { includeNonEmpty = true, includeFrozen = false } = options;
  const owner = new PublicKey(ownerAddress);

  const settled = await Promise.allSettled(
    SCANNED_TOKEN_PROGRAMS.map((program) => scanProgram(rpc, owner, program)),
  );

  let partial = false;
  let discovered: DiscoveredAccount[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') discovered = discovered.concat(result.value);
    else {
      partial = true;
      log.error('token program scan failed', { reason: String(result.reason) });
    }
  }

  const filtered = discovered.filter((account) => {
    if (!includeFrozen && account.isFrozen) return false;
    if (!includeNonEmpty && account.kind !== 'empty') return false;
    return true;
  });

  log.info('token scan complete', { owner: ownerAddress, found: filtered.length, partial });
  return { accounts: filtered, partial };
}

const KIND_ORDER: Record<AssetKind, number> = {
  reward: 0,
  empty: 1,
  token: 2,
  lp: 3,
  nft: 4,
  cnft: 5,
  domain: 6,
  unknown: 7,
};

/** Stable ordering: by kind, then reclaimable rent desc, then value desc. */
export function sortAssets(accounts: DiscoveredAccount[]): DiscoveredAccount[] {
  return [...accounts].sort((a, b) => {
    if (a.kind !== b.kind) return (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    if (a.rentLamports !== b.rentLamports) return Number(b.rentLamports - a.rentLamports);
    return (b.value?.usdValue ?? 0) - (a.value?.usdValue ?? 0);
  });
}
