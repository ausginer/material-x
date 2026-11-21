/** Raises a failed build before a test reads the published files. */
import { inject } from 'vitest';

const failure = inject('buildFailure');

if (failure !== null) {
  throw new Error(failure);
}
