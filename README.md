# Sol Burner

A production-grade **Solana wallet cleanup and rent-recovery** platform. Close
unused SPL token accounts and reclaim the SOL locked up as their rent deposit —
non-custodial, fast, and with completely transparent fees.

> Every account on Solana must be rent-exempt, which means each SPL token account
> holds a small SOL deposit (~0.002 SOL). When you no longer need an account, you
> can close it and that deposit is returned to your wallet. Most wallets accumulate
> dozens or hundreds of these. Sol Burner finds them and helps you reclaim the SOL.

---

## Security and trust — read this first

This is the source of the app running at **https://solburner.claims**. It is published so
you do not have to take any claim here on faith: read the code, then check it against what
your wallet shows you before you sign.

**Every instruction this app can build**, and no others:

| Instruction | Where | What it does |
|---|---|---|
| `CloseAccount` | `src/solana/transactions/builder.ts`, `src/solana/pump/rewards.ts` | Closes a token account whose balance is zero and returns its rent deposit **to your own wallet** |
| `Burn` | `src/solana/transactions/builder.ts` | Destroys tokens you have explicitly selected, so their account can then be closed |
| `HarvestWithheldTokensToMint` | `src/solana/transactions/builder.ts` | Token-2022 only: moves transfer-fee tokens withheld *inside* your account back to their mint, which Token-2022 requires before the account can close. Permissionless; none of your own balance moves |
| Pump.fun `claim_cashback` | `src/solana/pump/rewards.ts` | Only if you select a Pump.fun reward: claims the cashback Pump.fun owes **you**, into your wallet |
| Pump.fun `close_user_volume_accumulator` | `src/solana/pump/rewards.ts` | Closes your Pump.fun volume account and returns its rent **to your own wallet** |
| `CreateIdempotent` (associated token account) | `src/solana/pump/rewards.ts` | Pump.fun AMM cashback only: opens a temporary wrapped-SOL account **owned by you** to receive the claim; it is closed back to you in the same transaction |
| `ComputeBudget` (limit and price) | `src/solana/transactions/builder.ts` | Sets the transaction's compute limit and priority fee, as most Solana apps do |
| `SystemProgram.transfer` | `src/solana/transactions/builder.ts` | The service fee, attached to the last transaction of a batch. If a referral split is configured, the same fee is split across two transfers; the total stays 0.87% |

The fee transfer is the only instruction that moves value away from you. There is no
`approve`, no delegate, no `setAuthority`, no transfer of your tokens or NFTs to anyone.

*Correction, 2026-10-13: an earlier version of this table listed three instructions. It
left out the Token-2022 harvest, the Pump.fun reward claims and the compute-budget
instructions above. All of them were in the published code; the table was incomplete.*

**Non-custodial.** The app never holds your assets and never sees a private key. You sign
every transaction in your own wallet, and recovered SOL lands directly in your wallet.

**The fee.** 0.87% of the SOL you recover (`VITE_FEE_RATE=0.0087`). The exact breakdown —
gross recovered, fee, network fee, what you receive — is shown before you sign. Solana's
own network fee applies on top, as it does for any transaction.

**Simulation before signing.** Every transaction is simulated first
(`src/solana/transactions/simulate.ts`); a simulation failure stops it rather than asking
you to sign something that would fail.

**How to verify, without trusting us.** In your wallet's transaction preview, you should see
only `CloseAccount` / `Burn` instructions, SOL coming *in*, and one small outgoing fee
transfer. If a preview ever shows tokens, NFTs or SOL leaving to an address you did not
expect, reject it — on this app or any other.

**Being straight about the risks.** The domain is new, so it has no long public track
record, and parts of the ecosystem flag new domains by default. If that bothers you — and
it is a reasonable thing to weigh — use a burner wallet, or close accounts yourself using
[Solana's documented close-account operation](https://solana.com/docs/tokens/basics/close-account),
which costs nothing but takes one account at a time.

**What this repo does not contain:** deployment and server configuration, which stays
private, as it does for most hosted apps. Nothing here affects what the app does in your
wallet.

---

## Highlights

- **Transparent fees** — every figure shown (gross, fee %, net, savings) comes from
  a single fee engine that also builds the on-chain transfer. The preview can never
  disagree with what you sign.
- **Fast, resilient scanning** — parallel reads across both SPL token programs with
  automatic RPC failover and retry.
- **Non-custodial** — you sign every transaction; recovered SOL goes straight to
  your wallet. The app never has custody.
- **Pre-flight simulation** — transactions are simulated before you're asked to sign.
- **White-label ready** — branding, themes, fees, RPC, and feature flags all come
  from configuration. Ship multiple branded deployments from one codebase.
- **Three built-in themes** — Professional, Degen, and Minimal, switchable at runtime.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure (all values are public/client-side)
cp .env.example .env.local
#   → set VITE_RPC_PRIMARY to a dedicated RPC endpoint for production
#   → set VITE_FEE_RECIPIENT if you want to collect a service fee

# 3. Develop
npm run dev

# 4. Ship
npm run build && npm run preview
```

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the Vite dev server                |
| `npm run build`     | Typecheck (`tsc -b`) + production build  |
| `npm run preview`   | Preview the production build             |
| `npm run typecheck` | Type-check only                          |
| `npm run lint`      | ESLint                                   |
| `npm run test`      | Run the unit test suite (Vitest)         |

### Applying config changes (restart the dev server)

Configuration is read from `.env` **once at startup** and frozen (see
[`src/config`](src/config)), so **editing `.env.local` requires a dev-server
restart** — hot-reload (HMR) will not pick up env changes.

To restart:

1. In the terminal running `npm run dev`, press **`Ctrl + C`** to stop it.
2. Run **`npm run dev`** again.
3. **Hard-refresh** the browser (`Ctrl + Shift + R` / `Cmd + Shift + R`) to drop
   cached modules.

> Vite usually auto-restarts when it detects an `.env` change, but a manual
> restart is the reliable way to guarantee new values (e.g. `VITE_FEE_RECIPIENT`,
> RPC endpoints, feature flags) are applied.

Windows one-liner to force-stop any stray dev servers, then start fresh:

```powershell
taskkill /F /IM node.exe; npm run dev
```

---

## Configuration

Everything is driven by environment variables, parsed once into a frozen
`appConfig` (see [`src/config`](src/config)). Copy [`.env.example`](.env.example)
and adjust.

| Variable                          | Description                                                 | Default                |
| --------------------------------- | ----------------------------------------------------------- | ---------------------- |
| `VITE_BRAND`                      | Active brand/theme: `professional` \| `degen` \| `minimal`  | `degen`                |
| `VITE_RPC_PRIMARY`                | Primary RPC endpoint (**use a dedicated one in prod**)      | public mainnet RPC     |
| `VITE_RPC_FALLBACKS`              | Comma-separated fallback endpoints                          | —                      |
| `VITE_SOLANA_NETWORK`             | `mainnet-beta` \| `devnet` \| `testnet`                     | `mainnet-beta`         |
| `VITE_FEE_RATE`                   | Service fee as a fraction (`0.0087` = 0.87%)                | `0.0087`               |
| `VITE_FEE_MIN_SOL`                | Absolute fee floor in SOL (`0` disables)                    | `0`                    |
| `VITE_FEE_MAX_SOL`                | Absolute fee ceiling in SOL (`0` disables)                  | `0`                    |
| `VITE_FEE_RECIPIENT`              | Fee recipient pubkey (empty = **no fee charged**)           | —                      |
| `VITE_BENCHMARK_FEE_RATE`         | Benchmark for the "you save vs X%" comparison (empty=off)   | `0.02`                 |
| `VITE_REFERRAL_SHARE`             | Share of the fee routed to a referrer (`0.30` = 30%)        | `0`                    |
| `VITE_REFERRAL_RECIPIENT`         | Referral recipient pubkey                                   | —                      |
| `VITE_FEATURE_BURN_TOKENS`        | Allow burning non-zero balances before closing             | `true`                 |
| `VITE_FEATURE_CLOSE_EMPTY`        | Allow closing empty accounts                                | `true`                 |
| `VITE_FEATURE_SIMULATE`           | Simulate before signing                                     | `true`                 |
| `VITE_FEATURE_SAVINGS_COMPARISON` | Show the savings-vs-benchmark comparison                    | `true`                 |

> If `VITE_FEE_RECIPIENT` is unset, the fee engine charges **0** and the user keeps
> 100% of the recovered SOL. Set it to enable fee collection.

---

## White-label & theming

A deployment's identity lives entirely in configuration:

- **Brand copy & social links** — [`src/config/brands.ts`](src/config/brands.ts)
- **Visual identity (colors, fonts, decor)** — [`src/theme/themes`](src/theme/themes)

The theme engine ([`src/theme/applyTheme.ts`](src/theme/applyTheme.ts)) maps a
theme to CSS custom properties on `:root`, which Tailwind tokens consume. Switching
brands restyles the entire app with **no logic changes** and no per-brand CSS bundle.
To add a brand: add a `BrandConfig`, add a matching `Theme`, register both, set
`VITE_BRAND`.

---

## How fees work

All fee math flows through one function: `computeFee` in
[`src/core/fees/calculator.ts`](src/core/fees/calculator.ts). It is pure, operates
in integer lamports (`bigint`) to avoid float drift, and is the *only* place fees
are computed — the UI preview and the on-chain `SystemProgram.transfer` use the
exact same numbers. See the unit tests for the contract.

```
gross  = Σ rent of selected accounts
fee    = clamp(gross × rate, min, max)   (0 if no recipient configured)
net    = gross − fee
```

---

## Security & trust model

- **Non-custodial.** The app builds transactions; your wallet signs them. Closing an
  account returns its rent directly to your wallet within the same transaction.
- **No hidden actions.** The only transfers added are the disclosed service fee.
  Burns only happen for accounts you explicitly select that still hold a balance,
  and are clearly flagged as destructive.
- **Simulated.** Transactions are simulated before signing (feature-flagged).
- **Validated.** Every recipient pubkey is validated; RPC failures retry and fail
  over; errors are normalized into clear, user-facing messages.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full module breakdown and data flow.

---

## License

MIT. Not affiliated with the Solana Foundation. Burning token balances is
irreversible — review your selection before confirming.
