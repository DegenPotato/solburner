/**
 * Mobile-browser wallet bridging.
 *
 * On desktop, wallets inject a provider via the browser extension. On a mobile
 * *browser* (Safari/Chrome on a phone) there is no extension — the wallet is a
 * separate app — so nothing is injected and signing can't round-trip. The one
 * reliable path that matches how the app already works is to reopen the dapp
 * inside Phantom's own in-app browser, where Phantom injects the provider and
 * the normal connect/sign/batch-approval flow works unchanged.
 *
 * We therefore detect "mobile browser with no injected wallet" and offer an
 * "Open in Phantom" action instead of the (empty) wallet-selection modal.
 */

/** True on a phone/tablet browser (Android or iOS, including iPadOS desktop-mode). */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOs = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
  return /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(ua) || iPadOs;
}

/**
 * True when a wallet provider is injected into this page — i.e. we're already
 * inside a wallet's in-app browser (Phantom, Solflare, …) or a desktop with an
 * extension. In that case the normal adapter flow works and no deeplink is needed.
 */
export function hasInjectedWallet(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    solana?: { isPhantom?: boolean };
    phantom?: { solana?: unknown };
  };
  return Boolean(w.solana || w.phantom?.solana);
}

/** True when we should surface "Open in Phantom" instead of the wallet modal. */
export function shouldUsePhantomDeeplink(): boolean {
  return isMobileBrowser() && !hasInjectedWallet();
}

/**
 * Universal link that reopens the current page inside Phantom's in-app browser.
 * `ref` (the current origin) lets Phantom show the requesting site and enables a
 * "back to browser" affordance. See the Phantom "browse" deeplink spec.
 *
 * IMPORTANT: this must be used as the `href` of a real anchor the user taps —
 * iOS/Android only hand a universal link off to the native app on a genuine
 * link click. Assigning it to `window.location` in JS is treated as ordinary web
 * navigation and merely loads the phantom.app fallback page in the browser.
 */
export function phantomBrowseUrl(): string {
  if (typeof window === 'undefined') return 'https://phantom.app/';
  const url = window.location.href;
  const ref = window.location.origin;
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`;
}
