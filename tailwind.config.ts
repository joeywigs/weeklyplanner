import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        morning: {
          50: '#fdf8ed',
          100: '#f9edd3',
          200: '#f2d9a7',
          300: '#e8c170',
          400: '#d4a843',
          500: '#b88c30',
          600: '#966f22',
          700: '#73551b',
          800: '#584218',
        },
        lunch: {
          50: '#f2f7f2',
          100: '#e0ede0',
          200: '#c0d9c0',
          300: '#98c298',
          400: '#7ba87b',
          500: '#5d8c5d',
          600: '#487148',
          700: '#385738',
          800: '#2c442c',
        },
        evening: {
          50: '#f6f2fa',
          100: '#ece4f4',
          200: '#d7c8e8',
          300: '#bda6d8',
          400: '#9b82be',
          500: '#7d63a3',
          600: '#634d85',
          700: '#4c3b66',
          800: '#3b2e50',
        },
        dinner: {
          50: '#fbf3f4',
          100: '#f5e2e5',
          200: '#eac4ca',
          300: '#dba2ac',
          400: '#c98b95',
          500: '#af6e79',
          600: '#915562',
          700: '#71414c',
          800: '#57333c',
        },
        calendar: {
          50: '#eef4f7',
          100: '#dce8ef',
          200: '#b8d1df',
          300: '#8fb5cb',
          400: '#6b98b4',
          500: '#527e9a',
          600: '#40647d',
          700: '#314d61',
          800: '#263c4b',
        },
        accent: {
          50: '#eef5fb',
          100: '#dcebf5',
          200: '#b9d5ea',
          300: '#8ebbdb',
          400: '#6ba0c9',
          500: '#4d84ae',
          600: '#3b6a90',
          700: '#2e526f',
          800: '#254158',
        },
      },
    },
  },
  plugins: [],
};

export default config;
