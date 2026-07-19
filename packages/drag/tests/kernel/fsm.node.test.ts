import { describe, expect, it } from 'vitest';
import {
  transition,
  IDLE_STATE,
  AWAITING_COMMIT,
  DRAGGING,
  IDLE,
  PENDING,
  SETTLING,
  type DragSessionEvent,
  type DragSessionState,
  type FsmConfig,
} from '../../src/kernel/fsm.ts';

const CONFIG: FsmConfig = { threshold: 8 };

/**
 * A pointer-shaped event. The transition discriminates events structurally, so a
 * plain object with the fields it reads is a faithful stand-in for a real
 * `PointerEvent` and keeps these tests pure.
 */
function pointer(
  type: string,
  pointerId: number,
  x = 0,
  y = 0,
): DragSessionEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { type, pointerId, clientX: x, clientY: y } as unknown as PointerEvent;
}

/** Runs a sequence of events from idle and returns the final state. */
function run(...events: readonly DragSessionEvent[]): DragSessionState {
  return events.reduce<DragSessionState>(
    (state, event) => transition(state, event, CONFIG),
    IDLE_STATE,
  );
}

describe('transition', () => {
  describe('from idle', () => {
    it('should arm tracking on pointerdown', () => {
      const state = transition(
        IDLE_STATE,
        pointer('pointerdown', 1, 5, 6),
        CONFIG,
      );

      expect(state).toEqual({
        type: PENDING,
        pointerId: 1,
        origin: { x: 5, y: 6 },
        latest: { x: 5, y: 6 },
      });
    });

    it('should ignore a pointermove while idle', () => {
      const state = transition(
        IDLE_STATE,
        pointer('pointermove', 1, 5, 6),
        CONFIG,
      );

      expect(state.type).toBe(IDLE);
    });
  });

  describe('from pending', () => {
    it('should stay pending for a move below the threshold', () => {
      const state = run(
        pointer('pointerdown', 1),
        pointer('pointermove', 1, 3, 3),
      );

      expect(state.type).toBe(PENDING);
    });

    it('should activate once travel crosses the threshold', () => {
      const state = run(
        pointer('pointerdown', 1),
        pointer('pointermove', 1, 20, 0),
      );

      expect(state.type).toBe(DRAGGING);
    });

    it('should treat a release before activation as a click back to idle', () => {
      const state = run(pointer('pointerdown', 1), pointer('pointerup', 1));

      expect(state.type).toBe(IDLE);
    });

    it('should ignore events from a foreign pointer', () => {
      const state = run(
        pointer('pointerdown', 1),
        pointer('pointermove', 2, 50, 50),
      );

      expect(state.type).toBe(PENDING);
    });

    it('should stay pending through a lost pointer capture', () => {
      const state = run(
        pointer('pointerdown', 1),
        pointer('lostpointercapture', 1),
      );

      expect(state.type).toBe(PENDING);
    });
  });

  describe('from dragging', () => {
    const toDragging = (): DragSessionState =>
      run(pointer('pointerdown', 1), pointer('pointermove', 1, 20, 0));

    it('should track the owning pointer on move', () => {
      const state = transition(
        toDragging(),
        pointer('pointermove', 1, 30, 4),
        CONFIG,
      );

      expect(state).toMatchObject({
        type: DRAGGING,
        latest: { x: 30, y: 4 },
      });
    });

    it('should hand off to awaiting-commit on release', () => {
      const state = transition(toDragging(), pointer('pointerup', 1), CONFIG);

      expect(state.type).toBe(AWAITING_COMMIT);
    });

    it('should settle canceled on pointercancel', () => {
      const state = transition(
        toDragging(),
        pointer('pointercancel', 1),
        CONFIG,
      );

      expect(state).toEqual({ type: SETTLING, result: 'canceled' });
    });

    it('should settle canceled on escape', () => {
      const state = transition(toDragging(), { type: 'escape' }, CONFIG);

      expect(state).toEqual({ type: SETTLING, result: 'canceled' });
    });

    it('should not react to a foreign pointer release', () => {
      const state = transition(toDragging(), pointer('pointerup', 2), CONFIG);

      expect(state.type).toBe(DRAGGING);
    });

    it('should keep dragging through a lost pointer capture', () => {
      // Touch transfers implicit capture when the engine re-captures, firing
      // `lostpointercapture`; the drag is tracked on the document, so it must
      // survive (regression: this cancelled sorting on mobile).
      const state = transition(
        toDragging(),
        pointer('lostpointercapture', 1),
        CONFIG,
      );

      expect(state.type).toBe(DRAGGING);
    });
  });

  describe('from awaiting-commit', () => {
    const toAwaiting = (): DragSessionState =>
      run(
        pointer('pointerdown', 1),
        pointer('pointermove', 1, 20, 0),
        pointer('pointerup', 1),
      );

    it('should settle accepted on drop-accepted', () => {
      const state = transition(toAwaiting(), { type: 'drop-accepted' }, CONFIG);

      expect(state).toEqual({ type: SETTLING, result: 'accepted' });
    });

    it('should settle rejected on drop-rejected', () => {
      const state = transition(toAwaiting(), { type: 'drop-rejected' }, CONFIG);

      expect(state).toEqual({ type: SETTLING, result: 'rejected' });
    });

    it('should settle accepted on commit-observed', () => {
      // The sortable path settles through an observed DOM commit rather than an
      // outright drop acceptance; both reach the same accepted settle.
      const state = transition(
        toAwaiting(),
        { type: 'commit-observed' },
        CONFIG,
      );

      expect(state).toEqual({ type: SETTLING, result: 'accepted' });
    });

    it('should ignore pointer input while awaiting an external decision', () => {
      const state = transition(
        toAwaiting(),
        pointer('pointermove', 1, 99, 99),
        CONFIG,
      );

      expect(state.type).toBe(AWAITING_COMMIT);
    });
  });

  describe('from settling', () => {
    const toSettling = (): DragSessionState =>
      run(
        pointer('pointerdown', 1),
        pointer('pointermove', 1, 20, 0),
        pointer('pointerup', 1),
        { type: 'drop-accepted' },
      );

    it('should return to idle only on animation-finished', () => {
      const state = transition(
        toSettling(),
        { type: 'animation-finished' },
        CONFIG,
      );

      expect(state.type).toBe(IDLE);
    });

    it('should ignore a late lostpointercapture after release', () => {
      const state = transition(
        toSettling(),
        pointer('lostpointercapture', 1),
        CONFIG,
      );

      expect(state).toEqual({ type: SETTLING, result: 'accepted' });
    });
  });

  describe('full lifecycles', () => {
    it('should complete an accepted drag end to end', () => {
      const state = run(
        pointer('pointerdown', 1),
        pointer('pointermove', 1, 20, 0),
        pointer('pointerup', 1),
        { type: 'drop-accepted' },
        { type: 'animation-finished' },
      );

      expect(state.type).toBe(IDLE);
    });

    it('should complete a canceled drag end to end', () => {
      const state = run(
        pointer('pointerdown', 1),
        pointer('pointermove', 1, 20, 0),
        pointer('pointercancel', 1),
        { type: 'animation-finished' },
      );

      expect(state.type).toBe(IDLE);
    });
  });
});
