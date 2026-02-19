/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // This line is critical to make the Sun/Moon toggle work
  darkMode: 'class',
  theme: {
    extend: {
      // You can add custom monochrome colors here if needed later
    },
  },
  plugins: [
    // This plugin makes the AI's Markdown reports look professional
    require('@tailwindcss/typography'),
  ],
}