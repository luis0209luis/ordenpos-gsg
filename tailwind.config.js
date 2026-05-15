/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Montserrat', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
      },
      colors: {
        gold: {
          50: '#fffdf0',
          100: '#fff8cc',
          200: '#ffed80',
          300: '#ffe033',
          400: '#ffd700',
          500: '#f5c400',
          600: '#d4a800',
          700: '#b08800',
          800: '#8a6800',
          900: '#5c4500',
        },
        dark: {
          bg: '#000000',
          surface: '#0d0d0d',
          card: '#111111',
          border: '#1f1f1f',
          muted: '#2a2a2a',
        },
        light: {
          bg: '#ffffff',
          surface: '#f8f8f8',
          card: '#f2f2f2',
          border: '#e5e5e5',
          muted: '#d4d4d4',
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #ffd700 0%, #f5c400 40%, #d4a800 70%, #ffd700 100%)',
        'gold-gradient-soft': 'linear-gradient(135deg, #ffe033 0%, #ffd700 50%, #b08800 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0d0d0d 0%, #000000 100%)',
        'sidebar-dark': 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
      },
      boxShadow: {
        'gold-sm': '0 2px 8px rgba(255, 215, 0, 0.20)',
        'gold-md': '0 4px 20px rgba(255, 215, 0, 0.28)',
        'gold-lg': '0 8px 40px rgba(255, 215, 0, 0.35)',
        'gold-xl': '0 16px 60px rgba(255, 215, 0, 0.40)',
        'dark-sm': '0 2px 8px rgba(0,0,0,0.50)',
        'dark-md': '0 4px 20px rgba(0,0,0,0.60)',
        'dark-lg': '0 8px 40px rgba(0,0,0,0.70)',
        'soft': '0 4px 24px rgba(0,0,0,0.08)',
        'soft-lg': '0 8px 40px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'xl2': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in-left': 'slideInLeft 0.35s ease forwards',
        'slide-in-up': 'slideInUp 0.4s ease forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,215,0,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255,215,0,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
