import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('applies defaults', () => {
    const env = validateEnv({ TWELVE_DATA_API_KEY: 'key' });
    expect(env.PORT).toBe(8080);
    expect(env.TWELVE_DATA_BASE_URL).toBe('https://api.twelvedata.com');
  });

  it('reads PORT as a number', () => {
    expect(validateEnv({ TWELVE_DATA_API_KEY: 'key', PORT: '3000' }).PORT).toBe(
      3000,
    );
  });

  it('trims the API key', () => {
    expect(
      validateEnv({ TWELVE_DATA_API_KEY: 'key\n' }).TWELVE_DATA_API_KEY,
    ).toBe('key');
  });

  it('fails fast when the API key is missing', () => {
    expect(() => validateEnv({})).toThrow(/TWELVE_DATA_API_KEY/);
  });
});
