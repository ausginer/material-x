import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanupDOM } from './browser.ts';

/*
 * `user-event` dispatches untrusted pointer events, whose pointer the browser
 * never saw. Capturing such a pointer is a no-op in Chromium and a
 * `NotFoundError` in Firefox, which ends the gesture before it starts. A pointer
 * from real input is always known, so the tests treat Firefox as Chromium does:
 * that one error is ignored, and every other one still throws.
 */
const capture = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'setPointerCapture',
)!;

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  ...capture,
  value(this: Element, pointerId: number): void {
    try {
      Reflect.apply(
        capture.value as (this: Element, pointerId: number) => void,
        this,
        [pointerId],
      );
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
        throw error;
      }
    }
  },
});

afterEach(() => {
  cleanupDOM();
});
