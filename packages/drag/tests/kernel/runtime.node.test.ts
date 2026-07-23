import { describe, expect, it, vi } from 'vitest';
import { createControllerRuntime } from '../../src/kernel/runtime.ts';
import { CONTINUE_BATCH, type Decision } from '../../src/kernel/session.ts';

const EFFECT_DISPATCH = 1;

type RuntimeEffect = Readonly<{
  type: typeof EFFECT_DISPATCH;
  value: number;
}>;

type RuntimeEvent = Readonly<{
  value: number;
}>;

function decide(
  _: number,
  event: RuntimeEvent,
): Decision<number, RuntimeEffect> {
  return event.value === 1
    ? {
        state: event.value,
        effects: { type: EFFECT_DISPATCH, value: 2 },
      }
    : { state: event.value, effects: null };
}

describe('createControllerRuntime', () => {
  it('should install dispatch before the first effect executes', () => {
    const runtime = createControllerRuntime(
      0,
      decide,
      (dispatch) => ({
        execute(effect) {
          dispatch({ value: effect.value });
          return CONTINUE_BATCH;
        },
        destroy() {},
      }),
      vi.fn(),
    );

    runtime.dispatch({ value: 1 });

    expect(runtime.state()).toBe(2);
  });

  it('should destroy the effect runtime once', () => {
    const destroy = vi.fn();
    const runtime = createControllerRuntime(
      0,
      decide,
      () => ({
        execute: () => CONTINUE_BATCH,
        destroy,
      }),
      vi.fn(),
    );

    runtime.destroy();
    runtime.destroy();

    expect(destroy).toHaveBeenCalledOnce();
    expect(runtime.closed()).toBe(true);
  });

  it('should destroy effects before reporting a panic', () => {
    const order: string[] = [];
    const runtime = createControllerRuntime<
      number,
      RuntimeEvent,
      RuntimeEffect
    >(
      0,
      () => {
        throw new Error('failed');
      },
      () => ({
        execute: () => CONTINUE_BATCH,
        destroy() {
          order.push('destroy');
        },
      }),
      () => {
        order.push('report');
      },
    );

    runtime.dispatch({ value: 1 });

    expect(order).toEqual(['destroy', 'report']);
    expect(runtime.closed()).toBe(true);
  });
});
