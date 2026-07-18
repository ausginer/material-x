import { describe, expect, it, vi } from 'vitest';
import {
  IDLE,
  PENDING,
  type DragSessionEvent,
  type DragSessionState,
} from '../../src/kernel/fsm.ts';
import { createSession, type ApplyEffects } from '../../src/kernel/session.ts';

const CONFIG = { threshold: 8 };

function pointer(type: string, pointerId: number): DragSessionEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { type, pointerId, clientX: 0, clientY: 0 } as unknown as PointerEvent;
}

describe('createSession', () => {
  it('should start in the idle state', () => {
    const session = createSession(CONFIG, () => {});

    expect(session.state().type).toBe(IDLE);
  });

  it('should expose the advanced state before running effects', () => {
    let observed: DragSessionState | null = null;
    const session = createSession(CONFIG, () => {
      observed = session.state();
    });

    session.transit(pointer('pointerdown', 1));

    // The effect must see the post-transition state, not the previous one.
    expect(observed).not.toBeNull();
    expect(observed!.type).toBe(PENDING);
  });

  it('should pass previous, next, and the event to the effect', () => {
    const effect = vi.fn<ApplyEffects>();
    const session = createSession(CONFIG, effect);
    const event = pointer('pointerdown', 1);

    session.transit(event);

    expect(effect).toHaveBeenCalledOnce();
    const [previous, next, passedEvent] = effect.mock.calls[0]!;
    expect(previous.type).toBe(IDLE);
    expect(next.type).toBe(PENDING);
    expect(passedEvent).toBe(event);
  });

  it('should support a re-entrant transit from within an effect', () => {
    const states: string[] = [];
    const session = createSession(CONFIG, (_previous, next) => {
      states.push(next.type);

      // A destroy fired from inside the pointerdown effect must start from the
      // current (pending) state, not the stale idle one.
      if (next.type === PENDING) {
        session.transit({ type: 'destroy' });
      }
    });

    session.transit(pointer('pointerdown', 1));

    expect(states).toEqual([PENDING, IDLE]);
    expect(session.state().type).toBe(IDLE);
  });

  it('should not run effects for an event that does not change state', () => {
    const effect = vi.fn<ApplyEffects>();
    const session = createSession(CONFIG, effect);

    // A pointermove while idle defines no transition, so effects must not fire.
    session.transit(pointer('pointermove', 1));

    expect(effect).not.toHaveBeenCalled();
    expect(session.state().type).toBe(IDLE);
  });

  it('should not run effects for a foreign pointer during a drag', () => {
    const effect = vi.fn<ApplyEffects>();
    const session = createSession(CONFIG, effect);

    session.transit(pointer('pointerdown', 1));
    session.transit(pointer('pointermove', 1)); // pending -> pending (below threshold)
    effect.mockClear();

    // A move from a different pointer leaves the state identical, so no effect.
    session.transit(pointer('pointermove', 2));

    expect(effect).not.toHaveBeenCalled();
  });

  it('should force the machine back to idle on reset', () => {
    const session = createSession(CONFIG, () => {});

    session.transit(pointer('pointerdown', 1));
    expect(session.state().type).toBe(PENDING);

    session.reset();

    expect(session.state().type).toBe(IDLE);
  });
});
