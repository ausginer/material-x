# Flattener brand row that failed once — plan

**Status: steps 1 and 2 done, and the cause is found. Step 3 is replaced** by the [ruling of the same day](#ruling-on-step-3-with-the-cause). Written by the architect on 2026-11-19, on the coordinator's task, on `repo/traits-flaky-1` at `91fc5d662` (`origin/main`). The owner approved it, and Implementer B ran steps 1 and 2 (`05cb93d52`, `c540e3efe`). The architect revised it at `c540e3efe` for the cause. It plans `repo:RF-60`. **No identifier is minted and no record is edited:** the main slot's architect owns `RF-60`'s entry and the index, and [Proposed record changes](#proposed-record-changes) lists what this plan asks of them.

Canonical entry: `RF-60` — a flattener runtime-equivalence row failed once in CI with no change, and its cause isn't established ([`00-index.md`](../00-index.md)). Its required property: the row's result depends only on the code. Either a reproduction names the cause and the cause is repaired, or the record states why the row can't fail again.

## What is established

- **The row and what it checks.** `tests/flatten.node.test.ts`, _"should preserve trait brands for instanceof"_, checks the composed and the flattened `Foo` against `Checkable` and `Nameable`. The test imports those two traits itself. A trait's `instanceof` reads the instance's property keyed by the trait's brand symbol (`abstractTrait` in `packages/core/src/traits/primitives.ts`). Each fixture creates its brand with `Symbol('…')` when its module is evaluated, so every evaluation of `nameable.ts` creates a different symbol. The flattened class installs both brands in a static block, under keys that it imports from the generated trait modules ([generated output](checks/rf60-generated.txt)):

  ```ts
  import { __mxflat_$nameable_d7b7babf as __mxflat_lnk_7a4fb491 } from "./nameable.ts";
  …
  static { Object.defineProperties(this.prototype, { [__mxflat_lnk_6fda5f37]: { value: true }, [__mxflat_lnk_7a4fb491]: { value: true } }); }
  ```

- **What the failure says, and what it doesn't.** In the failing attempt, the composed form passed both assertions, and the flattened form passed `Checkable` and failed `Nameable`. So the test's `Nameable` and the composed class used one evaluation of `nameable.ts`, and the flattened prototype lacked that evaluation's symbol. The message ends with _"to be an instance of "_ and no name ([excerpt](../traits-plugin-1/checks/rf60-flatten-flake.txt)). That is normal: a trait is the anonymous arrow function that `abstractTrait` returns. The entry's _"an instance of Nameable"_ quotes the source line, not the message.
- **Two candidates explain it. Neither is established:**
  - **(A) The link read `undefined`.** The brand was then installed under the key `"undefined"`. This is `RF-60`'s candidate. Vitest's runner doesn't check that a named import exists: `processImport` returns the exports as they are ([runner reading](checks/rf60-runner-reading.txt) §1). But the runner hands out a module's unfinished exports only when it detects a cycle (§2), and these imports have none. So (A) needs the generated `nameable.ts` to lack its synthetic export in that run. The generator is deterministic code over fixed fixtures, and no run has shown that.
  - **(B) The link read a second symbol,** from a second evaluation of `nameable.ts`. The runner evaluates a file again when the server answers `invalidate: true` for a module it already holds. The server answers that while it has no transform result for the module, and the runner deduplicates requests only by their URL string (§3). The test imports the trait as `file://…/nameable.ts`, and `foo-flat.ts` imports it by a relative path. In `vitest run` no file watcher runs (§4), so no file event causes the invalidation. A probe that delayed the generated module's transform by 300 ms to 2 s still evaluated it only once ([delay probe](checks/rf60-delay-probe.txt)). So a slow transform alone doesn't trigger (B). Which URL strings are in flight wasn't settled.
- **Not reproduced.** At `91fc5d662`, the plugin's whole project ran under the root configuration with coverage, as CI's `chromium` job runs it ([repetitions](checks/rf60-repetitions.txt)). 150 runs failed 0 times, and 44 runs beside 24 busy-loop processes failed 0 times. The entry's 40 runs at `c1a40a3fc` also passed. The failing tree's lockfile has the same Vite (8.4.0-beta.1) and Vitest (5.1.0) as `main`.
- **Only this describe block imports a trait module itself,** in one `Promise.all` with the composed and the flattened consumers. Three other places import the two consumers with `Promise.all`, and those consumers share trait modules: the second block of `flatten.node.test.ts`, `flatten-composite.node.test.ts`, and `flatten-method.node.test.ts`'s `loadForms`, which its five blocks share. Their assertions compare the two forms. They don't compare against a separately imported trait.

## The plan

Three steps, in this order, by the implementer, in tests only. **Size: small.** It changes the imports in four places in three test files, adds one failure message, and includes a time-boxed reproduction. **The cause: not known yet.** It depends on whether step 2 reproduces it.

### Step 1: the row reports what it needs

When either brand assertion fails, its message contains, for the form that failed:

- the generated `foo-flat.ts` and the generated trait modules (`checkable.ts`, `nameable.ts`) as written to disk;
- the flattened prototype's own keys, each as `"string"` or `Symbol(description)`;
- for each trait, whether its `brand` is one of those keys.

The message tells the candidates apart. A `"undefined"` key is (A), and the generated `nameable.ts` then shows whether its synthetic export was written. A `Symbol(Nameable)` key that isn't `Nameable.brand` is (B). A passing run prints nothing extra, and the assertions don't change. The implementer chooses how, for example a helper on `Flattening` that returns these facts and is used as the assertion's message. `RF-60`'s direction already asked for this.

### Step 2: a time-boxed reproduction, before anything else changes

With step 1 in place and the imports still concurrent, the implementer runs the block's setup and assertion many times in one worker. For example, a scratch test, not committed, repeats `flattenToDir` and the four concurrent imports 1,000 times in fresh directories, with coverage, beside busy-loop load. The implementer also finds the path by which Vitest's project server fetches modules, and records the URL strings that the four imports and the consumers' imports send. The architect's hook on `server.environments.ssr.fetchModule` recorded nothing.

- **Time box:** about one hour of the implementer's work. A reproduction names the cause through step 1's message, and the unit records it.
- **If the cause is in Vite or Vitest,** the unit records the smallest reproduction. A report upstream is the owner's decision, because it writes to GitHub.
- **If nothing reproduces,** the unit records the attempt, and step 3 still applies.

### Step 3: the imports don't overlap

**Replaced by the [ruling on step 3](#ruling-on-step-3-with-the-cause), with the cause known.** The text below is the step as the owner approved it.

The four places that import generated modules with `Promise.all` import them one at a time, dependencies first. In the brand row's block, that is the trait modules, then the composed consumer, then the flattened consumer. The other three places import the composed consumer, then the flattened one.

- **Why this makes the result depend only on the code.** With one request at a time, each module that a consumer imports is fully evaluated, and its transform result is on the server, before the consumer is requested. Both candidate paths need a request for a module whose evaluation or transform is still pending: an unfinished module through a cycle for (A), or a second evaluation through `invalidate` for (B). What remains is the generated text, which is deterministic over fixed fixtures, and a runner that resolves one request at a time. If the row fails after this, step 1's message shows the generated files and keys, and that is a defect that every run with the same text shows.
- **Cost:** the four imports' time, a few milliseconds.
- **It doesn't repair the plugin,** because no fault in the plugin is shown. If step 2 finds one, the repair replaces this step's argument.

### Ruling on step 3, with the cause

By the architect, 2026-11-19, at `c540e3efe`.

**The cause.** Candidate (B): Vite's module runner can evaluate one file twice when it is requested under two URL strings at the same time.

- **In the implementer's reproduction** ([reproduction](checks/rf60-reproduction.txt)), 8 of 1,000 loaded repeats failed, all of them (B).
  - Every failure is in the group where the test's `import(gen.url('nameable.ts'))` sent `file:///…/gen-X/nameable.ts`, a consumer's `./nameable.ts` sent `/tests/fixtures/gen-X/nameable.ts`, and both answers carried `invalidate: true`.
  - 1,522 trait loads under one URL string failed 0 times.
- **The same happens with Vite alone,** without Vitest and without load ([Vite-only](checks/rf60-vite-only.txt)).
  - With file URLs, 12 to 50 of 1,000 repeats evaluated the module twice.
  - With one URL string for both imports, 0 of 4,000 did.
- **The mechanism** is [the runner reading](checks/rf60-runner-reading.txt)'s §3:
  - in-flight requests are deduplicated only by their URL string;
  - the server answers `invalidate: !cached` while it holds no transform result;
  - the runner applies that answer to a module node that it is already evaluating.
- **The flattener and the generated text play no part.** The defect is in Vite 8.4.0-beta.1, which this repository pins, and Vitest 5.1.0 reaches it. The [upstream draft](upstream-vite-issue.md) is for the owner to decide on.

**The ruling: one URL string per file, not serialized imports.** The defect needs two URL strings for one file. Removing that condition repairs the row directly, whatever the timing. Serialized imports also avoid the defect today: the second request arrives after the server holds the transform result, so it is answered `invalidate: false`. But they keep two URL strings, and they depend on the order in which `invalidate` is computed, which is the defective code. The next `Promise.all` would reopen it. So **step 3's serialization is withdrawn**, and the concurrent imports stay.

These properties hold after the repair. The implementer chooses the code.

1. **A test imports a generated module by its file URL only when no other module imports it.** The consumers `foo-composed` and `foo-flat` qualify. A test reaches a module that a consumer also imports, such as a trait module, only through a static relative import from a generated module, so that the URL string matches the consumer's. Two places break the rule now:
   - **`flatten.node.test.ts`'s brand row block** imports `checkable.ts` and `nameable.ts` by file URL, concurrently with the consumers. This one fails.
   - **`flatten-method.node.test.ts`'s first block** imports `forwarding.ts` by file URL, after its consumers have finished. By the reading, that's safe today, because the server then holds the transform result. It breaks the rule, so it changes too.

   For example, `flattenToDir` could write an entry module that re-exports what a test needs from the generated modules by relative specifiers, and the test would import that entry by its file URL. Any shape that keeps one URL string per file is fine.

2. **The helper states the rule and its reason** in `flattenToDir`'s documentation: Vite's module runner can evaluate a file twice when it is requested under two URL strings at once (`repo:RF-60`). A test that needs a module that a consumer imports gets it through the generated modules, not by its own file URL.
3. **Step 1's message stays.** A future failure of the brand row still names its candidate.
4. **No other test needs to change.** The other places that use `Promise.all` import only the two consumers by file URL. Each file those consumers share is requested under one URL string, and the reproduction's 1,522 trait loads under one URL string never failed. No other test in the repository imports a module by a file URL that another module imports (searched at `c540e3efe`: `import(` with `gen.url`, `pathToFileURL`, `.href` or `new URL` in `packages/*/tests` and `.scripts`).

**Why the row can't fail again.** After the repair, every generated file that two importers reach is requested under one URL string. The runner deduplicates concurrent requests for that string, and it reuses the evaluated node for later requests. The defect then has no second string to start from. What remains is the generated text, which is deterministic. If the row fails anyway, step 1's message names the candidate.

### Not adopted

- **Serialized imports** (the approved step 3). They avoid the defect by timing and keep its precondition. See the ruling.
- **Both: one URL string and serialized imports.** Serialization adds nothing once each file has one URL string.
- **Waiting for a Vite fix.** The repair is needed whether or not the owner reports it, and it costs one helper shape. When Vite is fixed, the rule still keeps the tests independent of it.
- **Importing the generated modules natively, outside Vitest's runner.** It would avoid the runner's paths, but the tests then load modules differently from every other test, and it needs a loader for the `.ts` files the tests generate.
- **Retrying the row.** A retry hides a result that depends on more than the code, which `RF-60` exists to prevent.
- **Waiting for another CI failure.** It costs a full gate run each time and still says nothing until step 1 exists.

## How a reviewer proves it

1. **Step 1 discriminates.** Two mutations, each reverted:
   - remove the synthetic export from the generated `nameable.ts` before the imports, for example by writing the fixture unchanged: the message shows the key `"undefined"` and a `nameable.ts` without `__mxflat_$nameable_…`;
   - give the test's `Nameable` a second evaluation of `nameable.ts`, for example by importing it with a query string such as `?second`: the message shows a `Symbol(Nameable)` key, and that `Nameable.brand` isn't among the keys.

   Save both messages.

2. **Step 2's record:** the scratch test's text, the counts, the load, and the URL strings, or the cause when one is found.
3. **The ruling's repair, by reading.** No test imports by file URL a generated module that another module imports. The brand row's block and `flatten-method.node.test.ts`'s first block reach their traits through generated modules. Every assertion is unchanged.
4. **The ruling's repair, by the reproduction.** Step 2's scratch test runs again with the repaired import shape: 1,000 repeats, loaded, with coverage, and the URL reporter. Expected:
   - 0 failures;
   - in the URL log, no generated file requested under two URL strings, where the run before the repair had 478 such pairs.

   The URL log is what discriminates. A clean count alone wouldn't, at 8 in 1,000.

5. **The precondition is the cause.** Restore the trait import by file URL in the scratch copy only. The URL log shows two URL strings for the trait modules again.

Save 3 to 5 in `checks/`.

## What the closure needs

`RF-60` closes when:

- the ruling's properties 1 to 3 are merged;
- witnesses 1 and 3 to 5 are saved, and a feature proof has read them;
- the record states the cause, Vite's module runner as [Ruling on step 3](#ruling-on-step-3-with-the-cause) describes it, and why the row can't fail again.

**An upstream report isn't a closure condition.** The owner decides on it. If it's posted, the record links it. When a fix lands in a Vite release, the rule in the helper stays, because it costs nothing and keeps the tests independent of the runner's handling of URL strings.

## Proposed record changes

For the main slot's architect. This plan doesn't edit them.

- **`RF-60`, _What was observed_:** the message reads _"…to be an instance of "_ with no name, because a trait is an anonymous function. _"Nameable"_ in the entry's quote is the source line's.
- **`RF-60`, _A candidate_:** add candidate (B), a second evaluation of `nameable.ts`, with this plan's reading of the runner. Add that (A) needs the generated module to lack its export, because the runner hands out unfinished exports only on a cycle, and these imports have none.
- **`RF-60`, _Not reproduced_:** add 150 runs and 44 runs under load at `91fc5d662`, under the root configuration with coverage, and the delay probe.
- **`RF-60`, _The architect's direction_:** link this plan, its three steps, its witnesses and its closure.

**Revised at `c540e3efe`, with the cause.** These changes supersede the second and third bullets above.

- **`RF-60`, the cause, which replaces _A candidate, not established_ and _Not reproduced_.** Candidate (B) is reproduced. It is a second evaluation of a trait module, so the flattened class carries another `Symbol(Nameable)` or `Symbol(Checkable)` than the test's trait.
  - **Rates:** 8 of 1,000 loaded repeats with coverage. Every failure is where one file was fetched under two URL strings and both answers carried `invalidate: true`.
  - **Vite alone reproduces it:** 12 to 50 of 1,000 unloaded repeats with file URLs, and 0 of 4,000 with one URL string.
  - **The defect is in Vite 8.4.0-beta.1's module runner,** with the mechanism in three steps (the ruling). Vitest 5.1.0 reaches it.
  - **(A) wasn't seen** in any failure.
  - **Keep the record of** the 194 unreproduced runs and the delay probe.
- **`RF-60`, the repair:** the ruling's properties 1 to 4. Step 3's serialization is withdrawn.
- **`RF-60`, why it can't fail again:** the ruling's last paragraph. It meets the required property's first branch: a reproduction names the cause, and the cause's precondition is removed from the tests.
- **`RF-60`, upstream:** a draft at [upstream-vite-issue.md](upstream-vite-issue.md). vitejs/vite#24062 is related but not a duplicate. Posting is the owner's decision.
- **The tier stays B** until the repair merges.