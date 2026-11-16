/**
 * Copied into `packages/box-quad/tests/` for CI readings and removed after them
 * (`repo:RD-12` property 3). It reports, as a test annotation, the test frame's
 * inner size, its device pixel ratio, and the scale transform the orchestrator
 * applies to the frame element, read from the parent document.
 */
import { expect, it } from 'vitest';
import { server } from 'vitest/browser';

it('should report the test frame', async ({ annotate }) => {
  const frame = window.frameElement as HTMLElement | null;
  const parentView = frame?.ownerDocument.defaultView;
  const transforms: string[] = [];

  for (
    let element: Element | null = frame;
    element && parentView;
    element = element.parentElement
  ) {
    const { transform, scale, zoom } = parentView.getComputedStyle(element);

    if (
      transform !== 'none' ||
      (scale !== 'none' && scale !== '') ||
      (zoom !== '1' && zoom !== '')
    ) {
      transforms.push(
        `${element.localName}: transform ${transform}, scale ${scale}, zoom ${zoom}`,
      );
    }
  }

  const reading = {
    engine: server.browser,
    inner: [window.innerWidth, window.innerHeight],
    devicePixelRatio: window.devicePixelRatio,
    frameRect: frame
      ? [
          frame.getBoundingClientRect().width,
          frame.getBoundingClientRect().height,
        ]
      : null,
    parentInner: parentView
      ? [parentView.innerWidth, parentView.innerHeight]
      : null,
    transforms,
    userAgent: navigator.userAgent,
  };

  await annotate(`frame reading: ${JSON.stringify(reading)}`);
  expect(reading.inner).toHaveLength(2);
});
