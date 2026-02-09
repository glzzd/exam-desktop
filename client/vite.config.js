const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');
const tailwindcss = require('@tailwindcss/vite').default;

module.exports = defineConfig({
  root: path.join(__dirname, 'src/renderer'),
  envDir: path.join(__dirname),
  base: './',
  plugins: [react(),tailwindcss()],
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer"),
        },
      },
    });
