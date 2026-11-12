import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './', // relative asset paths so it works under a GitHub Pages sub-path
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
});
