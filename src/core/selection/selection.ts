/**
 * Selection logic. The user selects a subset of discovered assets to clean up.
 * Selection is modeled as an immutable set of asset ids with pure transition
 * helpers, so it can be unit-tested and driven from a reducer.
 */

import type { AssetKind, DiscoveredAccount } from '../types';

export type Selection = ReadonlySet<string>;

export const EMPTY_SELECTION: Selection = new Set<string>();

export function isSelected(selection: Selection, id: string): boolean {
  return selection.has(id);
}

export function toggle(selection: Selection, id: string): Selection {
  const next = new Set(selection);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function setSelected(selection: Selection, id: string, selected: boolean): Selection {
  const next = new Set(selection);
  if (selected) next.add(id);
  else next.delete(id);
  return next;
}

/** Select every asset in the list. */
export function selectAll(accounts: readonly DiscoveredAccount[]): Selection {
  return new Set(accounts.map((a) => a.id));
}

export function selectNone(): Selection {
  return new Set<string>();
}

/** Select only assets matching one of `kinds` (e.g. just `empty`). */
export function selectByKind(accounts: readonly DiscoveredAccount[], kinds: AssetKind[]): Selection {
  const allow = new Set(kinds);
  return new Set(accounts.filter((a) => allow.has(a.kind)).map((a) => a.id));
}

/** Add a set of assets to the current selection (union). */
export function addMany(selection: Selection, accounts: readonly DiscoveredAccount[]): Selection {
  const next = new Set(selection);
  for (const a of accounts) next.add(a.id);
  return next;
}

/** Remove a set of assets from the current selection (difference). */
export function removeMany(selection: Selection, accounts: readonly DiscoveredAccount[]): Selection {
  const next = new Set(selection);
  for (const a of accounts) next.delete(a.id);
  return next;
}

/** Resolve the selected ids back to full asset objects, in list order. */
export function resolveSelected(
  accounts: readonly DiscoveredAccount[],
  selection: Selection,
): DiscoveredAccount[] {
  return accounts.filter((a) => selection.has(a.id));
}

/** Drop ids from the selection that are no longer present (e.g. after a rescan). */
export function reconcile(selection: Selection, accounts: readonly DiscoveredAccount[]): Selection {
  const live = new Set(accounts.map((a) => a.id));
  const next = new Set<string>();
  for (const id of selection) if (live.has(id)) next.add(id);
  return next;
}
