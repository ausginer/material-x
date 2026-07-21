import { describe, expect, it, vi } from 'vitest';
import {
  PRESENTATION_READY_TIMEOUT,
  watchPresentationReady,
} from '../../src/kernel/presentation-ready.ts';
import type { ResolutionCurrency } from '../../src/kernel/protocol.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';

const currency: ResolutionCurrency = { operationId: 7, resolutionId: 3 };

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
    const onSettled = vi.fn();
    watchPresentationReady(
      Promise.resolve(),
      currency,
      realm,
      onSettled as never,
    );

    await flush();

    expect(onSettled).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledWith(currency, null);
  });

  it('should report the rejection reason when the promise rejects', async () => {
    const onSettled = vi.fn();
    const failure = new Error('commit failed');
    watchPresentationReady(
      Promise.reject(failure),
      currency,
      realm,
      onSettled as never,
    );

    await flush();

    expect(onSettled).toHaveBeenCalledOnce();
    expect(onSettled.mock.calls[0]![1]).toBe(failure);
  });

  it('should echo the currency back so a stale settlement can be discarded', async () => {
    const onSettled = vi.fn();
    watchPresentationReady(
      Promise.resolve(),
      currency,
      realm,
      onSettled as never,
    );

    await flush();

    expect(onSettled.mock.calls[0]![0]).toBe(currency);
  });

  it('should report a TimeoutError when the promise never settles', () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();

    try {
      watchPresentationReady(
        new Promise<void>(() => {}),
        currency,
        realm,
        onSettled as never,
      );
      vi.advanceTimersByTime(PRESENTATION_READY_TIMEOUT);
    } finally {
      vi.useRealTimers();
    }

    expect(onSettled).toHaveBeenCalledOnce();
    expect((onSettled.mock.calls[0]![1] as DOMException).name).toBe(
      'TimeoutError',
    );
  });

  it('should not report twice when the promise settles after the timeout', async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    let release!: () => void;

    try {
      watchPresentationReady(
        new Promise<void>((resolve) => {
          release = resolve;
        }),
        currency,
        realm,
        onSettled as never,
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
    const onSettled = vi.fn();
    const watchDisposer = watchPresentationReady(
      Promise.resolve(),
      currency,
      realm,
      onSettled as never,
    );
    watchDisposer();

    await flush();

    expect(onSettled).not.toHaveBeenCalled();
  });
});
