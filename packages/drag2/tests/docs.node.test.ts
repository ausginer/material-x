/**
 * The documented surface has to equal the exported surface.
 *
 * TypeDoc runs over the eight public entries and nothing else, so anything it
 * reports as *referenced but not included* is a public type structurally
 * depending on something a consumer cannot name — reachable through a public
 * shape, resolvable by their compiler, and absent from the docs. That is a
 * surface defect, not documentation noise, and it is how `CollectionSnapshot`,
 * `PlaceholderFactory` and the two `ReorderResolution` members were found.
 *
 * Asserted rather than checked once, because the property regresses silently:
 * the next public type to reference an internal alias breaks it with no other
 * failing test. The fix is always to export what the public type depends on, or
 * to inline the structure — never to suppress the warning.
 *
 * ## The kernel tier, and the one relaxation (Revision 2 closure)
 *
 * `kernel.js` has shipped since D-48 and was **missing from this run** — the
 * header above said "the eight public entries" while `typedoc.json` listed
 * seven, so the tier a behavior author writes against was the one tier no
 * warning could reach. Adding it produced **17** of them, all of the same
 * shape: `BehaviorSpec`, `BehaviorContext` and `BehaviorFactory` structurally name
 * `Frame`, `Draft`, `Transition`, the five `SETTLED_*` codes and nine more,
 * and none of those is exported.
 *
 * **They are not exported deliberately, and closure is not the place to change
 * that.** Exporting them is an addition to a frozen surface and it pre-empts
 * D-47 §11's queued work — *minimize the kernel vocabulary* — which is a
 * decision about what a behavior author should have to name, not a
 * documentation question. So the 17 are declared in `typedoc.json` under
 * `intentionallyNotExported`, which states the exemption rather than hiding
 * it, and the rule above is unchanged everywhere else.
 *
 * **The relaxation keeps its teeth, for three reasons.** Each entry is
 * **file-qualified** (`src/kernel/frames.ts:Frame`), so the exemption covers
 * exactly the kernel-internal declaration and a same-named leak from the
 * sortable tier still warns. Any *new* unresolved reference — the case this
 * test exists for — is not on the list and still fails. And TypeDoc warns when
 * a listed name stops being referenced or becomes exported, so the list cannot
 * outlive its reason: when D-47's vocabulary pass lands, the entries it
 * resolves fail this test until they are deleted from the config.
 *
 * The honest summary is that the ordinary and middle tiers are documented
 * under the strict rule, the kernel tier is documented with a fixed, decaying
 * list of 17 known gaps, and the gaps are now visible in a config file instead
 * of invisible in a missing entry point.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const MINUTE = 60_000;

type Run = Readonly<{ output: string; code: number | null }>;

function typedoc(
  out: string,
  entryPoints?: readonly string[],
  extraArgs: readonly string[] = [],
): Promise<Run> {
  return new Promise((done, fail) => {
    // A JSON target rather than `--emit none`: the run has to actually convert
    // every entry, and the generated-at line is the proof that it did. With
    // nothing to report TypeDoc prints no summary at all, so an empty stream
    // would otherwise be indistinguishable from a run that did nothing.
    const child = spawn(
      'npx',
      [
        'typedoc',
        '--options',
        'typedoc.json',
        '--json',
        out,
        ...extraArgs,
        ...(entryPoints ?? []),
      ],
      { cwd: ROOT },
    );
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
      done({ output, code });
    });
  });
}

/**
 * The modules a run actually converted, read out of the artifact it emitted.
 *
 * **The gate is the exit code and this list, never the captured stream**
 * (D-115 (b), E-08). A stream read for the word _warning_ gets **weaker**
 * without failing when TypeDoc rewords a summary, changes a log format or
 * declines to write one at all — the worst way for a gate to break, because it
 * converts to a green suite. `--treatWarningsAsErrors` turns the property under
 * test into a non-zero exit status, and reading the emitted JSON back proves
 * the run converted something: a run that converted nothing writes no file and
 * an empty module list, so neither half can pass vacuously.
 */
async function converted(artifact: string): Promise<readonly string[]> {
  const emitted = JSON.parse(await readFile(artifact, 'utf8')) as Readonly<{
    children?: ReadonlyArray<Readonly<{ name: string }>>;
  }>;

  return (emitted.children ?? []).map((child) => child.name).toSorted();
}

describe('the documented surface', () => {
  it(
    'should resolve every reference a public type makes',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'drag2-docs-'));
      const artifact = join(dir, 'docs.json');
      const { output, code } = await typedoc(artifact, undefined, [
        '--treatWarningsAsErrors',
      ]);

      // `output` is reported rather than asserted on: it is the diagnostic a
      // failure needs, and nothing about the pass depends on its shape.
      expect({ code, output }).toMatchObject({ code: 0 });
      // And it converted **every** declared entry, so "no warnings" cannot be
      // the silence of a run that did nothing.
      expect(await converted(artifact)).toEqual([
        'drag',
        'free-drag',
        'free-drag/bounds',
        'free-drag/feature',
        'free-drag/landing',
        'kernel',
        'sortable',
        'sortable/feature',
        'sortable/landing',
        'sortable/layout-animation',
        'sortable/xy',
        'sortable/y',
      ]);
    },
    2 * MINUTE,
  );

  it(
    'should close the kernel tier over the kernel tier',
    async () => {
      // **The per-entry form, and F-60 is why it exists.** The whole-run check
      // above resolves across *every* entry at once, so a name in `kernel.js`'s
      // closure that only resolves through `sortable.js` or
      // `sortable/feature.js` reads as clean — which is exactly what
      // `LandingStart`, `LandingHandle`, `LandingContext`, `Disposer` and
      // `CancelStage` did before D-68. TypeDoc was satisfied while the kernel
      // entry's closure ran through the **behavior** tier, which is the
      // inversion D-48 and D-64 both exist to prevent.
      //
      // Restricting the run to `kernel.js ∪ drag.js` asks the question the tier
      // boundary actually needs: *is every name in this entry's closure
      // reachable from this entry's own tier* — `drag.js` included because it
      // is shared vocabulary belonging to neither tier (D-64).
      const dir = await mkdtemp(join(tmpdir(), 'drag2-kernel-docs-'));
      const artifact = join(dir, 'kernel.json');
      const { output, code } = await typedoc(
        artifact,
        ['./src/kernel.ts', './src/drag.ts'],
        ['--treatWarningsAsErrors'],
      );

      expect({ code, output }).toMatchObject({ code: 0 });
      expect(await converted(artifact)).toEqual(['drag', 'kernel']);
    },
    2 * MINUTE,
  );

  it(
    'should close the ordinary tier over the ordinary tier and the ones below it',
    async () => {
      // **The tier that never had a per-entry instrument** (D-78). The
      // whole-run check above resolves across *every* entry at once, so a name
      // in this tier's closure that only resolves through `kernel.js` — or
      // through a declaration nothing exports — reads as clean, which is F-60's
      // inversion pointing the other way.
      //
      // **The union is the decision, not a convenience** (D-78): a public
      // type's closure resolves within its own tier plus the tiers below it, so
      // the ordinary tier closes over `sortable.js ∪ drag.js ∪
      // sortable/feature.js`. Demanding closure over `sortable.js` alone would
      // fail against `AxisInstaller`'s own closure, and the only way to satisfy
      // that would be to publish the middle tier at the ordinary one —
      // dissolving D-61's rung to satisfy an instrument, which is the naive
      // repair D-78 rejects.
      //
      // **What this run cannot see, stated rather than assumed** (P18A-05):
      // because `sortable/feature.js` is *in* the union, it is satisfied
      // whether or not `sortable.js` re-exports `AxisInstaller` — verified by
      // deleting the re-export, which leaves this green. Publication is a
      // **hoistability** property, not a closure one, and it is pinned where it
      // can be: the packed consumer fixture in `tests/consumer.node.test.ts`
      // hoists `const hoistedAxis: AxisInstaller` while importing only
      // `sortable.js`, and fails to compile without the re-export.
      const dir = await mkdtemp(join(tmpdir(), 'drag2-sortable-docs-'));
      const artifact = join(dir, 'sortable.json');
      const { output, code } = await typedoc(
        artifact,
        ['./src/sortable.ts', './src/drag.ts', './src/sortable/feature.ts'],
        ['--treatWarningsAsErrors'],
      );

      expect({ code, output }).toMatchObject({ code: 0 });
      expect(await converted(artifact)).toEqual([
        'drag',
        'sortable',
        'sortable/feature',
      ]);
    },
    2 * MINUTE,
  );

  it(
    'should close the free-drag tier over the ordinary tier and the ones below it',
    async () => {
      // **B-3 says the closure check runs per entry, and free drag had none**
      // (E-08). It relied on the whole-run check above, which resolves across
      // every entry at once — so a name in free drag's closure that only
      // resolves through `sortable.js` or `sortable/feature.js` would read as
      // clean. That is F-60's inversion, pointing at the behavior this package
      // added second.
      //
      // The union is the same one D-78 fixes for the sortable, with free drag's
      // names in it: the ordinary entry, the shared vocabulary, and the middle
      // tier below it. It passes today, so this is **missing discrimination**
      // rather than a current export leak — which is exactly the state an
      // instrument should be added in, while it is still cheap to trust.
      //
      // **The gate is the exit code and the artifact, not the captured
      // stream** (E-08) — the form `converted()` documents, which this run
      // reached first. ~~The three older runs are deliberately left alone:
      // rewriting them is a change to instruments that are currently green and
      // were not what Checkpoint E asked about.~~ **Correct scoping then, and
      // D-115 is what scheduled it since**: all four runs now assert their own
      // premise, so no run in this file can report success from a stream it
      // failed to read.
      const dir = await mkdtemp(join(tmpdir(), 'drag2-free-drag-docs-'));
      const artifact = join(dir, 'free-drag.json');
      const { output, code } = await typedoc(
        artifact,
        ['./src/free-drag.ts', './src/drag.ts', './src/free-drag/feature.ts'],
        ['--treatWarningsAsErrors'],
      );

      // `output` is reported rather than asserted on: it is the diagnostic a
      // failure needs, and nothing about the pass depends on its shape.
      expect({ code, output }).toMatchObject({ code: 0 });
      expect(await converted(artifact)).toEqual([
        'drag',
        'free-drag',
        'free-drag/feature',
      ]);
    },
    2 * MINUTE,
  );
});
