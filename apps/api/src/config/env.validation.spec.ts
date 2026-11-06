import { resolveFileSecrets, validateEnv } from './env.validation.js';

const base = { TWELVE_DATA_API_KEY: 'key', DATABASE_URL: 'db' };

describe('validateEnv', () => {
  it('applies defaults', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(8080);
    expect(env.TWELVE_DATA_BASE_URL).toBe('https://api.twelvedata.com');
  });

  it('reads PORT as a number', () => {
    expect(validateEnv({ ...base, PORT: '3000' }).PORT).toBe(3000);
  });

  it('trims the API key', () => {
    expect(
      validateEnv({ ...base, TWELVE_DATA_API_KEY: 'key\n' })
        .TWELVE_DATA_API_KEY,
    ).toBe('key');
  });

  it('fails fast when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ TWELVE_DATA_API_KEY: 'key' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('requires the ingestion settings in ingest mode', () => {
    expect(() => validateEnv({ ...base, APP_MODE: 'ingest' })).toThrow(
      /INGESTION_QUEUE.*INGESTION_TARGET_URL.*INGESTION_INVOKER_SA/,
    );
    const env = validateEnv({
      ...base,
      APP_MODE: 'ingest',
      INGESTION_QUEUE: 'projects/p/locations/europe-west9/queues/ingest-quotes',
      INGESTION_TARGET_URL: 'https://ingest.example.test',
      INGESTION_INVOKER_SA: 'invoker@p.iam.gserviceaccount.com',
    });
    expect(env.INGESTION_HISTORY_DAYS).toBe(5);
  });

  it('fails fast when the API key is missing', () => {
    expect(() => validateEnv({})).toThrow(/TWELVE_DATA_API_KEY/);
  });
});

describe('resolveFileSecrets', () => {
  const files: Record<string, string> = {
    '/secrets/database-url': 'postgresql://u:p@localhost/db\n',
  };
  const readFile = (path: string) => files[path];

  it('reads a secret from the file named by VARIABLE_FILE, trimmed', () => {
    expect(
      resolveFileSecrets(
        { DATABASE_URL_FILE: '/secrets/database-url', PORT: '8080' },
        readFile,
      ),
    ).toMatchObject({
      DATABASE_URL: 'postgresql://u:p@localhost/db',
      PORT: '8080',
    });
  });

  it('leaves the environment unchanged without VARIABLE_FILE', () => {
    expect(resolveFileSecrets(base, readFile)).toEqual(base);
  });

  it('rejects a secret set both directly and by file', () => {
    expect(() =>
      resolveFileSecrets(
        { DATABASE_URL: 'db', DATABASE_URL_FILE: '/secrets/database-url' },
        readFile,
      ),
    ).toThrow(/DATABASE_URL and DATABASE_URL_FILE/);
  });

  it('fails fast when the file cannot be read', () => {
    expect(() =>
      validateEnv({
        TWELVE_DATA_API_KEY: 'key',
        DATABASE_URL_FILE: '/does/not/exist',
      }),
    ).toThrow(/ENOENT/);
  });
});
