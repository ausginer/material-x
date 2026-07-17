/**
 * The transition boundary. All state updates and effects for one session pass
 * through {@link Session.transit}: the next state is assigned *before* effects
 * run, so a synchronous browser follow-up caused by an effect (for example a
 * `lostpointercapture` emitted by releasing capture) observes the new state and
 * cannot repeat drop or cleanup logic.
 *
 * Effects may re-enter `transit` (a consumer callback might destroy the
 * controller); because state is already advanced, the nested transition starts
 * from the current state rather than the stale one.
 */
import {
  transition,
  type DragSessionEvent,
  type DragSessionState,
  type FsmConfig,
  IDLE_STATE,
} from './fsm.ts';

/** Runs the DOM effects implied by one transition. Free of state assignment. */
export type ApplyEffects = (
  previous: DragSessionState,
  next: DragSessionState,
  event: DragSessionEvent,
) => void;

export type Session = Readonly<{
  /** The current session state. Always the value after the latest transition. */
  state(): DragSessionState;
  /** Feeds one event through the machine and applies the resulting effects. */
  transit(event: DragSessionEvent): void;
}>;

export function createSession(
  config: FsmConfig,
  applyEffects: ApplyEffects,
): Session {
  let current: DragSessionState = IDLE_STATE;

  return {
    state() {
      return current;
    },

    transit(event) {
      const previous = current;
      const next = transition(previous, event, config);

      // Assign before effects so re-entrant transits and synchronous browser
      // follow-ups see the advanced state.
      current = next;

      applyEffects(previous, next, event);
    },
  };
}
