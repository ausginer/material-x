/** Safari's setup file: see `safari-window.ts`. */
import { beforeAll } from 'vitest';
import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    fitSafariWindow(): Promise<void>;
  }
}

beforeAll(async () => {
  await commands.fitSafariWindow();
});
