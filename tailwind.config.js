/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          950: "#0C0A09",
          900: "#1C1917",
          800: "#292524",
          700: "#44403C",
        },
        accent: {
          yellow: "#F59E0B",
          red: "#F43F5E",
          green: "#10B981",
          blue: "#0EA5E9",
          purple: "#B720F7",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        mono: ["JetBrainsMono_400Regular"],
      },
    },
  },
  plugins: [],
};
