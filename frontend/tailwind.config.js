/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  presets:[require('@neo4j-ndl/base').tailwindConfig],
  corePlugins: {
    preflight: false,
  },
  prefix:""
}

