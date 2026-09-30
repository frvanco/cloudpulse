import { z } from 'zod';

// Schéma de la configuration : l'application refuse de démarrer si une
// variable obligatoire manque ou est invalide (fail fast).
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // Cloud Run injecte PORT (8080 par défaut) : on doit l'écouter.
  PORT: z.coerce.number().int().positive().default(8080),
  TWELVE_DATA_API_KEY: z.string().min(1, 'TWELVE_DATA_API_KEY is required'),
  TWELVE_DATA_BASE_URL: z.url().default('https://api.twelvedata.com'),
  TWELVE_DATA_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}
