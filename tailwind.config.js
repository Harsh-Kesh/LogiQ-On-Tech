/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface, #f8f9fb)',
        'on-background': 'var(--color-on-background, #191c1e)',
        'on-surface': 'var(--color-on-surface, #191c1e)',
        'on-surface-variant': 'var(--color-on-surface-variant, #444655)',
        'outline-variant': 'var(--color-outline-variant, #c5c5d7)',
        'surface-container': 'var(--color-surface-container, #edeef0)',
        'surface-container-lowest': 'var(--color-surface-container-lowest, #ffffff)',
        'surface-container-low': 'var(--color-surface-container-low, #f3f4f6)',
        'surface-container-high': 'var(--color-surface-container-high, #e7e8ea)',
        'surface-container-highest': 'var(--color-surface-container-highest, #e1e2e4)',
        primary: 'var(--color-primary, #2f4adb)',
        'primary-container': 'var(--color-primary-container, #4c66f5)',
        secondary: 'var(--color-secondary, #5f5e5f)',
        tertiary: 'var(--color-tertiary, #006388)',
        'status-success': 'var(--color-status-success, #10B981)',
        'status-error': 'var(--color-status-error, #EF4444)',
        'status-warning': 'var(--color-status-warning, #F59E0B)',
        'status-info': 'var(--color-status-info, #5770FF)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Hanken Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
