import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF3FF',
          100: '#DDE7FF',
          200: '#C3D3FF',
          300: '#9DB7FF',
          400: '#6F8FF4',
          500: '#2D56C5',
          600: '#2548A8',
          700: '#1E3A87',
          800: '#18306E',
          900: '#132554',
        },
        'primary-dark': '#1E3A87',
        accent: '#7B96F9',
        'accent-dark': '#627DE0',
        sidebar: '#233C78',
        'light-bg': '#EFF3FA',
        border: '#D2DBEC',
        'text-primary': '#18253A',
        'text-secondary': '#5D6F86',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
};

export default config;
