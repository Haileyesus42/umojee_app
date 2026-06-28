/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        emerald: {
          50: "#f1fcf5",
          100: "#defae8",
          200: "#bef4d4",
          300: "#8beab1",
          400: "#51d788",
          500: "#2dcc6f",
          600: "#1d9c52",
          700: "#1a7b43",
          800: "#1a6138",
          900: "#175031",
          950: "#072c18",
        },
        "waikawa-gray": {
          50: "#f3f7fa",
          100: "#eaf0f5",
          200: "#d8e3ed",
          300: "#c0d2e1",
          400: "#a6bad3",
          500: "#8fa3c5",
          600: "#7789b4",
          700: "#69789f",
          800: "#54617f",
          900: "#485267",
          950: "#2a2f3c",
        },
        "torch-red": {
          50: "#fef2f3",
          100: "#ffe1e3",
          200: "#ffc8cb",
          300: "#ffa2a7",
          400: "#fd6c74",
          500: "#f42c37",
          600: "#e2202b",
          700: "#be1720",
          800: "#9d171e",
          900: "#821a20",
          950: "#47080b",
        },
        "picton-blue": {
          50: "#f0faff",
          100: "#e0f5fe",
          200: "#bae8fd",
          300: "#7dd5fc",
          400: "#38bcf8",
          500: "#0ea5e9",
          600: "#028ac7",
          700: "#0370a1",
          800: "#075e85",
          900: "#0c506e",
          950: "#083549",
        },
        "deep-blue": "#0b2546",
        "deep-blue1": "#113c69",
      },
      screens: {
        xs: "350px",
      },
      backgroundImage: {
        "radial-gradient":
          "radial-gradient(circle, rgba(100,100,255,0.6), transparent 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.5)", opacity: "0.5" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ping-slow": "ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("daisyui")],
  daisyui: {
    themes: false, // false: only light + dark | true: all themes | array: specific themes like this ["light", "dark", "cupcake"]
    darkTheme: "light", // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ":root", // The element that receives theme color CSS variables
  },
};
