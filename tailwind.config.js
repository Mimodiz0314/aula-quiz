/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Nunito"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Nunito"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brandPrimary: '#2B3E4E',
        brandSecondary: '#26A69A',
        brandAccent: '#F36D21',
        brandDanger: '#E63946',
        brandSuccess: '#10B981',
        ink: '#1A202C',
        gameBg: '#F8FAFC',
        mist: '#E2E8F0',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'pulse-soft': 'pulseSoft 1.4s ease-in-out infinite',
        'slide-up': 'slideUp 300ms ease-out',
        'bounce-in': 'bounceIn 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pulseSoft: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        slideUp: { '0%': { transform: 'translateY(16px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
