import { defineConfig } from 'vitest/config'

/** Coverage target for `src/services/**`: 80% lines (PLAN Phase 3.2) — enforce by policy until full integration suite stabilizes. */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    passWithNoTests: true,
    pool: 'forks',
    maxWorkers: 1,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.ts'],
      exclude: ['**/*.d.ts'],
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'json-summary', 'html']
    }
  }
})
