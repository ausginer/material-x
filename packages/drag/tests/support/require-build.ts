/**
 * Raises the consumer project's failed build in each of its files, so the project
 * goes red with the build's own output and other projects' results stand.
 */
import { inject } from 'vitest';

const failure = inject('buildFailure');

if (failure !== null) {
  throw new Error(failure);
}
