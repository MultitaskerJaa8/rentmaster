/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff', 100: '#d9e6ff', 200: '#bcd4ff', 300: '#8eb8ff',
          400: '#5891ff', 500: '#316bff', 600: '#1a4bf5', 700: '#1539e1',
          800: '#1830b6', 900: '#1a2f8f', 950: '#151d57',
        },
        accent: {
          50: '#ecfdf6', 100: '#d1fae7', 200: '#a7f3d2', 300: '#6ee7b8',
          400: '#34d399', 500: '#10b981', 600: '#059666', 700: '#047852',
          800: '#065f42', 900: '#064e37',
        },
        ink: {
          50: '#f6f7f9', 100: '#eceef2', 200: '#d5dae3', 300: '#b0b9ca',
          400: '#8492ac', 500: '#647492', 600: '#4f5c78', 700: '#414b62',
          800: '#394053', 900: '#333847', 950: '#22252f',
        },
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(16,24,40,0.06), 0 4px 24px -8px rgba(16,24,40,0.08)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 8px 28px -12px rgba(16,24,40,0.14)',
        glow: '0 0 0 4px rgba(49,107,255,0.12)',
        pop: '0 20px 45px -18px rgba(26,75,245,0.45)',
      },
      backgroundImage: {
        'grid-light':
          'linear-gradient(to right, rgba(100,116,146,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,146,0.07) 1px, transparent 1px)',
        'brand-gradient': 'linear-gradient(135deg,#316bff 0%,#7c3aed 55%,#10b981 130%)',
        'hero-gradient': 'radial-gradient(1200px 500px at 10% -10%, #d9e6ff 0%, transparent 60%), radial-gradient(900px 400px at 100% 0%, #d1fae7 0%, transparent 55%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-in': { '0%': { opacity: 0, transform: 'translateX(-14px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.96)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(16,185,129,.55)' },
          '70%': { boxShadow: '0 0 0 10px rgba(16,185,129,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0)' },
        },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .4s ease both',
        'slide-in': 'slide-in .35s ease both',
        'scale-in': 'scale-in .28s cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2s infinite',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};