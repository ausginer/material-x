# Code-discipline review — test-execution redesign

**Read at commit:** `7aeaff260` (head of `drag2/fin-review`).
**Range under review:** `67af05288..7aeaff260` (`c1cab3031` implementation, `7aeaff260` doc-only reconciliation — confirmed by `git show --stat 7aeaff260`: one file, the r4 record, touched; no source changed in the second commit).
**Canonical contract read:** `.plan/test-execution-1/architect-test-execution-model-r4.md` at `7aeaff260`, and `.plan/test-execution-1/implementer-test-execution-model.md`.

## Lens

Machinery the code's own current responsibility does not require, against `CONTRIBUTING.md` (read in full — both parts) and `.agents/docs/documentation.md` §5. Part II ("Code of Size") is scoped to the library packages that ship a bundle; I applied it in full to `packages/vite-custom-element-assets` (a published workspace package) and treated `.scripts/*`, the root `Justfile`/`package.json`, `.vscode/settings.json` and `.agents/docs/*` as repository tooling and documentation, where Part I (style, comments) still binds but Part II's bundle-size machinery tests (§1–§18) do not, since none of it ships in an npm tarball.

## Scope

Read in full: `.scripts/vitest-config.ts`, `.scripts/vitest-one-shot.ts` (new), `.scripts/zed-test.sh`, `Justfile`, `package.json`, `.vscode/settings.json`, `.agents/docs/test-architecture.md`'s new §Run lifecycle, `.claude/skills/test-component/SKILL.md`'s addition, and every changed file under `packages/vite-custom-element-assets` (`src/index.ts`, `src/css/generation.ts` [new], `src/css/css-worker.ts`, `src/css/deps-tracker.ts`, `tsdown.config.ts`, `files.json`, `package.json`). Read the full `architect-test-execution-model-r4.md` diff and cross-checked every non-obvious code claim against it. Did **not** re-derive the memory/timing measurements (TE-F33–TE-F35) — that is evidence-quality territory for a different lens, not machinery-justification.

One mechanical claim I chased down and found **wrong** before writing it up, recorded here because it shaped what I did and did not report: `generation.ts`'s `assets` URL is resolved via `import.meta.resolve('@ydinjs/vite-custom-element-assets/package.json')` rather than `new URL('.', import.meta.url)`. I suspected this was defensive over-engineering, since `tsdown.config.ts` declares `css/generation` as its own build entry and I expected that to guarantee a stable `css/generation.js` output path making the indirection unnecessary. I built the package and read the actual output: `css/generation.js` is a two-line re-export stub, and the real bundled code lives in a content-hashed shared chunk (`generation-DrkXC8J5.js`) **at the package root**, next to `index.js` — because Rolldown hoists code shared between two importers (`index.js` and the `css/generation.js` stub) to their common ancestor. The module's own build-time location genuinely is not fixed, so the indirection is required. No finding there.

## Findings

### cleanup-1 — `evaluate()`'s returned `deps` set is copied on every call with no ownership reason (Tier C)

**Current behavior.** `packages/vite-custom-element-assets/src/css/generation.ts:181-192`:

```ts
export async function evaluate(path: string): Promise<EvaluationResult> {
  current ??= create();
  const generation = current;
  const id = (requests += 1);
  const code = await new Promise<string>((resolve, reject) => {
    generation.pending.set(id, { resolve, reject });
    generation.worker.postMessage({ id, path });
  });

  return { code, deps: new Set(generation.deps) };
}
```

`generation.deps` is one `Set<string>` shared and monotonically grown across every `.css.ts` entry the generation serves (populated asynchronously via the `deps-tracker` port listener in `create()`). `evaluate()` allocates a **fresh full copy** of it on every call.

Its only caller, `packages/vite-custom-element-assets/src/index.ts:208-215` (confirmed the single call site by grep — `evaluate(` appears nowhere else in `src/`):

```ts
const { code: source, deps } = await evaluate(cleanId);
entries.add(cleanId);
for (const dep of deps) {
  tracked.add(dep);
  this.addWatchFile(dep);
}
```

iterates the returned set exactly once, synchronously, immediately after the `await` resolves, and merges each member into its own long-lived `tracked` set. It never retains the reference `evaluate()` handed back.

**Why it is a problem.** `CONTRIBUTING.md` §9: "Do not copy data defensively by default. A copy is justified when the library must take ownership, stabilize a snapshot across consumer mutation, or enforce an actual lifecycle boundary." None of the three applies here. JavaScript is single-threaded and nothing runs between the `await` settling and the caller's `for` loop, so a live `ReadonlySet<string>` reference would present the exact same members the copy does — there is no consumer mutation to stabilize against, because the one consumer only reads. The design's own stated model (the comment at `index.ts:148-153`, "Every entry depends on the generation's whole set") argues a live reference would in fact be the _more_ accurate value here, not less: `tracked`'s whole purpose is to converge on the generation's complete dependency set as more entries evaluate, which a live reference tracks and a snapshot does not need to, since it's read once immediately regardless.

**Evidence.** Traced by reading: `deps: new Set(generation.deps)` at `generation.ts:191`; single call site at `index.ts:208`; the merge loop at `index.ts:212-215` with no retained reference afterward; `EvaluationResult.deps` typed `ReadonlySet<string>` (compile-time-only, does not require a runtime copy). 35 `.css.ts` files exist in the repo today (`find packages -name '*.css.ts' | wc -l`), so each generation performs up to 35 full-set copies, each sized at the generation's accumulated dependency count at that point — real but modest allocation given current repo size; the point is the copy buys nothing regardless of magnitude, not that the magnitude is currently alarming.

**Required property.** A value returned from an internal function with one immediate, non-retaining consumer should not be defensively copied absent a stated ownership, snapshot, or lifecycle reason (§9). Either state the reason (if one exists that I have not found) or return the set by reference.

### cleanup-2 — the per-request id counter is scoped wider than anything reads its uniqueness (Tier C, minor)

**Current behavior.** `generation.ts:47` declares `let requests = 0;` at module (process) scope, and `evaluate()` (`:185`) does `const id = (requests += 1);` to key `generation.pending`. Every `Generation` object carries its **own** `pending: Map<number, Pending>` (`:20`, `:85`), and each generation's `worker.on('message')` handler (`:102-137`) only ever calls `pending.get(response.id)` against _that_ generation's own map — confirmed by reading `create()` in full: the closures over `pending` and `deps` are per-generation, never shared or compared across generation instances.

At most one `Generation` is ever `current`, but a **superseded** generation can stay alive concurrently with the new `current` one while its own in-flight requests drain (`settle()`'s `current !== generation && generation.pending.size === 0` branch at `:60-67` exists precisely for this overlap — I initially misread this as dead code and re-traced it: the module-failure path at `:122-124` sets `current = undefined` directly, without routing through `fail()`, specifically so a poisoned generation's _other_ in-flight requests finish naturally rather than being force-rejected; that is a real, load-bearing branch, not a defect). During that overlap, two live generations exist, each with its own map — so nothing anywhere compares an id from one generation's map against another's.

**Why it is a problem.** A counter's scope should match what actually needs its guarantee (repository priority: readability serves the next reader who has to establish this, per the "seriously consider inlining"/"be suspicious of state wider than its use" thrust of Part II §2 and §5, applied here to a plain variable rather than a function). A `let requests = 0` local to `create()` — reset per generation — would supply everything `pending.get(id)` actually needs (uniqueness within one generation's own map) without asserting a cross-generation uniqueness guarantee that nothing consumes. As written, the module-level counter reads as though ids must be distinguishable across generations, which is not the case and could mislead a future reader into thinking cross-generation id comparison is meaningful somewhere.

**Evidence.** `generation.ts:47` (declaration), `:185` (increment/use), `:20`/`:85` (per-generation `pending` map), `:102-137` (per-generation closure doing the only lookup). No code anywhere reads or compares `id`/`requests` across two `Generation` objects.

**Required property.** A mutable counter's declared scope should be no wider than the invariant it is asserting requires — here, generation-local uniqueness, not process-lifetime uniqueness.

## Null results (explicitly, from this lens)

- **`packages/vite-custom-element-assets/src/css/generation.ts`'s `settle`/`fail`/`dispose` state machine** (module-level `current`, per-generation `pending`, the `current !== generation` disposal branch, `consumers` reference count): read in full and traced every transition by hand. Every piece of state is read by some branch and no branch is unreachable — including the one I initially suspected was dead (see cleanup-2's discussion). `consumers` is not a duplicate of anything: it is the only place that knows how many plugin instances (one per project/config sharing a process, matching the group's documented shared-process design) are still using the process's one generation, which is exactly what `closeBundle`'s "last consumer to leave terminates it" needs. No finding.
- **`css/generation.ts`'s `assets` URL indirection**: verified by building the package and reading the actual chunk output — required by real bundler behavior, not gratuitous (detailed above). No finding.
- **`.scripts/vitest-one-shot.ts` (`OneShotTestExecution` reporter)**: the `#consumed` single-run guard, the `#released`/reuse-after-teardown guard, and the `groupOrder` "erased" validation are all defensive checks reachable through legitimate platform/editor behavior the architect record independently investigated and cites by call-site enumeration (TE-F21, TE-F27, TE-F30) — VS Code Continuous Run, a `--sequence.*` CLI flag replacing the configured sequence object wholesale. These pass CONTRIBUTING §1.1's reachability gate on "the platform did it" / "the end user did it," and clause (b) is live because a silently-wrong teardown would leave Chromium processes running under the library's own name. This machinery is a legitimate protocol boundary (§10/litmus test: a real state transition the code owns), not nannying. No finding. (Part II's bundle-size tests do not bind this file regardless, since it is never published — noted for completeness, not as the basis of the null result.)
- **`.scripts/vitest-config.ts`'s `assignGroupOrder`, `resolveRequestedWorkers`, `BROWSER_WORKERS`/`NON_BROWSER_WORKERS`**: each is used at multiple call sites or computes a single module-scope constant with a stated, measured derivation (the architect record's TE-F34 table). Not single-use abstractions in the §2.1 sense, and Part II does not bind this file. No finding.
- **`css-worker.ts` / `deps-tracker.ts`**: the rewritten message-loop worker (persistent listener instead of one-shot import) and the `resolve` hook filtering on `resolved.url.startsWith('file:')` instead of `specifier.startsWith('.')` are both direct implementations of the contract's own stated findings (TE-D13, TE-F18) rather than machinery added beyond it. The `Request`/`Response` shapes are declared independently on each side of the worker-thread boundary rather than imported from one shared module; this is expected for two files that execute in different runtime contexts (main thread vs. worker) and are never bundled together, not a duplicated concept in the sense this lens is looking for. No finding.
- **Comments and JSDoc** (`.agents/docs/documentation.md` §5): read every added/changed comment in the diff for history-narration and provenance language (`used to`, `was changed`, `previously`, D-/F-/TE- pointers). None of the source-file comments (`.scripts/*`, `packages/vite-custom-element-assets/src/*`) carry planning bookkeeping or narrate history; they state present-tense invariants and reasons (e.g. the `NON_BROWSER_WORKERS` comment states the oversubscription reason and a measured figure, not that a decision was made or superseded). The bare `TE-Fxx` references live only in the `.plan` record, which is exactly where `documentation.md` and `CONTRIBUTING.md` §"Reading one entry of a record" say they belong; none reached a source comment or a published `.d.ts`. No finding.
- **`packages/vite-custom-element-assets/package.json`**: `@preact/signals-core` was removed as a dependency; confirmed by grep that no remaining source file imports it. Correct — not a finding, noted only because it is the kind of "dead export/dependency" check this lens exists to catch, and it was already caught by the change itself.

## Worktree hygiene

`git status --porcelain=v1` is empty at the end of this review — no tracked file in `/workspaces/material-x` was modified. The only write I performed was a `just build` inside `packages/vite-custom-element-assets` to inspect real bundler output for cleanup-1's due diligence, which writes to that package's already-gitignored build output (`index.js`, `css/*.js`, the hashed chunk files — all pre-existing untracked/build artifacts, not tracked files) and this report file itself. No destructive or mutation-capable experiment was needed for this lens, so no separate worktree was used.
