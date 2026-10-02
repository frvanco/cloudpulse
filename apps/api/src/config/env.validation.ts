import { z } from 'zod';

// Schéma de la configuration : l'application refuse de démarrer si une
// variable obligatoire manque ou est invalide (fail fast).
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // Cloud Run injecte PORT (8080 par défaut) : on doit l'écouter.
  PORT: z.coerce.number().int().positive().default(8080),
  // trim : un secret créé avec `echo` contient souvent un \n final, qui rendrait
  // l'en-tête HTTP invalide.
  TWELVE_DATA_API_KEY: z
    .string()
    .trim()
    .min(1, 'TWELVE_DATA_API_KEY is required'),
  // Format : postgresql://USER:PASSWORD@HOST:PORT/DB
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Durée pendant laquelle un cours en base est servi sans rappeler Twelve Data.
  QUOTE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
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
