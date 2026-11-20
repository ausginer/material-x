# Both Vite plugins check the host's binding, or its version where it offers no magic string — feature proof, `RF-55` task 4

**Files were read at:** `129640d0b` (`repo/rolldown-peer-1`, PR #83), in a scratch worktree of my own. A second scratch worktree at `main`'s `3457e3463` was the baseline. **Diff reviewed:** `ade7e1e45..129640d0b`, which is task 4 as first written (`d79bf6f38`), the architect's amendment (`aa427f691`), the test's lint fix (`79bf05930`) and the record (`129640d0b`).

**Governing records:** [`rolldown-peer-plan.md`](../../rolldown-peer-1/rolldown-peer-plan.md), _Task 4. The host's binding, not its version_, its _Amended: a host that offers no `meta.magicString`_, and _Closing_. Also `repo:RF-55` in [`00-index.md`](../../00-index.md): the ruling on task 3's `reviewer-1` (`cc121c0de`), and the ruling on the implementer's finding (`aa427f691`), option (ii).

**Lens:** feature proof. Each claim below comes from my own reading or my own run ([rerun](checks/task4-rerun.txt), [probe](checks/meta-getter-reads.mjs)). I didn't run npm in any form. I repaired nothing and amended no record.

**Verdict: task 4, as amended, meets the plan. This pass found no defect, and nothing stops the architect from closing `RF-55` on the branch.**

## Scope

**Covered.**

- **The check, against the amended property 1.**
  - **The traits plugin.** `emit` (`packages/vite-traits-plugin/src/plugin.ts`) is native exactly when `kind !== 'serve'` holds and one of two cases holds:
    - the host's meta has a `magicString` key, and the edited magic string is that object;
    - it has none, and `rolldownVersion === VERSION`.

    Both transforms pass `this.meta.rolldownVersion`. Outside serve, `editable` returns the host's object when it is `instanceof` the plugin's `RolldownMagicString`, and a new instance otherwise.

  - **The assets plugin.** `constructCSSTokens`'s production `transform` (`packages/vite-custom-element-assets/src/index.ts`) makes the ruling's test literally. With the key, `native` is `host instanceof RolldownMagicString`. Without it, `native` is the version comparison. `VERSION` stays imported in both plugins, as the amendment requires.
- **Coordinator question 2: is "the edited magic string is that host instance" the ruling's `instanceof`?** Yes, in every host. Two facts make it so:
  - **Every magic string the transforms edit comes from `createMagic`.** `lowerAttributes`, `transformTraitModule` and `flattenModule` each take it, and no other `new RolldownMagicString` is on either transform's path. `declaration-doc.ts` builds one in the `load` stage, which returns a string. `html.ts` and `css.ts` build one in hooks that return strings.
  - **rolldown 1.3.2's getter is memoized.** `bindingifyTransform` builds one instance from `code` on the first read and returns it on every later read. So `magic === meta.magicString` exactly when `editable` handed out the host's object, which is exactly when that object is `instanceof` the plugin's class.

  If some host's getter weren't memoized, the identity test would be stricter than `instanceof`. Such a host would take the string path, which is correct and slower.

- **Coordinator question 2: does `'magicString' in meta` avoid building the lazy string?** The `in` operator doesn't call the getter. Vite 8.4.0-beta.1's `injectSsrFlag` copies the meta's property descriptors (`Object.getOwnPropertyDescriptors`), so the getter that reaches the plugin is still rolldown's lazy one. Vite 8.3.8's `injectSsrFlag` spreads the meta, and that drops the non-enumerable getter. This confirms the implementer's `{ moduleType, ssr }` finding from the source. [`meta-getter-reads.mjs`](checks/meta-getter-reads.mjs) counted the reads in a rolldown 1.3.2 host ([rerun](checks/task4-rerun.txt) §9):
  - **The traits plugin** reads it twice for the module it changes, once in `editable` and once in `emit`, and both reads return one instance. It reads it zero times for each module it doesn't change, including one that passes its cheap `includes` filters.
  - **The assets plugin** reads it once for every module its filter admits, changed or not. Before task 4, the same handler built `new RolldownMagicString(code)` for every such module, so the count stays one per module. That is what property 3 and the record (_"built one magic string per module before, and builds one now"_) require.
  - **On the string path,** each plugin builds the host's instance and its own. That costs one more magic string per changed module, and the plan allows a slower string path.
- **The node test and its mutations.** `aube exec just test` in `packages/vite-traits-plugin` passes 161 of 161. `emit-mutations.sh` reproduces `emit-mutations.txt` line for line: 8 of 8 unmutated, and each of the five mutations fails exactly its own cases ([rerun](checks/task4-rerun.txt) §7).
  - **One branch isn't among the five:** `editable` always returning a new instance. The first case catches it anyway, because it asserts `result.code` is the host's object and `hasChanged()` on it.
- **Coordinator question 1: consumer-paths.** I built and packed the plugin and core at `129640d0b` and reran `consumer-paths.sh`. All six projects match `consumer-paths.txt` line for line ([rerun](checks/task4-rerun.txt) §1):
  - Vite 8.3.8 hoisted and isolated, and 8.1.4, are offered no `magicString` and take the native path;
  - Vite 8.4.0-beta.1 is offered it and takes the native path;
  - consumer D gets a string and a map and is flattened, and its mutant isn't flattened.
- **Vite 8.4.0-beta.1 is native by binding, not by version.** In consumer c, both checks would give a magic string, so `consumer-paths.txt` shows a native path but not which check decided it. I changed the wrapper in c's config to compare `ret.code` with `meta.magicString` and rebuilt. Both `trait-flattener` returns are the host's instance ([rerun](checks/task4-rerun.txt) §2).
- **Coordinator question 1: same-version-copies-real.** `same-version-copies-real.sh` reproduces its reading ([rerun](checks/task4-rerun.txt) §3):
  - `shared-binding` returns a magic string and keeps the edit;
  - `own-binding` returns a string and a map and keeps it;
  - the mutant returns a magic string, and the host drops it.
- **Coordinator question 1: material-x byte identity.** Fresh frozen installs and builds in both worktrees, at the root and in `packages/material-x`. The git-ignored files under `packages/material-x`, outside `node_modules` and `*.tsbuildinfo`, number 213 in each tree, with identical names and hashes ([rerun](checks/task4-rerun.txt) §4).
- **The host-path witness.** `host-path-witness.sh` gives the same counts as its reading ([rerun](checks/task4-rerun.txt) §5):
  - tsdown: 5 assets returns and 26 traits `library` returns;
  - Storybook's Vite: 5 assets returns and 34 traits `application` returns;
  - every one native by binding.

  Its label for which check decided comes from the key test the code uses, and §2 confirms the identity in a Vite 8.4.0-beta.1 host. My first run of the witness failed in `docs-build`, because the root `just build` doesn't build `@ydinjs/box-quad`. The root `docs-build` builds it, and the rerun passed. That came from my scratch tree's state, not from the branch.

- **docs-build and docs-smoke.** At the root, `aube exec just docs-build` exits 0, and `aube exec just docs-smoke` passes 105 of 105 pages ([rerun](checks/task4-rerun.txt) §6).
- **The private plugin's probe.** `assets-host-binding.ts` reproduces the reading's four cases ([rerun](checks/task4-rerun.txt) §8). The reading's mutations aren't scripted, and I didn't rerun them.
- **Coordinator question 3: the assets plugin has no serve guard.** The plan's amended property 1 applies the checks _"outside the dev server"_. The assets plugin meets it through registration: its `transform` exists only when `options.isProd` is true.
  - **Its two callers:** `.scripts/vite-config.ts` passes `isProd: env.command === 'build'`, and `.scripts/tsdown-component.ts` is a build.
  - **So the dev server never runs this transform.** The package is private, so the workspace is its only consumer. The traits plugin needs `kind`, because its transforms run in every command. This one doesn't. That is right, as under task 3.
- **Static checks on the branch.**
  - `just lint` passes on the four changed traits-plugin files and on the assets plugin's `src/index.ts`.
  - `just typecheck` passes in both plugin packages and at the root.
  - `git diff --check ade7e1e45 129640d0b -- packages` is clean.
- **Coordinator question 4: the record and the PR.**
  - **The limit, as ruled.** RF-55's _"Task 4 implemented"_ bullet states it as the ruling has it:
    - the hosts: no `meta.magicString`, Vite 8.1 to 8.3 today;
    - the tree: two copies of one version, each with its own binding, still drop the edit;
    - the evidence: no package manager has been shown to produce that tree;
    - the end: the fallback goes when the `vite` peer floor reaches a Vite that passes `meta.magicString`.

    The ruling's Tier A clause, which applies if such a tree is shown, is in the ruling bullet just above. The PR body's _Limits_ section says the same.

  - **The PR body** says `Refs #48`, which the plan's _Closing_ gives until the architect closes `RF-55`. It has no session link and no bare `@name`. PR #83 is open, isn't a draft, has no auto-merge, and has head `129640d0b`. Its line _"Task 4's feature proof is pending"_ goes stale with this record. It and `Refs #48` change at the closure.
  - **Commit messages.** `d79bf6f38`, `aa427f691`, `79bf05930` and `129640d0b` carry no session link and no closing keyword.

**Not covered.**

- Any CI run, and material-x's browser tests. Those run on Vite's dev server, where the traits plugin's `kind` guard gives a string and a map, as before.
- A tsdown host on another `rolldown` copy, and a host whose getter isn't memoized. Both are readings, not runs.
- Source-map contents beyond `sources`.
- The mutations in `assets-host-binding.txt`, which no committed script reproduces.

## Findings

**None.** This feature-proof pass found no defect against task 4 as amended, the two rulings or the plan's _Closing_. Under _Closing_, the plan's condition for closing `RF-55`, that tasks 1 to 4 are in and proven, holds as far as this pass reads it. The closing itself is the architect's.