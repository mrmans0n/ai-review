import { useEffect, useState } from 'react';
import oneDarkCss from 'highlight.js/styles/atom-one-dark.css?inline';
import catppuccinLatteCss from '@catppuccin/highlightjs/css/catppuccin-latte.css?inline';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  // MIRROR of the inline bootstrap in index.html — keep these in sync.
  // Prefer the pre-set data-theme attribute so first render agrees with the
  // attribute the bootstrap already set on <html> before React mounted.
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
  }
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    // Reconcile the attribute the inline bootstrap set. No-op when it already
    // matches — otherwise React would re-write it on first render for no
    // reason, which is not a visual bug today but a needless write we avoid.
    const current = document.documentElement.getAttribute('data-theme');
    const desired = theme === 'dark' ? 'dark' : null;
    if (current !== desired) {
      if (desired === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', desired);
      }
    }
    localStorage.setItem('theme', theme);

    // Inject highlight.js theme stylesheet
    let styleEl = document.getElementById('hljs-theme') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'hljs-theme';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = theme === 'dark' ? oneDarkCss : catppuccinLatteCss;
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
