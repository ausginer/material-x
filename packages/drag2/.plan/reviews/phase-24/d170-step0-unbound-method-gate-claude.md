# D-170 step 0 — the `unbound-method` gate, bounded independent review

**Files read at `cd9445e9`**, the sole commit ("tooling: enforce unbound-method repo-wide and state the receiver at each platform capture"), against D-170's entry in [`00-index.md`](../../contract/00-index.md) and its landing note in [`plan.md`](../../plan.md).

## Scope

**Covered.** Whether the rule is effectively enabled at the scope D-170 claims; the tracked-tree census and whether every report is accounted for; the narrowness and justification of each suppression; the mutation probe's discriminating power over the four load-bearing `createRectIndex` / host cases; the accuracy of the configuration comment; and whether the delta contains only step 0.

**Not covered, deliberately.** The `no-shadow` half of F-280, out of this pass by instruction. The seventeen pre-existing lint errors of other rules, and the stale `.claude/worktrees/agent-a4d0ec4ad722d3a16` checkout — both held out of every census here by `--ignore-pattern '.claude/**'` and by counting only rule-matched reports, and neither reassessed. D-170's steps 1–3, which have not run.

## Findings

**Five, and the first is blocking.** The gate D-170 step 0 exists to arm is **not armed** under the repository's own lint invocation.

---

### gate-1 — Tier B — The rule is `off` under every invocation the repository actually uses

**Current behavior.** [`eslint.config.ts`](../../../../../eslint.config.ts) removes `'@typescript-eslint/unbound-method': 'off'` from its override block, then — **later in the same config array (line 52 against the override block's line 39), and therefore winning** — spreads `...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json')`. That path is resolved against `process.cwd()`. Every package lints from its own directory: `packages/drag2/Justfile` line 4 defines `_eslint := "eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts"` and `lint` runs it from the package root. From there the plugin loads `packages/drag2/.oxlintrc.json` — a 152-byte file that only `extends` the root one — and emits a **broader** disable set that contains `@typescript-eslint/unbound-method: "off"`.

**Why it is a problem.** The delta's central claim, in both records and in the configuration comment, is that the rule is *enforced*. It is not. The step-0 precondition D-170 makes steps 1–3 depend on is unmet, and the migration would proceed under an instrument that reports nothing.

**Evidence.** The effective severity differs by working directory, for the same config object and the same file:

| cwd | `--print-config` → `@typescript-eslint/unbound-method` |
| --- | --- |
| repository root | `[2, {"ignoreStatic": true}]` — error |
| `packages/drag2` | `[0, {"ignoreStatic": true}]` — **off** |

Mechanism, from `eslint-plugin-oxlint` directly: from the root it disables 267 rules and `unbound-method` is **not among them**; from `packages/drag2` it disables 356, **including** `@typescript-eslint/unbound-method: "off"`.

End to end, on a deliberate violation (`class Probe { method() { return this.n; } }`, then `const detached = p.method`) placed in `packages/drag2/src/`:

- `cwd=packages/drag2`, `-c eslint.config.ts` — the repo's own recipe: **no `unbound-method` report**.
- `cwd=<root>`, same config, same file: **reported**.

**Required property.** The rule's enabled state is the same under the invocation the repository lints with as under any other, and that state is enforced by something a change to the override block cannot silently reverse.

---

### gate-2 — Tier B — The aggregate lint recipe does not cover `drag2` at all

**Current behavior.** The root `Justfile` `lint` runs `nx run-many -t lint --projects=box-quad,core,tproc,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown,material-x`. That selector resolves to **eight** projects and `@ydinjs/drag2` is not one of them, though `nx show projects` lists it.

**Why it is a problem.** It is the second half of gate-1. There is no CI lint workflow — `.github/workflows/` contains only `docs.yml` — so lint is developer-invoked, and the aggregate recipe is the invocation that would plausibly run from the root where the rule is on. It skips the one package whose migration the gate protects. Between gate-1 and gate-2, **no invocation in this repository lints `drag2` with `unbound-method` on.**

**Evidence.** `npx nx show projects` → 9 projects including `@ydinjs/drag2`. `npx nx show projects --projects=<the recipe's selector>` → 8, without it. Pre-existing (the selector predates this commit; `Justfile` is not in the delta), and reported because D-170's "repository scope" claim rests on it.

**Required property.** The scope at which the gate is claimed is a scope some runnable command actually lints.

---

### gate-3 — Tier B — The census reports thirteen sites; there are ten. No site was omitted

**Current behavior.** Both records say "**Thirteen** sites in seven tracked files". `plan.md` breaks that down as "eleven re-supply the receiver explicitly, one is a membership test that never calls, and `q7`'s array holds restore slots" — 11 + 1 + 1.

**Why it is a problem.** The census is the evidence that every report is accounted for. A total that does not match the sites cannot discharge that, and it is the number a later pass would reconcile against.

**Evidence.** Full tracked-tree run from the root (where the rule is on), with `--no-inline-config` so suppressions do not hide anything, excluding `.claude/**`: **10 reports**, in exactly the seven named files.

| file | sites |
| --- | --- |
| `.scripts/ce-hmr.ts` | 2 |
| `packages/drag2/src/kernel/kernel.ts` | 1 |
| `packages/drag2/tests/kernel/presentation.browser.test.ts` | 1 |
| `packages/drag2/tests/perf/q7.browser.test.ts` | 1 |
| `packages/drag2/tests/sortable/displacement.browser.test.ts` | 3 |
| `packages/drag2/tests/sortable/features.browser.test.ts` | 1 |
| `packages/drag2/tests/sortable/placement.browser.test.ts` | 1 |

Ten sites, and the delta adds exactly **ten** `eslint-disable-next-line @typescript-eslint/unbound-method` directives — one per site, one-to-one.

**The reconciliation asked for: this is a reporting error only, not an omission.** Every real site is classified and suppressed; nothing was left out of the classification. The file count (seven) is correct. The true sub-counts are **8 + 1 + 1**, not 11 + 1 + 1: eight re-supply the receiver explicitly (`then.call`, `nativeHide.call`, `native.call` ×3 — one of them `native.apply` — `native.call` ×2, and `ce-hmr`'s `originalDefine`, invoked as `originalDefine.call(registry, …)`), one is the `STATE_KEY in prototype.define` membership test that never calls through, and one is `q7`'s restore-slot array. The eight is presumably where the displayed `8 + 1 + 1 + 1` came from — drag2's own eight — with `ce-hmr`'s two split across two rows and the total then overstated by three.

**Required property.** The stated site count equals the number the instrument reports, and the sub-counts sum to it.

---

### gate-4 — Tier B — The probe's stated discriminator is wrong, and two of the four load-bearing cases cannot report even after the migration

**Current behavior.** The records justify the silence at the riskiest sites as follows: *"the same members in today's closure form report none, because a property holding an arrow function has no receiver to lose"*, and *"the instrument arms itself the moment step 1 converts the first factory"*.

**Why it is a problem.** Both halves are wrong, in opposite directions, and the second means the gate stays blind at two of the four cases D-170 names — not until step 1, but permanently, unless the published types change.

**Evidence.** The rule's actual discriminator is the **declared type at the read site**, and `Readonly<…>` erases it. Measured on three shapes:

| shape at the read site | reported? |
| --- | --- |
| `{ invalidate(): void }` — bare method signature | **yes** |
| `Readonly<{ invalidate(): void }>` — mapped type | no |
| class instance | **yes** |
| `Readonly<{ invalidate(): void }>` over a class implementation | **no** |

Applied to the four load-bearing members, using the package's own types:

- **`createRectIndex`'s `invalidate`/`retire`.** They are object-literal **method shorthand** (`invalidate(): void { dirty = true; }` at `rect-index.ts:531`), not arrow properties, and `RectIndex` is `export type RectIndex = { … }` — plain, unwrapped. A detached read of them is **reported today, in the closure form, with no class conversion at all** (probe: 2 reports). Their silence in the census is because **nothing reads them detached today**, not because their form has no receiver to lose. The record's stated reason does not hold for the members it names.
- **`host.cancel` / `host.destroy`.** `KernelHost` is `Readonly<{ … cancel(reason?: unknown): void; … }>` (`kernel/spec.ts:33`), and both read sites — `sortable/controller.ts:59,64` and `free-drag/controller.ts:89,90` — receive `host: KernelHost`. A detached read through that type is **silent, and stays silent when the implementation is a class**, because the rule sees the mapped type, not the implementation. Converting the factory cannot arm the gate at these four sites.

The same erasure covers more than the named four: `LinearShift` is `Readonly<{ … invalidate(): void; retire(): void }>`, so `y.ts:264`'s `invalidate: shift.invalidate` is silent; and `assemble.ts` pushes `axis.insertion.retire`, `axis.retire`, `landing.retire` and `displacement.retire` into `retireHooks` — detached reads of exactly the kind F-274 records — all silent for the same reason.

**Required property.** The probe distinguishes the form the migration will actually produce **at the read sites the migration will actually leave standing**, and the recorded reason for a silence is the reason that produces it.

---

### gate-5 — Tier C — `ignoreStatic: true` narrows the gate, unrecorded

**Current behavior.** The effective options are `{"ignoreStatic": true}`, inherited from the preset rather than chosen here. A `static` member read without a receiver is not reported.

**Why it is a problem.** Minor and possibly correct, but the configuration comment presents the rule as covering "a method read without a receiver" without qualification, and any static member a converted class acquires falls outside it.

**Required property.** The recorded scope of the instrument matches its configured scope.

---

## What passed

**The suppressions are narrow and correctly justified — this half is clean.** All ten are `eslint-disable-next-line` naming the single rule; none is a file-level or blanket `eslint-disable`; each covers exactly one expression, and none sits on a line carrying anything else or on any factory-to-class member. Each was read to its call or restoration site: the eight delegating captures re-supply the receiver explicitly, `ce-hmr:105` is a membership test that never invokes, and `q7`'s `originals` array holds restore slots assigned straight back onto their own elements, its called copy being separately bound. Under a root-cwd run all ten are matched one-to-one by a report; under the package-cwd run they are inert, which is gate-1's consequence rather than a defect in them.

**The delta is step 0 only.** No class is introduced anywhere — the only added occurrence of the word is inside the configuration comment. No migration has begun.

**The configuration comment is accurate on its factual claim and wrong on its operative one.** "oxlint implements none" is true: `oxlint --rules` lists no `unbound-method`, and the root `.oxlintrc.json` does not enable one. But "deliberately absent from this list and **enforced**" is false in effect, per gate-1 — the sentence records an intent the configuration does not deliver.

## Disposition

**The implementation review is not recorded complete, and `unbound-method` should not be relied on for the class migration in its current state.** gate-1 alone is disqualifying: the instrument the migration is meant to lean on does not run under the command the repository lints with. gate-4 is the one that would survive fixing gate-1 — with the rule genuinely on, two of the four cases D-170 names still cannot report, because the package publishes its SPI through `Readonly<…>` mapped types and the rule reads the type, not the implementation. gate-3 is a counting correction with no site omitted. Nothing here is remediated; all of it is reported for routing.

## Method

Read at `cd9445e9`. Effective severities taken from `eslint --print-config` under each working directory rather than from the config source; the plugin's disable sets read from `eslint-plugin-oxlint` directly; the census run with `--no-inline-config` so no suppression could hide a site; the type-shape discrimination and the four load-bearing cases established by probes against the package's own `KernelHost` and `RectIndex` types. Every probe ran in a detached worktree at `/tmp/d170-probe`, since removed; the tracked tree was not modified at any point and is clean. The stale `.claude/worktrees/` checkout was excluded from every count by ignore pattern.

**One methodological note worth carrying.** The shell's working directory is load-bearing for this configuration, and an early census of mine — run from a package directory — returned zero reports and would have read as "the gate is on and the tree is clean". The paired root/package runs are what separate an armed instrument from a silent one, and any future check of this rule has to state which directory it ran from.

**LSP plugin — available; not used:** the questions here were configuration resolution and rule behavior, settled by running ESLint and the oxlint plugin rather than by symbol navigation; the type-shape question was answered by probing the compiler through the rule itself, which is the only thing that establishes what the rule sees.
