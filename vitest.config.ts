import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/support/**/*.ts',
        'lib/flex/**/*.ts',
        'types/support.ts',
      ],
      exclude: [
        'node_modules',
        '.next',
        '__tests__',
        // 外部依存を持つファイルはE2Eテストで検証
        'lib/handlers/**/*.ts',
        'lib/database/**/*.ts',
      ],
      thresholds: {
        statements: 97,
        branches: 95,
        functions: 97,
        lines: 97,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
