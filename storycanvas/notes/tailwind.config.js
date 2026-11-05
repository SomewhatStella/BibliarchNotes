/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "editor-raised": "rgb(var(--editor-raised, 255 255 255) / <alpha-value>)",
        parchment: {
          50: "rgb(var(--editor-parchment-50, 253 251 244) / <alpha-value>)",
          100: "rgb(var(--editor-parchment-100, 248 242 226) / <alpha-value>)",
          200: "rgb(var(--editor-parchment-200, 240 230 201) / <alpha-value>)",
        },
        ink: {
          900: "rgb(var(--editor-ink-900, 43 36 22) / <alpha-value>)",
          700: "rgb(var(--editor-ink-700, 74 64 48) / <alpha-value>)",
          500: "rgb(var(--editor-ink-500, 122 110 87) / <alpha-value>)",
        },
        gold: {
          400: "#D9B35B",
          500: "#C49A3C",
          600: "#A87E28",
        },
        bibliarch: {
          blue: "#2E5AAC",
          marigold: "#E8A61C",
          rose: "#C76A82",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      // Same corner rounding as Home and Books: 10px for buttons, fields and small cards.
      borderRadius: { lg: "10px", xl: "10px" },
      boxShadow: {
        card: "0 1px 2px rgba(43,36,22,.08), 0 4px 14px -6px rgba(43,36,22,.18)",
        "card-hover": "0 2px 4px rgba(43,36,22,.1), 0 10px 24px -8px rgba(43,36,22,.28)",
      },
    },
  },
  plugins: [],
};
