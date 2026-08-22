// The eight-phase vocabulary, kept verbatim from the shipped package
// (contract D-14). A module header rather than a doc block, for the reason
// `kernel/types.ts` states (D-113, MNT-02).
//
// Two of these are named for a state they describe only *after* their effect
// runs. `ACTIVATING` is committed **before** `activation.effect` inserts the
// placeholder, and `FINALIZING` is committed **before** the join measures,
// destroys the runner, pins and releases presentation. The names describe the
// phase from its commit, which is when it becomes observable
// (contract 02 §Phases and legality).

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
/** Outcome committed; awaiting the landing and readiness gates. */
export const SETTLING = 5;
/** `onError` in flight. */
export const REPORTING = 6;
/** Finalization in progress: measure, pin, release, report. */
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
