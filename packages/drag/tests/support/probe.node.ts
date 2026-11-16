/**
 * Temporary probe (`repo:RD-12` property 4): one WebDriver pointer chain in
 * three forms, to read when Safari delivers its last move. Removed after the
 * CI reading.
 */
import { defineBrowserCommand } from '@vitest/browser';
import type { BrowserCommand } from 'vitest/node';

interface Chain {
  move(params: object): Chain;
  pause(duration: number): Chain;
  perform(skipRelease?: boolean): Promise<void>;
}

export const probeCommands: Record<string, BrowserCommand<any[]>> = {
  probeChain: defineBrowserCommand<
    [string, ReadonlyArray<readonly [number, number]>]
  >(async (context, variant, points): Promise<void> => {
    const { browser } = context as unknown as Readonly<{
      browser: {
        action(type: 'pointer', params: object): Chain;
      };
    }>;
    let chain = browser.action('pointer', {
      id: 'drag-pointer',
      parameters: { pointerType: 'mouse' },
    });

    for (const [x, y] of points) {
      chain = chain.move({
        x,
        y,
        origin: 'viewport',
        duration: variant === 'duration' ? 16 : 0,
      });
    }

    if (variant === 'pause') {
      chain = chain.pause(50);
    }

    await chain.perform(true);
  }),
};
