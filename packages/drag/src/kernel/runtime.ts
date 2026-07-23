import {
  createSession,
  type EffectDisposition,
  type Machine,
  type Session,
  type TaggedEffect,
} from './session.ts';

export type EffectRuntime<Effect extends TaggedEffect> = Readonly<{
  execute(effect: Effect): EffectDisposition;
  destroy(): void;
}>;

export type ControllerRuntime<State, Event> = Readonly<{
  dispatch(event: Event): void;
  state(): State | null;
  destroy(): void;
  closed(): boolean;
}>;

/**
 * Resolves the intentional dispatch/execute dependency without exposing a
 * mutable context object to effect owners.
 */
export function createControllerRuntime<
  State,
  Event,
  Effect extends TaggedEffect,
>(
  initial: State,
  decide: Machine<State, Event, Effect>,
  createEffects: (dispatch: (event: Event) => void) => EffectRuntime<Effect>,
  reportFatal: (error: unknown) => void,
): ControllerRuntime<State, Event> {
  let dispatch: (event: Event) => void;
  let destroyed = false;

  const effects = createEffects((event) => {
    dispatch(event);
  });

  const session: Session<State, Event> = createSession(
    initial,
    decide,
    (effect) => effects.execute(effect),
    (error) => {
      if (!destroyed) {
        destroyed = true;
        effects.destroy();
      }
      reportFatal(error);
    },
  );

  ({ dispatch } = session);

  return {
    dispatch,
    state: session.state,

    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      session.close();
      effects.destroy();
    },

    closed: session.closed,
  };
}
