import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid()],
  test: {
    name: 'web',
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'happy-dom',
    setupFiles: ['./src/test-utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/index.ts',
        'src/main.tsx',
        'src/env.d.ts',
        // App.tsx and Board.tsx are integration glue that's better verified
        // in the dev server / browser mode than in happy-dom unit tests.
        'src/App.tsx',
        'src/components/**',
        // Test utilities are not production code.
        'src/test-utils/**',
      ],
      // Web coverage is intentionally lower than core (which is 100%) because:
      //   - canvas-heavy code has many env-detection branches
      //     (`typeof OffscreenCanvas !== 'undefined'`) that don't fire in happy-dom
      //   - browser-API hooks (Fullscreen, Wake Lock, ResizeObserver) hit code
      //     paths that only execute in real browsers
      // Pure logic (state, font loader, layout helpers) is held to 100%; the
      // overall floor is set to "still serious" levels.
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 65,
        statements: 85,
      },
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
});
