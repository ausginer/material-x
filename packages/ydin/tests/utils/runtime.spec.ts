import { describe, expect, it, vi } from 'vitest';
import {
  forEachMaybePromise,
  join,
  not,
  when,
} from '../../src/utils/runtime.ts';

describe('join', () => {
  it('should call all callbacks in order', () => {
    const calls: string[] = [];
    const callback = join(
      () => calls.push('first'),
      () => calls.push('second'),
      () => calls.push('third'),
    );

    callback();

    expect(calls).toEqual(['first', 'second', 'third']);
  });
});

describe('when', () => {
  it('should call andThen when condition returns true', () => {
    const callback = when(
      (value: number) => value > 0,
      (value) => value * 2,
      () => -1,
    );

    expect(callback(2)).toBe(4);
  });

  it('should call orElse when condition returns false', () => {
    const callback = when(
      (value: number) => value > 0,
      (value) => value * 2,
      () => -1,
    );

    expect(callback(0)).toBe(-1);
  });

  it('should return undefined when condition is false and orElse is missing', () => {
    const callback = when(
      (value: number) => value > 0,
      (value) => value * 2,
    );

    expect(callback(0)).toBeUndefined();
  });
});

describe('not', () => {
  it('should invert the predicate result', () => {
    const predicate = not((value: number) => value > 0);

    expect(predicate(1)).toBe(false);
    expect(predicate(0)).toBe(true);
  });
});

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
    const onError = vi.fn();

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
    const onError = vi.fn();

    forEachMaybePromise([1], async () => await Promise.reject(error), onError);

    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should continue iterating after one callback fails', () => {
    const onError = vi.fn();
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
