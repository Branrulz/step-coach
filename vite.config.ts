import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  // Relative asset paths so the build works at GitHub Pages' /step-coach/ path.
  base: './',
  plugins: [react()],
});
