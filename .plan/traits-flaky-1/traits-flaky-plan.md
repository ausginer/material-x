# Flattener brand row that failed once — plan

**Status: proposed.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/traits-flaky-1` at `91fc5d662` (`origin/main`). It plans `repo:RF-60`. **No identifier is minted and no record is edited:** the main slot's architect owns `RF-60`'s entry and the index, and [Proposed record changes](#proposed-record-changes) lists what this plan asks of them.

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

The four places that import generated modules with `Promise.all` import them one at a time, dependencies first. In the brand row's block, that is the trait modules, then the composed consumer, then the flattened consumer. The other three places import the composed consumer, then the flattened one.

- **Why this makes the result depend only on the code.** With one request at a time, each module that a consumer imports is fully evaluated, and its transform result is on the server, before the consumer is requested. Both candidate paths need a request for a module whose evaluation or transform is still pending: an unfinished module through a cycle for (A), or a second evaluation through `invalidate` for (B). What remains is the generated text, which is deterministic over fixed fixtures, and a runner that resolves one request at a time. If the row fails after this, step 1's message shows the generated files and keys, and that is a defect that every run with the same text shows.
- **Cost:** the four imports' time, a few milliseconds.
- **It doesn't repair the plugin,** because no fault in the plugin is shown. If step 2 finds one, the repair replaces this step's argument.

### Not adopted

- **Importing the generated modules natively, outside Vitest's runner.** It would avoid the runner's paths, but the tests then load modules differently from every other test, and it needs a loader for the `.ts` files the tests generate.
- **Retrying the row.** A retry hides a result that depends on more than the code, which `RF-60` exists to prevent.
- **Waiting for another CI failure.** It costs a full gate run each time and still says nothing until step 1 exists.

## How a reviewer proves it

1. **Step 1 discriminates.** Two mutations, each reverted:
   - remove the synthetic export from the generated `nameable.ts` before the imports, for example by writing the fixture unchanged: the message shows the key `"undefined"` and a `nameable.ts` without `__mxflat_$nameable_…`;
   - give the test's `Nameable` a second evaluation of `nameable.ts`, for example by importing it with a query string such as `?second`: the message shows a `Symbol(Nameable)` key, and that `Nameable.brand` isn't among the keys.

   Save both messages.

2. **Step 2's record:** the scratch test's text, the counts, the load, and the URL strings, or the cause when one is found.
3. **Step 3:** the four places import one module at a time, dependencies first, and every assertion is unchanged, by reading. The plugin's project passes repeated runs under the root configuration with coverage. Repetition doesn't discriminate, because the original passed 194 times. The reviewer states that, and relies on the argument and on step 1.

## What the closure needs

`RF-60` closes when steps 1 and 3 are merged, the reviewer has proved them, and the record states one of these:

- **the cause,** from step 2, with its repair, or with step 3 as the repair when the cause is the runner's concurrency;
- **the argument** in step 3 for why the row can't fail again, the reproduction attempt, and that a further failure prints its cause.

The second branch meets the required property's _"the record states why the row can't fail again"_. The main architect judges that.

## Proposed record changes

For the main slot's architect. This plan doesn't edit them.

- **`RF-60`, _What was observed_:** the message reads _"…to be an instance of "_ with no name, because a trait is an anonymous function. _"Nameable"_ in the entry's quote is the source line's.
- **`RF-60`, _A candidate_:** add candidate (B), a second evaluation of `nameable.ts`, with this plan's reading of the runner. Add that (A) needs the generated module to lack its export, because the runner hands out unfinished exports only on a cycle, and these imports have none.
- **`RF-60`, _Not reproduced_:** add 150 runs and 44 runs under load at `91fc5d662`, under the root configuration with coverage, and the delay probe.
- **`RF-60`, _The architect's direction_:** link this plan, its three steps, its witnesses and its closure.