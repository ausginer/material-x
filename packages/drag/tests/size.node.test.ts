/** `drag:DRI-18`: what importing an entry brings, and the size ceilings. */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  COMPOSITIONS,
  measure,
  type Measurement,
  violations,
} from '../bench/size/measure.ts';

describe('drag:DRI-18 module graphs and size', () => {
  const measured = new Map<string, Measurement>();

  beforeAll(async () => {
    await Promise.all(
      COMPOSITIONS.map(async (composition) => {
        measured.set(composition.name, await measure(composition));
      }),
    );
  });

  it.each(COMPOSITIONS.map((composition) => composition.name))(
    'should satisfy the declared graph and ceiling of %s',
    (name) => {
      expect(violations(measured.get(name)!)).toEqual([]);
    },
  );

  it('should bring no lift, box-quad, sortable, cache or landing code with draggable alone', () => {
    const { modules } = measured.get('draggable alone')!;

    expect(modules.toSorted()).toEqual([
      'src/draggable.ts',
      'src/fault.ts',
      'src/kernel/drag.ts',
      'src/kernel/gesture.ts',
      'src/kernel/session.ts',
      'src/shared/focus.ts',
    ]);
  });
});
