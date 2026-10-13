/**
 * Transaction builder: turns a `CleanupPlan` into a sequence of ready-to-sign
 * legacy transactions.
 *
 * Packing matches `core/plan` exactly. Each account contributes a `close` (and a
 * preceding `burn` when it still holds a balance). The single service-fee
 * transfer — split between platform and referral recipients per the fee engine —
 * is appended to the **last** transaction, after that transaction's closes have
 * credited rent back to the owner.
 */

import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  createBurnInstruction,
  createCloseAccountInstruction,
  createHarvestWithheldTokensToMintInstruction,
} from '@solana/spl-token';
import type { CleanupPlan, DiscoveredAccount } from '@/core/types';
import { estimateGroupComputeUnits, packIntoTransactions } from '@/core/plan/plan';
import { DEFAULT_PRIORITY_FEE_MICROLAMPORTS, tokenProgramId } from '../constants';
import { buildPumpRewardInstructions } from '../pump/rewards';

export interface FeeTransferTarget {
  recipient: PublicKey;
  lamports: bigint;
  kind: 'platform' | 'referral';
}

export interface BuiltTransaction {
  transaction: Transaction;
  /** Accounts whose recovery actions are included in this transaction. */
  accounts: DiscoveredAccount[];
  /** Fee transfers attached to this transaction (only the last one has any). */
  feeTransfers: FeeTransferTarget[];
}

export interface BuildTransactionsInput {
  owner: PublicKey;
  plan: CleanupPlan;
  /** Fee recipient wallets (from config). */
  feeRecipient: string | null;
  referralRecipient: string | null;
  priorityFeeMicroLamports?: number;
}

/** Build the recovery instructions for one asset onto a transaction. */
function appendAccountInstructions(tx: Transaction, owner: PublicKey, account: DiscoveredAccount): void {
  // Pump.fun rewards: claim cashback (AMM) and/or close the volume accumulator.
  if (account.action === 'claim-pump-rewards' && account.pump) {
    for (const ix of buildPumpRewardInstructions(owner, account.pump)) tx.add(ix);
    return;
  }

  const programId = tokenProgramId(account.program);
  const accountPk = new PublicKey(account.address);

  if (account.action === 'burn-and-close' && account.rawAmount > 0n) {
    const mintPk = new PublicKey(account.mint);
    tx.add(createBurnInstruction(accountPk, mintPk, owner, account.rawAmount, [], programId));
  }

  // Token-2022 transfer-fee accounts can't be closed while they hold withheld
  // tokens. Harvest them to the mint first (permissionless) so the close succeeds.
  if (account.program === 'token-2022' && (account.withheldAmount ?? 0n) > 0n) {
    const mintPk = new PublicKey(account.mint);
    tx.add(createHarvestWithheldTokensToMintInstruction(mintPk, [accountPk], programId));
  }

  // Close returns the account's rent lamports to the owner.
  tx.add(createCloseAccountInstruction(accountPk, owner, owner, [], programId));
}

/** Resolve the fee breakdown into concrete transfer targets. */
function resolveFeeTransfers(input: BuildTransactionsInput): FeeTransferTarget[] {
  const { plan, feeRecipient, referralRecipient } = input;
  const transfers: FeeTransferTarget[] = [];
  const { platformLamports, referralLamports } = plan.fee;

  if (feeRecipient && platformLamports > 0n) {
    transfers.push({ recipient: new PublicKey(feeRecipient), lamports: platformLamports, kind: 'platform' });
  }
  if (referralRecipient && referralLamports > 0n) {
    transfers.push({ recipient: new PublicKey(referralRecipient), lamports: referralLamports, kind: 'referral' });
  }
  return transfers;
}

/**
 * Build all transactions for a plan. Blockhash + signatures are applied later by
 * the executor/simulator so they always use a fresh blockhash.
 */
export function buildCleanupTransactions(input: BuildTransactionsInput): BuiltTransaction[] {
  const { owner, plan, priorityFeeMicroLamports = DEFAULT_PRIORITY_FEE_MICROLAMPORTS } = input;
  if (plan.accounts.length === 0) return [];

  const groups = packIntoTransactions(plan.accounts);
  const feeTransfers = resolveFeeTransfers(input);
  const built: BuiltTransaction[] = [];

  groups.forEach((group, index) => {
    const tx = new Transaction();
    tx.feePayer = owner;

    // Right-size the CU limit to the group so priority fees (which scale with the
    // requested limit) don't overcharge the user. Uses the same estimate the plan
    // reports as the network fee, so displayed cost == charged cost.
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: estimateGroupComputeUnits(group) }));
    if (priorityFeeMicroLamports > 0) {
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeMicroLamports }));
    }

    for (const account of group) appendAccountInstructions(tx, owner, account);

    const isLast = index === groups.length - 1;
    const attached = isLast ? feeTransfers : [];
    for (const transfer of attached) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: transfer.recipient,
          lamports: transfer.lamports,
        }),
      );
    }

    built.push({ transaction: tx, accounts: group, feeTransfers: attached });
  });

  return built;
}
