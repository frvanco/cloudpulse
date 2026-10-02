import { validateEnv } from './env.validation.js';

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

  it('fails fast when the API key is missing', () => {
    expect(() => validateEnv({})).toThrow(/TWELVE_DATA_API_KEY/);
  });
});
