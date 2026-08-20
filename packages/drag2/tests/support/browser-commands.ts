/**
 * The command surface M-6 drives, declared for the browser side.
 *
 * See [`pointer-commands.node.ts`](./pointer-commands.node.ts) for why the
 * census may not use `element.dispatchEvent`.
 */
declare module 'vitest/browser' {
  interface BrowserCommands {
    pointerPress(x: number, y: number): Promise<void>;
    pointerSweep(x: number, y: number, steps: number): Promise<void>;
    pointerFlood(count: number, wave: number): Promise<void>;
    pointerRelease(): Promise<void>;
  }
}

export {};
