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
        "sans-light": ["Inter_300Light"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
        "sans-extrabold": ["Inter_800ExtraBold"],
        "sans-black": ["Inter_900Black"],
        mono: ["JetBrainsMono_400Regular"],
        "mono-extrabold": ["JetBrainsMono_800ExtraBold"],
        "mono-bold": ["JetBrainsMono_700Bold"],
        display: ["PlusJakartaSans_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
