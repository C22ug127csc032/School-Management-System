import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2F7',
          100: '#DDE5EE',
          200: '#C4D0DD',
          300: '#9EB1C4',
          400: '#6F8BA7',
          500: '#35597E',
          600: '#284A6F',
          700: '#1D3A57',
          800: '#162E45',
          900: '#102235',
        },
        'primary-dark': '#162E45',
        accent: '#A64A1C',
        'accent-dark': '#7C3512',
        sidebar: '#15273B',
        'light-bg': '#EEF1F4',
        border: '#CED7E2',
        'text-primary': '#182431',
        'text-secondary': '#5E6E7E',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
};

export default config;
