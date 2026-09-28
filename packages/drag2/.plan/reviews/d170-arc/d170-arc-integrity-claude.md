# D-170 arc integrity: the class/entity boundary and the `BehaviorContext` surface hold; one renaming claim in the record overstates the tree

**Read at `b73b6779`**, branch `drag2/fin-review`, review range `261a3a16..b73b6779`. Package coherence only — D-170's correctness against its own plan (truth tables, step-by-step reconstruction fidelity) is another pass's subject and is not re-litigated here. Canonical authority is the current D-170 entry (`.plan/contract/00-index.md:1505-1563`, including `§The ownership boundary`, `§The step-6 boundary · corrected by §The behavior-facing interface`, and `§The behavior-facing interface`) and its linked records. F-300 is confirmed still open/deferred (tier C, `.plan/contract/00-index.md:3177`) and is not re-raised.

## Scope

Checked against the live tree at `b73b6779`, not against any intermediate commit in the range:

- The `BehaviorContext` interface (`src/kernel/spec.ts`) against the `Kernel` class's non-private surface (`src/kernel/kernel.ts`) — member-for-member.
- Deletion of the separate `host` façade record and of every `KernelHost` reference across `src/`, `tests/`, and `README.md`.
- The two published detach-by-contract sites (`SortableController.cancel`/`destroy`, `FreeDragController.cancel`/`destroy`) — wrapped, not bare.
- The `RectIndex`/`RectIndexView` ownership boundary (public mutable field on the class, readonly-content view for collaborators) and `LinearShift`'s liveness disposition (no `#live` field).
- Public-surface consistency: `src/kernel.ts`'s export list, `README.md`'s vocabulary table, `tests/kernel/vocabulary.node.test.ts`, against the renamed type.
- Whether anything outside `packages/drag2` (`material-x`, the sibling `packages/drag` package, gitignored build output) depends on the old `KernelHost` name or the pre-migration shapes.
- Whether the unbound-method gate (the arc's own instrument) is actually clean on the shipped tree, not merely asserted clean in the record.
- Whether `CONTRIBUTING.md` was touched (it decides whether F-300 was silently promoted) — it was not.

Not independently re-measured: the Brotli byte figures in `budget-rebases.md` (a measurement-fidelity question, not a coherence one) and the exact identity of each of the eleven detached-read sites step 6 claims to wrap (see Method — the passing lint-fix run is treated as sufficient evidence for that aggregate claim, not each site individually).

## Findings

### ir-1 — The record's `host` → `kernel` rename is not made "wherever it is threaded"; two sibling files that receive the identical `BehaviorContext` value still name it `host`

**Tier B.** No runtime behaviour changes — this is a local-variable name, and TypeScript does not require an argument's binding name to match its type's own parameter name. But the decision record makes an unqualified, falsifiable claim about the tree that the tree does not satisfy, and the same threaded value now carries two different names across sibling modules that used to agree.

**Current behavior / contract.** `.plan/contract/00-index.md:1560` (`§The behavior-facing interface`) states: "**`KernelHost` becomes `interface BehaviorContext`** — the same seven members and documentation, method syntax throughout — with `arm` on the class and off the interface, and **the parameter renamed `host` → `kernel` wherever it is threaded**."

**Why it is a problem.** The rename was made in `src/kernel/spec.ts`, `src/kernel/kernel.ts`, `src/sortable/spec.ts`, `src/free-drag/spec.ts`, `src/sortable/controller.ts` and `src/free-drag/controller.ts` — every one of those now names the `BehaviorContext`-typed value `kernel`. It was **not** made in `src/sortable/behavior.ts` or `src/free-drag/behavior.ts`, the two `BehaviorFactory` implementations that receive the exact same value and thread it into `createSortableSpec`/`createSortableController` and `createFreeDragSpec`/`createFreeDragController` respectively — both still call it `host` throughout (parameter name, `host.realm`, `host.root`, `host.closed`, doc comments). Neither file appears in the D-170 entry's list of touched files for any step, and neither was touched anywhere in `261a3a16..b73b6779`. A reader who trusts the record's "wherever it is threaded" and, for example, greps for `host` to confirm the migration's naming convention is complete throughout would get a false negative on two of the six sites that carry the value — precisely the class of drift the record itself was written to close out (`KernelHost` → `BehaviorContext`, `host` → `kernel`, name for name).

**Evidence.**

- `git diff 261a3a16..b73b6779 --stat -- src/sortable/behavior.ts src/free-drag/behavior.ts` is empty — neither file changed in the arc.
- `git diff 261a3a16..b73b6779 --stat -- src/sortable/controller.ts src/free-drag/controller.ts` shows both changed (34 and 33 lines); `git show 261a3a16:packages/drag2/src/sortable/controller.ts` confirms the pre-arc signature was `createSortableController(host: KernelHost)`, now `createSortableController(kernel: BehaviorContext)`.
- `grep -n "(host)" src/sortable/behavior.ts src/free-drag/behavior.ts` → `return (host) => ({ … })` / `return (host) => { … }` in both files, at `src/sortable/behavior.ts:77,101` and `src/free-drag/behavior.ts:54`; both close over `host.closed`, `host.realm`, `host.root` and pass `host` straight into `createSortableSpec`/`createSortableController` (or the free-drag equivalents).
- `grep -n "kernel: BehaviorContext" src/sortable/spec.ts src/free-drag/spec.ts src/sortable/controller.ts src/free-drag/controller.ts` → all four use `kernel`.

**Required property.** Either the record's claim is narrowed to the sites it actually reaches (the kernel-tier modules and the two controller factories), or the two behavior-assembly sites are brought into agreement with it. Which is correct is a record-accuracy call, not mine to make.

## Everything else checked, clean

- **`BehaviorContext` ≡ `Kernel`'s non-private surface, exactly.** The interface (`src/kernel/spec.ts:40-92`) declares `realm`, `root`, `dispatch`, `fail`, `closed`, `cancel`, `destroy` — seven members. `class Kernel<Part, Activation> implements BehaviorContext` (`src/kernel/kernel.ts:324`) exposes exactly those seven plus `arm` (`readonly realm`/`root` fields at 326/329, `get closed()` at 2557, `dispatch`/`fail`/`cancel`/`destroy`/`arm` as prototype methods) and nothing else non-private — matching `§The behavior-facing interface`'s claim about the class's surface and superseding the earlier (explicitly corrected) `§The step-6 boundary` text that said `KernelHost` would stay a separate composed record.
- **The façade is gone.** No `KernelHost` identifier remains anywhere in `src/`, `tests/`, or `README.md` (only in historical review prose describing the old state, and in an unrelated sibling package's own fixture, `packages/drag`, which does not depend on `drag2`). No leftover `const host = { … }` object literal exists in `src/`.
- **The two detach-by-contract sites wrap correctly, and the wrap is exercised by the gate.** `sortable/controller.ts` and `free-drag/controller.ts` both publish `cancel: (reason?) => { kernel.cancel(reason); }` and `destroy: () => kernel.destroy()` (a plain arrow, preserving promise identity) rather than `cancel: kernel.cancel`. `npx just lint-fix src/` (the exact recipe `handoff.md` mandates and the record's own falsifier) exits 0 with zero unbound-method reports across `src/`; the only `unbound-method` disable in `src/` is `kernel/kernel.ts:300`, for the platform `.then` capability check, matching the record's description of that one case.
- **`RectIndex`/`RectIndexView` boundary matches `§The ownership boundary`'s reversed (final) disposition.** The class (`src/sortable/rect-index.ts:157`) declares its four mutable fields directly (`values`, `hole`, `items`, `count`, no accessors); `RectIndexView` (line 96) re-declares the same four as readonly/content-readonly with no method members, so it stays outside the gate's reach by design rather than by accident. `linear-shift.ts` holds both `#index: RectIndex` and `#view: RectIndexView` (the module that drives the operations); `xy.ts` and `y.ts` narrow to `RectIndexView` only.
- **`LinearShift` carries no liveness state**, matching the record: `grep -n "live" src/sortable/linear-shift.ts` shows `live` only as a forwarded parameter/closure argument, never a field, with the module's own doc comment stating the property explicitly (`src/sortable/linear-shift.ts:101-105`).
- **Public surface is internally consistent.** `src/kernel.ts` exports `BehaviorContext` (not `KernelHost`); `README.md`'s vocabulary table lists `BehaviorContext (~~KernelHost~~ — D-170 §The behavior-facing interface)`; `tests/kernel/vocabulary.node.test.ts` lists `'BehaviorContext'`. `kernel/kernel.ts` is not in `package.json`'s `exports` map (only `./kernel.js` is), and `src/kernel.ts` is its only importer — the entity the record says crosses no tier does not.
- **Root tooling reaches the package.** `Justfile`'s `lint`/`lint-fix` recipes list `drag2` among nine projects, matching the record's claim about the selector fix.
- **`CONTRIBUTING.md` is untouched** in the range — F-300 (deferred, not promoted to §10) was not silently closed by this arc.
- **Typecheck, lint, and the Node test suite are clean on the shipped tree**: `npx just typecheck` exits 0; `npx just lint-fix src/` exits 0 with no findings; `npx vitest run --project node` — 21 files, 339/339 passing.

## Method

Direct reading of `src/` at `b73b6779` against the current D-170 entry's own text, member-by-member for the interface/class surface and grep-verified for every "no X remains" claim; `git diff`/`git show` against `261a3a16` to establish which files the arc actually touched, used specifically to catch the `host`/`kernel` finding above (a claim about _every_ thread, which a diff of the arc's own file list can falsify). One repo-wide search each for `KernelHost` and for cross-package dependence on `drag2` (`material-x`, `packages/drag/package.json`'s dependency list). Live verification, not inference from the record's prose: `npx just typecheck`, `npx just lint-fix src/`, and `npx vitest run --project node` were all run against the actual working tree at `b73b6779`, not assumed from the record's own account of a prior run.

LSP plugin - unavailable: `ToolSearch` for an LSP/language-server tool returned no matching tool in this session (only unrelated Figma tools matched). Every check here is direct grep/read/diff against exact text at exact lines across the current tree and `261a3a16`, which those tools answer directly without needing symbol-level references or call hierarchies.