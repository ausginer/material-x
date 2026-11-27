# PR #332, `RF-156`'s repair: feature proof

**Files were read at:** `4b8f4ddd3`, the head of `repo/fresh-tree-tests-1` and of PR #332, in slot b. **Diff reviewed:** `2b193971e..4b8f4ddd3`, all of it.

**Governing record:** `RF-156` in [`00-index.md`](../../00-index.md), with the implementer's note of 2026-11-27.

**Lens:** feature proof. Every claim comes from my own reading or from a run I made. The runs are in [`checks/feature-proof-runs.txt`](checks/feature-proof-runs.txt). The scripts that made them are [`checks/feature-proof-probe.sh.txt`](checks/feature-proof-probe.sh.txt) (p0 to p4), [`checks/feature-proof-mutations.sh.txt`](checks/feature-proof-mutations.sh.txt) (M1 to M5) and [`checks/import-probe.mjs.txt`](checks/import-probe.mjs.txt) (p5). Each step restored the plugin's source from `HEAD` and rebuilt the plugin. It also restored the list from a copy taken before p0. `git status` was clean after every step. I changed no file outside this record. Another session's Vitest workload ran on the machine during my runs. No row failed for that reason.

**Verdict:** the repair meets `RF-156`'s required property. The witness reproduces at the base and at the head. The built output is identical. `verify` passes on the head in the three engines. **One finding,** `reviewer-1`, Tier C: the implementer's note gives the wrong order for when the list is written in material-x's run. The property still holds, by M3. It doesn't block.

## Scope

- **Read:**
  - `loadPropList()` and its two callers, `compileCSS` and `constructCSSTokens`'s transform, before and after.
  - Every consumer of `@ydinjs/vite-custom-element-assets` and every place `isProd` is set: `.scripts/tsdown-component.ts` (always `true`) and `.scripts/vite-config.ts` (`env.command === 'build'`).
  - Every reader and writer of `css-private-props.json`: the plugin's `src/utils.ts` and `.scripts/css/collect-props.ts`. `collect-props.ts` imports only the plugin's `css/styles-import.js` subpath, which doesn't load the list.
  - `.scripts/vitest-config.ts`'s `assignGroupOrder` and the node projects' `globalSetup`. material-x's and drag's `build-package.node.ts`.
  - The package and root `Justfile`s: `build`, `docs-prepare`, `docs-dev`, `docs-build`, `_package-builds`, `_test-builds`. `nx.json`. material-x's `tsdown.config.ts` (`watch: false`). `cem.config.ts`. The devcontainer's create and start scripts.
- **Ran:** p0 to p5 and M1 to M5, as below.
- **Not read:** lint and typecheck, which are CI's `static` job and pass on the head. The plugin has no tests of its own. Visual stays CI's.

## The claim

### The repair

**Holds.**

- `loadPropList()` keeps one promise per process. It is created on the first call, from a dynamic JSON `import()` of `node_modules/.cache/css/css-private-props.json`.
- A failed read becomes an `Error` that names the path and _"`just build-prepare` in packages/material-x writes it"_, with `cause` set to the read's error.
- It has two callers:
  - `compileCSS`, only when `options?.isProd`.
  - The token plugin's `transform`, which exists only when `options?.isProd`. It builds its regular expressions on its first call, into one promise per plugin instance.
- Neither module reads the list at load any more. `grep` finds no other reader.

### The witnesses

- **At the base (p1),** with the base plugin source built and the list moved away:
  - All six packages' `aube exec just test` end in about a second, at config load. Each ends with _"Cannot find module '…/css-private-props.json' imported from …/vite-custom-element-assets/index.js"_.
  - material-x's `just build-lib` fails at tsdown's config load with the same message.
- **At the head (p2),** with the list moved away before each package, every package starts and passes. The counts are the implementer's control counts:

  | Package | Files | Rows | List after the run |
  | --- | --- | --- | --- |
  | core | 28 | 394 | absent |
  | tproc | 14 | 351 | absent |
  | vite-traits-plugin | 11 | 254 | absent |
  | box-quad | 7 | 242 | absent |
  | drag | 68 | 1256 | absent |
  | material-x | 52 | 2850, 2 expected fail | present, written by the node project's setup |

- **`build-lib` without the list (p3)** exits 1 with _"Build failed with 47 errors"_. Each error is _"Can't read the private-property list …. `just build-prepare` in packages/material-x writes it."_, followed by the `ERR_MODULE_NOT_FOUND` cause.
  - After `just build-prepare` it builds.
  - The list that `build-prepare` wrote is byte for byte the copy I kept. So the list used in p4 is current with the tree.

### Build output

**Identical (p4),** with the list present.

- I built material-x with `just clean-build` and then `just build-lib` three times: with the head's plugin, with `2b193971e`'s plugin source rebuilt, and with the head's again.
- In each build, the sorted per-file `sha256sum` listing of the 115 built `.js` files is the same. So is the listing of the 148 `.d.ts` and `.js.map` files.
- **The comparison isn't vacuous:** the built `.js` files hold 280 distinct `--mx-*` names, in 49 files, and no `--_` name (p6). So both builds mangled.

## The questions the brief asks

### A read before the list exists

**No repository path does a production transform before `build-prepare` has written the list, or in a process that outlives one build.**

- **The processes that read the list:**
  - material-x's `just build` runs `build-prepare` and then `build-lib`, in sequence.
  - `docs-build` and `docs-dev` run `docs-prepare` first. `docs-prepare` runs `build-prepare` concurrently with `build-cem` and `docs-themes`, and neither of those loads the plugin. Storybook's build starts after `docs-prepare`.
  - The root `just build` reaches material-x's `just build` through Nx.
  - material-x's node setup runs `collect-props.ts` and then `tsdown` as two child processes, in sequence.
- **No long-lived production process:**
  - material-x's tsdown config sets `watch: false`.
  - The Vite dev server, Storybook's dev server and every Vitest project run with `env.command` `serve`, so `isProd` is false and the list is never read.
  - No test runs this plugin in-process with `isProd`. vite-traits-plugin's in-process `build()` tests don't use the plugin.
- **What is new state:** the promise keeps a rejection for the life of the process.
  - Node itself doesn't cache a failed JSON import: p5 imports a missing file, writes it, and the second import succeeds.
  - So a hypothetical long-lived production process started without the list would keep failing after `build-prepare`, where a fresh `import()` would succeed.
  - No such process exists in the repository, as above.
- **A stale list after a successful read is not new.** Node caches a JSON module by URL (p5: a rewritten file imports with its old content). The base read the list once at module load as well.

This is an observation, not a finding.

### The node build test

**The browser projects don't need the list's contents.** The witness alone doesn't show it for material-x. M3 does.

- **The order, in M3's run:** the list was moved away and appeared 2 s into material-x's `just test`, before any row had reported.
  - Vitest runs every project's global setup before any file starts, as `build-package.node.ts`'s own comment says. So the node setup's `collect-props.ts` writes the list before the browser projects' files run.
  - `groupOrder` orders the files, not the setups.
  - So in p2's material-x run, the browser projects ran with a list present. That is `reviewer-1`.
- **M3, `loadPropList()` always rejects:**
  - Whole material-x run, Chromium. 49 files and 2812 rows pass, with the 2 expected failures.
  - Only the node project's three files fail, from tsdown's _"M3: the list was read"_. 2850 − 38 = 2812.
  - So no browser or spec row reaches the list, whatever the order.
- **Two browser files with no node project (M1's control):** `icon.browser.test.ts` and `button.browser.test.ts` pass with the list absent throughout. The same holds in Firefox and in WebKit for `icon.browser.test.ts`.
- **drag and the other four packages** ran with the list absent from start to end (p2). Their builds don't use the list.

## Mutations

The implementer's record lists no mutations, only the base witness. So none are read from it. All of these are mine.

| Id | Mutation | Engines | Run | Result |
| --- | --- | --- | --- | --- |
| M1 | `compileCSS` reads the list whatever `isProd` says. This removes the mechanism that keeps a browser project off the list | Chromium, Firefox, WebKit | `icon.browser.test.ts`, plus `button.browser.test.ts` in Chromium, list absent | **Killed** in each: the files fail to import, with Vite's _"Can't read the private-property list …"_. The unmutated controls pass: 54 rows in Chromium, 10 and 17 skipped in Firefox and in WebKit |
| M2 | The token plugin's `transform` outside `isProd` | Chromium | the same two files, list absent | **Killed:** both files fail at `browser-setup.ts`'s import, with the same message |
| M3 | `loadPropList()` always rejects | Chromium and node | whole material-x run | **Killed only in node,** as it must be: the browser projects never read the list. See above |
| M4 | The read's error rethrown as it is, without the wrapper | node (`build-lib`) | list absent | **Killed:** the build still fails, and no line names `build-prepare`. Only _"Cannot find module …"_ |
| M5 | The wrapper without `cause` | node (`build-lib`) | list absent | **Killed:** the message names `build-prepare`, and no line names the missing module |

- **M1 is the one repeated in the three engines,** as `repo:RD-62` asks for the mutation that removes the property's mechanism.
- The mechanism runs in Node, in Vite's transform, so the engines can't differ. They don't.
- M2 to M5 aren't engine mechanisms. M4 and M5 are node only.
- No mutation survived, and none is equivalent.
- The `??=` on each promise is a cache. Removing it changes no result here, so I didn't make it a mutation.

## CI

`verify` run [46048926550](https://github.com/ausginer/material-x/actions/runs/46048926550) on `4b8f4ddd334fba6c295fe2a685505f8d48e12b24`: `success`, `static` included.

| Job | Files | Rows |
| --- | --- | --- |
| `chromium` (140675310494) | 193 passed | 5540, 2 expected fail, 12 skipped |
| `firefox` (140675310536) | 137 passed, 1 skipped | 4354, 3 expected fail, 201 skipped |
| `webkit` (140675310508) | 137 passed, 1 skipped | 4365, 2 expected fail, 201 skipped |

- CI runs `build:prepare` first, so its run has the list. It is the unmutated pass of the six packages in Firefox and WebKit.
- The no-list case is local only: p2, and M1's controls in Firefox and WebKit.

## Findings

| Id | Tier | Blocks | Owner | Claim |
| --- | --- | --- | --- | --- |
| reviewer-1 | C | no | implementer, to correct the note. **Closed 2026-11-27** | The note says material-x's browser projects run before the node project writes the list. The node setup writes it before any file runs. |

### reviewer-1 — the list is written before material-x's browser projects run, not after

- **Current record:**
  - The implementer's note on `RF-156` says: _"material-x's node build test writes the list during its node project, by `RF-153`'s repair. The browser projects, which run before the node group, run without it."_
  - The header of [`after.txt`](../../fresh-tree-tests-1/checks/after.txt) says the same: _"after its browser projects have run"_.
- **Observed:**
  - In M3's run, the list was absent at the start and present 2 s in, before any row had reported.
  - The node project's `globalSetup` runs `collect-props.ts`. Vitest runs every project's global setup before any file, as `build-package.node.ts`'s comment says. `groupOrder` sequences only the files.
  - So the witness's material-x run read the browser projects with a list present.
- **Why it is a problem:** the note offers that run as evidence that the browser projects run without the list. The run doesn't show that.
  - The property holds by other evidence: M3, and M1's controls.
  - So only the record's account is wrong.
- **Tier:** C. No consumer observes it, and no instrument is unsound: the rows and the repair are unaffected.
- **Required property:** the note's account of the witness states what the run shows. Where a browser project's independence from the list is claimed, the evidence cited is a run in which the list is absent while that project runs, or one in which the list can't be read.
- **Closed 2026-11-27 by the implementer,** on `repo/fresh-tree-tests-1` after `536d20f8c`, records only. The note on `RF-156` now says that the node project's global setup writes the list before any file runs, and quotes its old wording. It cites M3's reading from [`feature-proof-runs.txt`](checks/feature-proof-runs.txt) as the evidence that the browser projects don't read the list. The header of `after.txt` stays as captured, and the note names its wording.

## Observations

- **A new slot needs more than the list.** `RF-156` says that with the run starting, _"a fresh tree then needs nothing before its first run"_. That holds for a tree whose packages are built.
  - The plugin itself is consumed through its built `index.js`, which is untracked. The other packages that the configs import are consumed the same way.
  - The devcontainer's create and start scripts and `cl.sh`'s slot creation don't build them.
  - So a new worktree still needs `aube install` and the root `_package-builds` before a package's `just test`.
  - The required property is about the list, and it is met. #320's description, _"a fresh checkout that hasn't run the build's preparation step"_, still holds, so no issue description needs a change.