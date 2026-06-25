/** @type {import('tailwindcss').Config} */

// ── Acento de marca: vino / oxblood (lacre de sello jurídico) ──
const wine = {
  50:  '#f9ece9',
  100: '#f0cfc9',
  200: '#e0a59c',
  300: '#cd7368',
  400: '#b54a40',
  500: '#93302a',
  600: '#7a2422',
  700: '#611d20',
  800: '#4b181b',
  900: '#371416',
  950: '#210b0c',
  DEFAULT: '#93302a',
}

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Tinta cálida (texto y superficies oscuras) ──
        ink: {
          50:  '#f5f1ec',
          100: '#e7ded4',
          200: '#cbbcaa',
          300: '#a89580',
          400: '#836f59',
          500: '#5f4f3e',
          600: '#473a2d',
          700: '#342a20',
          800: '#241d16',
          900: '#1a140f',
          950: '#110c08',
          DEFAULT: '#1a140f',
        },
        // ── Vino / oxblood — acento de marca y signature ──
        wine,
        gold: wine, // compat: las clases gold-* existentes pasan a vino
        // ── Verde escribanía — estados / éxito / activo ──
        seal: {
          50:  '#eef2ee',
          100: '#d3e0d6',
          200: '#a7c1ad',
          300: '#769b80',
          400: '#4f7563',
          500: '#3a5a4c',
          600: '#2d473c',
          700: '#243930',
          800: '#1c2c26',
          900: '#12201b',
          DEFAULT: '#3a5a4c',
        },
        // ── Bronce / oro viejo — detalle puntual de sello ──
        brass: {
          200: '#e7d3a6',
          300: '#d8be88',
          400: '#c2a25e',
          500: '#a6843f',
          600: '#876a30',
          700: '#675024',
          DEFAULT: '#a6843f',
        },
        // ── Papel oficio (fondos cálidos) ──
        paper: {
          DEFAULT: '#f2ebda',
          deep: '#e8dec6',
        },
        // ── Neutros cálidos / hueso (bordes, hairlines) ──
        sand: {
          50:  '#faf6ec',
          100: '#f1ead8',
          200: '#e5dac1',
          300: '#d4c4a3',
          400: '#b3a081',
          500: '#8f7d61',
          600: '#6e5f48',
          700: '#514636',
          800: '#352e23',
          900: '#211d16',
        },
        primary: { DEFAULT: '#1a140f', 50: '#f5f1ec', 900: '#1a140f' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Libre Caslon Display', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'tinted-sm': '0 1px 2px rgba(26,20,15,0.07), 0 1px 1px rgba(26,20,15,0.05)',
        'tinted':    '0 4px 18px -4px rgba(26,20,15,0.12), 0 2px 6px -2px rgba(26,20,15,0.07)',
        'tinted-lg': '0 24px 50px -16px rgba(26,20,15,0.26), 0 8px 18px -10px rgba(26,20,15,0.14)',
        'gold-glow': '0 10px 34px -10px rgba(147,48,42,0.5)',
        'wine-glow': '0 10px 34px -10px rgba(147,48,42,0.5)',
        'inset-hi':  'inset 0 1px 0 rgba(255,255,255,0.08)',
        'inset-hi-soft': 'inset 0 1px 0 rgba(255,255,255,0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(14px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'shimmer': { '100%': { transform: 'translateX(100%)' } },
        'spin-slow': { '100%': { transform: 'rotate(360deg)' } },
        'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.32,0.72,0,1) both',
        'fade-in': 'fade-in 0.6s ease-out both',
        'spin-slow': 'spin-slow 90s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.32,0.72,0,1)',
      },
    },
  },
  plugins: [],
}
