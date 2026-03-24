/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#1e1e1e',
        'bg-secondary': '#252526',
        'bg-tertiary': '#2d2d30',
        'text-primary': '#cccccc',
        'text-secondary': '#9e9e9e',
        'accent-blue': '#007acc',
        'accent-blue-hover': '#1a8ad4',
        'signal-buy': '#f23645',
        'signal-sell': '#089981',
        'border-color': '#3e3e42',
      },
    },
  },
  plugins: [],
};
