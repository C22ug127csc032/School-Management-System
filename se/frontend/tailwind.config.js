/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#dbe3ff',
          200: '#bccbff',
          300: '#90a9ff',
          400: '#5f7df0',
          500: '#3557cc',
          600: '#1E3EA0',
          700: '#19358a',
          800: '#162f79',
          900: '#102255',
        },
        sidebar: {
          light: '#ffffff',
          active: '#eff6ff',
          text: '#475569',
          'text-active': '#1E3EA0',
        },
        'app-bg': '#f8fafc',
        'card-bg': '#ffffff',
        accent: '#f1f5f9',
        border: '#e2e8f0',
        'text-main': '#0f172a',
        'text-muted': '#64748b',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'premium': '0 10px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
      }
    },
  },
  plugins: [],
};
