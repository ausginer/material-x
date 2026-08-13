/**
 * **Revision 2 fixture — does the redesigned consumer surface compile as one
 * system?**
 *
 * The `phase-14.ts` treatment applied to **D-36…D-67**. Everything Revision 2
 * and Revision 2.1 changed is **restated here**; everything they left alone is
 * imported from `../../src/` so the two halves cannot silently drift apart.
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
 * It is not an implementation and it is not lifecycle validation. `src/` still
 * implements the **pre-revision** surface; nothing here is wired to it, and the
 * imports below are deliberately confined to types the revision does not
 * touch. Contract 00 is explicit that typecheck cannot catch a lifecycle error.
 *
 * ## The rule that makes it evidence
 *
 * `tsc` errors on an **unused** `@ts-expect-error`, so a green
 * `npx just typecheck` from `packages/drag2` asserts both halves: the positive
 * shapes compile, and each negative one still does not.
 *
 * **Fifteen live negative assertions across sixteen directives, and two withdrawn.** The three that fell — `n6`, `n12`, `n15` — are the file's most useful output: each was a contract claim that TypeScript does not actually enforce.
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
 * ## The two assertions worth reading first
 *
 * `stageToCode` is a `Record<FailureStage, DraggableErrorCode>`. D-64 requires
 * that mapping to be **total in the type** rather than by convention, because
 * §Failure classification already has one mapping — stage to recovery — whose
 * gap D-60 had to be written to close. A `default:` arm would reproduce that
 * defect silently on the channel a consumer actually reads. Here, adding a
 * stage without a code is a compile error.
 *
 * `n17` pins **D-66's carrier**. The decision's first draft named
 * `reportFailure`, which is admission-only by contract and cannot carry an
 * in-operation failure at all; the real carrier is `SettlementInput` with
 * `SETTLED_FAILED`, which already holds `{ stage, error }`. The assertion
 * proves what that input does *not* hold — a `CancelStage` — which is why the
 * fallback's cancellation stage is derived by the behavior. The kernel-side
 * `settlement.prepare` below builds the fallback at the failure site, which is
 * also why no frame field is added and document 04 is untouched.
 *
 * `disposition` switches over `ReorderTransactionResult` with **no `default`**
 * and assigns the fall-through to `never`. That is F-37's defect made
 * unexpressible: the library used to route four arms into two callbacks with a
 * binary predicate, and D-62 replaced the predicate with a union the compiler
 * checks. D-66 then made the switch total over the failure path too.
 */

import {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from '../../src/kernel/failures.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';
import type { Point } from '../../src/kernel/types.ts';
import type {
  AcceptedReorderResult,
  CanceledReorderResult,
  NoopReorderResult,
  RejectedReorderResult,
  ReorderProposal,
  ReorderRequest,
  ReorderTransactionResult,
} from '../../src/sortable/domain.ts';

// ---------------------------------------------------------------------------
// drag.js — shared vocabulary (D-64)
// ---------------------------------------------------------------------------

/**
 * The coarse consumer-facing fault classes. Names are **not frozen** (review 3
 * §12); the axis is — a code names an actionable fault class, never an
 * internal pipeline seam.
 */
type DraggableErrorCode =
  | 'consumer'
  | 'interaction'
  | 'presentation'
  | 'platform';

/**
 * A class, therefore a runtime value. `cause` is the native ES2022 property and
 * is deliberately not redeclared.
 *
 * Whether this needs its own entry root is **measured, not argued**:
 * `.plan/measurements/error-identity.md` shows a module reachable from two
 * entries is emitted once in both build modes, so cross-entry `instanceof`
 * holds however many entries re-export it.
 */
declare class DraggableError extends Error {
  readonly code: DraggableErrorCode;
}

// ---------------------------------------------------------------------------
// kernel.js — the kernel tier (D-48, D-64)
// ---------------------------------------------------------------------------

/**
 * Thirteen stages, not fourteen: `FAILURE_PRESENTATION_READY` goes with the
 * readiness protocol (D-41). Restated rather than imported precisely because
 * the count changed — importing it would have hidden the deletion.
 */
type FailureStage =
  | 'admission'
  | 'activation'
  | 'renderer-write'
  | 'insertion'
  | 'placeholder-move'
  | 'invalidation'
  | 'scheduled-frame'
  | 'reorder-resolution'
  | 'release'
  | 'landing-create'
  | 'landing-interrupted'
  | 'landing-target'
  | 'terminal-callback';

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
  admission: 'consumer',
  activation: 'interaction',
  'renderer-write': 'presentation',
  insertion: 'presentation',
  'placeholder-move': 'presentation',
  invalidation: 'platform',
  'scheduled-frame': 'platform',
  'reorder-resolution': 'consumer',
  release: 'interaction',
  'landing-create': 'presentation',
  'landing-interrupted': 'presentation',
  'landing-target': 'presentation',
  'terminal-callback': 'consumer',
};

/** D-53 — the sanctioned logical-liveness reading, and the only one. */
type KernelHost = Readonly<{
  readonly closed: boolean;
  realm: DOMRealm;
  root: HTMLElement;
  fail(stage: FailureStage, error: unknown): void;
}>;

/**
 * D-59 — `admit` returns the element to lift, optionally paired with a box
 * element. Discriminated by `'visual' in subject`, never `instanceof`, because
 * `DOMRealm` exists precisely because an element may come from another
 * document.
 */
type AdmissionSubject =
  | HTMLElement
  | Readonly<{
      visual: HTMLElement;
      box: HTMLElement;
    }>
  | null;

type BehaviorFactory<Controller> = (host: KernelHost) => Readonly<{
  spec: BehaviorSpecShape;
  controller: Controller;
}>;

/**
 * D-24 / F-33 — the five settlement cases, all of which return to the behavior
 * because `outcome`, `recovery` and `domain` are fields of the behavior's part
 * that the kernel cannot name or write.
 *
 * **`SETTLED_FAILED` is D-66's carrier**, and the reason is visible in the
 * shape: it is the only in-operation input that carries the classifying
 * `error`, and the failure checkpoint routes every classified failure of a
 * live operation through this seam to deliver it. Note what it does **not**
 * carry — a `CancelStage`. That is `n17`.
 */
type SettlementInput =
  | Readonly<{ type: 'fulfilled'; value: unknown }>
  | Readonly<{ type: 'rejected'; error: unknown }>
  | Readonly<{ type: 'skipped' }>
  | Readonly<{ type: 'canceled'; reason: unknown; stage: CancelStage }>
  | Readonly<{ type: 'failed'; stage: FailureStage; error: unknown }>;

/** The behavior's own frame part. `domain` has held the result since D-24. */
type SortableFramePart = {
  proposal: ReorderProposal | null;
  domain: ReorderTransactionResult | null;
};

/** Only the members this fixture exercises; the full SPI lives in `src/`. */
type BehaviorSpecShape = Readonly<{
  admit(event: PointerEvent, draft: object): AdmissionSubject;
  /**
   * **Admission-only, and D-66 does not use it.** Its contract is _a failure
   * with no operation to settle_ — `admit` threw, identity was never minted,
   * there is no checkpoint to queue. An early draft of D-66 named this member
   * as the carrier for in-operation failures, which it cannot be by
   * construction. `SettlementInput` is the carrier.
   */
  reportFailure(stage: FailureStage, error: unknown): void;
  settlement: Readonly<{
    prepare(
      draft: SortableFramePart,
      input: SettlementInput,
    ): SortableFramePart;
  }>;
  finalized(current: Readonly<SortableFramePart>): void;
}>;

declare function draggable<Controller>(
  root: HTMLElement,
  behavior: BehaviorFactory<Controller>,
): Controller;

// ---------------------------------------------------------------------------
// sortable/feature.js — the middle tier (D-61)
// ---------------------------------------------------------------------------

type FeatureContext = Readonly<{
  realm: DOMRealm;
  root: HTMLElement;
  report(error: unknown): void;
}>;

type PlaceholderContext = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  /** D-43 — the geometry source, which is not always the visual. */
  box: HTMLElement;
  rect: DOMRectReadOnly;
}>;

type PlaceholderFactory = (context: PlaceholderContext) => HTMLElement;

type InsertionView = Readonly<{ pointer: Point; item: HTMLElement }>;

type InsertionGeometry = Readonly<{
  resolve(view: InsertionView): HTMLElement | null;
  invalidate(): void;
  retire(): void;
}>;

type DisplacementHook = (view: InsertionView) => void;

type LandingContext = Readonly<{
  realm: DOMRealm;
  from: Point;
  target: Point;
}>;

type LandingHandle = Readonly<{ destroy(): void }>;

type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

/**
 * D-65 — the contribution slot is spelled `placeholder`, as the config slot is.
 * Two names for one factory would be a puzzle rather than a distinction now
 * that a middle-tier author reads both.
 */
type SortableContribution = Readonly<{
  insertion?: InsertionGeometry;
  placeholder?: PlaceholderFactory;
  startLanding?: LandingStart;
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  retire?(): void;
}>;

type SortableInstaller = (context: FeatureContext) => SortableContribution;

// ---------------------------------------------------------------------------
// sortable.js — the ordinary tier
// ---------------------------------------------------------------------------

type OnReorder = (
  request: ReorderRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => ReorderResolution | PromiseLike<ReorderResolution>;

type AcceptedReorderResolution = Readonly<{ type: 'accepted' }>;
type RejectedReorderResolution = Readonly<{
  type: 'rejected';
  reason: unknown;
}>;
type ReorderResolution = AcceptedReorderResolution | RejectedReorderResolution;

/** D-41 — both factories lose their options argument with the protocol. */
declare const ReorderResolution: Readonly<{
  accept(): AcceptedReorderResolution;
  reject(reason?: unknown): RejectedReorderResolution;
}>;

/** D-64 — `stage` is gone; `domain` is the sortable half and stays. */
type DragErrorContext = Readonly<{
  domain: ReorderTransactionResult | null;
}>;

/**
 * **The callback slots are named aliases, and `n12` is why.**
 *
 * D-62's claim is that the compiler checks the consumer's exhaustiveness over
 * the four arms. That claim survives only if the slot is **contravariant** in
 * its parameter — and a method-shorthand declaration, `onEnd?(r: R): void`, is
 * checked **bivariantly** even under `strict`, so it silently accepts a handler
 * narrowed to two arms.
 *
 * Writing the property form inline does not survive contact with this repo:
 * `@typescript-eslint/method-signature-style` is configured to `method`, and
 * `just lint-fix` rewrites `onEnd?: (r: R) => void` back into the shorthand.
 * The variance property would therefore be destroyed by the next person to
 * format the file — which is not a rule anyone can be asked to remember.
 *
 * A **named alias** is immune: the rule normalises inline function-type
 * literals and leaves type references alone. So the aliases below are not
 * stylistic. They are what makes D-62 checkable, and `n12` is the test that
 * they still are.
 */
type OnStart = (item: HTMLElement) => void;
type OnEnd = (result: ReorderTransactionResult) => void;
type OnDragError = (error: DraggableError, context: DragErrorContext) => void;
type ResolveHandle = (item: HTMLElement) => HTMLElement | null;
type ResolveElement = (item: HTMLElement) => HTMLElement;
type ItemSource = () => readonly HTMLElement[];

type SortableConfig = Readonly<{
  items: ItemSource;
  onReorder: OnReorder;
  axis: SortableInstaller;

  onStart?: OnStart;
  /** D-62 — one terminal, four arms, and the arms are the existing union. */
  onEnd?: OnEnd;
  onError?: OnDragError;
  handle?: ResolveHandle;
  visual?: ResolveElement;
  box?: ResolveElement;
  /** D-65 — the callback itself, not `createPlaceholder` + a class name. */
  placeholder?: PlaceholderFactory;

  landing?: SortableInstaller;
  plugins?: readonly SortableInstaller[];
  threshold?: number;
}>;

type SortableController = Readonly<{
  invalidate(): void;
  cancel(reason?: unknown): void;
  /** D-36 — logical close is immediate; the promise settles after teardown. */
  destroy(): Promise<void>;
}>;

declare function sortable(
  root: HTMLElement,
  ...fragments: ReadonlyArray<Partial<SortableConfig>>
): SortableController;

// ---------------------------------------------------------------------------
// sortable/landing.js (D-63, D-67)
// ---------------------------------------------------------------------------

/** D-67 — the contextual form. The zero-argument thunk is `n6`. */
type LandingTimingContext = Readonly<{
  from: Point;
  to: Point;
  distance: number;
}>;

/** D-63 — no `run`. The library owns the animation at this tier. */
type LandingOptions = Readonly<{
  duration?: number | ((context: LandingTimingContext) => number);
  easing?: string;
}>;

declare function y(): Pick<SortableConfig, 'axis'>;
declare function landing(
  options?: LandingOptions,
): Pick<SortableConfig, 'landing'>;
declare function layoutAnimation(): Pick<SortableConfig, 'plugins'>;

// ---------------------------------------------------------------------------
// Positive shapes
// ---------------------------------------------------------------------------

declare const root: HTMLElement;
declare const rows: readonly HTMLElement[];

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
function report(error: DraggableError, context: DragErrorContext): string {
  const mine = error.code === 'consumer';
  // D-60 / D-66 — both channels can fire for one operation, so the domain
  // result is still present here and must not be read as absent.
  return `${mine ? 'mine' : 'theirs'}:${context.domain?.type ?? 'none'}`;
}

/** D-61 — a middle-tier installer, authored outside the package. */
const installMyAxis: SortableInstaller = (ctx) => {
  const cache = new Map<HTMLElement, DOMRectReadOnly>();

  return {
    insertion: {
      resolve: (view) => view.item,
      invalidate: () => cache.clear(),
      retire: () => cache.clear(),
    },
    retire: () => {
      cache.clear();
      ctx.report(undefined);
    },
  };
};

/** D-45 — a helper may return several slots and a consumer may take one. */
function weirdThing(): Pick<SortableConfig, 'axis' | 'landing'> {
  return { axis: installMyAxis, landing: installMyAxis };
}

const controller: SortableController = sortable(
  root,
  {
    items: () => rows,
    onReorder: () => ReorderResolution.accept(),
    onStart: (item) => item.setAttribute('data-dragging', ''),
    onEnd: (result) => globalThis.console.log(disposition(result)),
    onError: (error, context) =>
      globalThis.console.warn(report(error, context)),
    placeholder: ({ box }) => box.ownerDocument.createElement('li'),
    box: (item) => item,
    threshold: 8,
  },
  y(),
  // D-67 — contextual duration, resolved once per landing at settlement.
  landing({ duration: ({ distance }) => Math.min(400, 80 + distance) }),
  layoutAnimation(),
  { axis: weirdThing().axis },
);

void controller.destroy();
controller.invalidate();

/** D-48 / D-47 — the kernel tier keeps the two-phase handshake. */
const kernelSide: SortableController = draggable(root, (host) => ({
  spec: {
    // D-59 — either form is admissible.
    admit: (event, _draft) =>
      event.target instanceof HTMLElement
        ? { visual: event.target, box: event.target.parentElement ?? root }
        : null,
    // Admission-only (see the member's doc). Present so the fixture models the
    // real spec, not because D-66 uses it.
    reportFailure: (stage, error) =>
      globalThis.console.warn(stageToCode[stage], error),

    // **D-66's actual mechanism.** The fallback is built here, at the failure
    // site, and written into the `domain` field the part already has — which
    // is why no frame field is added and document 04 is untouched. Storing the
    // raw error for `finalized` to read later is what would have needed one.
    settlement: {
      prepare: (draft, input) => {
        if (input.type === 'failed' && draft.domain === null) {
          return {
            ...draft,
            domain: {
              type: 'canceled',
              reason: input.error,
              // Derived, never supplied: `SETTLED_FAILED` carries a
              // `FailureStage`, and the kernel hands out a `CancelStage` only
              // for `SETTLED_CANCELED`. `AT_CONSUMER` when a published request
              // is unresolved, `AT_PROPOSAL` otherwise — total over the
              // fallback's domain, because the fallback fires only when no
              // resolution completed.
              stage: draft.proposal === null ? AT_PROPOSAL : AT_CONSUMER,
              proposal: draft.proposal,
            },
          };
        }
        // "Existing result wins" — every other input leaves `domain` alone.
        return draft;
      },
    },

    // D-53 — liveness is read from the latch, never from a disposed resource.
    // D-66 — one lookup, no branch per stage: by the time this runs, the
    // fallback has already been written into the same field a successful drop
    // writes.
    finalized: (current) => {
      if (!host.closed && current.domain !== null) {
        globalThis.console.log(disposition(current.domain));
      }
    },
  },
  controller: {
    invalidate: () => {},
    cancel: () => {},
    destroy: () => Promise.resolve(),
  },
}));

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
declare const errContext: DragErrorContext;
// @ts-expect-error DragErrorContext carries no stage (D-64)
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
declare const failedInput: Extract<SettlementInput, { type: 'failed' }>;
// @ts-expect-error SETTLED_FAILED carries no CancelStage (D-66)
void failedInput.stage satisfies CancelStage;

// n16 — D-53: the liveness reader is readonly. A behavior may consult the
// latch; it may not set it, which is what keeps closure the kernel's to decide.
declare const host: KernelHost;
// @ts-expect-error `closed` is readonly (D-53)
host.closed = true;

export type { DraggableError, DraggableErrorCode, SortableConfig };
export { AT_CONSUMER, stageToCode };
