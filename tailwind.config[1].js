/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Executive Linear & Stripe Clean Design System Palette
        bg: '#F6F8FC',
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#F9FBFD',
        },
        primary: '#161C2D',
        secondary: '#667085',
        border: '#EEF2F7',
        accent: {
          green: '#B6F36A',
          'green-dark': '#93E33C',
          blue: '#4A7BFF',
          orange: '#F5A623',
        },
        // Legacy alias mappings so all components transition smoothly to light/clean executive tokens
        obsidian: {
          950: '#F6F8FC',
          900: '#FFFFFF',
          800: '#F9FBFD',
          700: '#EEF2F7',
        },
        charcoal: {
          900: '#FFFFFF',
          800: '#FFFFFF',
          700: '#F9FBFD',
          600: '#EEF2F7',
        },
        neon: {
          400: '#93E33C',
          500: '#B6F36A',
          600: '#93E33C',
        },
        ink: {
          950: '#161C2D',
          900: '#161C2D',
          800: '#344054',
          700: '#667085',
        },
        paper: {
          50: '#FFFFFF',
          100: '#F9FBFD',
          200: '#EEF2F7',
        },
        marigold: {
          400: '#F5A623',
          500: '#F5A623',
          600: '#D98200',
        },
        steel: {
          400: '#4A7BFF',
          500: '#4A7BFF',
          600: '#3358D4',
        },
        track: {
          good: '#B6F36A',
          bad: '#F04438',
          warn: '#F5A623',
          accent: '#4A7BFF',
        },
      },
      borderRadius: {
        'card': '22px',
        'button': '16px',
        'input': '16px',
        'nav': '18px',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'sm-clean': '0 2px 8px rgba(16,24,40,.03)',
        'clean': '0 8px 24px rgba(16,24,40,.06), 0 2px 8px rgba(16,24,40,.03)',
        'card': '0 12px 40px rgba(15,23,42,.06)',
        'card-hover': '0 24px 70px rgba(15,23,42,.12)',
        'button': '0 10px 30px rgba(15,23,42,.18)',
        'button-hover': '0 18px 40px rgba(15,23,42,.22)',
        'input-focus': '0 0 0 5px rgba(182,243,106,.18)',
      },
    },
  },
  plugins: [],
}
