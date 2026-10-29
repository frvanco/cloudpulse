// Test de fumée exécuté par Cloud Deploy (conteneur verify) après chaque phase
// du déploiement. Il interroge l'URL du service, pas une révision précise :
// pendant un canary, les requêtes se répartissent entre l'ancienne et la
// nouvelle révision, et toutes doivent répondre.

export interface SmokeTestOptions {
  url: string;
  requests: number;
  headers: Headers;
  fetchFn?: typeof fetch;
  retryDelayMs?: number;
}

export interface SmokeTestResult {
  url: string;
  requests: number;
  ok: number;
  failed: number;
  // Nombre de réponses par révision : montre la répartition du trafic.
  revisions: Record<string, number>;
}

const ATTEMPTS_PER_REQUEST = 3;

export async function runSmokeTest({
  url,
  requests,
  headers,
  fetchFn = fetch,
  retryDelayMs = 2000,
}: SmokeTestOptions): Promise<SmokeTestResult> {
  const result: SmokeTestResult = {
    url,
    requests,
    ok: 0,
    failed: 0,
    revisions: {},
  };

  for (let i = 0; i < requests; i++) {
    const revision = await checkReady(url, headers, fetchFn, retryDelayMs);
    if (revision === null) {
      result.failed++;
      continue;
    }
    result.ok++;
    result.revisions[revision] = (result.revisions[revision] ?? 0) + 1;
  }
  return result;
}

// Révision qui a répondu, ou null après plusieurs échecs (démarrage à froid,
// erreur passagère : quelques tentatives avant de conclure).
async function checkReady(
  url: string,
  headers: Headers,
  fetchFn: typeof fetch,
  retryDelayMs: number,
): Promise<string | null> {
  for (let attempt = 1; attempt <= ATTEMPTS_PER_REQUEST; attempt++) {
    try {
      const response = await fetchFn(new URL('/health/ready', url), {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const body = (await response.json()) as { revision?: string };
        return body.revision ?? 'unknown';
      }
    } catch {
      // Réseau ou timeout : nouvelle tentative.
    }
    if (attempt < ATTEMPTS_PER_REQUEST) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  return null;
}
