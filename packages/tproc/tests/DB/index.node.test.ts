import { describe, it, expect, vi } from 'vitest';

describe('db index', () => {
  it('should load db instance', async () => {
    vi.unmock('../../src/DB/index.ts');
    vi.resetModules();
    const mockInstance = { name: 'db' };
    const load = vi.fn(async () => await Promise.resolve(mockInstance));

    vi.doMock('../../src/DB/DB.ts', () => ({
      DB: { load },
    }));

    const { default: db } = await import('../../src/DB/index.ts');

    expect(db).toBe(mockInstance);
    expect(load).toHaveBeenCalled();
  });
});
