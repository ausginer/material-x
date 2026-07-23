/**
 * Pure decision and FIFO run-to-completion session contracts shared by the
 * feature machines.
 */

export type TaggedEffect = Readonly<{
  type: number;
}>;

export type Effects<Effect extends TaggedEffect> =
  | null
  | Effect
  | readonly Effect[];

export type Decision<State, Effect extends TaggedEffect> = Readonly<{
  state: State;
  effects: Effects<Effect>;
}>;

export type Machine<State, Event, Effect extends TaggedEffect> = (
  state: State,
  event: Event,
) => Decision<State, Effect>;

export const CONTINUE_BATCH = 0;
export const STOP_BATCH = 1;

export type EffectDisposition = typeof CONTINUE_BATCH | typeof STOP_BATCH;

export type Execute<Effect extends TaggedEffect> = (
  effect: Effect,
) => EffectDisposition;

export type Session<State, Event> = Readonly<{
  dispatch(event: Event): void;
  state(): State | null;
  close(): void;
  closed(): boolean;
}>;

/**
 * Stores one complete machine state and executes accepted decisions in FIFO
 * order. Nested dispatch appends to the queue; it never interrupts an effect
 * batch that is already running.
 */
export function createSession<State, Event, Effect extends TaggedEffect>(
  initial: State,
  decide: Machine<State, Event, Effect>,
  execute: Execute<Effect>,
  panic: (error: unknown) => void,
): Session<State, Event> {
  let state: State | null = initial;
  let running = false;
  let terminal = false;
  const queue: Event[] = [];

  const close = (): void => {
    if (terminal) {
      return;
    }

    terminal = true;
    queue.length = 0;
    state = null;
  };

  const runEffect = (effect: Effect): boolean => {
    const disposition = execute(effect);
    return !terminal && disposition === CONTINUE_BATCH;
  };

  const runEffects = (effects: Effects<Effect>): void => {
    if (!effects || terminal) {
      return;
    }

    if (!Array.isArray(effects)) {
      runEffect(effects);
      return;
    }

    for (const effect of effects) {
      if (!runEffect(effect)) {
        break;
      }
    }
  };

  const dispatch = (event: Event): void => {
    if (terminal) {
      return;
    }

    queue.push(event);

    if (running) {
      return;
    }

    running = true;

    try {
      // `execute` can synchronously call `close`, mutating `terminal` through its closure.
      // oxlint-disable-next-line no-unmodified-loop-condition
      for (let index = 0; !terminal && index < queue.length; index += 1) {
        const current = state;

        if (current === null) {
          break;
        }

        const decision = decide(current, queue[index]!);
        ({ state } = decision);
        runEffects(decision.effects);
      }
    } catch (error) {
      close();
      panic(error);
    } finally {
      queue.length = 0;
      running = false;
    }
  };

  return {
    dispatch,
    state: () => state,
    close,
    closed: () => terminal,
  };
}

/** Returns an ignored decision without allocating an effect collection. */
export function ignored<State, Effect extends TaggedEffect>(
  state: State,
): Decision<State, Effect> {
  return { state, effects: null };
}
