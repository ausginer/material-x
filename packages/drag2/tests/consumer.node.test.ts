/**
 * The pack/extract consumer fixture.
 *
 * Every other suite imports `src/` directly, so nothing else in this package
 * can see what a consumer actually receives: the `exports` map, the emitted
 * declarations, and whether the tarball contains the files those two promise.
 * This builds, packs and extracts the real package, then imports and compiles
 * against the extracted copy from outside the workspace.
 *
 * It is deliberately the slowest test here. It is also the only one that would
 * catch a subpath whose `default` condition points at a file the build never
 * emitted, or an internal SPI type becoming reachable through a public entry.
 */
import { spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs a command to completion, rejecting with the captured output on a
 * non-zero exit — which is what makes the consumer's `tsc` run a usable
 * assertion rather than a bare boolean.
 */
function run(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<Readonly<{ stdout: string }>> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        done({ stdout });
        return;
      }

      fail(new Error(`${command} exited with ${code}\n${stdout}${stderr}`));
    });
  });
}

/** Code-unit order, so the expected lists below read the way they sort. */
const byName = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

const ROOT = resolve(import.meta.dirname, '..');
const REPO = resolve(ROOT, '../..');
const MINUTE = 60_000;

/**
 * Subpaths declared in the export topology from phase 0 whose module is still a
 * stub, so the build has no runtime code to emit for them. **Empty since 8b**:
 * every declared subpath now ships runtime code. It stays as a named list rather
 * than being deleted, because a future subpath declared ahead of its
 * implementation is exactly the case this guards.
 */
const PENDING: readonly string[] = [];

const CONSUMER = `import {
  DraggableError,
  DraggableWarning,
  type DOMRealm,
  FAILURE_ADMISSION,
  FAILURE_RESOLUTION,
  type FailureStage,
  type Point,
} from '@ydinjs/drag2/drag.js';
import {
  draggable,
  FAILURE_ACTIVATION,
  FAILURE_TERMINAL_CALLBACK,
  type BehaviorFactory,
} from '@ydinjs/drag2/kernel.js';
// **One declaration, two publication points** (D-132 §6). \`FailureStage\` is
// on \`kernel.js\` as well, and naming it from both here is a *duplicate
// identifier* rather than a conflict — which is the assertion: this file
// authors a behavior and consumes its errors at once, and there is exactly one
// type to name from whichever root it reaches for.
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_ABORTED,
  CANCEL_FAILED,
  ReorderResolution,
  sortable,
  type AxisInstaller,
  type CancelOrigin,
  type CancelStage,
  type CollectionSnapshot,
  type ItemSource,
  type OnReorder,
  type PlaceholderContext,
  type PlaceholderFactory,
  type ResolveElement,
  type ResolveHandle,
  type SortableConfig,
  type ReorderProposal,
  type ReorderRequest,
  type ReorderTransactionResult,
  type SortableController,
  type SortableDisplacementInstaller,
  type SortableLandingInstaller,
  type SortableOnDragError,
  type SortableOnEnd,
  type SortableOnStart,
} from '@ydinjs/drag2/sortable.js';
import { y } from '@ydinjs/drag2/sortable/y.js';
import {
  landing,
  type LandingOptions,
  type LandingTimingContext,
} from '@ydinjs/drag2/sortable/landing.js';
// **The three seam types re-homed** (D-63, D-61): they stopped being consumer
// vocabulary when \`landing({ run })\` went, and stayed authoring vocabulary.
import type {
  LandingTail,
  LandingTiming,
} from '@ydinjs/drag2/sortable/feature.js';
import {
  layoutAnimation,
  type LayoutAnimationOptions,
} from '@ydinjs/drag2/sortable/layout-animation.js';

// ---------------------------------------------------------------------------
// The intended surface, exercised rather than merely imported.
// ---------------------------------------------------------------------------

declare const root: HTMLElement;
declare const items: readonly HTMLElement[];

// **The \`axis\` slot's alias is hoistable from the ordinary tier** (D-78,
// P18A-05). The rule this pins is _a public type's closure resolves within its
// own tier plus the tiers below it_, and the two halves are asserted together:
// the **name** ships from \`sortable.js\`, so this \`const\` compiles with no
// deeper import — while its closure does **not**, which is what the
// \`@ts-expect-error\`s on \`AxisContribution\`, \`InsertionGeometry\` and
// \`FeatureContext\` below still say. Without the re-export a consumer could
// fill the slot and never hoist the installer out of the object literal, which
// is the surface defect F-51 names.
//
// **\`context\` is not annotated on purpose.** Its type is \`FeatureContext\`,
// which this file cannot import from here — contextual typing resolves it
// structurally anyway, which is the fact D-78 retracts the old opacity claim
// over.
const hoistedAxis: AxisInstaller = (context) => {
  void context.root;

  return {
    insertion: {
      resolve: () => null,
      invalidate: (): void => {},
      moved: (): void => {},
      retire: (): void => {},
    },
  };
};

// **The \`displacement\` and \`landing\` aliases are hoistable from the
// ordinary tier too.** \`SortableConfig\` names one at each slot, so typing one
// without these would mean importing the types-only middle tier — the tier
// inversion the free-drag mirror never forced. These rows are what stop them
// being dropped again, and they pin the cardinality with it: each is a named
// key with exactly one writer, so a second one is unrepresentable rather than
// detected.
const hoistedDisplacement: SortableDisplacementInstaller = (context) => {
  void context.root;

  return {
    report: () => {},
    settle: () => {},
  };
};

void hoistedDisplacement;

const hoistedLanding: SortableLandingInstaller = (context) => {
  void context.root;

  return {
    landingTiming: () => ({ duration: 200, easing: 'ease' }),
  };
};

const list: SortableController = sortable(
  root,
  {
    // **D-77**: one required config argument, and \`y()\` is the installer
    // itself rather than a one-key fragment. \`y()\` rather than
    // \`hoistedAxis\` because the stock rule is what an ordinary consumer
    // writes; the hoisted one is asserted assignable below.
    axis: y(),
    items: () => items,
    onReorder: (request: ReorderRequest) => {
      void request.from;
      void request.to;
      void request.item;
      return ReorderResolution.accept();
    },
    // **One terminal, four arms** (D-62). \`onFinish\`/\`onCancel\` and the two
    // partition types that existed to type them — \`SortableFinishResult\`,
    // \`SortableCancelResult\` — are gone, so this is also the case that proves
    // a consumer can tell the arms apart with nothing but the discriminant
    // (F-41).
    // **Qualified by behavior** (D-109). Both ordinary roots declare an
    // \`onStart\`, an \`onEnd\` and an \`onError\` alias with *different*
    // structures, which is D-75's only condition for qualifying a name — so
    // this fixture, which imports both roots at once, is where an unqualified
    // pair would collide.
    onStart: ((item: HTMLElement): void => {
      void item.isConnected;
    }) satisfies SortableOnStart,
    onEnd: ((result: ReorderTransactionResult): void => {
      if (result.type === 'accepted') {
        const proposal: ReorderProposal = result.proposal;
        // The proposal exposes the snapshot it was built against, so the type
        // of that field has to be nameable too.
        const snapshot: CollectionSnapshot = proposal.snapshot;

        void proposal.request.version;
        void snapshot.items.length;
        void snapshot.version;
      }

      if (result.type === 'canceled') {
        const stage: CancelStage = result.stage;
        // **The discrimination D-154 exists to make writable** — *stay silent
        // when the user pressed Escape*, which had no correct implementation
        // before this field.
        const origin: CancelOrigin = result.origin;

        void (stage === AT_PROPOSAL || stage === AT_CONSUMER);
        void (origin === CANCEL_ABORTED || origin === CANCEL_FAILED);

        // **And \`reason\` stays shut.** It is \`unknown\`, so the consumer's own
        // compiler refuses every use that would look like a discrimination —
        // which is what keeps provenance on the field that cannot be forged.
        // @ts-expect-error: an open channel narrows to nothing
        const claimed: string = result.reason;

        void claimed;
      }
    }) satisfies SortableOnEnd,
    onError: ((error: DraggableError | DraggableWarning): void => {
      // **D-64 and D-130.** One argument, two classes. The ordinary consumer
      // branches on the *class* first — a warning says the operation was not
      // affected and its terminal is still coming — and only then on the
      // **stage** (D-132). ~~And only then on a coarse fault class.~~ The
      // pipeline stage *is* what is visible now, from \`drag.js\` and never
      // from \`kernel.js\`; a context still is not, since \`domain\` was
      // strictly redundant with the \`onEnd\` D-66 makes unconditional.
      if (!(error instanceof DraggableError)) {
        void error.message;
        void error.cause;
        return;
      }

      const stage: FailureStage | null = error.stage;

      void (stage === FAILURE_ADMISSION || stage === FAILURE_RESOLUTION);
    }) satisfies SortableOnDragError,
    // **D-65**: the callback itself, not \`create\` plus a class name. Nameable,
    // so a consumer can hoist the factory out of the object literal.
    placeholder: ((context: PlaceholderContext) => {
      void context.rect.height;
      return document.createElement('div');
    }) satisfies PlaceholderFactory,
    handle: (item: HTMLElement) => item.firstElementChild as HTMLElement,
    visual: (item: HTMLElement) => item,
    threshold: 4,
  },
  landing({ duration: 120, easing: 'ease-out' }),
  layoutAnimation({ duration: 90 }),
  { landing: hoistedLanding },
);

// **D-44**: payload-free. The collection is a pull source, so this says
// \`re-read what you already have\` rather than handing over a new array.
list.invalidate();
list.cancel('reason');
list.destroy();

// A custom timing is authorable from the **middle tier** alone (D-63): the
// consumer surface takes options rather than a policy, and the seam a
// third-party installer fills is reachable without importing anything else.
//
// **The landing chain is scalars, and each of the four is named** (D-145). An
// annotated \`const\` per coordinate is what pins them: a nested \`from\` would
// fail to compile here, and a transposed axis is invisible to a one-field read.
const run: LandingTiming = (fromX, fromY, toX, toY): LandingTail | null => {
  const x: number = fromX;
  const y: number = fromY;
  const targetX: number = toX;
  const targetY: number = toY;

  return x + y + targetX + targetY === 0
    ? null
    : { duration: 200, easing: 'ease' };
};

// **D-63's negative half** (A-7). The positive half is above — a runner is
// authorable from the middle tier — and this is the assertion that the
// *ordinary* tier no longer takes one. \`LandingOptions\` is
// \`Readonly<{ duration?, easing? }>\`, so the excess-property check rejects the
// object literal; if \`run\` were ever re-added, this directive stops erroring
// and the build fails.
// @ts-expect-error: \`run\` is not a landing option (D-63)
landing({ run });

// **The timing context is four scalars, and all four are read** (D-145). A
// duration function is the only consumer-facing place the landing's endpoints
// appear, so this is where the flattening is pinned on the ordinary tier.
landing({
  duration: ({ fromX, fromY, toX, toY, distance }): number =>
    distance + fromX + fromY + toX + toY,
});
// @ts-expect-error: the endpoints are not nested points (D-145)
const retiredTimingFrom = ({} as LandingTimingContext).from;
// @ts-expect-error: ″
const retiredTimingTo = ({} as LandingTimingContext).to;

void [retiredTimingFrom, retiredTimingTo];

// ~~Both members of the \`ReorderResolution\` union are nameable, so a consumer
// can give a helper a return type narrower than the union.~~
// **The resolution is opaque, and this is the whole of what a consumer does
// with one** (D-143): build it and return it. The retired rows below assert
// that nothing else is available.
declare const accepted: ReorderResolution;
declare const rejected: ReorderResolution;

void [accepted, rejected];

declare const behavior: BehaviorFactory<SortableController, object>;
declare const onReorder: OnReorder;
// **D-45**: the config schema replaces \`SortableCallbacks\` and
// \`PlaceholderOptions\`, and a \`Partial\` of it is exactly what a fragment is —
// so a consumer can give a preset helper a return type.
declare const preset: Partial<SortableConfig>;
declare const landingOptions: LandingOptions;
declare const layoutOptions: LayoutAnimationOptions;

void [run, behavior, onReorder, preset, landingOptions, layoutOptions];

// Assignable to the slot as well as nameable: a hoisted installer is only a
// writable surface if it can go back into the config it was hoisted out of.
const hoistedFragment: Partial<SortableConfig> = { axis: hoistedAxis };

void hoistedFragment;

// Inference through the *packed* declarations, with no explicit type argument.
const inferred = draggable(root, behavior);

inferred.destroy();

// ---------------------------------------------------------------------------
// Opacity: neither branded value is constructible or callable.
// ---------------------------------------------------------------------------

// @ts-expect-error: the resolution is opaque, so there is no discriminant on it
// to read — the verdict reaches the consumer as a transaction result (D-143)
const retiredReorderDiscriminant = accepted.type;
// @ts-expect-error: and none to forge either, which is what makes the round
// trip a round trip rather than a data model (D-143)
const retiredReorderLiteral: ReorderResolution = { type: 'accepted' };
// @ts-expect-error: the two resolution arms are not public types (D-143)
type R8 = import('@ydinjs/drag2/sortable.js').AcceptedReorderResolution;
// **The internal arms are not public either, and nothing else says so**
// (F-120). \`AcceptedResolution\` and \`RejectedResolution\` are the names the
// representation is written in; they are erased, so \`exports.node.test.ts\`
// compares values and would not see either of them joining a re-export list.
// @ts-expect-error: the accepted arm is internal to the behavior (D-143)
type R9 = import('@ydinjs/drag2/sortable.js').AcceptedResolution;
// @ts-expect-error: and so is the rejected one
type R10 = import('@ydinjs/drag2/sortable.js').RejectedResolution;
// The cross-behavior row is asserted in \`tests/composition.declaration.test.ts\`
// rather than here: this fixture compiles the sortable tier *without* free
// drag, which is a claim of its own, and importing the other entry to make one
// negative assertion would quietly retire it.

void [retiredReorderDiscriminant, retiredReorderLiteral];

// **The three hoistable slot aliases, named in a type position** (D-78, F-120).
// They were reachable only through a JSDoc paragraph, so deleting the
// \`sortable.js\` re-exports left the suite green — which is exactly the
// hoistability the re-exports exist to provide. Their free-drag counterparts
// are \`satisfies\`-pinned in the other fixture; these are annotated, which is
// the same claim from the other side.
const hoistedItems: ItemSource = () => [];
const hoistedHandle: ResolveHandle = () => null;
const hoistedVisual: ResolveElement = (node) => node;

void [hoistedItems, hoistedHandle, hoistedVisual];

// D-55: a behavior *is* the install function now, so the two opacity rows that
// stood here have no subject. What is still checked is that a bare literal does
// not satisfy the factory's return type.
// @ts-expect-error: a factory must return both halves of the handshake
const forgedBehavior: BehaviorFactory<SortableController, object> = () => ({});
// D-45: an installer is no longer opaque — it is a plain function published at
// the middle tier — so the two brand rows that stood here have no subject
// either. What survives is that an unknown slot is not a config: the merge
// walks the schema, so a misspelled key has to be a *compile* error to be
// diagnosable at all.
// @ts-expect-error: \`onReorded\` is not a slot
const forgedFragment: Partial<SortableConfig> = { onReorded: () => {} };
// **The cardinality, at the published surface.** Each slot is a named key with
// one writer, so an axis installer in \`displacement\` is a type error at the
// call rather than geometry nothing resolves against. The positive control is
// \`hoistedDisplacement\` above.
// @ts-expect-error: an axis installer is not a displacement installer
sortable(root, { items: () => items, onReorder, axis: hoistedAxis, displacement: hoistedAxis });
// D-55: there is no branded behavior type at all now, so the opacity check has
// no subject. What replaces it is the reachability check below — the SPI is
// published at \`kernel.js\` and still unreachable from \`drag.js\`.
// @ts-expect-error: \`Behavior\` is withdrawn (D-55)
type Part = import('@ydinjs/drag2/kernel.js').Behavior<SortableController>;

void [forgedBehavior, forgedFragment];

// ---------------------------------------------------------------------------
// Every internal SPI name is unreachable. Each line must error; an
// \`@ts-expect-error\` that stops erroring is itself a compile failure, so this
// list cannot rot into a no-op.
// ---------------------------------------------------------------------------

// @ts-expect-error: the install function type is internal
type A1 = import('@ydinjs/drag2/drag.js').BehaviorFactory<SortableController, object>;
// @ts-expect-error: the behavior SPI is internal
type A2 = import('@ydinjs/drag2/drag.js').BehaviorSpec<object>;
// @ts-expect-error: the install result is internal
type A3 = import('@ydinjs/drag2/drag.js').BehaviorInstall<SortableController, object>;
// @ts-expect-error: the host is internal
type A4 = import('@ydinjs/drag2/drag.js').KernelHost;
// @ts-expect-error: the seam transition is internal
type A5 = import('@ydinjs/drag2/drag.js').Transition<object>;
// @ts-expect-error: the activation scope is internal
type A6 = import('@ydinjs/drag2/drag.js').ActivationScope;
// @ts-expect-error: the settlement scope is internal
type A7 = import('@ydinjs/drag2/drag.js').SettlementScope;
// @ts-expect-error: the settlement input is internal
type A8 = import('@ydinjs/drag2/drag.js').SettlementInput;
// @ts-expect-error: the resolution command is internal
type A9 = import('@ydinjs/drag2/drag.js').ResolutionCommand;
// @ts-expect-error: the seam rejection is **deleted**, not merely internal
// (D-152) — a non-discardable seam fails by throwing, like every other seam,
// so there is no second failure transport for a behavior author to reach for.
type A10 = import('@ydinjs/drag2/kernel.js').SeamRejection;
// @ts-expect-error: the lift mode constants are internal
const A11 = import('@ydinjs/drag2/drag.js').then((m) => m.LIFT_FLAT);
// @ts-expect-error: the slot record is internal
type B1 = import('@ydinjs/drag2/sortable.js').SortableSlots;
// @ts-expect-error: the contribution groups are internal
type B2 = import('@ydinjs/drag2/sortable.js').AxisContribution;
// @ts-expect-error: the geometry capability is internal
type B3 = import('@ydinjs/drag2/sortable.js').InsertionGeometry;
// @ts-expect-error: the feature context is internal
type B4 = import('@ydinjs/drag2/sortable.js').FeatureContext;
// @ts-expect-error: the contribution group is internal
type B5 = import('@ydinjs/drag2/sortable.js').DisplacementContribution;
// @ts-expect-error: the insertion is internal
type B7 = import('@ydinjs/drag2/sortable.js').Insertion;
// @ts-expect-error: the outcome constants are internal
const B8 = import('@ydinjs/drag2/sortable.js').then((m) => m.OUTCOME_ACCEPTED);
// @ts-expect-error: the recovery constants are internal
const B9 = import('@ydinjs/drag2/sortable.js').then((m) => m.RECOVERY_HOME);

// The four names Checkpoint D (D5) decided **not** to carry over. Each is a
// deliberate omission with its migration loss stated in the parity ledger
// (§2.1, §7), and without these lines those decisions have no executable
// guard: re-adding one would be a silent surface change.
// @ts-expect-error: dissolved into \`LandingOptions\`/\`LayoutAnimationOptions\` (D5)
type D1 = import('@ydinjs/drag2/sortable.js').AnimationTiming;
// @ts-expect-error: dropped; the pair survives inside \`PlaceholderContext\` (D5)
type D2 = import('@ydinjs/drag2/sortable.js').DragSubject;
// @ts-expect-error: structurally inlined into \`OnReorder\`'s second parameter (D5)
type D3 = import('@ydinjs/drag2/sortable.js').ResolutionContext;
// @ts-expect-error: dissolved into \`CanceledReorderResult\`'s \`reason\`/\`stage\` (D5)
type D4 = import('@ydinjs/drag2/sortable.js').CancellationReason;
// \`AnimationTiming\` is the one of the four whose plausible re-entry point is
// **not** \`sortable.js\`: it dissolved into two option types that live on their
// own entries, so a re-add would land there. Guarded on both, which is what
// makes the ledger's claim about it executable rather than aspirational
// (C3-04). The other three have no such second home — each is a name only
// \`sortable.js\` ever exported.
// @ts-expect-error: dissolved into \`LandingOptions\` (D5)
type D5a = import('@ydinjs/drag2/sortable/landing.js').AnimationTiming;
// @ts-expect-error: dissolved into \`LayoutAnimationOptions\` (D5)
type D5b = import('@ydinjs/drag2/sortable/layout-animation.js').AnimationTiming;

// Deep imports are not declared in \`exports\`, so the module graph itself is
// closed — not merely the names each entry chooses to re-export.
// @ts-expect-error: the kernel is not a declared subpath
type C1 = import('@ydinjs/drag2/kernel/spec.js').KernelHost;
// @ts-expect-error: source is not a declared subpath
type C2 = import('@ydinjs/drag2/src/drag.ts').Point;
// The slot views are still internal. The **feature authoring module is not**
// (D-61): \`sortable/feature.js\` is a declared subpath now — the middle tier
// where an installer's types live — so this line must *resolve*, which is the
// opposite of what it asserted before.
type C3 = import('@ydinjs/drag2/sortable/feature.js').SortableDisplacementInstaller;
// @ts-expect-error: the slot views are not a declared subpath
type C4 = import('@ydinjs/drag2/sortable/slots.js').InsertionRuntimeView;

void [A11, B8, B9];
declare const unusedTypes: [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, B1, B2, B3, B4, B5, B7, C1, C2, C3, C4, D1, D2, D3, D4, D5a, D5b, Part];
void unusedTypes;
`;

/**
 * **The kernel-tier fixture behavior** (D-68, 05 §Kernel vocabulary).
 *
 * This is the acceptance row that tests self-containment as a *property*
 * rather than as a list: it imports `@ydinjs/drag2/kernel.js` and
 * `@ydinjs/drag2/drag.js` and **nothing else** — no deep path, no
 * `sortable.js`, no `sortable/feature.js` — and it compiles against the
 * **packed** declarations, so an unpublished name fails here the way it would
 * for a real behavior author.
 *
 * **Every seam is declared out of line**, and that is load-bearing rather than
 * stylistic: an inline factory is contextually typed throughout, so it would
 * have compiled against the pre-D-68 surface and proved nothing. Hoisting each
 * seam into its own `const` is what forces the closure to be nameable —
 * `Draft`, `Frame`, `Transition`, `SettlementTransition`, `ActivationScope`,
 * `LifetimeScope`, `VisualLiftSession`, `OffsetBox`, `FramePartOf`,
 * `BehaviorInstall`.
 *
 * It also fills `config.liftMode`, discriminates all five `SETTLED_*` arms and
 * derives D-66's fallback stage from `AT_PROPOSAL`/`AT_CONSUMER` — the three
 * value holes F-59 named, none of which any type could have filled.
 */
const BEHAVIOR = `import { DraggableError, type Point } from '@ydinjs/drag2/drag.js';
import {
  ACTIVE,
  AT_CONSUMER,
  AT_PROPOSAL,
  draggable,
  FAILURE_ACTIVATION,
  FAILURE_RELEASE,
  IDLE,
  LIFT_IN_PLACE,
  RELEASING,
  CANCEL_FAILED,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type ActionTransition,
  type ActivationScope,
  type AdmissionSubject,
  type BehaviorLiftSession,
  type BehaviorConfig,
  type BehaviorInstall,
  type BehaviorSpec,
  type CancelOrigin,
  type CancelStage,
  type CommandAdmission,
  type Disposer,
  type Draft,
  type Frame,
  type FramePartOf,
  type KernelFrame,
  type KernelHost,
  type LandingTail,
  type LifetimeScope,
  type OffsetBox,
  type OperationIdentity,
  type Phase,
  type PreparedSettlement,
  type ReleaseTransition,
  type ResolutionCommand,
  type SettlementInput,
  type SettlementTransition,
  type Transition,
  type VisualLiftSession,
} from '@ydinjs/drag2/kernel.js';

/** The behavior's own frame part. The kernel never names it (D-15). */
type Part = {
  grabbed: HTMLElement | null;
  verdict: string | null;
};

type Controller = Readonly<{ cancel(reason?: unknown): void; destroy(): Promise<void> }>;

/** Behavior-private, per-operation. D-66's marker, out of line. */
const MINTED = 0;
const STARTED = 1;
const RESOLVING = 2;

let progress: 0 | 1 | 2 = MINTED;

const config: BehaviorConfig = {
  threshold: 8,
  // **The value F-59 is about.** No default, no erased substitute.
  liftMode: LIFT_IN_PLACE,
  actionTags: 1,
};

const admit = (event: PointerEvent, draft: Draft<Part>): AdmissionSubject | null => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return null;
  }

  draft.grabbed = target;
  // A behavior reads the phase, and its domain is published (D-68).
  const phase: Phase = draft.phase;

  return phase === IDLE ? { visual: target, box: target, item: target } : null;
};

const command: CommandAdmission<Part> = {
  types: ['keydown'],
  admit: (event, draft) => (draft.phase === IDLE && event.type === 'keydown' ? draft.grabbed : null),
};

/**
 * **The projection, out of line** (D-35, C5-01). The behavior may name what it
 * is handed, and the source it is a projection *of* — a \`Pick\` whose source a
 * consumer cannot name is not a type a consumer can name — but the two members
 * the kernel keeps are not on the value it receives.
 */
const project: (session: VisualLiftSession) => BehaviorLiftSession = (session) => session;

const activation: Transition<Part, HTMLElement, ActivationScope> = {
  prepare: (draft, scope) => {
    const box: OffsetBox = scope.boxPre;
    const lift: BehaviorLiftSession = scope.lift;
    const motion: LifetimeScope = scope.motion;
    const release: Disposer = () => {};

    motion.use(release);
    void project;
    void lift.write;
    void lift.compose;
    void lift.visual;
    void lift.baseTransform;
    // @ts-expect-error — \`rendered\` is the kernel's own reading (D-35).
    void lift.rendered;
    // @ts-expect-error — \`dispose\` is the kernel's own sequencing (C5-01).
    void lift.dispose;
    void box.height;
    void draft.grabbed;
    return scope.visual;
  },
  effect: (current, prepared, scope) => {
    progress = STARTED;
    void current.pointerX;
    void prepared.isConnected;
    scope.presentation.use(() => {});
  },
};

const release: ReleaseTransition<Part> = {
  prepare: (draft): ResolutionCommand => {
    // **The seam owns its stage, so the behavior raises a cause** (D-152).
    // This is the out-of-line third-party behavior, so it is where the throw
    // form has to be writable: \`release.prepare\` is already running at
    // \`FAILURE_RELEASE\`.
    if (draft.grabbed === null) {
      throw new Error('no subject');
    }

    return {
      invoke: (signal) => {
        progress = RESOLVING;
        return signal.aborted ? null : 'verdict';
      },
    };
  },
  effect: (current, prepared) => {
    void current.operation;
    void prepared.invoke;
  },
};

const settlement: SettlementTransition<Part> = {
  // All five arms, exhaustively — D-24 requires it and the discriminants are
  // values, so an erased surface could not express this switch at all.
  prepare: (draft, input: SettlementInput): PreparedSettlement => {
    switch (input.type) {
      case SETTLED_FULFILLED:
        draft.verdict = String(input.value);
        return true;
      case SETTLED_REJECTED:
        // The caught cause, re-raised verbatim (D-152).
        throw input.error;
      case SETTLED_SKIPPED:
        draft.verdict = 'noop';
        return true;
      case SETTLED_CANCELED: {
        const stage: CancelStage = input.stage;
        // Read off the input and forwarded; a behavior mints no origin here.
        const origin: CancelOrigin = input.origin;

        void origin;
        draft.verdict = stage === AT_CONSUMER ? 'late' : 'early';
        return true;
      }
      case SETTLED_FAILED: {
        // D-66's fallback, derived rather than supplied — the input carries a
        // \`FailureStage\`, never a \`CancelStage\`.
        const stage: CancelStage = progress === RESOLVING ? AT_CONSUMER : AT_PROPOSAL;
        // The one origin a behavior writes: this fallback is what gives a
        // classified failure a terminal, so the behavior is the only party that
        // can say so.
        const origin: CancelOrigin = CANCEL_FAILED;

        void origin;
        // D-130: the input carries the finished error the consumer will
        // receive, beside the \`FailureStage\` this behavior maps to a recovery.
        const error: DraggableError = input.report;

        draft.verdict =
          stage === AT_CONSUMER ? String(error.stage) : 'aborted';
        return true;
      }
    }
  },
  effect: (current) => {
    void current.phase;
  },
};

const action: ActionTransition<Part> = {
  prepare: (tag, argument, draft) => (tag === 0 && draft.phase === ACTIVE ? { argument } : null),
  effect: (_tag, _argument, current: Readonly<Frame<Part>>, prepared) => {
    void current.verdict;
    void prepared;
  },
};

const createFramePart = (): FramePartOf<Part> => ({ grabbed: null, verdict: null });

const resetFramePart = (part: Part): void => {
  part.grabbed = null;
  part.verdict = null;
};

// **\`HTMLElement\` written out at both construction types** (D-34, and C-04's
// correction that the parameter has to reach them). This behavior stages the
// element its \`activation.prepare\` returns; one that stages nothing writes
// neither argument and gets \`true\`.
const install = (host: KernelHost): BehaviorInstall<Controller, Part, HTMLElement> => {
  const spec: BehaviorSpec<Part, HTMLElement> = {
    config,
    admit,
    command,
    activation,
    release,
    settlement,
    action,
    moved: (current, lift: BehaviorLiftSession) => {
      const frame: KernelFrame = current;
      const operation: OperationIdentity | null = frame.operation;

      void operation;
      lift.write(current.pointerX - current.originX, current.pointerY - current.originY);
    },
    anchorTarget: (current): Point => ({ x: current.pointerX, y: current.pointerY }),
    // **The tail's policy, and the four scalars it is handed** (D-145, D-155).
    // A kernel-tier behavior decides whether a drop has a journey worth
    // interpolating; the kernel owns the interpolation itself.
    landingTail: (current, fromX, fromY, targetX, targetY): LandingTail | null =>
      current.phase >= RELEASING && (fromX !== targetX || fromY !== targetY)
        ? { duration: 200, easing: 'ease' }
        : null,
    finalized: (current) => {
      void current.verdict;
    },
    reportError: (error) => {
      // **D-130 — forward, and nothing else.** The kernel builds the error and
      // picks its class. ~~\`toDraggableError\` is no longer on \`kernel.js\` at
      // all, which is what makes the stage → code mapping impossible for a
      // behavior to re-own.~~ **D-132 deleted the mapping outright**, so there
      // is no second vocabulary for a behavior to re-own in the first place.
      void error.message;
    },
    retire: () => {
      progress = MINTED;
    },
    createFramePart,
    resetFramePart,
  };

  return {
    spec,
    controller: { cancel: host.cancel, destroy: host.destroy },
  };
};

declare const root: HTMLElement;

const behaviorController: Controller = draggable(root, install);

void behaviorController;
`;

/**
 * **The free-drag consumer fixture** (B-5).
 *
 * The second behavior's half of what `CONSUMER` does for the sortable, and the
 * criterion is the same: it compiles against the **packed** declarations from
 * outside the workspace, so a name that never reached the tarball fails here
 * rather than in a suite that imports `src/`.
 *
 * **Ordinary tier only.** `free-drag.js`, its two capability entries and
 * `drag.js` — no `kernel.js`, no `free-drag/feature.js`, no deep path. The
 * middle tier is exercised by `CONSTRAINT` below, separately, because *what an
 * ordinary consumer cannot reach* is half of what this fixture asserts.
 *
 * The terminal switch is **exhaustive over three arms with `never` on the
 * fall-through** (D-62, F-41): with one `onEnd` the arms are the consumer's to
 * discriminate, so a fourth arm added later has to be a compile error here.
 */
const FREE_DRAG = `import {
  DraggableError,
  DraggableWarning,
  FAILURE_RENDERER_WRITE,
  type FailureStage,
  type Point,
} from '@ydinjs/drag2/drag.js';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_ABORTED,
  CANCEL_INTERRUPTED,
  FreeDragResolution,
  freeDrag,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type AcceptedFreeDragResult,
  type CancelOrigin,
  type CancelStage,
  type CanceledFreeDragResult,
  type DragAxis,
  type DragGeometry,
  type FreeDragConfig,
  type FreeDragController,
  type ConstraintInstaller,
  type FreeDragLandingInstaller,
  type FreeDragPlugin,
  type FreeDragOnDragError,
  type FreeDragOnEnd,
  type FreeDragOnStart,
  type FreeDragRequest,
  type FreeDragSubject,
  type FreeDragTransactionResult,
  type LiftMode,
  type OnDrop,
  type OnMove,
  type RejectedFreeDragResult,
  type ResolveElement,
  type ResolveHandle,
  type ResolveHome,
} from '@ydinjs/drag2/free-drag.js';
import { bounds, type BoundsSource } from '@ydinjs/drag2/free-drag/bounds.js';
import {
  landing,
  type LandingDuration,
  type LandingOptions,
} from '@ydinjs/drag2/free-drag/landing.js';

declare const item: HTMLElement;
declare const stage: HTMLElement;

// **Each capability slot's alias is hoistable from the ordinary tier** (D-78,
// D-146). \`FreeDragConfig\` names one per key, so a third-party constraint
// must be writable as a typed \`const\` rather than only inline — while the
// names *it* reaches stay at the middle tier, which is what the negative rows
// at the bottom of this file still assert. \`context\` is deliberately not
// annotated: its type is \`FeatureContext\`, which this file cannot import, and
// contextual typing resolves it structurally anyway.
const hoistedInstaller: ConstraintInstaller = (context) => {
  void context.root;

  return {
    constrain: {
      apply: (motion) => {
        motion.x = Math.round(motion.x);
        motion.y = Math.round(motion.y);
      },
      invalidate: (): void => {},
      retire: (): void => {},
    },
  };
};

const controller: FreeDragController = freeDrag(
  item,
  {
    // **D-77**: one required config argument. Only \`onDrop\` is required, and
    // omitting it is a compile error rather than a runtime throw.
    onDrop: (request: FreeDragRequest) => {
      void request.visualRect.width;
      // **Every flattened coordinate is read, on both shapes** (D-139, F-120).
      // A transposition between an X and a Y field is the failure a flattening
      // most easily produces, and a fixture that reads one field of eight
      // cannot see it. Reading each by name is what makes a renamed or dropped
      // field a compile error at the tier the consumer works at.
      void [
        request.pointerX,
        request.pointerY,
        request.positionX,
        request.positionY,
        request.viewportDeltaX,
        request.viewportDeltaY,
        request.localDeltaX,
        request.localDeltaY,
      ];
      return FreeDragResolution.accept();
    },
    // **Fixed configuration** (D-148): a scalar for the controller's lifetime.
    axis: 'x' satisfies DragAxis,
    handle: ((element: HTMLElement) => element) satisfies ResolveHandle,
    visual: ((element: HTMLElement) => element) satisfies ResolveElement,
    home: ((subject: FreeDragSubject): Point => ({
      x: subject.visual.clientLeft,
      y: 0,
    })) satisfies ResolveHome,
    onStart: ((geometry: DragGeometry) => {
      void geometry.originRect.width;
      void [geometry.originPointerX, geometry.originPointerY];
    }) satisfies FreeDragOnStart,
    onMove: ((geometry: DragGeometry) => {
      void geometry.currentRect.left;
      void [
        geometry.pointerX,
        geometry.pointerY,
        geometry.viewportDeltaX,
        geometry.viewportDeltaY,
        geometry.localDeltaX,
        geometry.localDeltaY,
      ];
    }) satisfies OnMove,
    lift: LIFT_FLAT satisfies LiftMode,
    threshold: 4,
    onEnd: ((result: FreeDragTransactionResult): void => {
      // **Three arms, and \`never\` on the fall-through** (D-62, F-41). The
      // shipped \`is*\` predicates are dropped: the union is discriminated, so a
      // consumer needs nothing but the tag.
      switch (result.type) {
        case 'accepted': {
          const accepted: AcceptedFreeDragResult = result;

          void accepted.request.item;
          break;
        }

        case 'rejected': {
          const rejected: RejectedFreeDragResult = result;

          void rejected.reason;
          break;
        }

        case 'canceled': {
          const canceled: CanceledFreeDragResult = result;
          const stageTag: CancelStage = canceled.stage;
          // *The user changed their mind* is not *the input was taken away*,
          // and this is the field that tells them apart.
          const originTag: CancelOrigin = canceled.origin;

          void (stageTag === AT_PROPOSAL || stageTag === AT_CONSUMER);
          void (originTag === CANCEL_ABORTED || originTag === CANCEL_INTERRUPTED);
          break;
        }

        default: {
          const exhaustive: never = result;

          void exhaustive;
        }
      }
    }) satisfies FreeDragOnEnd,
    onError: ((error: DraggableError | DraggableWarning): void => {
      // **D-64 and D-130.** One argument, two classes, and the two roots are
      // structurally identical here now — which is the D-109 note the decision
      // records rather than acts on: the qualified names stay for symmetry with
      // \`OnStart\` and \`OnEnd\`, whose structures still differ.
      if (!(error instanceof DraggableError)) {
        void error.message;
        return;
      }

      const stage: FailureStage | null = error.stage;

      void (stage === FAILURE_RENDERER_WRITE);
    }) satisfies FreeDragOnDragError,
  },
  // **A capability installer, not a config key** (D-70), and the no-argument
  // form *is* the viewport — the shipped \`bounds: 'viewport'\` sentinel is
  // closed by deletion.
  bounds(stage),
  landing({ duration: ((): number => 120) satisfies LandingDuration }),
  // **In the key it is read from** (D-151). A constraint installer composed
  // through \`plugins\` is refused at this call: the plugin loop reads a
  // lifetime and nothing else, so its clamp would never be applied and its
  // \`retire\` never recorded. Last-wins replaces \`bounds(stage)\` above,
  // which is the merge rule and not a collision.
  { bounds: hoistedInstaller },
);

// **D-71**: payload-free \`invalidate()\`, and \`moveTo\` is a command in
// viewport space rather than a policy slot.
controller.invalidate();
controller.moveTo({ x: 10, y: 20 } satisfies Point);
controller.cancel('reason');
void controller.destroy();

// Free drag's twin (F-147): named by \`freeDrag()\`'s signature and therefore
// exported from this entry, with its own closure one tier down.
type FreeComposition = import('@ydinjs/drag2/free-drag.js').FreeDragComposition<{
  plugins: readonly FreeDragPlugin[];
}>;

declare const freeComposition: FreeComposition;

void freeComposition;

declare const source: BoundsSource;
declare const options: LandingOptions;
declare const preset: Partial<FreeDragConfig>;
declare const drop: OnDrop;
declare const axis: DragAxis;
// **The resolution is opaque, and this is the whole of what a consumer does
// with one** (D-140): build it and return it. The two rows below the retired
// list assert that nothing else is available.
declare const accepted: FreeDragResolution;
declare const rejected: FreeDragResolution;

void [source, options, preset, drop, axis, accepted, rejected];

// The three lift constants are the config slot's vocabulary and reach an
// ordinary consumer from this entry (D-141), not only from \`kernel.js\`.
const liftModes: readonly LiftMode[] = [LIFT_FAITHFUL, LIFT_FLAT, LIFT_IN_PLACE];

void liftModes;

// A hoisted installer is only a writable surface if it can go back into the
// config it was hoisted out of.
const hoistedFragment: Partial<FreeDragConfig> = {
  bounds: hoistedInstaller,
};

void hoistedFragment;

// ---------------------------------------------------------------------------
// The retired shipped names. Each line must error; an \`@ts-expect-error\` that
// stops erroring is itself a compile failure, so this list cannot rot.
// ---------------------------------------------------------------------------

// @ts-expect-error: \`coordinateSpace\` is dropped, not renamed (D-72)
const retiredSpace: Partial<FreeDragConfig> = { coordinateSpace: 'local' };
// **The composition check, at the published surface** (D-151). An installer
// may contribute only the slots its position is read for, and \`constrain\` is
// installable from \`bounds\` alone — so this is refused at the call rather
// than silently installing a clamp nothing applies. The positive control is
// \`{ bounds: hoistedInstaller }\` above, and \`AxisSource\` below is what
// stops this row being read as a general refusal of the \`plugins\` key.
// @ts-expect-error: a constraint installer is not a plugin (D-151)
freeDrag(item, { onDrop: () => FreeDragResolution.accept() }, { plugins: [hoistedInstaller] });
// @ts-expect-error: \`axis\` is fixed configuration, never a source (D-148)
const retiredAxisSource: Partial<FreeDragConfig> = { axis: () => 'x' };
// @ts-expect-error: and the alias is unpublished with it
type R8 = import('@ydinjs/drag2/free-drag.js').AxisSource;
// @ts-expect-error: \`update(DragUpdate)\` has no successor (D-71)
controller.update({ position: { x: 0, y: 0 } });
// @ts-expect-error: the lift slot takes the kernel's numeric mode (D-141), so
// no string is one — the shipped names and the withdrawn ones alike
const retiredLift: Partial<FreeDragConfig> = { lift: 'top-layer' };
// @ts-expect-error: the resolution factories take no argument (D-41)
const retiredResolution = FreeDragResolution.accept({ presentation: true });
// @ts-expect-error: the resolution is opaque, so there is no discriminant on
// it to read — the verdict reaches the consumer as a transaction result (D-140)
const retiredDiscriminant = accepted.type;
// @ts-expect-error: and none to forge either, which is what makes the round
// trip a round trip rather than a data model (D-140)
const retiredLiteral: FreeDragResolution = { type: 'accepted' };
// @ts-expect-error: the two resolution arms are not public types (D-140)
type R6 = import('@ydinjs/drag2/free-drag.js').AcceptedFreeDragResolution;
// @ts-expect-error: nor is the string lift union (D-141)
type R7 = import('@ydinjs/drag2/free-drag.js').FreeDragLift;
// **Every retired pair, not one of eight** (D-139, F-120). A flattening that
// left one member behind, or reintroduced one, is caught here rather than by a
// reader noticing; \`viewportDelta\` alone said nothing about the other three.
// @ts-expect-error: the request's coordinates are scalars (D-139)
const retiredPair = ({} as FreeDragRequest).viewportDelta;
// @ts-expect-error: and its release position is \`positionX\`/\`positionY\`
const retiredPosition = ({} as FreeDragRequest).viewportPosition;
// @ts-expect-error: the geometry's are scalars too
const retiredLocal = ({} as DragGeometry).localDelta;
// @ts-expect-error: including the two pointer pairs, which a transposition
// would otherwise reach through
const retiredPointer = ({} as DragGeometry).pointer;
// @ts-expect-error: ″
const retiredOrigin = ({} as DragGeometry).originPointer;
// **The internal arm names are not published from this entry either** (F-120).
// @ts-expect-error: the accepted arm is internal to the behavior (D-140)
type R11 = import('@ydinjs/drag2/free-drag.js').AcceptedResolution;
// @ts-expect-error: and so is the rejected one
type R12 = import('@ydinjs/drag2/free-drag.js').RejectedResolution;
// @ts-expect-error: \`FreeDropResolution\` is renamed to one vocabulary (D-69)
type R1 = import('@ydinjs/drag2/free-drag.js').FreeDropResolution;
// @ts-expect-error: \`DragUpdate\` is dissolved (D-71)
type R2 = import('@ydinjs/drag2/free-drag.js').DragUpdate;
// @ts-expect-error: \`DraggableOptions\` is dissolved into \`FreeDragConfig\`
type R3 = import('@ydinjs/drag2/free-drag.js').DraggableOptions;
// @ts-expect-error: \`FreeHomeTarget\` had one inhabitant for its discriminant
type R4 = import('@ydinjs/drag2/free-drag.js').FreeHomeTarget;
// @ts-expect-error: \`DragBounds\` is \`BoundsSource\`, on the capability entry
type R5 = import('@ydinjs/drag2/free-drag.js').DragBounds;
// @ts-expect-error: the union is discriminated; the predicates are dropped
const retiredPredicate = FreeDragResolution.isAccepted;

void [
  retiredSpace,
  retiredLift,
  retiredResolution,
  retiredPredicate,
  retiredDiscriminant,
  retiredLiteral,
  retiredPair,
  retiredPosition,
  retiredLocal,
  retiredPointer,
  retiredOrigin,
];

// ---------------------------------------------------------------------------
// **The tier-scoped closure, from the other side** (D-78). The three installer
// aliases ship from \`free-drag.js\`; every name they reach stays declared at
// the middle tier, one import away for an author who wants them.
// ---------------------------------------------------------------------------

// @ts-expect-error: the contribution groups are middle tier
type T1 = import('@ydinjs/drag2/free-drag.js').ConstraintContribution;
// @ts-expect-error: the constraint capability is middle tier
type T2 = import('@ydinjs/drag2/free-drag.js').MotionConstraint;
// @ts-expect-error: the constraint's view is middle tier
type T3 = import('@ydinjs/drag2/free-drag.js').ConstraintView;
// @ts-expect-error: the feature context is middle tier
type T4 = import('@ydinjs/drag2/free-drag.js').FeatureContext;
// @ts-expect-error: the slot record is internal
type T5 = import('@ydinjs/drag2/free-drag.js').FreeDragSlots;
// @ts-expect-error: the seam module is not a declared subpath
type T6 = import('@ydinjs/drag2/free-drag/spec.js').FreeDragFramePart;
// The **middle tier is** a declared subpath, so this one must resolve — the
// opposite assertion, and the reason the two are written together.
type T7 = import('@ydinjs/drag2/free-drag/feature.js').ConstraintInstaller;

declare const unreachable: [R1, R2, R3, R4, R5, T1, T2, T3, T4, T5, T6, T7];
void unreachable;
`;

/**
 * **The middle-tier fixture** (B-6): a `constrain` installer authored **out of
 * line** against `free-drag/feature.js`, proving the slot is fillable by a
 * third party *instead of* the first-party `bounds()` rather than beside it.
 *
 * It imports the middle tier and the ordinary entry and nothing else — no
 * kernel, no deep path — which is the tier boundary D-61 draws, checked against
 * the packed declarations rather than against `src/`.
 */
const CONSTRAINT = `import type {
  ConstraintContribution,
  ConstraintInstaller,
  ConstraintView,
  Disposer,
  FeatureContext,
  MotionConstraint,
  MotionDraft,
} from '@ydinjs/drag2/free-drag/feature.js';
import { FreeDragResolution, freeDrag } from '@ydinjs/drag2/free-drag.js';

/** Snaps the drag to a grid — the third-party capability D-70 exists for. */
const snapToGrid =
  (step: number): ConstraintInstaller =>
  (context: FeatureContext): ConstraintContribution => {
    void context.realm.window;
    void context.root;

    let cached: number = step;

    const constrain: MotionConstraint = {
      // By reference, and it allocates nothing: the clamped scalars are written
      // back into the draft the behavior owns (D-70, 13c P-1 as corrected).
      apply(motion: MotionDraft, view: ConstraintView): void {
        void view.originRect.width;
        motion.x = Math.round(motion.x / cached) * cached;
        motion.y = Math.round(motion.y / cached) * cached;
      },
      // Staleness only — lazy by contract, so it reads no geometry.
      invalidate(): void {
        cached = step;
      },
      retire(): void {},
    };

    const retire: Disposer = () => {};

    return { constrain, retire };
  };

declare const item: HTMLElement;

const controller = freeDrag(
  item,
  { onDrop: () => FreeDragResolution.accept() },
  { bounds: snapToGrid(8) },
);

void controller.destroy();
`;

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    strict: true,
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'esnext',
    lib: ['esnext', 'dom'],
    types: [],
    noEmit: true,
    // Deliberately on: the point is to typecheck the packed declaration graph,
    // not to trust that it resolves.
    skipLibCheck: false,
  },
  include: ['consumer.ts', 'behavior.ts', 'free-drag.ts', 'constraint.ts'],
});

type Packed = Readonly<{
  /** The extracted package root. */
  dir: string;
  /** The consumer project, outside the workspace, resolving the extracted copy. */
  consumer: string;
  /** `exports` as published, minus `./package.json`. */
  subpaths: ReadonlyMap<string, Readonly<{ types: string; default?: string }>>;
}>;

let packed: Packed;

const exists = async (path: string): Promise<boolean> => {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
};

/** Every packed file whose extension `suffix` matches, as absolute paths. */
async function packedFiles(
  dir: string,
  suffix: string,
): Promise<readonly string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name));
}

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'drag2-consumer-'));

  await run('npx', ['tsdown', '--config', 'tsdown.config.ts'], ROOT);

  const { stdout } = await run(
    'npm',
    ['pack', '--pack-destination', dir, '--silent'],
    ROOT,
  );

  await run(
    'tar',
    ['-xzf', join(dir, stdout.trim().split('\n').at(-1)!), '-C', dir],
    ROOT,
  );

  const extracted = join(dir, 'package');
  const consumer = join(dir, 'consumer');
  // One scope directory above both the extracted package and the consumer, so
  // node's upward lookup finds it from either. The extracted copy needs it too:
  // `kernel/presentation.js` imports `@ydinjs/box-quad` at runtime, which is
  // the kind of dependency edge a tarball can only be proven to satisfy from
  // outside the workspace.
  const scope = join(dir, 'node_modules', '@ydinjs');

  await mkdir(scope, { recursive: true });
  await mkdir(consumer, { recursive: true });
  // The consumer resolves the extracted tarball, never `src/` — a deep import
  // the `exports` map does not declare has to fail here the way it would for a
  // real consumer.
  await symlink(extracted, join(scope, 'drag2'));
  await symlink(join(REPO, 'packages', 'box-quad'), join(scope, 'box-quad'));
  await writeFile(join(consumer, 'consumer.ts'), CONSUMER);
  await writeFile(join(consumer, 'behavior.ts'), BEHAVIOR);
  await writeFile(join(consumer, 'free-drag.ts'), FREE_DRAG);
  await writeFile(join(consumer, 'constraint.ts'), CONSTRAINT);
  await writeFile(join(consumer, 'tsconfig.json'), TSCONFIG);

  const manifest = JSON.parse(
    await readFile(join(extracted, 'package.json'), 'utf8'),
  ) as {
    exports: Record<
      string,
      string | Readonly<{ types: string; default?: string }>
    >;
  };
  const subpaths = new Map<
    string,
    Readonly<{ types: string; default?: string }>
  >();

  for (const [key, value] of Object.entries(manifest.exports)) {
    if (typeof value !== 'string') {
      subpaths.set(key, value);
    }
  }

  packed = { dir: extracted, consumer, subpaths };
}, 4 * MINUTE);

describe('the packed package', () => {
  it('should ship a runtime module for every landed subpath', async () => {
    // Runtime-imported, not merely stat-ed: a module that exists but cannot
    // resolve its own imports is exactly the B-01 failure this suite exists for.
    const landed = [...packed.subpaths].filter(
      ([key, value]) => !PENDING.includes(key) && value.default !== undefined,
    );

    expect(landed.length).toBeGreaterThan(0);

    const imported = await Promise.all(
      landed.map(([, value]) => import(join(packed.dir, value.default!))),
    );

    for (const each of imported) {
      expect(each).toBeTypeOf('object');
    }
  });

  it('should expose sortable.js as a runtime module', async () => {
    // Named on its own because it is the entry the contract gives a runtime
    // export to (`ReorderResolution`) while every other sortable subpath is a
    // feature. A type-only entry emits no `.js`, and the `default` condition
    // would then point at nothing.
    const entry: Readonly<{
      ReorderResolution: Readonly<{ accept(): unknown }>;
    }> = await import(join(packed.dir, './sortable.js'));

    // Acceptance declares nothing (D-41): the readiness protocol the
    // `presentation` flag belonged to is deleted. Since D-143 it declares
    // nothing *at all* — the value is opaque and carries no discriminant, so
    // what is asserted here is that the factory is callable through the packed
    // entry and returns the shared value, which is the whole of its contract.
    expect(entry.ReorderResolution.accept()).toBe(
      entry.ReorderResolution.accept(),
    );
  });

  it('should leave exactly the unimplemented feature subpaths without runtime code', async () => {
    const missing: string[] = [];

    for (const [key, value] of packed.subpaths) {
      if (value.default === undefined) {
        // A **type-only** subpath (D-61), not a pending one: it declares no
        // `default` condition at all, so there is no file it is promising and
        // failing to ship. `PENDING` is for the opposite case — a `default`
        // that points at a module the build has not written yet.
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, value.default)))) {
        missing.push(key);
      }
    }

    expect(missing.toSorted()).toEqual(PENDING);
  });

  it('should resolve the types target of every declared subpath', async () => {
    const missing: string[] = [];

    for (const [key, value] of packed.subpaths) {
      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, value.types)))) {
        missing.push(key);
      }
    }

    expect(missing).toEqual([]);
  });

  it('should expose exactly the intended runtime surface, per subpath', async () => {
    // The frozen table from contract 03, asserted as an **equality**: a new
    // export is as much a failure here as a missing one, which is the whole
    // point of freezing a surface. Types are erased at runtime and are checked
    // by the consumer compile instead.
    const expected: Readonly<Record<string, readonly string[]>> = {
      // **The stage vocabulary is published here too** (D-132 §6), as runtime
      // values rather than types alone — a numeric union whose members are
      // unnameable is not a public type, and \`DraggableError.stage\` hands an
      // ordinary consumer one of these twelve.
      './drag.js': [
        'DraggableError',
        'DraggableWarning',
        'FAILURE_ACTION_EFFECT',
        'FAILURE_ACTION_PREPARE',
        'FAILURE_ACTIVATION',
        'FAILURE_ADMISSION',
        'FAILURE_INVALIDATION',
        'FAILURE_RELEASE',
        'FAILURE_RENDERER_WRITE',
        'FAILURE_RESOLUTION',
        'FAILURE_SCHEDULED_FRAME',
        'FAILURE_TERMINAL_CALLBACK',
      ],
      // **35 values, asserted by value** (D-68, D-154), and the count is the
      // length of the list below — F-174 found this written at four sites with
      // three different numbers, none of them the tree's. A type-only assertion
      // cannot see the hole F-59 names: every missing name was a *constant*,
      // and erased types cannot fill a value position.
      './kernel.js': [
        'ACTIVATING',
        'ACTIVE',
        'AT_CONSUMER',
        'AT_PROPOSAL',
        'CANCEL_ABORTED',
        'CANCEL_FAILED',
        'CANCEL_INTERRUPTED',
        'CANCEL_SUPPLIED',
        'FAILURE_ACTION_EFFECT',
        'FAILURE_ACTION_PREPARE',
        'FAILURE_ACTIVATION',
        'FAILURE_ADMISSION',
        'FAILURE_INVALIDATION',
        'FAILURE_RELEASE',
        'FAILURE_RENDERER_WRITE',
        'FAILURE_RESOLUTION',
        'FAILURE_SCHEDULED_FRAME',
        'FAILURE_TERMINAL_CALLBACK',
        'FINALIZING',
        'IDLE',
        'LIFT_FAITHFUL',
        'LIFT_FLAT',
        'LIFT_IN_PLACE',
        'PENDING',
        'RELEASING',
        'REPORTING',
        'SETTLED_CANCELED',
        'SETTLED_FAILED',
        'SETTLED_FULFILLED',
        'SETTLED_REJECTED',
        'SETTLED_SKIPPED',
        'SETTLING',
        'draggable',
      ],
      // **Ten since D-154.** The four origins are the closed provenance
      // vocabulary a `CanceledReorderResult` obliges the consumer to
      // discriminate; the two `CANCEL_*` reasons are the behavior's own domain
      // values, sound on `reason` for a reason the deleted kernel strings never
      // had.
      './sortable.js': [
        'AT_CONSUMER',
        'AT_PROPOSAL',
        'CANCEL_ABORTED',
        'CANCEL_COLLECTION_INVALIDATED',
        'CANCEL_FAILED',
        'CANCEL_INTERRUPTED',
        'CANCEL_ITEM_REMOVED',
        'CANCEL_SUPPLIED',
        'ReorderResolution',
        'sortable',
      ],
      // **Eleven.** Three are the lift vocabulary (D-141) — `config.lift` takes
      // the kernel's numeric `LiftMode`, and a numeric union whose members are
      // unnameable is not a fillable slot — and four are the cancellation
      // origins (D-154), which publish beside the type they belong to exactly
      // as the stages do on `drag.js`.
      './free-drag.js': [
        'AT_CONSUMER',
        'AT_PROPOSAL',
        'CANCEL_ABORTED',
        'CANCEL_FAILED',
        'CANCEL_INTERRUPTED',
        'CANCEL_SUPPLIED',
        'FreeDragResolution',
        'LIFT_FAITHFUL',
        'LIFT_FLAT',
        'LIFT_IN_PLACE',
        'freeDrag',
      ],
      './free-drag/bounds.js': ['bounds'],
      './free-drag/landing.js': ['landing'],
      './sortable/feature.js': ['insertionAt'],
      './sortable/y.js': ['y'],
      './sortable/xy.js': ['xy'],
      './sortable/landing.js': ['landing'],
      './sortable/layout-animation.js': ['layoutAnimation'],
    };

    /**
     * ~~**`./sortable/feature.js` is deliberately absent from this table.**~~
     * **It joined it 2026-08-25** (D-123, D-125): the sortable middle tier now
     * has one runtime export, so the build emits a `.js` for it and its export
     * entry gained a `default` condition. Read off the **packed** artifact,
     * which is what makes this row the proof of the topology change rather
     * than a restatement of `files.json`.
     *
     * **`./free-drag/feature.js` is what the absence claim now rests on**, and
     * it still has zero runtime exports: `types` with no `default`, no emitted
     * `.js`, nothing whose names could be listed. Unlike the three subpaths
     * D-56 deleted for measuring nothing, it is not pretending to measure
     * anything, and its declarations are covered by the packed-declaration row
     * above and by the consumer compile.
     */
    const runtimeSubpaths = [...packed.subpaths].filter(
      ([, value]) => value.default !== undefined,
    );

    expect(runtimeSubpaths.map(([key]) => key).toSorted(byName)).toEqual(
      Object.keys(expected).toSorted(byName),
    );
    expect([...packed.subpaths.keys()]).toContain('./free-drag/feature.js');

    const actual: Record<string, readonly string[]> = {};

    await Promise.all(
      runtimeSubpaths.map(async ([key, value]) => {
        const module: object = await import(join(packed.dir, value.default!));
        const names: readonly string[] = Object.keys(module);

        actual[key] = names.toSorted(byName);
      }),
    );

    expect(actual).toEqual(expected);
  });

  it('should pack every declaration its declarations reference', async () => {
    const files = await packedFiles(packed.dir, '.d.ts');
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const dangling: string[] = [];

    for (const [index, source] of sources.entries()) {
      for (const match of source.matchAll(/from\s*"(\.[^"]*)"/gu)) {
        // A declaration references `./x.js`; the file that has to be packed
        // alongside it is `./x.d.ts`.
        const target = resolve(
          dirname(files[index]!),
          match[1]!.replace(/\.js$/u, '.d.ts'),
        );

        // oxlint-disable-next-line no-await-in-loop
        if (!(await exists(target))) {
          dangling.push(`${files[index]!} -> ${match[1]!}`);
        }
      }
    }

    expect(dangling).toEqual([]);
  });

  it('should pack every sourcemap its modules point at', async () => {
    // `files` ships whole directories for `kernel/` and `sortable/`, which
    // carries their maps along, but names the root entries file by file — so a
    // root map is the one artefact the allowlist can silently drop.
    //
    // **`.d.ts` as well as `.js`, since D-111.** This scanned only `.js`, and
    // the omission is the whole reason 31 dangling references shipped
    // unnoticed: tsdown runs both emits as one rolldown build over one
    // `sourcemap` option, so every declaration carried a
    // `//# sourceMappingURL=….d.ts.map` comment while no such chunk was ever
    // produced. An instrument that checks one half of what it names is the
    // failure this row now closes — the property is *every* packed module,
    // not every packed module of one extension.
    const files = [
      ...(await packedFiles(packed.dir, '.js')),
      ...(await packedFiles(packed.dir, '.d.ts')),
    ];
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const dangling: string[] = [];

    for (const [index, source] of sources.entries()) {
      const match = /\/\/# sourceMappingURL=(\S+)/u.exec(source);

      if (match === null) {
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(resolve(dirname(files[index]!), match[1]!)))) {
        dangling.push(`${files[index]!} -> ${match[1]!}`);
      }
    }

    expect(dangling).toEqual([]);
    // Not vacuous: the `.js` half really does carry maps, so a future build
    // that stopped emitting `sourceMappingURL` altogether cannot pass this
    // row by having nothing to check.
    expect(
      sources.filter((source) => source.includes('sourceMappingURL')).length,
    ).toBeGreaterThan(0);
  });

  it('should pack every file its own allowlist names', async () => {
    // **The other direction, and the one `files` gets wrong** (D-111). `exports`
    // is generated from `files.json` and cannot drift; `files` is the single
    // hand-maintained list in the package contract, and it listed `drag.js.map`
    // — a chunk rolldown never emits, because a pure re-export facade has no
    // mappings. npm ignores a missing allowlist entry silently, so nothing
    // failed and the tarball simply promised a file it did not carry.
    const manifest = JSON.parse(
      await readFile(join(packed.dir, 'package.json'), 'utf8'),
    ) as { files: readonly string[] };
    const missing: string[] = [];

    for (const entry of manifest.files) {
      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, entry)))) {
        // A directory entry reads as a file that cannot be read; only a
        // genuinely absent path fails.
        // oxlint-disable-next-line no-await-in-loop
        const listed = await readdir(join(packed.dir, entry)).catch(() => null);

        if (listed === null) {
          missing.push(entry);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('should ship the two author-facing checks it validates behaviors with', async () => {
    // **D-108, read off the artifact a third-party behavior author installs.**
    // These were `__DEV__`-gated on the premise that behavior authoring is not
    // public, which Revision 2.1 voided — the kernel shipped empty stubs an
    // author could not fill (F-78). Asserted on the packed *message identity*
    // (D-117) rather than on the source, because the gate was invisible
    // everywhere else in this suite: the repository builds `__DEV__` as `true`,
    // so every in-repo fixture ran the checks that the published build had
    // folded away.
    //
    // **Four became two on 2026-08-25** (D-128). The frame pair —
    // `assertFrameShapesMatch` and `assertFrameScrubbed`, with the `assert`,
    // `sameKeys` and `validateFrameDescriptors` helpers under them — was
    // deleted in the source-shape pass, so `kernel/frames.js` now ships no
    // diagnostic at all. What D-108 decided is untouched and is what this row
    // still reads: the checks that **do** ship are un-gated, in the build a
    // third party installs.
    const seams = await readFile(join(packed.dir, 'kernel/seams.js'), 'utf8');
    const frames = await readFile(join(packed.dir, 'kernel/frames.js'), 'utf8');

    expect(seams).toContain('drag: seam/staged-unconsumed');
    expect(seams).toContain('drag: seam/fail-outside-seam');
    // The other half of the same statement, and the reason this row was not
    // simply narrowed: the frame module ships **no** author-facing message now,
    // so a returning assertion has to change this line.
    expect(frames).not.toContain('drag: frame/');
  });

  it('should declare no subpath into the kernel directory', () => {
    // **Narrowed by D-48, not withdrawn.** `./kernel.js` is now a declared
    // entry — the kernel tier is published, because a behavior author needs
    // `draggable()` and the classification vocabulary. What stays unaddressable
    // is the `kernel/` *directory*: it is shipped, because the entrypoints
    // import it at runtime, but no export key reaches inside it, so the seam
    // modules are still not importable by path.
    expect(
      [...packed.subpaths.keys()].filter((key) => key.startsWith('./kernel/')),
    ).toEqual([]);
  });

  it(
    'should compile a consumer against the packed declarations',
    async () => {
      // The fixture carries the opacity checks as `@ts-expect-error` lines, so a
      // clean exit proves both directions at once: the public imports resolve and
      // typecheck, and neither `Behavior`'s frame part nor `BehaviorFactory` is
      // reachable through a public entry.
      await expect(
        run(
          join(REPO, 'node_modules', '.bin', 'tsc'),
          ['--noEmit', '-p', 'tsconfig.json'],
          packed.consumer,
        ),
      ).resolves.toBeDefined();
    },
    2 * MINUTE,
  );
});
