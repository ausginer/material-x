import { describe, expect, it, vi, type Mock } from 'vitest';
import {
  forEachMaybePromise,
  type ForEachMaybePromiseErrorHandler,
} from '../../src/utils/runtime.ts';

describe('forEachMaybePromise', () => {
  it('should iterate all items synchronously', () => {
    const callback = vi.fn<(value: number) => void>();

    forEachMaybePromise([1, 2, 3], callback);

    expect(callback).toHaveBeenNthCalledWith(1, 1);
    expect(callback).toHaveBeenNthCalledWith(2, 2);
    expect(callback).toHaveBeenNthCalledWith(3, 3);
  });

  it('should route sync throws to the error handler', () => {
    const error = new Error('sync');
    const onError: Mock<ForEachMaybePromiseErrorHandler> = vi.fn();

    forEachMaybePromise(
      [1],
      () => {
        throw error;
      },
      onError,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should rethrow sync errors when no error handler is provided', () => {
    const error = new Error('sync');

    expect(() =>
      forEachMaybePromise([1], () => {
        throw error;
      }),
    ).toThrow(error);
  });

  it('should route rejected real promises to the error handler', async () => {
    const error = new Error('async');
    const onError: Mock<ForEachMaybePromiseErrorHandler> = vi.fn();

    forEachMaybePromise([1], async () => await Promise.reject(error), onError);

    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should continue iterating after one callback fails', () => {
    const onError: Mock<ForEachMaybePromiseErrorHandler> = vi.fn();
    const calls: number[] = [];

    forEachMaybePromise(
      [1, 2, 3],
      (value) => {
        calls.push(value);

        if (value === 2) {
          throw new Error('stop');
        }
      },
      onError,
    );

    expect(calls).toEqual([1, 2, 3]);
    expect(onError).toHaveBeenCalledOnce();
  });
});
