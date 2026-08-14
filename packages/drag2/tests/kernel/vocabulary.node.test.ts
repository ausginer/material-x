/**
 * The kernel tier's published vocabulary, as a boundary rather than as a list
 * (D-68).
 *
 * `exports.node.test.ts` asserts *what* `kernel.js` exports and
 * `consumer.node.test.ts` compiles a behavior against it. What neither can see
 * is the **direction** of the boundary: whether the first-party sortable is
 * reaching into `src/kernel/` for something a third-party behavior could not
 * reach at all. That is the question F-59 answers badly — the tier published no
 * value, so every behavior but this package's own was unwritable — and the
 * assertion below is what stops it recurring silently: a new `../kernel/*`
 * import in `src/sortable/` is either published vocabulary, or one of the
 * groups 02 §What stays internal enumerates, or a failure.
 *
 * Source-level on purpose. The property is about **specifiers**, and a runtime
 * or type-level check cannot see one: an import that a bundler inlines and a
 * type that erases both leave nothing to assert against.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as drag from '../../src/drag.ts';
import * as kernel from '../../src/kernel.ts';
import * as sortable from '../../src/sortable.ts';

const SRC = resolve(import.meta.dirname, '../../src');

/**
 * Every name `src/kernel.ts` and `src/drag.ts` publish — values by reflection,
 * types by declaration. The type half is written out because types erase and
 * this file runs in Node: there is nothing to reflect over.
 */
const PUBLISHED_TYPES: readonly string[] = [
  // kernel.js — the closure of `BehaviorFactory` (D-68, class A)
  'ActionTransition',
  'ActivationScope',
  'AdmissionSubject',
  'BehaviorConfig',
  'BehaviorFactory',
  'BehaviorInstall',
  'BehaviorSpec',
  'CancelStage',
  'CommandAdmission',
  'Disposer',
  'Draft',
  'FailureStage',
  'Frame',
  'FramePartOf',
  'KernelFrame',
  'KernelHost',
  'LandingContext',
  'LandingHandle',
  'LandingStart',
  'LiftMode',
  'LifetimeScope',
  'OffsetBox',
  'OperationIdentity',
  'Phase',
  'PreparedSettlement',
  'ReleaseTransition',
  'ResolutionCommand',
  'SeamRejection',
  'SettlementInput',
  'SettlementScope',
  'SettlementTransition',
  'Transition',
  'VisualLiftSession',
  // drag.js — shared vocabulary, belonging to neither tier (D-64)
  'DraggableErrorCode',
  'DOMRealm',
  'Point',
];

/**
 * What 02 §What stays internal lists, with the substitute it names. The
 * first-party behavior may use these; a third-party one is expected to reach
 * for the substitute instead, which is why each group is enumerated rather
 * than the whole of `src/kernel/` being waved through.
 */
const INTERNAL: Readonly<Record<string, readonly string[]>> = {
  'the seam driver': [
    'SeamOutcome',
    'SeamContext',
    'SeamDriver',
    'ArmOutcome',
    'SEAM_COMMITTED',
    'SEAM_DISCARDED',
    'SEAM_EFFECT_FAILED',
    'SEAM_INVALIDATED',
    'SEAM_PREPARE_FAILED',
  ],
  'the full lifetime': [
    'Lifetime',
    'createLifetime',
    'createOperationLifetimes',
    'OperationLifetimes',
  ],
  'the frame helpers': [
    'composeFrame',
    'beginFrame',
    'scrubFrame',
    'validateFramePart',
    'assertFrameScrubbed',
    'KERNEL_FRAME_KEYS',
  ],
  'lift acquisition': [
    'acquireLift',
    'captureInlineStyles',
    'acquireTopLayer',
    'BehaviorLiftSession',
  ],
  'the reporter': ['report', 'guarded'],
  'scheduling and invalidation': [
    'createInvalidator',
    'createFrameTask',
    'FrameTask',
    'Invalidator',
  ],
  'the ingress protocol': ['POINTER_DOWN', 'KEY_DOWN'],
  'the input policy': [
    'POINTER_OWNERS',
    'COMMAND_OWNERS',
    'pathOwnsInteraction',
  ],
  // The phase *constants* are published; `NO_STAMP` and the internal frame
  // plumbing are not.
  'kernel-private frame state': ['NO_STAMP'],
  // `DraggableError` is a runtime value on `drag.js`; the sortable imports the
  // class from its declaration site, which is the same declaration.
  'the shared error class': ['DraggableError', 'toDraggableError'],
};

const INTERNAL_NAMES = new Set(Object.values(INTERNAL).flat());
const PUBLISHED_NAMES = new Set([
  ...Object.keys(kernel),
  ...Object.keys(drag),
  ...PUBLISHED_TYPES,
]);

type Import = Readonly<{
  file: string;
  module: string;
  names: readonly string[];
}>;

/** `import … from '../kernel/x.ts'` in one file, names flattened. */
function kernelImports(file: string, source: string): readonly Import[] {
  const found: Import[] = [];
  const pattern =
    /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.\.\/kernel\/[^']+)'/gu;

  for (const match of source.matchAll(pattern)) {
    const names = match[1]!
      .split(',')
      .map((entry) => entry.replace(/\btype\b/u, '').trim())
      // `a as b` imports the declaration `a`.
      .map((entry) => entry.split(/\s+as\s+/u)[0]!.trim())
      .filter((entry) => entry.length > 0);

    found.push({ file, module: match[2]!, names });
  }

  return found;
}

async function sortableImports(): Promise<readonly Import[]> {
  const dir = join(SRC, 'sortable');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.ts'));
  const sources = await Promise.all(
    files.map((name) => readFile(join(dir, name), 'utf8')),
  );

  return files.flatMap((name, index) =>
    kernelImports(`sortable/${name}`, sources[index]!),
  );
}

describe('the kernel tier boundary', () => {
  it('should reach nothing from the behavior that is neither published nor a named internal', async () => {
    const stray: string[] = [];

    for (const entry of await sortableImports()) {
      for (const name of entry.names) {
        if (!PUBLISHED_NAMES.has(name) && !INTERNAL_NAMES.has(name)) {
          stray.push(`${entry.file}: ${name} (from ${entry.module})`);
        }
      }
    }

    // A failure here is a **decision**, not a lint: either the name belongs in
    // the published vocabulary — in which case a third-party behavior needs it
    // too — or it belongs in one of 02's internal groups with a substitute
    // stated. Adding it to `INTERNAL` without that sentence is how the tier
    // silently widens back.
    expect(stray).toEqual([]);
  });

  it('should declare the doubly-declared seam types exactly once', async () => {
    // **F-61.** `ActionTransition` and `SeamRejection` were declared in
    // `kernel/seams.ts` *and* `kernel/spec.ts`, structurally identical and
    // independently maintained. Harmless while both were internal; publishing
    // one of each makes it the identity hazard 03 §The export topology exists
    // to prevent — a consumer's compiler resolves the published declaration
    // while the driver consumes the other.
    const dir = join(SRC, 'kernel');
    const files = (await readdir(dir)).filter((name) => name.endsWith('.ts'));
    const declarations: Record<string, string[]> = {
      ActionTransition: [],
      SeamRejection: [],
    };

    const sources = await Promise.all(
      files.map((name) => readFile(join(dir, name), 'utf8')),
    );

    files.forEach((name, index) => {
      for (const symbol of Object.keys(declarations)) {
        if (sources[index]!.includes(`export type ${symbol}`)) {
          declarations[symbol]!.push(name);
        }
      }
    });

    expect(declarations).toEqual({
      ActionTransition: ['seams.ts'],
      SeamRejection: ['seams.ts'],
    });
  });

  it('should keep the re-homed cancel stages as one declaration on two entries', () => {
    // D-68 re-homes `AT_*`/`CancelStage` to the kernel tier — a behavior
    // **writes** one into D-66's fallback — while `sortable.js` keeps
    // publishing them, because a `CanceledReorderResult` carries one and an
    // ordinary consumer must discriminate it. Identity, not mere presence: two
    // entries, one declaration, so neither tier reaches the other for it.
    expect(sortable.AT_PROPOSAL).toBe(kernel.AT_PROPOSAL);
    expect(sortable.AT_CONSUMER).toBe(kernel.AT_CONSUMER);
  });

  it('should re-export the middle tier’s landing seam types from the kernel’s own modules', async () => {
    // The type half of the same property, and it has to be source-level: the
    // four re-homed names erase, so nothing survives to `toBe`. What is
    // asserted is that `sortable/feature.js` **re-exports** them rather than
    // declaring its own — the direction D-68 corrects, since
    // `SettlementScope.holdForLanding` is kernel SPI and a kernel-tier author
    // reaching the sortable for `LandingStart` would be importing a behavior
    // in order to author a different one.
    const source = await readFile(join(SRC, 'sortable/feature.ts'), 'utf8');

    for (const name of ['LandingContext', 'LandingHandle', 'LandingStart']) {
      expect([name, source.includes(`export type ${name} =`)]).toEqual([
        name,
        false,
      ]);
      expect([name, source.includes(name)]).toEqual([name, true]);
    }

    expect(source).toContain("from '../kernel/spec.ts'");
    expect(source).toContain("from '../kernel/lifetimes.ts'");
  });
});
