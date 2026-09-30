import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Lu par ConfigModule.forRoot, évalué dès l'import d'AppModule.
    env: { TWELVE_DATA_API_KEY: 'test-key' },
  },
});
