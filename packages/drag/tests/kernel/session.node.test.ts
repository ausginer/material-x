import { describe, expect, it, vi } from 'vitest';
import {
  CONTINUE_BATCH,
  createSession,
  STOP_BATCH,
  type Decision,
  type EffectDisposition,
} from '../../src/kernel/session.ts';

const EFFECT_RECORD = 1;
const EFFECT_NESTED = 2;
const EFFECT_STOP = 3;
const EFFECT_CLOSE = 4;

type TestEffect = Readonly<{
  type:
    | typeof EFFECT_RECORD
    | typeof EFFECT_NESTED
    | typeof EFFECT_STOP
    | typeof EFFECT_CLOSE;
  value?: number;
}>;

type TestEvent = Readonly<{
  value: number;
  effects?: TestEffect | readonly TestEffect[] | null;
}>;

function decide(state: number, event: TestEvent): Decision<number, TestEffect> {
  return {
    state: event.value,
    effects: event.effects ?? null,
  };
}

describe('createSession', () => {
  it('should commit state before executing effects', () => {
    let observed: number | null | undefined;
    let session: ReturnType<
      typeof createSession<number, TestEvent, TestEffect>
    >;

    session = createSession(
      0,
      decide,
      () => {
        observed = session.state();
        return CONTINUE_BATCH;
      },
      vi.fn(),
    );

    session.dispatch({
      value: 1,
      effects: { type: EFFECT_RECORD },
    });

    expect(observed).toBe(1);
  });

  it('should process nested dispatch after the current batch', () => {
    const order: number[] = [];
    let session: ReturnType<
      typeof createSession<number, TestEvent, TestEffect>
    >;

    session = createSession(
      0,
      decide,
      (effect) => {
        if (effect.type === EFFECT_NESTED) {
          order.push(1);
          session.dispatch({
            value: 2,
            effects: { type: EFFECT_RECORD, value: 3 },
          });
        } else {
          order.push(effect.value!);
        }

        return CONTINUE_BATCH;
      },
      vi.fn(),
    );

    session.dispatch({
      value: 1,
      effects: [{ type: EFFECT_NESTED }, { type: EFFECT_RECORD, value: 2 }],
    });

    expect(order).toEqual([1, 2, 3]);
    expect(session.state()).toBe(2);
  });

  it('should stop the remaining effect batch after STOP_BATCH', () => {
    const execute = vi.fn(
      (effect: TestEffect): EffectDisposition =>
        effect.type === EFFECT_STOP ? STOP_BATCH : CONTINUE_BATCH,
    );
    const session = createSession(0, decide, execute, vi.fn());

    session.dispatch({
      value: 1,
      effects: [
        { type: EFFECT_RECORD },
        { type: EFFECT_STOP },
        { type: EFFECT_RECORD },
      ],
    });

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('should stop the remaining effect batch after close', () => {
    let session: ReturnType<
      typeof createSession<number, TestEvent, TestEffect>
    >;
    const execute = vi.fn((effect: TestEffect): EffectDisposition => {
      if (effect.type === EFFECT_CLOSE) {
        session.close();
      }

      return CONTINUE_BATCH;
    });
    session = createSession(0, decide, execute, vi.fn());

    session.dispatch({
      value: 1,
      effects: [{ type: EFFECT_CLOSE }, { type: EFFECT_RECORD }],
    });

    expect(execute).toHaveBeenCalledOnce();
    expect(session.state()).toBeNull();
  });

  it('should clear queued events and reject later dispatch after close', () => {
    let session: ReturnType<
      typeof createSession<number, TestEvent, TestEffect>
    >;
    const decide_ = vi.fn(decide);

    session = createSession(
      0,
      decide_,
      () => {
        session.dispatch({ value: 2 });
        session.close();
        return CONTINUE_BATCH;
      },
      vi.fn(),
    );

    session.dispatch({
      value: 1,
      effects: { type: EFFECT_CLOSE },
    });
    session.dispatch({ value: 3 });

    expect(decide_).toHaveBeenCalledOnce();
    expect(session.closed()).toBe(true);
  });

  it('should close ingress and report a decision panic once', () => {
    const failure = new Error('decision failed');
    const panic = vi.fn();
    const session = createSession<number, TestEvent, TestEffect>(
      0,
      () => {
        throw failure;
      },
      () => CONTINUE_BATCH,
      panic,
    );

    session.dispatch({ value: 1 });
    session.dispatch({ value: 2 });

    expect(panic).toHaveBeenCalledExactlyOnceWith(failure);
    expect(session.closed()).toBe(true);
    expect(session.state()).toBeNull();
  });

  it('should close ingress and report an executor panic once', () => {
    const failure = new Error('effect failed');
    const panic = vi.fn();
    const session = createSession(
      0,
      decide,
      () => {
        throw failure;
      },
      panic,
    );

    session.dispatch({
      value: 1,
      effects: { type: EFFECT_RECORD },
    });

    expect(panic).toHaveBeenCalledExactlyOnceWith(failure);
    expect(session.closed()).toBe(true);
  });

  it('should close idempotently', () => {
    const session = createSession(0, decide, () => CONTINUE_BATCH, vi.fn());

    session.close();
    session.close();

    expect(session.closed()).toBe(true);
    expect(session.state()).toBeNull();
  });
});
