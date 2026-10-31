import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        teal: 'var(--teal)',
        'teal-soft': 'var(--teal-soft)',
        'teal-ink': 'var(--teal-ink)',
        'shade-light': 'var(--shade-light)',
        'shade-mid': 'var(--shade-mid)',
        'shade-strong': 'var(--shade-strong)',
        'shade-strong-ink': 'var(--shade-strong-ink)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
