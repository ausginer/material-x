# RF-60's repair: one URL string per generated file — feature proof

**Files were read at:** `446b21bd6` (`repo/traits-flaky-1`, in a detached scratch worktree that was clean before the probes). **Commit reviewed:** `446b21bd6` (the repair and its proof). Step 1's message is read as it stands at that head, from `05cb93d52`. **Records read at the same commit.**

**Governing records:** the [plan](../../traits-flaky-1/traits-flaky-plan.md), with step 3 replaced by its _Ruling on step 3, with the cause_ (`144e053a3`), the ruling's properties 1 to 4, and _How a reviewer proves it_; the implementer's [repair proof](../../traits-flaky-1/checks/rf60-repair-proof.txt) and [reproduction](../../traits-flaky-1/checks/rf60-reproduction.txt); `RF-60` in [`00-index.md`](../../00-index.md).

**Lens:** feature proof, on the coordinator's task. Each claim below is my own reading of the tree or of a local probe, unless it says otherwise. Nothing is repaired, and no record is amended. Written on 2026-11-19.

**Scope:**

- the ruling's properties 1 to 4, and step 1, against the code;
- the by-reading claim that no file-URL import reaches a module that another module imports;
- whether the repair proof discriminates;
- whether `augmented.ts` changes what any other row tests.

**Not in scope:** the cause itself (the Vite-only reading and the runner reading), the upstream draft, `RF-60`'s record changes and its closure.

**Verdict: the repair meets properties 1 to 4, step 1's message still tells (A) from (B), and the proof discriminates. I re-ran it at the committed head. No findings: no Tier A, B or C defect.**

## Properties checked

1. **A test imports a generated module by its file URL only when no other module imports it.** **Confirmed.**
   - `gen.url(…)` is now called only with `foo-composed` and `foo-flat`:
     - `flatten.node.test.ts:26`, `:27`, `:117` and `:118`;
     - `flatten-composite.node.test.ts:33` and `:34`;
     - `flatten-method.node.test.ts:20` and `:21`.

     No generated module imports a consumer.

   - The two places that the ruling names now reach their traits through `gen.augmentedUrl`: the brand row's block (`flatten.node.test.ts:28`, still in the `Promise.all` with the consumers) and `flatten-method.node.test.ts`'s first block (`:43`).
   - `augmented.ts` is `export * from './<name>';` for each `augment`ed module (`helpers.ts:198`–`:203`). The consumers import the same files as `./checkable.ts`, `./nameable.ts` and `./forwarding.ts`. Nothing imports `augmented.ts`.
   - **Observed:** in my repaired run, `augmented.ts`'s imports arrive as `/tests/fixtures/gen-X/checkable.ts` and `/tests/fixtures/gen-X/nameable.ts`. Those are the consumers' strings, and each trait has exactly one request per directory. See §1 of my [re-proof](checks/rf60-repair-reproof.txt).
   - **Re-exports:** checkable, nameable and forwarding export no name in common: `CHECKABLE_ATTRS`, `Checkable`, `NAMEABLE_ATTRS`, `Nameable`, `Forwarding`, `useForwarding`, and hashed synthetic names. So `export *` drops nothing that the tests read.
2. **The helper states the rule and its reason.** **Confirmed.**
   - `flattenToDir`'s documentation (`helpers.ts:140`–`:145`) states the mechanism: two URL strings at once, a second evaluation, a second brand. It names `repo:RF-60` and the rule, one URL string per file.
   - `Flattening.url`'s documentation (`:103`–`:107`) restricts it to the consumers and points to `augmentedUrl`.
3. **Step 1's message stays.** **Confirmed.** `brandReport` and the row's message are unchanged by `446b21bd6`. I re-ran the plan's two step 1 mutations at the head, against the repaired imports (re-proof §2):
   - **(A),** the generated `nameable.ts` written without its synthetic export: the flattened form fails, the chain carries `"undefined"`, `Nameable.brand` is absent, and the printed `nameable.ts` has no `__mxflat_$nameable_` export.
   - **(B),** `Nameable` taken from `?second`: the composed form fails, and its chain carries a `Symbol(Nameable)` that isn't `Nameable.brand`.
4. **No other test needs to change.** **Confirmed.** `446b21bd6` changes only `helpers.ts`, the brand row's block and `flatten-method.node.test.ts:43`. The other `Promise.all` places import only the two consumers by file URL: `flatten.node.test.ts`'s second block, `flatten-composite.node.test.ts` and `loadForms`.

## The by-reading claim

**Confirmed.** No dynamic import in `packages/*/tests` or `.scripts` reaches a module through Vite's module runner by a file URL while another module imports it.

- I listed every `import(` in `packages/*/tests` and `.scripts` whose specifier isn't a string literal, with the fixtures excluded. The result matches the repair proof's list, plus three `.scripts` entries that its pattern didn't catch:
  - `.scripts/oxlint-migrate.ts:92` imports `.oxlintrc.json`;
  - `.scripts/css/collect-props.ts:21` and `.scripts/css/debug.ts:30` import source files by path.

  All three run natively in Node, outside Vitest's module runner, like `.scripts/package-files.ts:59`, which the proof names.

- `polyfills.browser.test.ts:19` imports `src/core/utils/polyfills.ts` with `?fresh-import` in a browser project. There, `import.meta.url` is the dev server's `http:` URL, and the query makes it a distinct module on purpose. It is outside the runner path that the defect is in.
- I also searched for other loading paths: `importActual`, `importMock`, `createRequire`, `require(` and `vi.mock(`. The only hit in a test is `vi.mock('../src/DB/index.ts', …)` in `packages/tproc/tests/setup.ts`. That is a mock registration, not a second import.

## Does the proof discriminate

**Yes, through the URL log and through the failure count.** I re-ran the implementer's proof at `446b21bd6`. The implementer's ran at `144e053a3` with the repair uncommitted. I used the reproduction's own scratch test and reporter, 1,000 repeats in one worker, coverage and 24 busy-loop processes (re-proof §1):

|  | repaired (committed shape) | file-URL traits (scratch test unchanged) |
| --- | --- | --- |
| repeats failed | 0 of 1,000 | 26 of 1,000 (46 failure messages) |
| files under two URL strings | 0 | 572 (checkable 343, nameable 229) |
| requests for `checkable.ts` / `nameable.ts` | 1,000 / 1,000 | 1,343 / 1,229 |
| failures that are (A) | — | 0: no `"undefined"` key |

- **The URL log separates the two shapes completely:** 0 files against 572. That is the plan's discriminating witness.
- **The failure count separates them too.** At the rate of the mutation runs, about 10 to 26 in 1,000, 0 of 1,000 would be unlikely by chance. The rate varies between runs: 8 before the repair, 10 in the implementer's mutation, 26 in mine.
- **A single run of the committed file doesn't discriminate.** The implementer's §3b reports this, and it agrees with the rates. That run is not the witness, and the proof doesn't use it as one.

## Does `augmented.ts` change what another row tests

**No.**

- **The brand row:** `Checkable` and `Nameable` are now the evaluation that the consumers use. Before the repair, a passing run's file-URL import gave the same evaluation. A pass means that both forms carried that trait's brand. So the row asserts the same property, without the race.
- **`flatten-method.node.test.ts:97`** (`toBeInstanceOf(Forwarding)`): before the repair, `forwarding.ts` was imported by file URL after the consumers had finished, so it got their evaluation. It still does.
- **Every other block** gets an `augmented.ts` on disk that it never imports, so the file is never evaluated. Both inputs to `brandReport`, `foo-flat` and `options.augment`, are unchanged. Coverage includes only `packages/*/src/**` and `src/**`.
- **The whole project passes** under the root configuration with coverage: 8 files, 147 tests. Typecheck and lint pass on the changed files (re-proof §0).

## Findings

**None.** No property of the ruling is unmet, the proof's witnesses reproduce at the committed head, and no other row's subject changes.

## Limits

- I ran no CI and no other machine. All rates come from one dev container with 12 processors.
- I didn't re-read the cause, the Vite-only reproduction or the runner reading. The ruling rests on those, and this proof takes them as given.
- `RF-60`'s closure also needs the record changes that the plan proposes. They aren't in this tree, and they aren't in this scope.