import { describe, expect, it, vi } from 'vitest';
import {
  PRESENTATION_READY_TIMEOUT,
  watchPresentationReady,
} from '../../src/kernel/presentation-ready.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';

/**
 * `watchPresentationReady` only reaches the realm for its timer pair, so the
 * ambient node timers are a faithful stand-in for these pure cases.
 */
const realm = {
  window: globalThis,
} as unknown as DOMRealm;

/** Yields to the microtask queue so a settled promise reaches its handler. */
function flush(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('watchPresentationReady', () => {
  it('should report success with a null error once the promise resolves', async () => {
    const onSettled = vi.fn<(error: unknown) => void>();
    watchPresentationReady(Promise.resolve(), realm, onSettled);

    await flush();

    expect(onSettled).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledWith(null);
  });

  it('should report the rejection reason when the promise rejects', async () => {
    const onSettled = vi.fn<(error: unknown) => void>();
    const failure = new Error('commit failed');
    watchPresentationReady(Promise.reject(failure), realm, onSettled);

    await flush();

    expect(onSettled).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledWith(failure);
  });

  it('should report a TimeoutError when the promise never settles', () => {
    vi.useFakeTimers();
    const onSettled = vi.fn<(error: unknown) => void>();

    try {
      watchPresentationReady(new Promise<void>(() => {}), realm, onSettled);
      vi.advanceTimersByTime(PRESENTATION_READY_TIMEOUT);
    } finally {
      vi.useRealTimers();
    }

    expect(onSettled).toHaveBeenCalledOnce();
    expect((onSettled.mock.calls[0]![0] as DOMException).name).toBe(
      'TimeoutError',
    );
  });

  it('should not report twice when the promise settles after the timeout', async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn<(error: unknown) => void>();
    let release!: () => void;

    try {
      watchPresentationReady(
        new Promise<void>((resolve) => {
          release = resolve;
        }),
        realm,
        onSettled,
      );
      vi.advanceTimersByTime(PRESENTATION_READY_TIMEOUT);
      release();
      await Promise.resolve();
    } finally {
      vi.useRealTimers();
    }

    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('should be inert once disposed', async () => {
    const onSettled = vi.fn<(error: unknown) => void>();
    const watchDisposer = watchPresentationReady(
      Promise.resolve(),
      realm,
      onSettled,
    );
    watchDisposer();

    await flush();

    expect(onSettled).not.toHaveBeenCalled();
  });
});
