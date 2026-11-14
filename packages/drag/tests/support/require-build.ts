/**
 * Raises a failed build in each file of the consumer project and the node
 * project, so both go red with the build's own output and the other projects'
 * results stand.
 */
import { inject } from 'vitest';

const failure = inject('buildFailure');

if (failure !== null) {
  throw new Error(failure);
}
