import { GoogleAuth } from 'google-auth-library';
import { runSmokeTest } from './smoke-test.js';

// Point d'entrée du conteneur verify : node dist/smoke/main.js
// URL : SMOKE_TEST_URL, sinon la première de CLOUD_RUN_SERVICE_URLS
// (fournie par Cloud Deploy aux conteneurs verify d'une cible Cloud Run).
async function main(): Promise<void> {
  const url =
    process.env.SMOKE_TEST_URL ??
    process.env.CLOUD_RUN_SERVICE_URLS?.split(',')[0];
  if (!url) {
    throw new Error('SMOKE_TEST_URL or CLOUD_RUN_SERVICE_URLS is required');
  }
  const requests = Number(process.env.SMOKE_TEST_REQUESTS ?? '20');

  // Service privé : jeton d'identité (OIDC) du service account d'exécution,
  // obtenu par les Application Default Credentials. Audience : l'URL du service.
  // SMOKE_TEST_AUTH=none : sans jeton, pour l'API lancée en local.
  const headers =
    process.env.SMOKE_TEST_AUTH === 'none'
      ? new Headers()
      : await (
          await new GoogleAuth().getIdTokenClient(url)
        ).getRequestHeaders(url);

  const result = await runSmokeTest({ url, requests, headers });
  console.log(JSON.stringify({ event: 'smoke.test', ...result }));
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
