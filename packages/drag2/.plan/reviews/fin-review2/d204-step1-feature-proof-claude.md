# D-204 step 1: the runner and construction — feature proof

**Trees read.** Implementation `2c5212daf`. Documentation `c2a38f316`, which changes no file under `src/` relative to `2c5212daf`. Baseline `582092c1f`. Branch `drag2/fin-review2`. The shared checkout has the owner's uncommitted one-assertion edit to `tests/kernel/seams.node.test.ts`. It was present in the tip suite run and is otherwise outside this review. The baseline and tip runs in the table below used detached worktrees at `582092c1f` and `c2a38f316`.

**Subject.** `drag2:D-204`, which carries D-203 → D-202 by reference. The inputs read were:

- the D-201 to D-204 text in `contract/00-index.md`;
- `request-application-claude.md` §2.1–§2.4, §2.9, §2.10, §3–§8, §10 and §11;
- `measurements/d204-step1.md`.

**Scope.** The pass covered:

- step 1's runner and construction work: `src/kernel/execution.ts`, and in full the `src/kernel/kernel.ts`, `src/kernel.ts` and `spec.ts` changes;
- the cases the step claims (R1's construction and drain half, R9–R11, R13, R15, R17, R23–R27);
- the measurement record's verification, composition and mutation claims;
- step 1's interaction with paths that steps 2–6 still own.

It did **not** cover:

- steps 2–6 themselves;
- a full read of the rewritten `tests/COVERAGE.md` registers and of 01's amended sections (both were sampled);
- each of the 22 revised browser rows (sampled in `sortable.browser`, `free-drag/lifecycle`).

## Result

**Four findings: two Tier A, both regressions against the baseline; one Tier B; one Tier C.** The step otherwise does what its record claims:

- every step-1 case named in the record has a passing row;
- the failing test, lint and typecheck sets are the baseline's;
- all fifteen composition figures reproduce byte for byte.

| Check | Result |
| --- | --- |
| `just test`, tip (shared checkout, with the owner's edit) | 10 failed, 1,352 passed, 60 skipped. `react.browser` and `stories.browser` fail to load |
| `just test`, baseline worktree | the same 10 failures and 2 unloadable files, plus 3 failures specific to the worktree: `packaging.node` ×2 needs build output, and `references.node` needs paths on disk. 1,295 passed, i.e. 1,298 once those 3 are counted, as the record states |
| Lint, every changed `.ts` | 5 eslint errors (`unbound-method` ×3, `no-unnecessary-condition`, `prefer-promise-reject-errors`), identical at baseline apart from line numbers |
| Typecheck | the 2 `.scripts/vitest-*.ts` errors, as at baseline |
| Composition (`measureAll()`, both worktrees built) | every row matches the record's before/after table exactly. +68 B minified on every kernel-carrying row; `drag.js` and baseline B unmoved |
| R27 | `kernel.ts: this.#spec.config.actionTags` at armed intake, plus `next.config.actionTags` twice in static validation. The test pins exactly that |
| Cited case rows | all ten named rows exist. `armed dispatch tags` has 10 rows |
| P5 (`probes/snapshot-units/`) on both trees | see reviewer-A |

---

### reviewer-A — a destroy requested in the release unit now opens the consumer round-trip

**Tier A. Regression against `582092c1f`. Also contrary to the target outcome (R5).** Routed for a sequencing decision; see the end of this entry.

#### Current behavior / contract

- D-202 §8 step 1 (carried) requires `closed` to "report `CLOSED` only" through this step. So a `destroy()` raised inside a unit leaves `#preparationValid()` true for the rest of the unit (`kernel.ts:469–473`).
- The release seam stages its command after `release.effect` on exactly that reading (`seams.ts:317`). `runReleaseSeam` then executes it inside the release unit (`seams.ts:641–643` → `kernel.ts:1876–1883` → `#openResolution`, which calls the consumer's `invoke`).
- **R5** requires: destroy requested in `release.effect` → _no round-trip; no `onEnd`; application after the release unit_. D-203 delivers that by moving the round-trip into its own queued `OPEN_RESOLUTION` unit, which application discards. That unit is step 3's work.

#### Evidence

P5, run unmodified from `.plan/probes/snapshot-units/p5-in-unit-requests.browser.test.ts.txt` in the package browser project (Chromium), on both trees. The `destroy() in release.effect` row:

```text
582092c1f: ["activation.prepare","onStart","release.effect","destroy() in release.effect; closed=true","retire","presentation.released","destroy settled"]
c2a38f316: ["activation.prepare","onStart","release.effect","destroy() in release.effect; closed=false","invoke (round-trip opened)","retire","presentation.released","destroy settled"]
```

The other P5 rows at the tip match their targets:

- `destroy()` in `activation.prepare` and in `activation.effect` delivers `onStart` with no rollback (R2);
- `destroy()` in `anchorTarget` delivers `finalized` before retirement (R7);
- the two `cancel()` rows are unchanged from baseline, which is step 3's scope.

Only the release row reaches an outcome that is neither the baseline's nor the target's.

**Nothing in the suite sees it.** The one row about this path, `seams.node` — _should never invoke the consumer when the release effect abandoned the operation_ (`tests/kernel/seams.node.test.ts:1693`), flips `preparationValid` through the harness's own `invalidate()` and never goes through the bracket. It passes at both commits. The sortable's `release.prepare` destroy rows (`sortable.browser.test.ts:3550`, `:3635`) call the spec directly at depth 0, where the destroy is applied at once. So they still read `closed === true` and do not represent the in-unit path either.

#### Why it is a problem

A behavior or consumer that asks to stop during the release unit now has its `invoke` called, which in the sortable means `onReorder`, a consumer model mutation. That is a round-trip the baseline never opened and the decision forbids. The measurement record's paragraph on what the step "makes true early" lists the 22 revised rows and calls their new outcome D-203's. It does not name this path, where the step-1 outcome is not D-203's.

#### Required property

No consumer round-trip opens for an operation whose release unit requested destruction (R5). This holds at every commit booked as a landed step, or the interval in which it does not hold is accepted explicitly by the decision's owner.

#### Routed, not answered

The implementation follows §8 step 1 literally. The interval exists because step 1 changes `closed` before step 3 adds `OPEN_RESOLUTION`. Whether a step may ship it, or the step boundary must move, is a call on D-204's step order. That belongs to the architect, not to this pass.

---

### reviewer-B — after a panic, `destroy()` returns a promise that never settles

**Tier A by consequence, reached only through a panic. Regression against `582092c1f`.**

#### Current behavior / contract

- `ExecutionBracket.#drain` handles a panic by setting `CLOSED`, calling the kernel's panic and then `#release()` (`execution.ts:237–240`). `#release` settles `#settle` only if a promise was already allocated (`:274–279`).
- At the baseline, the kernel's `#panic` began with `void this.destroy()`, which allocated the promise and settled it in the same teardown. Step 1 removed that call (`kernel.ts:709–712`).
- A later `requestClose()` allocates a fresh promise (`:211–213`). Because the lifecycle is already `CLOSED`, it neither applies nor settles it (`:215–221`), and nothing else ever will.
- The contract text this commit amends says otherwise:
  - 05 I-6: "`destroy()` returns `Promise<void>`, settling exactly once after application; every call returns the same promise … **`panic()` is the one immediate application**";
  - record §2.4: after application "`requestDestroy()` returns the settled promise".

#### Evidence

The probe below composes the bracket with each tree's kernel panic body: the baseline's `void destroy()`, and the tip's report only. It is saved as written:

```ts
const { ExecutionBracket } = await import(path); // each tree's src/kernel/execution.ts
const b = new ExecutionBracket(
  () => {
    throw new Error('boom');
  },
  (e) => kernelPanic(e),
  () => torn.push('teardown'),
  () => {},
);
kernelPanic = isBaseline
  ? () => {
      void b.close();
    }
  : () => {};
b.dispatch(1, null);
const p = (b.requestClose ?? b.close).call(b);
// race p against a 50 ms timer
```

```text
baseline closed= true teardowns= 1 destroy() after panic: settled
step1    closed= true teardowns= 1 destroy() after panic: PENDING after 50ms
```

No row covers this at either commit. `execution.node`'s panic rows assert routing, close-before-report and teardown order, and never call `requestClose()` afterwards.

#### Why it is a problem

A consumer that awaits `controller.destroy()` in its own cleanup hangs forever once the controller has panicked. The completion signal I-6 publishes is never delivered on the one application path the same paragraph names.

**Reachability, stated rather than argued.** A panic is a throw escaping `handle`. Per F-85, no behavior-facing entry opens a nested phase, so this pass did not drive one through the SPI. The tier follows the consequence if a panic occurs. Within the tier its priority is low.

#### Required property

Every `destroy()` call after any application, panic included, returns a promise that is or becomes settled, and every call returns the same promise.

---

### reviewer-C — the first-entry falsifier is booked as reddening one row; it reddens two

**Tier B, low priority. An instrument the repository relies on misstates its own coverage.**

#### Current behavior / contract

COVERAGE makes the claim twice:

- `tests/COVERAGE.md:1058`: "a step that handles before it reads the lifecycle request reddens this row alone";
- `:1178`: "**1 — drain after admission and handle nothing**".

`measurements/d204-step1.md` §Mutations repeats it ("reddens the post-admission drain row alone").

#### Evidence

In the tip worktree, `#step` was mutated to `this.#handle(action, argument); return this.#lifecycle === LIVE;` and the node project was run over `tests/kernel`. Two rows reddened:

- `execution.node` — _should drain after admission and handle nothing once admission requested destruction_;
- `construction.node` — _should apply no window action once a window destruction is applied_.

The mutation was then restored.

#### Why it is a problem

The census undercounts the falsifiers of D-200 property 3's first-entry clause. This is the error F-398 named: a count true only under a scope it does not state, here presumably `execution.node` alone. A later pass that deletes or re-scopes either row would read the register wrong.

#### Required property

The mutation census reports every row the mutation reddens, or states the scope its count covers.

---

### reviewer-D — two texts still describe the pre-step-1 shape

**Tier C.**

- `tests/kernel/seams.node.test.ts:1134` says "`panic` in `kernel.ts` is `void destroy(); notify(new DraggableError(null, error))`". Step 1 removed the first statement (`kernel.ts:709–712`), so the row's comment no longer describes the code. This file carries the owner's uncommitted edit at `:1177`, and the stale line is in the committed text.
- `contract/01-construction-ownership.md:228` defines the construction window as running "to the moment `arm()` finishes composing". `arm()` is now the private `#arm()`, reached through `Kernel.construct`, and the rest of the commit renames every other mention.

**Required property.** Prose that names a code shape names the current one.

---

## Observations, not findings

- **The unchecked window ends at `#spec` publication.** In the code, and in 01 and `spec.ts`, it covers the factory body and the frame-part factories. During ingress attachment, the stretch R15 reaches through an overridden `addEventListener`, the tag is checked. D-204 property 12 words the window as "until arming completes". §11.2 item 2 equates that wording with `spec.ts`'s existing definition, which the code follows. Within the contract this changes nothing observable: in-range tags are queued either way, and an out-of-range window tag has no specified outcome. It is recorded only so the architect can see the wording carries two readings.
- **Destroy then failure inside construction (read, not executed).** Two code facts bear on it:
  - `#unwindArm` retires the spec and nulls `#spec` (`kernel.ts:2565–2582`);
  - `construct`'s `finally` then applies the request, and `#runPhysicalTeardown` is gated on `#spec` (`:639–651`).

  The spec is therefore retired once, ingress is aborted twice (idempotent), `draggable()` rethrows and the promise settles. No row drives this combination, and no case requires one.

## Verification limits

- Browser runs were Chromium through the package's Vitest browser project only.
- Of the record's seventeen mutations, only the first-entry mutation was re-run. The record's other mutation figures, including its three survivors, were not reproduced.
- reviewer-B is shown on the bracket composed with each tree's panic body. It was not reached through a real `Kernel`, for the F-85 reason above.
- reviewer-A is shown through P5's kernel-tier spec. It was not driven through the sortable or free-drag behaviors.
- Probe scripts and both worktrees lived in this session's scratchpad and have been removed. The commands and outputs this report relies on are quoted above.

## Next

- The architect decides reviewer-A's step-order question.
- reviewer-B, reviewer-C and reviewer-D are defects against step 1 as landed, for its implementer. Step 2 should not land on top of reviewer-B unaddressed, because step 2 rewrites the teardown that reviewer-B's promise depends on.