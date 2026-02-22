/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'ctp-base':     'rgb(var(--ctp-base) / <alpha-value>)',
        'ctp-mantle':   'rgb(var(--ctp-mantle) / <alpha-value>)',
        'ctp-surface0': 'rgb(var(--ctp-surface0) / <alpha-value>)',
        'ctp-surface1': 'rgb(var(--ctp-surface1) / <alpha-value>)',
        'ctp-overlay0': 'rgb(var(--ctp-overlay0) / <alpha-value>)',
        'ctp-text':     'rgb(var(--ctp-text) / <alpha-value>)',
        'ctp-subtext':  'rgb(var(--ctp-subtext) / <alpha-value>)',
        'ctp-blue':     'rgb(var(--ctp-blue) / <alpha-value>)',
        'ctp-mauve':    'rgb(var(--ctp-mauve) / <alpha-value>)',
        'ctp-peach':    'rgb(var(--ctp-peach) / <alpha-value>)',
        'ctp-green':    'rgb(var(--ctp-green) / <alpha-value>)',
        'ctp-red':      'rgb(var(--ctp-red) / <alpha-value>)',
        'ctp-yellow':   'rgb(var(--ctp-yellow) / <alpha-value>)',
        'ctp-teal':     'rgb(var(--ctp-teal) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm:      '4px',
        DEFAULT: '6px',
        md:      '8px',
        lg:      '12px',
      },
    },
  },
  plugins: [],
}
