/**
 * Issues never-reused identifiers for operation and asynchronous-effect
 * currency. A controller-lifetime monotonic counter: each admitted operation
 * gets an `operationId`, each consumer-resolution invocation a `resolutionId`,
 * and each landing attempt a `landingId`.
 *
 * The source owns no phase or "current operation" truth and is never consulted
 * to decide currency; the reducer compares event tokens against state.
 */
export type OperationIdentitySource = Readonly<{
  next(): number;
}>;

export function createIdentitySource(): OperationIdentitySource {
  let counter = 0;

  return {
    next() {
      counter += 1;
      return counter;
    },
  };
}
