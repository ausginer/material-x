/** The commands `commands.node.ts` defines, declared for the browser side. */
declare module 'vitest/browser' {
  interface BrowserCommands {
    pointerMove(x: number, y: number, steps?: number): Promise<void>;
    pointerDown(): Promise<void>;
    pointerUp(): Promise<void>;
    keyPress(key: string): Promise<void>;
    emulateReducedMotion(reduced: boolean): Promise<void>;
    touch(
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      points: ReadonlyArray<Readonly<{ id: number; x: number; y: number }>>,
    ): Promise<void>;
    tap(x: number, y: number): Promise<void>;
    forceGarbageCollection(): Promise<void>;
    countHeapObjects(name: string): Promise<number>;
    startHeapSampling(interval: number): Promise<void>;
    stopHeapSampling(urlPart: string): Promise<Record<string, number>>;
  }
}

export {};
