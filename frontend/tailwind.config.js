/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#080B10",
        surface: "#0D121A",
        surfaceElevated: "#111823",
        borderSubtle: "rgba(255, 255, 255, 0.08)",
        textPrimary: "#F3F5F7",
        textSecondary: "#8B95A5",
        textMuted: "#596474",
        statusHealthy: "#22C55E",
        statusWarning: "#F59E0B",
        statusCritical: "#EF4444",
        statusInfo: "#3B82F6",
        statusAI: "#A78BFA"
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
