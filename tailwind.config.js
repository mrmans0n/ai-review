/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['attribute', 'data-theme'],
  theme: {
    extend: {
      colors: {
        'ctp-base':     'var(--ctp-base)',
        'ctp-mantle':   'var(--ctp-mantle)',
        'ctp-surface0': 'var(--ctp-surface0)',
        'ctp-surface1': 'var(--ctp-surface1)',
        'ctp-overlay0': 'var(--ctp-overlay0)',
        'ctp-text':     'var(--ctp-text)',
        'ctp-subtext':  'var(--ctp-subtext)',
        'ctp-blue':     'var(--ctp-blue)',
        'ctp-mauve':    'var(--ctp-mauve)',
        'ctp-peach':    'var(--ctp-peach)',
        'ctp-green':    'var(--ctp-green)',
        'ctp-red':      'var(--ctp-red)',
        'ctp-yellow':   'var(--ctp-yellow)',
        'ctp-teal':     'var(--ctp-teal)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'Fira Code', 'monospace'],
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
