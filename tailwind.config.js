/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background Colors
        'page-bg': '#0A0E27',
        'surface': '#141B34',
        'surface-elevated': '#1A2342',

        // Blue Accent Colors (Primary)
        'primary-blue': '#3B82F6',
        'accent-blue': '#60A5FA',
        'electric-blue': '#2563EB',
        'cyan-accent': '#06B6D4',
        'bright-cyan': '#38BDF8',

        // Text Colors
        'text-primary': '#F3F4F6',
        'text-secondary': '#9CA3AF',
        'text-muted': '#6B7280',

        // UI Colors
        'border-default': '#1E293B',
        'border-highlight': '#334155',
        'success': '#10B981',
        'error': '#EF4444',
        'warning': '#F59E0B',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-vote': 'pulse-vote 0.3s ease-in-out',
      },
      keyframes: {
        'pulse-vote': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        }
      }
    },
  },
  plugins: [],
}
