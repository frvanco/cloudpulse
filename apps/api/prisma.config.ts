import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Pas de env() ici : `prisma generate` doit fonctionner sans base (build Docker).
    url: process.env.DATABASE_URL ?? '',
  },
});
