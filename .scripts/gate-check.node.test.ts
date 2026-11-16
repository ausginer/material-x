/** Temporary: one failing gate row, to show that `verify` fails. Removed next. */
import { expect, it } from 'vitest';

it('fails on purpose to check the gate', () => {
  expect(1).toBe(2);
});
