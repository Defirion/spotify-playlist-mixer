/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Keep the CRA-era env var names working (Netlify sets
  // REACT_APP_SPOTIFY_CLIENT_ID) without touching the dashboard.
  envPrefix: 'REACT_APP_',
  define: {
    // CRA shimmed `process.env` in the browser; some debug-only reads
    // (TEST_VERBOSE, DEBUG_*) remain in shipped code and must resolve to
    // undefined instead of throwing. Vite still statically replaces the
    // longer `process.env.NODE_ENV` key first.
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Netlify publishes build/ — keep CRA's output dir.
    outDir: 'build',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: {
      // Tests assert raw class names (toHaveClass('title')) the way
      // identity-obj-proxy used to expose them.
      modules: { classNameStrategy: 'non-scoped' },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'json', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/types/**',
        'src/**/types.ts',
        'src/**/index.ts',
        'src/**/index.tsx',
        'src/test-utils/**',
        'src/mocks/**',
        'src/setupTests.ts',
      ],
    },
  },
});
