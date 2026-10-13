import type { SVGProps } from 'react';

/**
 * Original inline icon set. Single registry so themes/components reference icons
 * by name. All icons inherit `currentColor` and a 1.6 stroke for visual unity.
 */

export type IconName =
  | 'flame'
  | 'shield'
  | 'wallet'
  | 'check'
  | 'check-circle'
  | 'close'
  | 'alert'
  | 'info'
  | 'spinner'
  | 'arrow-right'
  | 'external'
  | 'copy'
  | 'refresh'
  | 'sparkle'
  | 'chevron-down'
  | 'twitter'
  | 'discord'
  | 'github'
  | 'docs'
  | 'web'
  | 'sun'
  | 'bolt';

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

const PATHS: Record<IconName, JSX.Element> = {
  flame: (
    <path d="M12 3c2.5 3.2 4.2 5.7 4.2 8.4 0 2-1.1 3.4-2.8 4 .5-1.1.5-2.2.05-3.3-.6 2.2-2.3 3-3.7 4.4C8.5 17.7 8 19.1 8 20.5 8 22 9.2 23 11 23c3.4 0 6-2.6 6-6.2C17 12.6 14.7 8 12 3z" />
  ),
  shield: <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9.5 12l1.8 1.8L15 10" />,
  wallet: (
    <path d="M3 7.5A2.5 2.5 0 015.5 5H17a2 2 0 012 2v1h1.2A1.8 1.8 0 0122 9.8v6.4A1.8 1.8 0 0120.2 18H5.5A2.5 2.5 0 013 15.5v-8zM17 12h2.5M16.7 12a.8.8 0 100 .1z" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  'check-circle': <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12l2.4 2.4L15.5 9.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  alert: <path d="M12 3l9.5 16.5H2.5L12 3zM12 9.5v4.2M12 17.2v.1" />,
  info: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8v.1" />,
  spinner: <path d="M12 3a9 9 0 109 9" />,
  'arrow-right': <path d="M4 12h15M13 6l6 6-6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0116.5 20h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10" />,
  copy: <path d="M9 9V5.5A1.5 1.5 0 0110.5 4h8A1.5 1.5 0 0120 5.5v8a1.5 1.5 0 01-1.5 1.5H15M4 10.5A1.5 1.5 0 015.5 9h8A1.5 1.5 0 0115 10.5v8A1.5 1.5 0 0113.5 20h-8A1.5 1.5 0 014 18.5v-8z" />,
  refresh: <path d="M4 9a8 8 0 0113.7-3.3L20 8M20 4v4h-4M20 15a8 8 0 01-13.7 3.3L4 16M4 20v-4h4" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  twitter: <path d="M4 4l7 9m0 0L4 20m7-7l9-9m-9 9l9 7" />,
  discord: <path d="M8 6.5C9 6 10.4 5.7 12 5.7s3 .3 4 .8c1.7 2 2.4 4.6 2.5 7.8-1 .9-2.2 1.5-3.4 1.8l-.8-1.3M8.7 14.8l-.8 1.3c-1.2-.3-2.4-.9-3.4-1.8.1-3.2.8-5.8 2.5-7.8M9.5 13.2v.1M14.5 13.2v.1" />,
  github: <path d="M12 3a9 9 0 00-2.8 17.5c.5.1.7-.2.7-.5v-1.7c-2.5.5-3-1.2-3-1.2-.4-1-1-1.3-1-1.3-.8-.6 0-.6 0-.6.9.1 1.4 1 1.4 1 .8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.2-2-.2-4.1-1-4.1-4.4 0-1 .3-1.8.9-2.4-.1-.3-.4-1.2.1-2.4 0 0 .7-.2 2.4.9a8 8 0 014.4 0c1.7-1.1 2.4-.9 2.4-.9.5 1.2.2 2.1.1 2.4.6.6.9 1.4.9 2.4 0 3.4-2.1 4.2-4.1 4.4.3.3.6.8.6 1.7v2.5c0 .3.2.6.7.5A9 9 0 0012 3z" />,
  docs: <path d="M6 3.5h7L18 8v11.5A1 1 0 0117 20.5H6a1 1 0 01-1-1v-15a1 1 0 011-1zM13 3.5V8h5M8.5 12h7M8.5 15.5h7" />,
  web: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21M12 3C9.5 5.4 8.2 8.5 8.2 12S9.5 18.6 12 21" />,
  sun: <path d="M12 6.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />,
  bolt: <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />,
};

const FILLED: Set<IconName> = new Set(['flame', 'bolt', 'sparkle']);

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
