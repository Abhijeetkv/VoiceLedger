/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          800: '#1a1f3a',
          900: '#0f1225',
          950: '#0a0d1a',
        },
        accent: {
          violet: '#8b5cf6',
          blue: '#3b82f6',
        },
      },
    },
  },
  plugins: [],
};
