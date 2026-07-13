import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanupDOM } from './browser.ts';

afterEach(() => {
  cleanupDOM();
});
