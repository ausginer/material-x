import { afterEach, vi } from 'vitest';
import { mockDB, resetMockDB } from './helpers.ts';

vi.mock('../DB/index.ts', () => ({ default: mockDB }));

afterEach(() => {
  resetMockDB();
  vi.restoreAllMocks();
});
