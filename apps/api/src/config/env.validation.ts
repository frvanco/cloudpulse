import { z } from 'zod';

// Schéma de la configuration : l'application refuse de démarrer si une
// variable obligatoire manque ou est invalide (fail fast).
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Même image, deux services Cloud Run : l'API publique ou l'ingestion.
    APP_MODE: z.enum(['api', 'ingest']).default('api'),
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
    // Connexions max par instance de l'API. Total = max-instances × cette valeur,
    // à garder sous le max_connections de la base (faible sur les petites instances).
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
    // Durée pendant laquelle un cours en base est servi sans rappeler Twelve Data.
    QUOTE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(300),
    TWELVE_DATA_BASE_URL: z.url().default('https://api.twelvedata.com'),
    TWELVE_DATA_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

    // --- Mode ingest uniquement ---
    // File Cloud Tasks : projects/PROJET/locations/REGION/queues/FILE
    INGESTION_QUEUE: z
      .string()
      .regex(/^projects\/[^/]+\/locations\/[^/]+\/queues\/[^/]+$/)
      .optional(),
    // URL du service d'ingestion lui-même : cible des tâches et audience OIDC.
    INGESTION_TARGET_URL: z.url().optional(),
    // Service account dont Cloud Tasks signe le jeton OIDC des tâches.
    INGESTION_INVOKER_SA: z.email().optional(),
    // Nombre de jours d'historique demandés à chaque ingestion (rattrape les
    // jours manqués ; l'upsert rend les chevauchements sans effet).
    INGESTION_HISTORY_DAYS: z.coerce.number().int().min(1).max(30).default(5),
  })
  .superRefine((env, ctx) => {
    if (env.APP_MODE !== 'ingest') return;
    for (const key of [
      'INGESTION_QUEUE',
      'INGESTION_TARGET_URL',
      'INGESTION_INVOKER_SA',
    ] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when APP_MODE=ingest`,
        });
      }
    }
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
