import { ingestionTaskId } from './task-id.js';

describe('ingestionTaskId', () => {
  it('combines symbol and date', () => {
    expect(ingestionTaskId('NVDA', '2026-10-15')).toBe('NVDA-2026-10-15');
  });

  it('replaces characters not allowed in Cloud Tasks names', () => {
    expect(ingestionTaskId('BRK.B', '2026-10-15')).toBe('BRK_B-2026-10-15');
    expect(ingestionTaskId('MC:EPA', '2026-10-15')).toBe('MC_EPA-2026-10-15');
  });
});
