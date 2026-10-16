import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFF8ED",
        pinky: "#F6B7C8",
        yellows: "#F8D878",
        greeny: "#B8D8B0",
        bluey: "#B9C9F3",
      },
      fontFamily: { hand: ["'Mali'", "cursive"] },
      boxShadow: { 'sticker': '4px 4px 0px 0px rgba(0,0,0,0.8)' },
      animation: {
        'wiggle': 'wiggle 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        wiggle: { '0%, 100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }
      }
    },
  },
  plugins: [],
};
export default config;
