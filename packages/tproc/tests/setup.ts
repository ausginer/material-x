import { afterEach, vi } from 'vitest';
import { resetStore, storeModule, themeModule } from './helpers.ts';

vi.mock('../src/store/index.ts', () => storeModule);
vi.mock('../src/theme.ts', () => themeModule);

afterEach(() => {
  resetStore();
  vi.restoreAllMocks();
});
