import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── IME Design System ────────────────────────────────
      colors: {
        // Primary
        navy: {
          DEFAULT: '#0B1F3A',
          50:  '#E8ECF2',
          100: '#C5CFDF',
          200: '#9EAFCA',
          300: '#7790B5',
          400: '#577AA5',
          500: '#3A6494',
          600: '#2D5280',
          700: '#1E3D66',
          800: '#102A56',
          900: '#0B1F3A',
          950: '#060F1C',
        },
        // Accent
        gold: {
          DEFAULT: '#D9A441',
          50:  '#FDF6E8',
          100: '#FAE9C4',
          200: '#F5D48E',
          300: '#EDBB59',
          400: '#D9A441',
          500: '#C08A2A',
          600: '#A07020',
          700: '#7A5418',
          800: '#543B11',
          900: '#2E200A',
        },
        // Neutral
        surface: {
          DEFAULT: '#F7F4EF',
          50:  '#FFFFFF',
          100: '#F7F4EF',
          200: '#EDE9E2',
          300: '#E5E7EB',
          400: '#D1D5DB',
          500: '#9CA3AF',
          600: '#6B7280',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:   ['11px', { lineHeight: '16px' }],
        sm:   ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        md:   ['14px', { lineHeight: '21px' }],
        lg:   ['15px', { lineHeight: '22px' }],
        xl:   ['17px', { lineHeight: '26px' }],
        '2xl':['20px', { lineHeight: '28px' }],
        '3xl':['24px', { lineHeight: '32px' }],
        '4xl':['30px', { lineHeight: '38px' }],
      },
      borderRadius: {
        sm:   '4px',
        DEFAULT: '6px',
        md:   '8px',
        lg:   '10px',
        xl:   '14px',
        '2xl':'18px',
      },
      boxShadow: {
        'xs':  '0 1px 2px rgba(11,31,58,.04)',
        'sm':  '0 1px 3px rgba(11,31,58,.06), 0 1px 2px rgba(11,31,58,.04)',
        'md':  '0 4px 8px rgba(11,31,58,.07), 0 2px 4px rgba(11,31,58,.04)',
        'lg':  '0 8px 20px rgba(11,31,58,.09), 0 4px 8px rgba(11,31,58,.05)',
        'xl':  '0 20px 40px rgba(11,31,58,.12), 0 8px 16px rgba(11,31,58,.06)',
        'gold':'0 0 0 2px rgba(217,164,65,.35)',
        'inner-sm': 'inset 0 1px 2px rgba(11,31,58,.06)',
      },
      animation: {
        'fade-in':     'fadeIn .2s ease-out',
        'fade-up':     'fadeUp .25s ease-out',
        'slide-in':    'slideIn .2s ease-out',
        'spin-slow':   'spin 2s linear infinite',
        'pulse-gold':  'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' },                                    to: { opacity: '1' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(8px)' },      to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:   { from: { transform: 'translateX(-100%)' },                  to: { transform: 'translateX(0)' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 0 0 rgba(217,164,65,.4)' },  '50%': { boxShadow: '0 0 0 6px rgba(217,164,65,0)' } },
      },
    },
  },
  plugins: [],
}

export default config
