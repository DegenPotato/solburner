# Architecture

Sol Burner is organized into strictly separated layers. The guiding rule:

> **No business logic lives in UI components.** Components render state and call
> well-defined interfaces. All domain logic is pure and unit-testable.

```
┌──────────────────────────────────────────────────────────────────┐
│  UI            pages/ · components/ (ui, layout, recovery, …)      │
│                renders state, dispatches actions                   │
├──────────────────────────────────────────────────────────────────┤
│  State         state/RecoveryContext · hooks/                      │
│                orchestration & React glue (the only stateful seam) │
├──────────────────────────────────────────────────────────────────┤
│  Solana        solana/ (rpc · scanner · transactions · errors)     │
│                chain I/O, tx building, simulation, execution       │
├──────────────────────────────────────────────────────────────────┤
│  Core          core/ (fees · rent · selection · plan)              │
│                PURE domain logic — no React, no I/O                │
├──────────────────────────────────────────────────────────────────┤
│  Config        config/ (brand · fees · rpc · features)             │
│  Theme         theme/ (engine + presets)                           │
│  Utils         utils/ (lamports · format · async · logger · …)     │
└──────────────────────────────────────────────────────────────────┘
```

Dependencies point **downward only**. Core never imports Solana, React, or UI.

---

## Layers

### `config/` — single source of truth

Environment variables are parsed once into a **frozen** `appConfig`
([`config/index.ts`](src/config/index.ts)). Fees, RPC endpoints, branding, and
feature flags all originate here. Nothing else reads `import.meta.env` directly
(it is funneled through [`config/env.ts`](src/config/env.ts)).

### `core/` — pure domain logic

No React, no network, fully unit-tested. Amounts are integer `bigint` lamports.

- **`fees/calculator.ts`** — `computeFee`, the one place fees are calculated.
- **`rent/rent.ts`** — classify accounts (`empty` / `nft` / `fungible`) and
  aggregate reclaimable rent.
- **`selection/selection.ts`** — immutable selection set with pure transitions.
- **`plan/plan.ts`** — `buildCleanupPlan` + transaction packing math. Packs by
  estimated serialized bytes (`estimateAccountBytes` vs `TX_ACCOUNT_BYTE_BUDGET`)
  to stay under Solana's 1232-byte limit, and is shared with the transaction
  builder so the previewed transaction count always matches reality. A
  real-serialization test in the builder guards the byte estimate.

### `solana/` — chain layer

- **`rpc/connection.ts`** — `RpcClient` wraps primary + fallback endpoints with
  retry/backoff and automatic failover (`perform`).
- **`scanner/scan.ts`** — discovers token accounts across both SPL programs using
  `getParsedTokenAccountsByOwner`, runs in parallel, tolerates partial failure.
- **`transactions/builder.ts`** — assembles burn/close instructions + the single
  fee transfer, packed into transaction-sized groups.
- **`transactions/simulate.ts`** — pre-flight simulation with a fresh blockhash.
- **`transactions/execute.ts`** — signs (one approval via `signAllTransactions`)
  and submits sequentially, confirming each before the next.
- **`errors.ts`** — normalizes wallet/RPC/runtime errors into a typed set.

### `state/` — orchestration

[`RecoveryContext`](src/state/RecoveryContext.tsx) is the single stateful seam. A
`useReducer` state machine (`idle → scanning → review → executing → complete`)
composes the core engines and the Solana layer, and exposes a small action API
(`scan`, `toggleAccount`, `applyPreset`, `simulate`, `execute`, `reset`). The
derived `plan` is memoized from the current selection via the core engines.

### `theme/` — runtime theming

A `Theme` is pure data. [`applyTheme`](src/theme/applyTheme.ts) projects it onto
CSS custom properties; Tailwind tokens
([`tailwind.config.ts`](tailwind.config.ts)) reference those vars via
`rgb(var(--token) / <alpha-value>)`. Switching themes never re-renders logic.

### `components/` & `pages/`

Presentational. The `recovery/` feature components read `useRecovery` but contain
no chain or fee logic. Pages are lazy-loaded and code-split.

---

## End-to-end data flow

```
Connect wallet
   └─ RecoveryProvider.scan()
        └─ scanWallet(rpc, owner)            → ScanResult (categorized accounts)
Select accounts
   └─ selection set → resolveSelected()
        └─ buildCleanupPlan(accounts, fees)  → CleanupPlan { fee, transactionCount }
Review (PreviewModal)
   └─ buildCleanupTransactions(plan)         → BuiltTransaction[]
        └─ simulatePlan(rpc, txs)            → pass/fail (pre-flight)
Execute
   └─ executePlan(rpc, wallet, txs)          → ExecutionReport (per-tx results)
Summary (SummaryReport)
   └─ computeFee(recovered)                  → consistent final numbers
```

The fee numbers shown at **Review** and the lamports transferred at **Execute**
are produced by the same `computeFee` call path — they cannot drift.

---

## Key decisions

- **`bigint` everywhere for money.** All rent/fee math is integer lamports;
  conversion to a `number` of SOL happens only at the display boundary
  ([`utils/format.ts`](src/utils/format.ts)).
- **One fee engine.** Eliminates the classic "preview says X, transaction does Y"
  class of bug by construction.
- **Sequential, confirmed execution.** Later transactions carry the fee transfer
  and rely on rent credited by earlier (already-confirmed) closes, so funds are
  always available.
- **Failover-first RPC.** A single flaky node never breaks a scan; reads retry and
  rotate endpoints.
- **Config-frozen branding.** White-label deployments change `.env` + presets, never
  application code.

---

## Testing

Core engines are covered by Vitest (`src/**/*.test.ts`): fee math (rounding,
clamping, referral split, savings), rent classification/aggregation, and plan
packing. Because the core layer is pure, it tests without mocks or a browser.

```bash
npm run test
```
