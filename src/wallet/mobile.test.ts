import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasInjectedWallet, isMobileBrowser, phantomBrowseUrl, shouldUsePhantomDeeplink } from './mobile';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function stubNavigator(ua: string, extra: Partial<Navigator> = {}) {
  vi.stubGlobal('navigator', { userAgent: ua, platform: 'iPhone', maxTouchPoints: 5, ...extra });
}

function stubWindow(win: Record<string, unknown>) {
  vi.stubGlobal('window', win);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mobile wallet bridging', () => {
  it('detects a mobile browser from the user agent', () => {
    stubNavigator(IPHONE_UA);
    expect(isMobileBrowser()).toBe(true);
  });

  it('does not treat a desktop browser as mobile', () => {
    stubNavigator(DESKTOP_UA, { platform: 'Win32', maxTouchPoints: 0 });
    expect(isMobileBrowser()).toBe(false);
  });

  it('detects iPadOS reporting itself as MacIntel with touch', () => {
    stubNavigator(DESKTOP_UA, { platform: 'MacIntel', maxTouchPoints: 5 });
    expect(isMobileBrowser()).toBe(true);
  });

  it('reports an injected wallet when window.solana exists', () => {
    stubWindow({ solana: { isPhantom: true } });
    expect(hasInjectedWallet()).toBe(true);
  });

  it('reports no injected wallet on a bare page', () => {
    stubWindow({});
    expect(hasInjectedWallet()).toBe(false);
  });

  it('uses the deeplink on a mobile browser with no injected wallet', () => {
    stubNavigator(IPHONE_UA);
    stubWindow({});
    expect(shouldUsePhantomDeeplink()).toBe(true);
  });

  it('does NOT use the deeplink inside a wallet in-app browser (provider injected)', () => {
    stubNavigator(IPHONE_UA);
    stubWindow({ solana: { isPhantom: true } });
    expect(shouldUsePhantomDeeplink()).toBe(false);
  });

  it('does NOT use the deeplink on desktop', () => {
    stubNavigator(DESKTOP_UA, { platform: 'Win32', maxTouchPoints: 0 });
    stubWindow({ solana: { isPhantom: true } });
    expect(shouldUsePhantomDeeplink()).toBe(false);
  });

  it('builds a correctly URL-encoded Phantom browse deeplink', () => {
    stubWindow({ location: { href: 'https://sectbot.com/app?x=1', origin: 'https://sectbot.com' } });
    expect(phantomBrowseUrl()).toBe(
      'https://phantom.app/ul/browse/' +
        encodeURIComponent('https://sectbot.com/app?x=1') +
        '?ref=' +
        encodeURIComponent('https://sectbot.com'),
    );
  });
});
