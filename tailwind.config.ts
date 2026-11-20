import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E11D48', dark: '#BE123C', light: '#FFE4E9' },
      },
    },
  },
  plugins: [],
}

export default config
