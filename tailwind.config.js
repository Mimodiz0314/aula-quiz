/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Tipografía editorial: serif de display + mono para datos
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bone: '#F4F1EA',
        ink: '#111111',
        graphite: '#2A2A2A',
        mist: '#E6E2D8',
        // Verde y carmesí refinados, no neón
        affirm: '#1F7A4D',
        deny: '#B23A48',
        amber: '#D9A441',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'pulse-soft': 'pulseSoft 1.4s ease-in-out infinite',
        'slide-up': 'slideUp 300ms ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pulseSoft: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
};
