import { execSync } from 'node:child_process';

// Applique les migrations sur la base de test avant la suite e2e.
// Prérequis : `docker compose up -d` à la racine du repo.
export default function setup(): void {
  // DATABASE_URL est défini par vitest.config.e2e.ts.
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
