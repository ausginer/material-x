/** Temporary reading for Safari's CI run (`repo:RD-12` properties 3 and 10); removed after it. */
import { expect, it } from 'vitest';
import { server } from 'vitest/browser';

it.runIf(server.browser === 'safari')(
  'reads the window and the preference',
  () => {
    const transforms: string[] = [];

    for (
      let element: Element | null = window.frameElement;
      element;
      element = element.parentElement
    ) {
      const { transform, scale, zoom } = getComputedStyle(element);

      if (transform !== 'none' || scale !== 'none' || zoom !== '1') {
        transforms.push(`${element.tagName}: ${transform} ${scale} ${zoom}`);
      }
    }

    const frame = window.frameElement!.getBoundingClientRect();
    const reading = {
      topViewport: [window.top!.innerWidth, window.top!.innerHeight],
      frameInner: [innerWidth, innerHeight],
      frameRect: [frame.left, frame.top, frame.right, frame.bottom],
      devicePixelRatio,
      transforms,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    console.warn(`SAFARI READING ${JSON.stringify(reading)}`);
    expect(reading.reducedMotion).toBe(false);
  },
);
