# Execution boundary report

**Input:** `drag/production` at `2a07fd296`, which carries `DRD-32` and `DRO-9`. The source base is the owner's `8943f14e5`, unchanged at `2a07fd296`. **Governing records:** `DRD-32` §Implementation and `DRO-9` in [`00-index.md`](00-index.md), the [assessment](execution-boundary-assessment.md) §3, §4 and §7, and the prototype's [`kernel-v3.diff.txt`](probes/execution-boundary/kernel-v3.diff.txt).

**Outcome:** `DRD-32` landed in one commit, with no test edited. The suite passes in Chromium, Firefox and WebKit, and so does the per-sample test. Each of the four mutations makes its witness fail. **Every row is inside `DRO-9`'s approved figures.** The largest Brotli change is +20 B, and nothing is allocated per sample. No ceiling is re-based, and no timing was taken.

| Commit | Content |
| --- | --- |
| `a8327a7c8` | `DRD-32` in `src/kernel/gesture.ts` and `src/kernel/session.ts` |
| the commit carrying this report | This report, [`2026-11-08-execution-boundary.txt`](measurements/2026-11-08-execution-boundary.txt) and the status rows in `00-index.md` |

Raw output for every run below is in [`2026-11-08-execution-boundary.txt`](measurements/2026-11-08-execution-boundary.txt).

## The port onto `8943f14e5`

v3's diff applied to `session.ts` unchanged, because `8943f14e5` doesn't touch that file. In `gesture.ts`, a three-way apply conflicted only where `8943f14e5` had already made `Gesture` the root's listener object. **The owner's refactoring is kept:**

- **The field order.** `#steps` stays above `#session` and `#running`.
- **`handleEvent(event: KeyboardEvent | PointerEvent)`** stays where the owner put it, after `enter`, with the owner's parameter type. Its body is now `this.enter(this, event)`.
- **The dispatch moves into `handleInput`,** as `DRD-32` directs. It keeps the owner's order, `pointerdown` first, and the same parameter type. A method's parameter is bivariant, so `Gesture` still implements `InputHandler`.
- **`listenForInvalidation`'s listener-object parameter** in `src/shared/invalidation.ts` is untouched. v3 didn't change that file.

**One deviation from the owner's text: the second comparison is an `else`.** The owner's `handleEvent` read `else if (event.type === 'keydown')`. The root listens only for `pointerdown` and `keydown`, so the two forms behave the same. A one-line comment on `handleInput` states that assumption. The choice comes from measurement, with each form ablated separately:

| Form of `handleInput`'s dispatch | `complete`, Brotli | Largest change on a row | Inside `DRO-9` |
| --- | --: | --: | --- |
| The owner's: `pointerdown`, `else if` `keydown` | 7073 (+32) | +32, `complete` | **No.** It goes over +23, and over `complete`'s 7065 ceiling by 8 B |
| v3's: `keydown`, `else` | 7062 (+21) | +21 | Yes |
| **Landed:** `pointerdown`, `else` | 7061 (+20) | +20 | Yes |

The ablations were used only to choose. The figures booked below are the landed commit's.

Everything else is v3, unchanged:

- `InputHandler`, `enter(handler, event)`, `apply()` and the private `#run(first, argument)`;
- the reader with `#runStep` inlined;
- `raiseInPass` and an idle `requestStep` through `#run`;
- `requestCancel`, `requestDestroy`, the session's `#cancel` and a verdict's acceptance through `apply()`;
- the session's input through `enter(this, pointer)` and `handleInput`;
- `#press`, `#command`, `#move`, `#up` and `#endPending` as private methods;
- both `NOOP`s removed;
- the development count, with one set for each refused event.

## Checks

| Check | Base `8943f14e5` | After `a8327a7c8` |
| --- | --- | --- |
| Handoff loop (`fmt`, `lint-fix`, `fmt`, `lint`) on both kernel files | — | Clean |
| `npx just typecheck` | — | Passes |
| `npx just test` (Chromium) | 344 passed, 3 failed: size, `draggable alone`'s control, `freeDrag`, `freeDrag + bounds + landing` | 343 passed, 4 failed: the base's 3 and `example: drop zone`, over its ceiling by 8 B, which `DRO-9` expects |
| `npx just test-engines` (Chromium, Firefox, WebKit) | 945 passed, 18 skipped, 66 of 66 files | **945 passed, 18 skipped, 66 of 66 files** |
| Per-sample test (Chromium) | Passes | Passes |

**WebKit ran.** It needs `~/.cache/ms-playwright/webkit-env.sh`, as in the earlier units. A first run without that script failed to launch WebKit because of missing host libraries. Every run counted above sourced it.

**The production bundle has no development code.** In the build of `a8327a7c8`, `kernel/gesture.js` contains one `WeakSet`, which is `admitted`. Neither `countedRefusals` nor `__dragRefused` is present.

## Mutations

Each mutation was applied to `gesture.ts`, run and reverted. None was committed. The size rows that fail at the base are left out of the table.

| Mutation | Run | What failed |
| --- | --- | --- |
| **M1:** an idle step through the list: `this.#steps.push(step); this.apply();` | `just test` | `hot-path` › "should allocate per sample only the CSS string a lifted write needs": **73.56 B per move against a bound of 16**, with 21,736 B attributed to `kernel/gesture.ts:requestStep`. `complete` also went over its ceiling |
| **M2:** no per-event set in the count | `just test` | `terminals` › "should refuse a nested press, and take the next real one": `{ trusted: 0, untrusted: 2 }` against `untrusted: 1`. `requests` › "should finish the step when a custom element reaction asks to press during activate": `expected 2 to be 1` |
| **M3:** `apply` refuses on a closed controller: `!this.#running && !this.#destroyed` | `destruction.browser.test.ts` with `--hookTimeout=5000 --testTimeout=5000` | **13 of 23 `DRI-10` tests.** For example, "should tear down totally when requested from admit": `expected null to be Promise{…}`. "should not apply an Escape dispatched by the verdict abort during destruction": `expected [ true ] to deeply equal [ false ]`. The rest time out, because no teardown runs and `requestDestroy()`'s promise never settles |
| **M4:** `enter` refuses only on a closed controller | `just test` with the same timeouts | `terminals` › "should refuse a nested press…": `expected 2 to be 1`. `requests` › "…asks to press during activate": `expected 0 to be 1` |

**M3 under the default configuration doesn't fail. It hangs.** The harness's `afterEach` awaits each controller's `requestDestroy()`. Under M3 that promise never settles, and no timeout ended the full suite in ten minutes, so that run was stopped. The file was then run alone with explicit timeouts, as above.

**The timeouts used for M3 and M4 caused two failures of their own.** Under M4 the two `hot-path` allocation tests also failed, with `Test timed out in 5000ms`. On the unmutated source, with the same flags, the same two tests time out. So those failures come from the 5 s limit, not from M4.

## Size

From `node bench/size/measure.ts`, minified and Brotli, in bytes:

| Composition | Base `8943f14e5` | After `a8327a7c8` | Brotli change | `DRO-9` (prototype) |
| --- | --- | --- | --: | --: |
| `draggable alone` | 6471 / 2130 | 6600 / 2138 | +8 | +13 |
| `draggable + lift` | 11927 / 4138 | 12056 / 4152 | +14 | +23 |
| `example: resize handle` | 9128 / 3240 | 9257 / 3249 | +9 | +18 |
| `example: drop zone` | 12726 / 4423 | 12855 / 4439 | +16 | +22 |
| `example: canvas group` | 9264 / 3241 | 9393 / 3248 | +7 | +20 |
| `freeDrag` | 15140 / 5062 | 15269 / 5075 | +13 | +18 |
| `freeDrag + bounds + landing` | 15825 / 5313 | 15954 / 5330 | +17 | +22 |
| `sortable + y` | 20408 / 6634 | 20533 / 6652 | +18 | +18 |
| `sortable + xy` | 20028 / 6587 | 20153 / 6594 | +7 | +22 |
| `complete` | 21561 / 7041 | 21686 / 7061 | +20 | +16 |

- **Every row is at most +23 B Brotli**, the limit `DRO-9` sets. `complete` is 4 B above the prototype's figure for that row and inside the limit. Minified size grows by 125 to 129 B on every row.
- **Ceilings:**
  - `example: drop zone` is 8 B over its 4431 B ceiling. `DRO-9` expected 11.
  - `freeDrag` is 108 B over its ceiling, and `freeDrag + bounds + landing` is 120 B over. Both were over at the base, by 95 B and 103 B.
  - The control row moved by 114 B. It was 106 B at the base.
  - `complete` is 4 B under its 7065 B ceiling.
- **Nothing is re-based.**

## Allocation

**By reading,** as `DRO-9` states:

- **Per controller:** 3 fewer functions than at `8943f14e5`: `#press`, `#command` and `#runStep`. The owner's commit had already removed `#onPress` and `#onCommand`. Against `ef8c6cd96`, the total is `DRO-9`'s 5.
- **Per operation:** 3 fewer functions: `#move`, `#up` and `#endPending`.
- **Per module load:** the two `NOOP`s are gone.
- **Per sample:** nothing added. One more string comparison: `handleEvent` compares the type once, and `handleInput` compares it again.

**Per sample, measured.** The kernel's bytes per move come from the per-sample test. A temporary assertion, which wasn't committed, reported the figure, and the whole `hot-path` file ran 5 times on each side. The bound is 16.

| Run | Base | After |
| --: | ---: | ----: |
|   1 | 0.28 |     0 |
|   2 | 0.75 |     0 |
|   3 |    0 |     0 |
|   4 | 0.56 |  0.28 |
|   5 |    0 |  0.28 |

**Runs filtered with `-t` aren't comparable.** When the test ran alone under `-t`, it read 17.81 and 16.95 B at the base and 17.01 B after, which is over the bound on both sides, and passed in the other runs. Every full-suite run passed.

## Limits and open items

- **No timing.** `DRO-9` doesn't authorize it.
- **The drop-zone row is red,** as `DRO-9` expects, until a re-base under `DRO-4`. The `freeDrag` rows and the control row were red at the base.
- **The `unbound-method` gap** (assessment §1, point 5) isn't part of this unit. The landed form passes no `#` method as a value.
- **No independent review has read this commit.** The owner inspects it first. No combined review and no PR were started.

**Scratch work.** A detached worktree at `8943f14e5`, in this session's scratchpad, measured the base. It is removed after this report is committed.

## The diff

```diff
diff --git a/packages/drag/src/kernel/gesture.ts b/packages/drag/src/kernel/gesture.ts
index 889a8f07d..166b4ce5a 100644
--- a/packages/drag/src/kernel/gesture.ts
+++ b/packages/drag/src/kernel/gesture.ts
@@ -34,7 +34,11 @@ export interface DraggableController<Operation> {

 const DEFAULT_THRESHOLD = 8;

-const NOOP = (): void => {};
+/** What the gate runs as the first step of a pass: the work for one input event. */
+export interface InputHandler {
+  /** Called only by the gate, inside the pass it opened for `event`. */
+  handleInput(event: Event): void;
+}

 /**
  * Events a controller of this library copy has admitted. Bubbling reaches the
@@ -62,23 +66,29 @@ function ownsInteraction(event: Event, subject: EventTarget): boolean {
   return false;
 }

-/** Development only: how many events a running pass refused, for the suite. */
-function countRefused(argument: unknown): void {
-  const trusted = (argument as Event | null | undefined)?.isTrusted;
+/**
+ * Development only: how many events a running pass refused, for the suite. An
+ * event refused by both the window's and the root's listener counts once.
+ */
+const countedRefusals = new WeakSet<Event>();

-  if (trusted !== undefined) {
-    const refused = ((globalThis as Record<string, unknown>)[
-      '__dragRefused'
-    ] ??= { trusted: 0, untrusted: 0 }) as {
-      trusted: number;
-      untrusted: number;
-    };
+function countRefused(event: Event): void {
+  if (countedRefusals.has(event)) {
+    return;
+  }

-    if (trusted) {
-      refused.trusted += 1;
-    } else {
-      refused.untrusted += 1;
-    }
+  countedRefusals.add(event);
+
+  const refused = ((globalThis as Record<string, unknown>)['__dragRefused'] ??=
+    { trusted: 0, untrusted: 0 }) as {
+    trusted: number;
+    untrusted: number;
+  };
+
+  if (event.isTrusted) {
+    refused.trusted += 1;
+  } else {
+    refused.untrusted += 1;
   }
 }

@@ -92,7 +102,7 @@ export class Gesture<
   State,
   Verdict,
   Operation extends BehaviorOperation<Verdict>,
-> {
+> implements InputHandler {
   readonly #root: HTMLElement;
   readonly #behavior: Behavior<State, Verdict, Operation>;
   readonly #window: Window & typeof globalThis;
@@ -132,13 +142,14 @@ export class Gesture<
   }

   /**
-   * The one entry into library work. `step` is a stable function, so a pointer
-   * sample allocates nothing here.
+   * The gate for input: runs `handler`'s work for `event` as the first step of a
+   * new pass, then the reader. A running pass or a closed controller refuses the
+   * input. Nothing is allocated here, so a pointer sample allocates nothing.
    */
-  enter<A>(step: (argument: A) => void, argument: A): void {
+  enter(handler: InputHandler, event: Event): void {
     if (this.#running || this.#destroyed) {
       if (__DEV__ && this.#running) {
-        countRefused(argument);
+        countRefused(event);
       }

       return;
@@ -148,7 +159,7 @@ export class Gesture<

     try {
       try {
-        step(argument);
+        handler.handleInput(event);
       } catch (error) {
         this.raise(error);
       }
@@ -160,10 +171,50 @@ export class Gesture<
   }

   handleEvent(event: KeyboardEvent | PointerEvent): void {
+    this.enter(this, event);
+  }
+
+  /** The root listens only for `pointerdown` and `keydown`. */
+  handleInput(event: KeyboardEvent | PointerEvent): void {
     if (event.type === 'pointerdown') {
-      this.enter(this.#press, event as PointerEvent);
-    } else if (event.type === 'keydown') {
-      this.enter(this.#command, event as KeyboardEvent);
+      this.#press(event as PointerEvent);
+    } else {
+      this.#command(event as KeyboardEvent);
+    }
+  }
+
+  /**
+   * The gate for requests: a request has filled its slot, and this applies it
+   * now unless a pass is running, whose reader applies it (DRI-1). Nothing is
+   * refused.
+   */
+  apply(): void {
+    if (!this.#running) {
+      this.#run(null, null);
+    }
+  }
+
+  /**
+   * Opens a pass that no input started: `first`, if any, is its first step, and
+   * the reader follows. The caller has checked that no pass is running. `first`
+   * is a function only where the work is one already: the consumer's step, or
+   * `raise`.
+   */
+  #run<A>(first: ((argument: A) => void) | null, argument: A): void {
+    this.#running = true;
+
+    try {
+      if (first) {
+        try {
+          first(argument);
+        } catch (error) {
+          this.raise(error);
+        }
+      }
+
+      this.#applyRequests();
+    } finally {
+      this.#running = false;
     }
   }

@@ -181,7 +232,9 @@ export class Gesture<
         }

         if (this.#steps.length > 0) {
-          this.#runStep(this.#steps.shift()!);
+          const step = this.#steps.shift()!;
+
+          step(this.#session ? this.#session.stepTarget() : null);
         } else if (!this.#session?.advance()) {
           return;
         }
@@ -211,7 +264,7 @@ export class Gesture<
     if (this.#running) {
       this.raise(error);
     } else {
-      this.enter(this.raise, error);
+      this.#run(this.raise, error);
     }
   }

@@ -227,21 +280,21 @@ export class Gesture<
       return;
     }

-    if (!this.#running) {
-      this.enter(this.#runStep, step);
-    } else if (!this.#steps.includes(step)) {
-      this.#steps.push(step);
+    if (this.#running) {
+      if (!this.#steps.includes(step)) {
+        this.#steps.push(step);
+      }
+    } else {
+      // Requested while idle, the step is the first step of its own pass. The
+      // list stays empty, so an idle request allocates nothing.
+      this.#run(step, this.#session ? this.#session.stepTarget() : null);
     }
   };

-  readonly #runStep = (step: (operation: Operation | null) => void): void => {
-    step(this.#session ? this.#session.stepTarget() : null);
-  };
-
   readonly requestCancel = (reason?: unknown): void => {
     if (this.#session) {
       this.#session.decide(reason, 'request');
-      this.enter(NOOP, null);
+      this.apply();
     }
   };

@@ -250,10 +303,7 @@ export class Gesture<
       this.#destroyed = new Promise((resolve) => {
         this.#resolveDestroyed = resolve;
       });
-
-      if (!this.#running) {
-        this.#teardown();
-      }
+      this.apply();
     }

     return this.#destroyed;
@@ -267,7 +317,7 @@ export class Gesture<
     }
   };

-  readonly #press = (event: PointerEvent): void => {
+  #press(event: PointerEvent): void {
     if (
       event.button === 0 &&
       event.isPrimary &&
@@ -284,9 +334,9 @@ export class Gesture<
         this.#open(admission, event.clientX, event.clientY, event.pointerId);
       }
     }
-  };
+  }

-  readonly #command = (event: KeyboardEvent): void => {
+  #command(event: KeyboardEvent): void {
     if (this.#session || admitted.has(event)) {
       return;
     }
@@ -301,7 +351,7 @@ export class Gesture<
       event.preventDefault();
       this.#open(admission, 0, 0);
     }
-  };
+  }

   #open(
     admission: Admission<State>,
diff --git a/packages/drag/src/kernel/session.ts b/packages/drag/src/kernel/session.ts
index 44f512eca..8a7f18cfe 100644
--- a/packages/drag/src/kernel/session.ts
+++ b/packages/drag/src/kernel/session.ts
@@ -2,7 +2,7 @@ import { deepActiveElement } from '../shared/focus.ts';
 import type { Admission } from './admission.ts';
 import type { Behavior, BehaviorOperation } from './behavior.ts';
 import { runDragDisposer, type DragDisposer, type KernelDrag } from './drag.ts';
-import type { Gesture } from './gesture.ts';
+import type { Gesture, InputHandler } from './gesture.ts';
 import type { CancelOrigin, Outcome, SkippedOutcome } from './outcome.ts';

 const COMMAND_POINTER_ID = -1;
@@ -112,8 +112,6 @@ function armClickGuard(target: Window, pointerId: number): void {
   );
 }

-const NOOP = (): void => {};
-
 /**
  * One operation, from admission to its release, and every transition it makes.
  * Its absence from the controller's slot means idle. It ends where it leaves the
@@ -122,13 +120,14 @@ const NOOP = (): void => {};
  * The session reads and writes only its own fields. It reaches the controller
  * through the controller's interface, and the controller reaches it through
  * `advance`, `decide`, `stepTarget` and `terminate`. It is its own listener on
- * the window, through `handleEvent`.
+ * the window, through `handleEvent`, and the gate runs its input work through
+ * `handleInput`.
  */
 export class Session<
   State,
   Verdict,
   Operation extends BehaviorOperation<Verdict>,
-> {
+> implements InputHandler {
   readonly #gesture: Gesture<State, Verdict, Operation>;
   readonly #behavior: Behavior<State, Verdict, Operation>;
   readonly #root: HTMLElement;
@@ -325,7 +324,7 @@ export class Session<
         pointer.isPrimary &&
         pointer.button === 0
       ) {
-        this.#gesture.enter(this.#endPending, null);
+        this.#gesture.enter(this, pointer);
       }

       return;
@@ -335,10 +334,8 @@ export class Session<
       return;
     }

-    if (pointer.type === 'pointermove') {
-      this.#gesture.enter(this.#move, pointer);
-    } else if (pointer.type === 'pointerup') {
-      this.#gesture.enter(this.#up, pointer);
+    if (pointer.type === 'pointermove' || pointer.type === 'pointerup') {
+      this.#gesture.enter(this, pointer);
     } else if (
       pointer.type === 'pointercancel' ||
       // Taking a touch's implicit capture from the pressed element also fires
@@ -351,10 +348,24 @@ export class Session<

   #cancel(reason: unknown, origin: CancelOrigin): void {
     this.decide(reason, origin);
-    this.#gesture.enter(NOOP, null);
+    this.#gesture.apply();
+  }
+
+  /**
+   * The gate's step for the input `handleEvent` passed it: a sample, a release,
+   * or a primary press that ends the pending one.
+   */
+  handleInput(event: Event): void {
+    if (event.type === 'pointermove') {
+      this.#move(event as PointerEvent);
+    } else if (event.type === 'pointerup') {
+      this.#up(event as PointerEvent);
+    } else {
+      this.#endPending();
+    }
   }

-  readonly #move = (event: PointerEvent): void => {
+  #move(event: PointerEvent): void {
     // A press never activates without the button that admitted it. A release the
     // window never saw, such as one outside it, leaves samples with no button.
     // oxlint-disable-next-line no-bitwise -- `buttons` is a bitfield
@@ -387,17 +398,17 @@ export class Session<
       armClickGuard(this.#window, this.#drag.pointerId);
       this.#activate();
     }
-  };
+  }

   /** A press that never activated ends quietly: no hook, no report. */
-  readonly #endPending = (): void => {
+  #endPending(): void {
     this.#motion.abort();
     this.#presentation.abort();
     this.#phase = ENDED;
     this.#gesture.detach();
-  };
+  }

-  readonly #up = (event: PointerEvent): void => {
+  #up(event: PointerEvent): void {
     // Motion is open only while pending or active, and the operation is held
     // exactly while active there.
     const operation = this.#operation;
@@ -410,7 +421,7 @@ export class Session<
     this.#drag.x = event.clientX;
     this.#drag.y = event.clientY;
     this.#drop(operation);
-  };
+  }

   #activate(): void {
     // The consumer removed the item during the press, so there is nothing to
@@ -481,9 +492,9 @@ export class Session<
       }

       if (!faulted) {
-        // Inside a pass the gate refuses, and that pass's reader applies it.
+        // Inside a pass, that pass's reader applies it.
         this.#decision = { type: 'verdict', value: value as Verdict };
-        this.#gesture.enter(NOOP, null);
+        this.#gesture.apply();
       } else {
         this.#gesture.raiseInPass(value);
       }
```