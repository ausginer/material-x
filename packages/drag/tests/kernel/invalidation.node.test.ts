import { describe, expect, it, vi } from 'vitest';
import { createFrameTask } from '../../src/kernel/invalidation.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';

type FrameHarness = Readonly<{
  realm: DOMRealm;
  runFrame(): void;
  runCanceledFrame(): void;
  requested(): number;
  canceled(): number;
}>;

function createFrameHarness(): FrameHarness {
  let callback: FrameRequestCallback | null = null;
  let canceledCallback: FrameRequestCallback | null = null;
  const requestAnimationFrame = vi.fn((next: FrameRequestCallback) => {
    callback = next;
    return 1;
  });
  const cancelAnimationFrame = vi.fn(() => {
    canceledCallback = callback;
    callback = null;
  });

  return {
    realm: {
      window: {
        requestAnimationFrame,
        cancelAnimationFrame,
      },
    } as unknown as DOMRealm,
    runFrame() {
      const pending = callback;
      callback = null;
      pending?.(0);
    },
    runCanceledFrame() {
      const pending = canceledCallback;
      canceledCallback = null;
      pending?.(0);
    },
    requested: () => requestAnimationFrame.mock.calls.length,
    canceled: () => cancelAnimationFrame.mock.calls.length,
  };
}

describe('createFrameTask', () => {
  it('should coalesce multiple schedules into one frame', () => {
    const harness = createFrameHarness();
    const task = createFrameTask(harness.realm, vi.fn());

    task.schedule(1);
    task.schedule(2);
    task.schedule(3);

    expect(harness.requested()).toBe(1);
  });

  it('should run only the latest scheduled value', () => {
    const harness = createFrameHarness();
    const run = vi.fn();
    const task = createFrameTask(harness.realm, run);

    task.schedule(1);
    task.schedule(2);
    harness.runFrame();

    expect(run).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('should synchronously flush the latest pending value', () => {
    const harness = createFrameHarness();
    const run = vi.fn();
    const task = createFrameTask(harness.realm, run);

    task.schedule(1);
    task.schedule(2);
    task.flush();

    expect(harness.canceled()).toBe(1);
    expect(run).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('should make canceled work inert', () => {
    const harness = createFrameHarness();
    const run = vi.fn();
    const task = createFrameTask(harness.realm, run);

    task.schedule(1);
    task.cancel();
    harness.runCanceledFrame();

    expect(harness.canceled()).toBe(1);
    expect(run).not.toHaveBeenCalled();
  });

  it('should request a new frame when work schedules during execution', () => {
    const harness = createFrameHarness();
    let task: ReturnType<typeof createFrameTask<number>>;
    const run = vi.fn((value: number) => {
      if (value === 1) {
        task.schedule(2);
      }
    });
    task = createFrameTask(harness.realm, run);

    task.schedule(1);
    harness.runFrame();

    expect(harness.requested()).toBe(2);
    expect(run).toHaveBeenCalledExactlyOnceWith(1);

    harness.runFrame();

    expect(run).toHaveBeenLastCalledWith(2);
  });

  it('should cancel and flush idempotently without pending work', () => {
    const harness = createFrameHarness();
    const run = vi.fn();
    const task = createFrameTask(harness.realm, run);

    task.cancel();
    task.cancel();
    task.flush();
    task.flush();

    expect(harness.canceled()).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
});
