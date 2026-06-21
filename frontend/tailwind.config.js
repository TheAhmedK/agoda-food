/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f9faf7',
          100: '#fdd762',
          500: '#7db557',
          550: '#4e7036',
          600: '#c23b41',
          700: '#4376b4',
        },
      },
    },
  },
  plugins: [],
}

