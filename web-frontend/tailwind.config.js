const { colors, spacing, typography, shadows, borderRadius, zIndex, breakpoints } = require('./src/design/tokens');

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    colors: {
      ...colors,
    },
    spacing: {
      ...spacing,
    },
    fontFamily: {
      ...typography.fontFamily,
    },
    fontSize: {
      ...typography.fontSize,
    },
    fontWeight: {
      ...typography.fontWeight,
    },
    lineHeight: {
      ...typography.lineHeight,
    },
    boxShadow: {
      ...shadows,
    },
    borderRadius: {
      ...borderRadius,
    },
    zIndex: {
      ...zIndex,
    },
    screens: {
      ...breakpoints,
    },
    extend: {
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
        'slower': '500ms',
      },
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};