import { useEffect, useState } from 'react';
import oneDarkCss from 'highlight.js/styles/atom-one-dark.css?inline';
import catppuccinLatteCss from '@catppuccin/highlightjs/css/catppuccin-latte.css?inline';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
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
