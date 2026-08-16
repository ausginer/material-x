/**
 * **Revision 2 fixture — does the redesigned consumer surface compile as one
 * system?**
 *
 * The `phase-14.ts` treatment applied to **D-36…D-67**, **wired to `src/` at
 * Revision 2 closure** (A-4). Every public type and value it exercises is now
 * imported from the entry that publishes it, so the file checks the
 * implementation rather than checking itself.
 *
 * ## Why this file exists
 *
 * The revision handoff listed a compiled fixture as **owed**, and then five
 * owner decisions turned out to be missing from the contracts — decisions
 * nothing could check, because nothing mechanical was reading the contracts at
 * all. Two of the five (`onEnd`, `placeholder`) are pure type facts: this file
 * would have failed on both. That is the argument for it, stated as a fact
 * about what happened rather than as a principle.
 *
 * ## What it is not
 *
 * It is not an implementation and it is not lifecycle validation: contract 00
 * is explicit that typecheck cannot catch a lifecycle error, and A-1 is the
 * worked example — a *value* defect in the one branch this file's `n17`/`n18`
 * pin the shape of, which no type could have caught.
 *
 * **It restated the whole surface until Revision 2 closure**, because `src/`
 * was pre-revision while it was written, and the handoff booked the rewiring as
 * owed *"at Phase R"*. The drift that had already accumulated is the argument:
 * the fixture's own `FailureStage` was a union of **string literals** while the
 * shipped one is numeric constants, so a fixture whose central type was a
 * different *kind* of type could not have detected drift in anything naming it.
 *
 * **Three names were imported from inside the package rather than from an
 * entry, and that was the finding** (F-59, ledger §L-14). `LIFT_FLAT` is
 * required to *construct* a `BehaviorSpec`, `SETTLED_FAILED` to *discriminate*
 * a `SettlementInput`, and `AT_PROPOSAL`/`AT_CONSUMER` to derive D-66's
 * fallback stage; `kernel.js` published none of them — so the kernel tier was
 * not authorable from its own entry **in any style**, since a contextually
 * typed inline factory still cannot fill `liftMode`.
 *
 * **Closed by D-68** (00 §Revision 2.2, 02 §The kernel tier's public
 * vocabulary): all three ship from `kernel.js`, and this file imports **nothing
 * from `src/kernel/`** — which was the standing marker for that work and is now
 * the assertion. What it cannot assert is the *other* half of authorability:
 * an inline factory names almost none of the closure, so the out-of-line
 * fixture in `tests/consumer.node.test.ts` is what proves the type half.
 *
 * ## The rule that makes it evidence
 *
 * `tsc` errors on an **unused** `@ts-expect-error`, so a green
 * `npx just typecheck` from `packages/drag2` asserts both halves: the positive
 * shapes compile, and each negative one still does not.
 *
 * **Seventeen live `@ts-expect-error` directives across fifteen numbered assertions, and two withdrawn.** The three that fell — `n6`, `n12`, `n15` — are the file's most useful output: each was a contract claim that TypeScript does not actually enforce.
 *
 * `n12` was **repaired**, and the repair is a contract detail nobody would have
 * guessed: the callback slots must be **named type aliases**, because
 * method-shorthand is bivariant and this repo's `method-signature-style` lint
 * rule rewrites the property form back into shorthand on every `lint-fix`.
 *
 * `n6` and `n15` could **not** be repaired and are recorded as limitations
 * rather than quietly dropped — a zero-argument function is assignable to any
 * signature, and any return type is assignable to a `void` position. Each is annotated with the decision it
 * pins. A directive that stops failing is a contract regression, not a lint
 * complaint.
 *
 * **What the rewiring itself caught, stated because it is the return on A-4.**
 * Three restatements were wrong about the package they described, and none of
 * them could have been noticed while the fixture only checked itself:
 * `PreparedSettlement` was written as `Readonly<{ presentation: boolean }>` and
 * is the bare `true` sentinel D-41 left behind; `InsertionGeometry.resolve` was
 * written as `(view) => HTMLElement | null` and is
 * `(frame, runtime) => Insertion | null`; and `FailureStage` was a union of
 * string literals against a shipped union of numeric constants. An installer
 * written against the first two would not have compiled against the package it
 * claims to extend.
 *
 * ## The two assertions worth reading first
 *
 * `stageToCode` is a `Record<FailureStage, DraggableErrorCode>`. D-64 requires
 * that mapping to be **total in the type** rather than by convention, because
 * §Failure classification already has one mapping — stage to recovery — whose
 * gap D-60 had to be written to close. A `default:` arm would reproduce that
 * defect silently on the channel a consumer actually reads. Here, adding a
 * stage without a code is a compile error.
 *
 * `n17` and `n18` pin **D-66's carrier and its writing seam**. The decision's first draft named
 * `reportFailure`, which is admission-only by contract and cannot carry an
 * in-operation failure at all; the real carrier is `SettlementInput` with
 * `SETTLED_FAILED`, which already holds `{ stage, error }`. The assertion
 * proves what that input does *not* hold — a `CancelStage` — which is why the
 * fallback's cancellation stage is derived by the behavior — from a private
 * monotone marker advanced inside the `invoke` closure, never from
 * `proposal !== null`, which commits a seam too early. `n18` pins the other
 * half: `effect` receives a `Readonly` frame, so the fallback is `prepare`'s
 * write into the draft. Building it at the failure site is also why no frame
 * field is added and document 04's frame model is unchanged.
 *
 * `disposition` switches over `ReorderTransactionResult` with **no `default`**
 * and assigns the fall-through to `never`. That is F-37's defect made
 * unexpressible: the library used to route four arms into two callbacks with a
 * binary predicate, and D-62 replaced the predicate with a union the compiler
 * checks. D-66 then made the switch total over the failure path too.
 */

// **The shared root.** A class, therefore a runtime value both tiers name and
// neither owns.
import type { DraggableError, DraggableErrorCode } from '../../src/drag.ts';
// **The kernel tier, from its own entry** — all of it, since D-68. Three
// imports used to reach *inside* the package from here: `LIFT_FLAT` fills
// `BehaviorConfig.liftMode`, `SETTLED_FAILED` discriminates the input D-66
// travels on, and `AT_PROPOSAL`/`AT_CONSUMER` derive its fallback stage. None
// was on `kernel.js`, and every one is a **value** — which is F-59, and why a
// type-closure instrument could not see the hole.
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  LIFT_FLAT,
  SETTLED_FAILED,
  draggable,
  type CancelStage,
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type AdmissionSubject,
  type BehaviorSpec,
  type FailureStage,
  type KernelHost,
  type SettlementInput,
} from '../../src/kernel.ts';
// The middle tier (D-61).
import type { ReorderProposal } from '../../src/sortable/domain.ts';
import type {
  AxisInstaller,
  LandingStart,
  SortableContribution,
  SortableInstaller,
} from '../../src/sortable/feature.ts';
// The ordinary tier.
import { landing, type LandingOptions } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type AcceptedReorderResult,
  type CanceledReorderResult,
  type SortableErrorContext,
  type NoopReorderResult,
  type RejectedReorderResult,
  type ReorderTransactionResult,
  type SortableConfig,
  type SortableController,
} from '../../src/sortable.ts';

// ---------------------------------------------------------------------------
// drag.js — shared vocabulary (D-64)
// ---------------------------------------------------------------------------

/**
 * `DraggableError` and `DraggableErrorCode` are **imported** now. They were
 * restated here — the class as a `declare class`, the code as its four string
 * literals — which proved only that four literals can be written down twice.
 */

// ---------------------------------------------------------------------------
// kernel.js — the kernel tier (D-48, D-64)
// ---------------------------------------------------------------------------

/**
 * **Thirteen stages, not fourteen** — `FAILURE_PRESENTATION_READY` went with
 * the readiness protocol (D-41), and its number was deliberately not reused.
 * The union was restated here on the reasoning that *importing it would have
 * hidden the deletion*; the opposite turned out to be true. A restated union of
 * **string literals** could not see that the shipped one is numeric, so it
 * hid a far larger difference than the one it was guarding. Imported now, and
 * the count is asserted below rather than asserted about.
 */

/**
 * **D-64's totality requirement, as a type.** Every stage names a code; adding
 * a stage without one does not compile. This is the assertion that stops the
 * `default:` arm — see the file header.
 *
 * The split is **fault attribution**, which is the axis review 3 §12 chose and
 * the axis the stage names do not have: `admission`, `reorder-resolution` and
 * `terminal-callback` are consumer code failing, `scheduled-frame` and
 * `renderer-write` are not.
 */
const stageToCode: Readonly<Record<FailureStage, DraggableErrorCode>> = {
  [FAILURE_ADMISSION]: 'consumer',
  [FAILURE_ACTIVATION]: 'interaction',
  [FAILURE_RENDERER_WRITE]: 'presentation',
  [FAILURE_ACTION_PREPARE]: 'presentation',
  [FAILURE_ACTION_EFFECT]: 'presentation',
  [FAILURE_INVALIDATION]: 'platform',
  [FAILURE_SCHEDULED_FRAME]: 'platform',
  [FAILURE_RESOLUTION]: 'consumer',
  [FAILURE_RELEASE]: 'interaction',
  [FAILURE_LANDING_CREATE]: 'presentation',
  [FAILURE_LANDING_INTERRUPTED]: 'presentation',
  [FAILURE_LANDING_TARGET]: 'presentation',
  [FAILURE_TERMINAL_CALLBACK]: 'consumer',
};

/**
 * `KernelHost`, `AdmissionSubject`, `BehaviorFactory`, `SettlementInput`,
 * `PreparedSettlement`, `SeamRejection` and `BehaviorSpec` were all restated
 * here and are all **imported from `kernel.js`** now. The spec below is typed
 * as the shipped `BehaviorSpec`, so every seam signature it fills is checked
 * against the SPI rather than against a local sketch of it.
 */

/** The behavior's own frame part. `domain` has held the result since D-24. */
type SortableFramePart = {
  proposal: ReorderProposal | null;
  domain: ReorderTransactionResult | null;
};

/**
 * **D-66's two facts, in one behavior-private monotone marker.**
 *
 * `STARTED` is advanced **immediately before invoking `onStart`** — before,
 * not after, so a throw from `onStart` itself still owes a terminal. The
 * consumer has been told the drag began.
 *
 * `RESOLVING` is advanced as the first statement of the
 * `ResolutionCommand.invoke` closure, which the kernel runs *only* after
 * `release.effect` returns normally — so it marks the round-trip opening
 * exactly. Deriving it from `proposal !== null` instead is **false**: the
 * proposal commits one seam earlier, in `release.prepare`.
 */
const MINTED = 0;
const STARTED = 1;
const RESOLVING = 2;

type OperationProgress = typeof MINTED | typeof STARTED | typeof RESOLVING;

// ---------------------------------------------------------------------------
// sortable/feature.js — the middle tier (D-61)
// ---------------------------------------------------------------------------

/**
 * **The middle tier is imported whole** (D-61). `FeatureContext`,
 * `PlaceholderContext`, `PlaceholderFactory`, `InsertionGeometry`,
 * `DisplacementHook`, `SortableContribution`, `SortableInstaller` and the three
 * landing seam types D-63 re-homed all live on `sortable/feature.js`, and
 * `n14`'s stray-slot assertion now runs against the shipped contribution rather
 * than a local copy of it.
 */

// ---------------------------------------------------------------------------
// sortable.js — the ordinary tier
// ---------------------------------------------------------------------------

/**
 * **Also imported whole.** `SortableConfig` and every alias it names —
 * `ItemSource`, `OnReorder`, `OnStart`, `OnEnd`, `OnDragError`,
 * `ResolveHandle`, `ResolveElement` — ship from `sortable.js` for exactly the
 * reason `n12` exists (F-51), so the fixture asserts the *shipped* alias is
 * still an alias.
 *
 * `n12` is the row this rewiring most changes. It checked the fixture's local
 * `SortableConfig['onEnd']`, so a `lint-fix` that rewrote the shipped alias
 * back into method shorthand would have left it passing. It now reads
 * `src/sortable/config.ts` and would fail.
 */

// ---------------------------------------------------------------------------
// sortable/landing.js (D-63, D-67)
// ---------------------------------------------------------------------------

/**
 * `landing`, `LandingOptions`, `LandingTimingContext` and `LandingDuration` are
 * the shipped ones. D-63's `run` is absent from the shipped type, which is what
 * makes `n5` an assertion about the implementation rather than about this file.
 */

// ---------------------------------------------------------------------------
// Positive shapes
// ---------------------------------------------------------------------------

declare const root: HTMLElement;
declare const rows: readonly HTMLElement[];
/** Behavior-private, per-operation, cleared in `retire()`. Not frame state. */
declare let progress: OperationProgress;

/**
 * **D-62 / D-66 — the terminal is one exhaustive switch with no `default`.**
 *
 * The `never` assignment is the proof: if an arm is added to
 * `ReorderTransactionResult` and not handled here, `rest` stops being `never`
 * and this stops compiling. F-37's binary predicate cannot be written against
 * this shape at all.
 */
function disposition(result: ReorderTransactionResult): string {
  switch (result.type) {
    case 'accepted': {
      const r: AcceptedReorderResult = result;
      return `accepted ${r.proposal.request.from}→${r.proposal.request.to}`;
    }
    case 'noop': {
      const r: NoopReorderResult = result;
      return `noop ${String(r.proposal.snapshot.version)}`;
    }
    case 'rejected': {
      const r: RejectedReorderResult = result;
      return `rejected ${String(r.reason)}`;
    }
    case 'canceled': {
      // D-66 — the failure path arrives here, carrying the classifying error
      // as `reason`. `proposal` is null when the operation was abandoned
      // before one existed, which is the same shape a user cancel produces.
      const r: CanceledReorderResult = result;
      const stage: CancelStage = r.stage;
      return `canceled@${stage === AT_PROPOSAL ? 'proposal' : 'consumer'} ${String(
        r.reason,
      )}`;
    }
    default: {
      const rest: never = result;
      return rest;
    }
  }
}

/** D-64 — the consumer branches on a fault class, never on a stage. */
function report(error: DraggableError, context: SortableErrorContext): string {
  const mine = error.code === 'consumer';
  // D-60 / D-66 — both channels can fire for one operation, so the domain
  // result is still present here and must not be read as absent.
  return `${mine ? 'mine' : 'theirs'}:${context.domain?.type ?? 'none'}`;
}

/**
 * D-61 — a middle-tier installer, authored outside the package **against the
 * shipped `SortableInstaller`**.
 *
 * The restated version of this fixture had `resolve(view) => HTMLElement`. The
 * real seam is `resolve(frame, runtime) => Insertion | null`, and the rewiring
 * is what surfaced that: an installer written against the old sketch does not
 * compile against the package it claims to extend.
 */
const installMyAxis: AxisInstaller = (ctx) => {
  const cache = new Map<HTMLElement, DOMRectReadOnly>();

  return {
    insertion: {
      resolve: (frame) => frame.insertion,
      invalidate: () => cache.clear(),
      retire: () => cache.clear(),
    },
    retire: () => {
      cache.clear();
      ctx.report(undefined);
    },
  } satisfies SortableContribution;
};

/**
 * D-77 — a **plugin-shaped** installer, whose contribution declares no
 * `insertion`. It fills `plugins` and `landing`, and the negative assertion
 * below is that it cannot fill `axis`.
 */
const installMyPlugin: SortableInstaller = (ctx) => ({
  retire: () => ctx.report(undefined),
});

/** D-45 — a helper may return several slots and a consumer may take one. */
function weirdThing(): Pick<SortableConfig, 'axis' | 'landing'> {
  return { axis: installMyAxis, landing: installMyPlugin };
}

const controller: SortableController = sortable(
  root,
  {
    items: () => rows,
    onReorder: () => ReorderResolution.accept(),
    // **D-77 — the axis is a slot in the required first argument**, and `y()`
    // is the installer itself rather than a one-key fragment.
    axis: y(),
    onStart: (item) => item.setAttribute('data-dragging', ''),
    onEnd: (result) => globalThis.console.log(disposition(result)),
    onError: (error, context) =>
      globalThis.console.warn(report(error, context)),
    placeholder: ({ box }) => box.ownerDocument.createElement('li'),
    box: (item) => item,
    threshold: 8,
  },
  // D-67 — contextual duration, resolved once per landing at settlement.
  landing({ duration: ({ distance }) => Math.min(400, 80 + distance) }),
  layoutAnimation(),
  { axis: weirdThing().axis },
);

// ---------------------------------------------------------------------------
// D-77 — the required first argument, asserted negatively (B-9 (a)).
//
// Without these the parameter could quietly become optional again and every
// positive fixture above would keep compiling.
// ---------------------------------------------------------------------------

// @ts-expect-error — the config argument is required, not variadic.
sortable(root);

// @ts-expect-error — `items`, `onReorder` and `axis` are all missing.
sortable(root, {});

sortable(root, {
  items: () => rows,
  onReorder: () => ReorderResolution.accept(),
  // @ts-expect-error — a plugin-shaped installer contributes no insertion
  // geometry, which is what replaced the assembler's construction-time check.
  axis: installMyPlugin,
});

// @ts-expect-error — a complete config minus the axis is still incomplete.
sortable(root, {
  items: () => rows,
  onReorder: () => ReorderResolution.accept(),
  threshold: 8,
});

// @ts-expect-error — a later fragment is `Partial` and cannot stand in for the
// required first argument, which is the cost D-77 accepts by name: a preset
// carrying a required slot must be spread into that first argument instead.
sortable(root, { axis: y() }, { items: () => rows });

/**
 * **B-9 (b) — the two axis modules, both asserted here** (P18A-14). The clause
 * says `y()`/`xy()` are asserted to return the **installer** rather than a
 * one-key fragment; the fixture named only `y()`, and `xy()`'s pin lived in a
 * browser test as an assignability side effect. Both are hoisted into a typed
 * `const` — which is also what makes them evidence for D-78's published alias —
 * and both are filled into the slot.
 *
 * The **fixed** landing form is here for the same reason: B-9 (b) names
 * `landing({ duration: 200 })` and the composition above uses the contextual
 * one, so the clause described a form the fixture did not carry.
 */
const yAxis: AxisInstaller = y();
const xyAxis: AxisInstaller = xy();

sortable(
  root,
  {
    items: () => rows,
    onReorder: () => ReorderResolution.accept(),
    axis: yAxis,
  },
  landing({ duration: 200 }),
);
sortable(root, {
  items: () => rows,
  onReorder: () => ReorderResolution.accept(),
  axis: xyAxis,
});

/**
 * The **positive** half of the same rule (B-9 (c)), stated at the type level:
 * a later fragment carrying `axis: undefined` is a legal `Partial` value, so
 * nothing but the merge's `undefined` skip keeps it from clearing a required
 * slot. The runtime assertion lives in `tests/sortable/options.node.test.ts`,
 * and — since P18A-15 — through the public entry in
 * `tests/sortable/composition.browser.test.ts`.
 */
sortable(
  root,
  { items: () => rows, onReorder: () => ReorderResolution.accept(), axis: y() },
  { axis: undefined },
);

void controller.destroy();
controller.invalidate();

/**
 * **D-48 / D-47 — the kernel tier, authored from its own entry.**
 *
 * Typed as the shipped `BehaviorSpec<SortableFramePart>`, so this is the first
 * executable evidence that a third party can write a behavior at all: every
 * seam below is contextually typed from the SPI, and a signature drifting in
 * `src/kernel/spec.ts` breaks this file.
 *
 * **Everything it needs is on `kernel.js`** since D-68, including the three
 * values that reached inside the package from here until the vocabulary pass.
 * Note what the seams below still do *not* name — `Frame`, `Draft` and
 * `Transition` never appear, because an inline factory is contextually typed
 * throughout. That is why this file cannot be the acceptance case for the
 * vocabulary: it would have compiled against the pre-D-68 *type* surface too.
 * The row that discharges it is `tests/consumer.node.test.ts`'s kernel-tier
 * fixture, which declares every seam **out of line**, against the packed
 * declarations, importing `kernel.js` and `drag.js` and nothing else.
 */
const kernelSide: SortableController = draggable<
  SortableController,
  SortableFramePart,
  HTMLElement
>(root, (host) => {
  // **`HTMLElement` is written out, and D-34 is why it can be** (K-1). The
  // staged activation type is the behavior's choice now; this one stages an
  // element, so it says so. Omitting the argument here would not be shorter by
  // accident — it would declare a behavior that stages nothing, and the
  // `return root` below would stop compiling.
  const spec: BehaviorSpec<SortableFramePart, HTMLElement> = {
    // D-59 — either form is admissible.
    admit: (event, _draft) =>
      event.target instanceof HTMLElement
        ? { visual: event.target, box: event.target.parentElement ?? root }
        : null,
    // Admission-only (see the member's doc), **and D-49 gave it a second
    // caller**: a landing measurement that fails on a reorder that already
    // committed reports here too, without replacing a settlement.
    reportFailure: (stage, error) => {
      globalThis.console.warn(stageToCode[stage], error);
    },

    activation: {
      prepare: (draft) => {
        // `draft` is `Draft<SortableFramePart>` — this behavior's own part plus
        // a readonly kernel slice. It cannot see the *sortable's* fields, which
        // is D-15 holding in the one place an author would notice.
        void draft.phase;
        return root;
      },
      effect: () => {},
    },

    release: {
      prepare: (draft) => {
        draft.proposal = null;
        return { invoke: null };
      },
      effect: () => {},
    },

    // **D-66's actual mechanism.** `prepare` writes the draft and returns the
    // sentinel; there is no other seam that may write frame state. The
    // fallback is built here, at the failure site, into the `domain` field the
    // part already has — which is why no frame field is added and 04's frame
    // model is unchanged.
    settlement: {
      prepare: (draft, input) => {
        if (input.type !== SETTLED_FAILED) {
          return true;
        }
        // Q-15 — no start, no terminal. The owner's guarantee is an
        // implication over *started* operations; declining here is what keeps
        // D-66 from silently making it a biconditional.
        if (progress === MINTED) {
          return true;
        }
        // **Existing result wins; `??=` is the whole of that rule** — and A-1
        // is what it cost to write this line as `=` in `src/`. A stage test
        // cannot stand in for it: `FAILURE_LANDING_INTERRUPTED` can only fire
        // after a runner was armed, which is after the settlement committed.
        draft.domain ??= {
          type: 'canceled',
          reason: input.error,
          // Derived, never supplied: the input carries a `FailureStage`, and
          // the kernel hands out a `CancelStage` only for `SETTLED_CANCELED`.
          stage: progress === RESOLVING ? AT_CONSUMER : AT_PROPOSAL,
          proposal: draft.proposal,
        };
        return true;
      },
      // `current` is `Readonly` — this seam cannot write frame state, which is
      // exactly why the write above is `prepare`'s.
      effect: (current) => {
        void current.domain;
      },
    },

    action: {
      prepare: () => null,
      effect: () => {},
    },

    moved: () => {},
    anchorTarget: () => ({ x: 0, y: 0 }),

    // D-53 — liveness is read from the latch, never from a disposed resource.
    // D-66 — one lookup, no branch per stage: by the time this runs, the
    // fallback has already been written into the same field a successful drop
    // writes.
    finalized: (current) => {
      if (!host.closed && current.domain !== null) {
        globalThis.console.log(disposition(current.domain));
      }
    },

    retire: () => {},
    createFramePart: () => ({ proposal: null, domain: null }),
    resetFramePart: (part) => {
      part.proposal = null;
      part.domain = null;
    },
    config: { threshold: 8, liftMode: LIFT_FLAT, actionTags: 0 },
  };

  return {
    spec,
    controller: {
      invalidate: () => {},
      cancel: () => {},
      destroy: () => Promise.resolve(),
    },
  };
});

void kernelSide;

// ---------------------------------------------------------------------------
// Negative assertions. Each pins one decision.
// ---------------------------------------------------------------------------

declare const cfg: SortableConfig;

// n1 / n2 — D-62: the two-callback surface is gone.
// @ts-expect-error onFinish is not a config key (D-62)
void cfg.onFinish;
// @ts-expect-error onCancel is not a config key (D-62)
void cfg.onCancel;

// n3 / n4 — D-65: one slot, not two flat keys.
// @ts-expect-error createPlaceholder is not a config key (D-65)
void cfg.createPlaceholder;
// @ts-expect-error placeholderClassName is not a config key (D-65)
void cfg.placeholderClassName;

// n5 — D-63: no consumer-supplied runner at the ordinary tier.
declare const runner: LandingStart;
// @ts-expect-error `run` is not a landing option (D-63)
landing({ run: runner });

// n6 — **withdrawn, and the withdrawal is the finding.** The assertion here
// was `landing({ duration: () => 200 })` must not compile. It does compile, and
// no type can stop it: TypeScript assigns a zero-parameter function to any
// signature, so a consumer's shipped `() => 200` keeps working against
// `(context) => number` and silently ignores the argument.
//
// D-67 therefore **cannot** be enforced as a compile error, and the contract
// said it could until this file was written. Two consequences, both recorded
// in 03 §Public option domains: the migration is **source-compatible**, which
// is a genuine benefit nobody had claimed; and the only way to *require* the
// context is a runtime arity check, which is not worth its cost for an option
// whose zero-argument form still behaves correctly.
const legacyThunk: LandingOptions['duration'] = () => 200;
void legacyThunk;

// n7 — D-64: the consumer never receives a pipeline stage.
declare const errContext: SortableErrorContext;
// @ts-expect-error SortableErrorContext carries no stage (D-64)
void errContext.stage;

// n8 — D-64: the code is a fault class, not a stage.
declare const err: DraggableError;
// @ts-expect-error a FailureStage is not a DraggableErrorCode (D-64)
const wrongCode: DraggableErrorCode = err.code satisfies FailureStage;
void wrongCode;

// n9 / n10 — D-41 and D-44: the controller lost two members and gained one.
// @ts-expect-error `ready` is deleted with the readiness protocol (D-41)
void controller.ready;
// @ts-expect-error `updateItems` is replaced by items() + invalidate() (D-44)
void controller.updateItems;

// n11 — D-41: acceptance declares nothing, because there is nothing to declare.
// @ts-expect-error accept() takes no argument (D-41)
ReorderResolution.accept({ presentation: true });

// n12 — D-62: a handler narrowed to the old "finish" partition cannot be an
// `onEnd`. This is F-37's defect at the type level: the split that produced it
// is no longer expressible against the config.
declare const onFinishOnly: (
  result: AcceptedReorderResult | NoopReorderResult,
) => void;
// @ts-expect-error onEnd receives all four arms (D-62)
const partial: SortableConfig['onEnd'] = onFinishOnly;
void partial;

// n13 — D-59: the pair is a pair. A box without a visual has no meaning, and
// an optional `box` was rejected precisely to keep one encoding.
declare const el: HTMLElement;
// @ts-expect-error the admission pair requires `visual` (D-59)
const boxOnly: AdmissionSubject = { box: el };
void boxOnly;

// n14 — D-61: the middle tier publishes the contribution, and it is still a
// closed set of named seams. Filling an existing seam is supported; adding one
// is the package's alone.
// @ts-expect-error `whenever` is not a contribution slot (D-61)
const strayContribution: SortableContribution = { whenever: () => {} };
void strayContribution;

// n15 — **withdrawn, and this one has teeth.** The assertion was that
// `controller.destroy` cannot be used where `() => void` is expected. It can:
// TypeScript assigns *any* return type to a `void` return position, by design,
// so `Promise<void>` flows into a void-returning slot with no complaint.
//
// This is exactly the shape of the 46 floating-promise sites the handoff
// records, and it establishes which instrument owns them: **the lint rule, not
// the compiler.** `no-floating-promises` is load-bearing for D-36 rather than
// stylistic, and a repo that disabled it would lose the only check there is.
// Proved at the type level so this file stays lint-clean, and the lint half is
// recorded rather than demonstrated: with the assignment written out, `tsc`
// reports nothing and **two** lint rules fire — oxlint's
// `typescript/no-misused-promises` and eslint's
// `@typescript-eslint/strict-void-return`. Verified 2026-08-13.
type PromiseFlowsIntoVoid = (() => Promise<void>) extends () => void
  ? true
  : false;
const destroyIsSilentlyVoidable: PromiseFlowsIntoVoid = true;
void destroyIsSilentlyVoidable;

// n17 — D-66: `SETTLED_FAILED` carries a `FailureStage` and **no**
// `CancelStage`. That is what makes the fallback's cancellation stage the
// behavior's to derive rather than the kernel's to supply — widening this
// input would have been an SPI change for information the behavior already
// holds, since it is what published the request.
declare const failedInput: Extract<
  SettlementInput,
  { type: typeof SETTLED_FAILED }
>;
// @ts-expect-error SETTLED_FAILED carries no CancelStage (D-66)
void failedInput.stage satisfies CancelStage;

// n18 — D-66: `settlement.effect` cannot write frame state, which is why the
// fallback is `prepare`'s write and not `effect`'s. An earlier draft of this
// decision said the behavior "publishes it in `effect`"; this is why that was
// unimplementable rather than merely imprecise.
// The frame the **shipped** seam hands `effect`, extracted rather than
// restated: `Frame` is not exported (§L-14), and `Parameters` reaches it
// without naming it — which is also how the seams above avoid naming it.
declare const settledFrame: Parameters<
  BehaviorSpec<SortableFramePart>['settlement']['effect']
>[0];
// @ts-expect-error the committed frame is readonly in `effect` (D-3, D-66)
settledFrame.domain = null;

// n16 — D-53: the liveness reader is readonly. A behavior may consult the
// latch; it may not set it, which is what keeps closure the kernel's to decide.
declare const host: KernelHost;
// @ts-expect-error `closed` is readonly (D-53)
host.closed = true;

export type { DraggableError, DraggableErrorCode, SortableConfig };
export { AT_CONSUMER, stageToCode };
