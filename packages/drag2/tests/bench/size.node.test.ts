/**
 * M-3's assertions. `bench/size/measure.ts` declares each composition — its
 * imports, its budget, and the modules its graph must and must not contain —
 * and this runs the declaration in CI.
 *
 * Three properties:
 *
 * 1. **What each composition declared.** Budget, absent modules, present
 *    modules, in one pass. The absence half is the tree-shaking claim and is
 *    the half a byte count cannot express: a module can be pulled in and then
 *    mostly shaken, which looks like a small delta and reads like success
 *    (03 §Tree-shaking).
 * 2. **Determinism.** The pipeline produces byte-identical output for identical
 *    input, which is what lets M-3 report single numbers with no repetition or
 *    statistical policy. Asserted rather than assumed.
 * 3. **Baseline fidelity.** The non-composed baseline is only a baseline while
 *    it builds the same slot record `assemble()` does. It is hand-written, so
 *    it drifts unless something checks.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  COMPOSITIONS,
  measure,
  type Measurement,
  violations,
} from '../../bench/size/measure.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';
import { assemble } from '../../src/sortable/assemble.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import type { FeatureContext } from '../../src/sortable/feature.ts';
import { handle, visual } from '../../src/sortable/handle.ts';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { placeholder } from '../../src/sortable/placeholder.ts';
import { vertical } from '../../src/sortable/vertical.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const MINUTE = 60_000;

function build(): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn('npx', ['tsdown', '--config', 'tsdown.config.ts'], {
      cwd: ROOT,
    });
    let output = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        done();
        return;
      }

      fail(new Error(`tsdown exited with ${code}\n${output}`));
    });
  });
}

const measured = new Map<string, Measurement>();

beforeAll(async () => {
  // The fixtures import **built** output — that is the point, since a consumer
  // never sees `src/`. Building here rather than relying on a prior `just
  // build` keeps the suite self-contained, the same way the packed-consumer
  // fixture does.
  await build();

  for (const composition of COMPOSITIONS) {
    // oxlint-disable-next-line no-await-in-loop
    measured.set(composition.name, await measure(composition));
  }
}, 2 * MINUTE);

describe('the declared compositions', () => {
  for (const composition of COMPOSITIONS) {
    it(`should hold to what ${composition.name} declares`, () => {
      // One assertion per composition rather than one per property: a failure
      // should name the composition and every way it broke, not the first.
      expect([
        composition.name,
        ...violations(measured.get(composition.name)!),
      ]).toEqual([composition.name]);
    });
  }

  it('should ship no dev-assertion module at all', () => {
    // The M-3 carried decision, as a property rather than a byte count: with
    // `__DEV__` folded to `false` the guarded blocks are dead code, and
    // `kernel/dev.js` stops being emitted or reached entirely.
    const { modules } = measured.get('complete')!;

    expect(modules.filter((module) => module.includes('dev.js'))).toEqual([]);
  });
});

describe('the measurement pipeline', () => {
  it(
    'should produce identical bytes for identical input',
    async () => {
      const first = COMPOSITIONS[0]!;
      const again = await measure(first);

      expect(again.brotli).toBe(measured.get(first.name)!.brotli);
      expect(again.minified).toBe(measured.get(first.name)!.minified);
    },
    MINUTE,
  );
});

describe('the non-composed baseline', () => {
  it('should fill exactly the slots the assembler fills', async () => {
    // Fidelity, not equality of values: the baseline is only a baseline while
    // it fills exactly the slots `assemble()` fills. A slot added to the
    // assembler and not to the baseline would make the comparison measure two
    // different runtimes and read as a composition saving.
    // The factories never dereference the realm or the root at construction —
    // `placeholder()` reads `realm.document` inside its factory, not around it —
    // so empty stand-ins are enough to reach the slot record.
    const realm: DOMRealm = Object.create(null) as DOMRealm;
    const root: HTMLElement = Object.create(null) as HTMLElement;
    const context: FeatureContext = { realm, root, report: (): void => {} };
    const composed = assemble(
      [
        vertical(),
        placeholder({ className: 'ghost' }),
        handle(() => null),
        visual((item) => item),
        landing(),
        layoutAnimation(),
        callbacks({ onReorder: () => ({ type: 'accepted' }) }),
      ],
      context,
    );
    // Imported here rather than at the top: it reaches built output, which
    // does not exist until `beforeAll` has run.
    const { buildSlots } = await import('../../bench/size/noncomposed.js');
    const byHand = buildSlots(
      context,
      () => ({ type: 'accepted' }),
      () => null,
      (item) => item,
    );

    expect([...Object.keys(byHand)].sort()).toEqual(
      [...Object.keys(composed)].sort(),
    );
  });
});
