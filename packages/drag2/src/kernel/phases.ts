// The eight-phase vocabulary. A module header rather than a doc block, for the
// reason `kernel/types.ts` states.
//
// Two of these are named for a state they describe only *after* their effect
// runs. `ACTIVATING` is committed **before** `activation.effect` inserts the
// placeholder, and `FINALIZING` is committed **before** the join pins,
// releases presentation and starts the tail. The names describe the
// phase from its commit, which is when it becomes observable.

/** No operation. The only phase that admits input. */
export const IDLE = 0;
/** Admitted; below the activation threshold. */
export const PENDING = 1;
/** Activation committed; presentation/start effect in flight. */
export const ACTIVATING = 2;
/** Live, tracking input. */
export const ACTIVE = 3;
/** Input closed, geometry final, consumer resolving. */
export const RELEASING = 4;
/** Outcome committed; the landing target not yet measured. */
export const SETTLING = 5;
/** `onError` in flight. */
export const REPORTING = 6;
/** Finalization in progress: pin, release, interpolate, report. */
export const FINALIZING = 7;

export type Phase =
  | typeof IDLE
  | typeof PENDING
  | typeof ACTIVATING
  | typeof ACTIVE
  | typeof RELEASING
  | typeof SETTLING
  | typeof REPORTING
  | typeof FINALIZING;
