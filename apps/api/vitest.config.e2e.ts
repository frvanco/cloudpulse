import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Base dédiée aux tests (créée par docker/postgres/init), surchargeable par
// TEST_DATABASE_URL, par exemple en CI.
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://cloudpulse:cloudpulse@localhost:5432/cloudpulse_test';
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Lu par ConfigModule.forRoot, évalué dès l'import d'AppModule.
    env: {
      TWELVE_DATA_API_KEY: 'test-key',
      DATABASE_URL: databaseUrl,
      QUOTE_TTL_SECONDS: '300',
    },
  },
});
