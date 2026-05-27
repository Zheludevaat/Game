import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom for any component test; engine tests work fine either way
    // but jsdom keeps the option open for a future render harness.
    environment: 'jsdom',
    globals: false,
    // Match the existing src/ tree — tests live under __tests__ folders.
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
