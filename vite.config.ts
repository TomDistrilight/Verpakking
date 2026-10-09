import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relatieve base, zodat de build zowel op GitHub Pages (/Verpakking/) als lokaal werkt.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
