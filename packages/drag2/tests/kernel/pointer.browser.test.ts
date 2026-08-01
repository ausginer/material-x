import { afterEach, describe, expect, it } from 'vitest';
import { acquirePointerCapture } from '../../src/kernel/pointer.ts';

const created: HTMLElement[] = [];

afterEach(() => {
  for (const element of created.splice(0)) {
    element.remove();
  }
});

function createTarget(): HTMLElement {
  const element = document.createElement('div');
  element.style.width = '100px';
  element.style.height = '100px';
  document.body.append(element);
  created.push(element);
  return element;
}

describe('acquirePointerCapture', () => {
  it('should throw when capture cannot be acquired', () => {
    // No such pointer exists, so the UA rejects the request. The contract makes
    // this an activation failure rather than a silently degraded drag (D-17),
    // so the throw must reach the caller instead of being swallowed.
    expect(() => acquirePointerCapture(createTarget(), 9999)).toThrow();
  });

  it('should return a release that tolerates a vanished pointer', () => {
    const target = createTarget();
    // Force a held capture without a live pointer by stubbing the acquisition
    // half only; the release half is what has to stay guarded.
    target.setPointerCapture = () => {};
    const release = acquirePointerCapture(target, 1);

    expect(release).not.toThrow();
  });

  it('should latch the release so a second call is a no-op', () => {
    const target = createTarget();
    let releases = 0;

    target.setPointerCapture = () => {};
    target.releasePointerCapture = () => {
      releases += 1;
    };

    const release = acquirePointerCapture(target, 1);
    release();
    release();

    expect(releases).toBe(1);
  });
});
