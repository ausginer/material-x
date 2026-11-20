import { test } from 'vitest';
import { bench } from './bench.ts';

test('trait accessors, flattened against mixin', async () => {
  await bench();
});
