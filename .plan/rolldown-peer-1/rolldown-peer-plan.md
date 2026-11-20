# `rolldown` as a peer of the two Vite plugins (`RF-55`)

**Branch:** `repo/rolldown-peer-1`, from `origin/main` at `d69e3ddbc`. **Governing records:** `repo:RF-55` in [`00-index.md`](../00-index.md), its _Decided_ block of 2026-11-20; [`CONTRIBUTING.md`](../../CONTRIBUTING.md) Part I, _Dependencies of a published package_; `repo:RD-16` (aube, the lockfile, the release-age gate); `repo:RF-46` (Vite run outside its declared `rolldown` range). **Issue:** #48.

**The owner's direction,** relayed by the coordinator: _"О, ну тут peer напрашивается )"_ ("A peer is the obvious fit here").

## What was read

**Evidence:** [`consumer-probe.sh`](checks/consumer-probe.sh) and its [reading](checks/consumer-probe.txt), with aube 2.10.0 and the npm registry of 2026-11-20. The probe installs a stand-in plugin into empty consumer projects. The stand-in imports `RolldownMagicString` from `rolldown` and returns one from `transform`, as both plugins do in a build. `pinned` declares `rolldown` as the plugins do today, and `peer` declares it as decided below.

| Consumer | `rolldown` the plugin gets | `rolldown` Vite gets | The plugin's edit in `vite build` |
| --- | --- | --- | --- |
| A: `peer`, Vite 8.3.8, hoisted and isolated | 1.2.19 | the same copy | kept |
| B: `pinned`, Vite 8.3.8, hoisted and isolated | 1.3.2 | 1.2.19 | **dropped, exit 0** |
| C: `peer`, Vite 8.1.4 | 1.1.8 | the same copy | kept |
| D: `peer`, Vite 8.3.8 and tsdown 0.23.7 | 1.3.3 | 1.2.19 | **dropped, exit 0** |
| E: `peer`, Vite 8.4.0-beta.1 and tsdown 0.23.7 | 1.3.3 | the same copy | kept |

- **Two copies are a silent miscompile, not only a type clash.** In B, the transform runs and returns a magic string from rolldown 1.3.2 to Vite's rolldown 1.2.19. The build exits 0 without the edit. For the traits plugin, that means a consumer's build ships unflattened compositions. No consumer has been affected, because neither plugin is on the registry yet.
- **The peer removes the copy that the plugins add** (A, C, E). In D, the consumer's own tree has two copies, because tsdown 0.23.7 declares `~1.3.0` and Vite 8.3.8 declares `~1.2.18`. The peer resolves to the root copy, so a Vite build still drops the edit. This is the tree `RF-46` describes, outside this repository. Owner question 1 below is about this case.
- **What each Vite release in the `vite` peer range declares** (registry): 8.1.4 declares `~1.1.4`, 8.2.x `~1.2.0` to `~1.2.18`, 8.3.x `~1.2.6` to `~1.2.18`, and 8.4.0-beta.1 `~1.3.2`.
- **The API the plugins use exists at the floor.** The magic-string class declares the same methods in rolldown 1.1.4 as in 1.3.2. `Plugin`, `PluginContext`, `SourceMapInput` and `RolldownMagicString` are exported by both.
- **Vite doesn't re-export what the plugins need at runtime.** Its runtime exports from rolldown are `parse`, `parseSync`, `parseAst`, `parseAstAsync`, `minify`, `minifySync`, `withFilter`, `esmExternalRequirePlugin` and `rolldownVersion`. There is no `RolldownMagicString`. Its types export the whole module as the namespace `Rolldown`.
- **The workspace's Vite is outside the plugins' own `vite` range.** `8.4.0-beta.1` doesn't satisfy `^8.1.4` under semver's prerelease rule, which `CONTRIBUTING.md`'s _Peers_ rule forbids. aube 2.10.0 reports no unmet peer: consumer E installed it without a warning.
- **The lockfile** ([below](#the-workspace-and-its-lockfile)).

## The decision

`RF-55`'s _Decided_ block holds it. This section explains how each property applies.

### The manifests

Both `packages/vite-traits-plugin/package.json` and `packages/vite-custom-element-assets/package.json` end with:

```json
"peerDependencies": {
  "rolldown": "^1.1.4",
  "vite": "^8.1.4 || ^8.4.0-beta.1"
}
```

and no `rolldown` in `dependencies`. Nothing else in `dependencies` changes. No `peerDependenciesMeta`: each package's main entry imports `rolldown` at runtime.

- **`rolldown`'s floor** is the floor that the `vite` floor declares: Vite 8.1.4 declares `~1.1.4`. Whenever the `vite` floor moves, the `rolldown` floor moves in the same commit to the floor that the new `vite` floor declares. `CONTRIBUTING.md`'s _Peers_ rule now states this.
- **The caret** covers the major that the workspace builds and tests against, 1. It is not Vite's tilde: Vite pins a minor because it uses rolldown's internals, and the plugins use only its public API.
- **`|| ^8.4.0-beta.1`** puts the workspace's own Vite inside the range. It goes when the workspace moves to a stable 8.4, in the same commit.
- **The private package moves too.** `@ydinjs/vite-custom-element-assets` isn't published, so only the workspace installs it. The rule places a package by what its files import, and a private package follows the same placement. That way, the two plugins don't differ, and publishing it later changes nothing here.

### Public types and runtime imports

**Nothing changes in either plugin's sources.**

- **Types still import from `rolldown`,** which is now the consumer's copy. The public `Plugin & RolldownPlugin` and `css/transform.d.ts`'s `SourceMapInput` keep their spelling.
- **Not through Vite's `Rolldown` namespace.**
  - The runtime needs the `RolldownMagicString` constructor, which Vite doesn't export. So `rolldown` is a peer either way, and naming its types through Vite removes nothing from the manifest.
  - The `RolldownPlugin` half of the return type is what a tsdown or rolldown host reads (`.scripts/tsdown-library.ts`), and that host uses the consumer's `rolldown`, not Vite's. The `Plugin` half already comes from `vite`.
- **Runtime imports stay `from 'rolldown'`.**

### The workspace and its lockfile

- **No package gains a devDependency.** The root's `"rolldown": "catalog:"` (1.3.2) and its `overrides` entry already install the peer for the workspace's builds and tests, inside `^1.1.4`.
- **The lockfile doesn't change.** Read on this branch with the manifests edited as above, then reverted:
  - `aube install --lockfile-only` and `--fix-lockfile` report _"Lockfile is up to date, resolution step is skipped"_ and write nothing;
  - `aube install --frozen-lockfile` passes and installs one `rolldown`, 1.3.2.
  - The lockfile's entries for the two workspace packages keep a copy of their old `peerDependencies`. aube doesn't read it as drift, and it is rewritten at the next full resolution.
- **`RD-16`'s release-age gate doesn't apply,** because no version is resolved anew, so no exception is needed.
- **Don't force a full re-resolution** (`--no-frozen-lockfile`). Today it fails with `ERR_AUBE_TRUST_DOWNGRADE` for `tsrs@0.25.0-ts7.1.0-beta`, which this unit doesn't touch. Before 2026-11-23, the gate would also block `vite@8.4.0-beta.1` (`RD-16`'s record). If aube does write a lockfile change, it may touch only the two workspace packages' entries and resolve no version. Otherwise, stop and report.

### What `RD-27`'s release check needs to know about peers

`RD-27`'s [release workflow plan](https://github.com/ausginer/material-x/blob/repo/release-workflow-1/.plan/release-workflow-1/release-workflow-plan.md) is on `repo/release-workflow-1` (PR #81), so this unit proposes and doesn't amend it. Its `prepare` step 7 installs the tarball into an empty project and type-checks it. Peers add three checks, which `.scripts/release-check.ts` can hold:

1. **The consumer project declares each peer of the package, optional ones included, at the version that the workspace's lockfile holds.** The check fails when that version doesn't satisfy the packed range under semver's prerelease rule. It computes this itself, because aube 2.10.0 reports no unmet peer (consumer E).
2. **Each peer resolves to one real path** from the package and from every other installed package that depends on it. For `@ydinjs/vite-traits-plugin`, that is `rolldown` resolved from the plugin and from `vite`. Consumer B is the failing case.
3. **The packed `peerDependencies` hold literal ranges,** with no `catalog:` or `workspace:` specifier.

**None of this blocks box-quad,** which has no peers. The first released package with a required peer would be `@ydinjs/vite-traits-plugin`. material-x's `react` and `@types/react` are optional peers, and check 1 installs them so that the React entry type-checks.

## Tasks

**Recipient:** an implementer, on this branch, in any slot except `e`.

**Sequencing:** Mx Implementer is changing `packages/vite-traits-plugin/src` in slot `e`. Tasks 1 and 2 touch no source. If slot `e`'s branch also changes the plugin's `package.json`, the branch merged second resolves the conflict. Task 3 waits for slot `e`'s merge and for the owner's answer to question 1.

### Task 1. The manifests

As [the manifests](#the-manifests) specify. Then run `aube install`, which is frozen-equivalent here.

**Proof:**

- `aube install --frozen-lockfile` passes, and `git diff package-lock.json` is empty, or touches only as [the lockfile](#the-workspace-and-its-lockfile) allows;
- the workspace holds one `rolldown`: `aube why rolldown`, or a listing of every `rolldown/package.json` under `node_modules` that isn't under `@rolldown/`, shows only `node_modules/rolldown` at 1.3.2;
- `just build`, `just typecheck`, `just typecheck-declarations` (`RF-51`'s check) and both plugins' tests pass;
- `aube exec publint` passes in `packages/vite-traits-plugin`.

### Task 2. The consumer proof for `@ydinjs/vite-traits-plugin`

Build the plugin and pack it with `aube pack`. Install the tarball with aube into empty projects outside the checkout, as [`consumer-probe.sh`](checks/consumer-probe.sh) does with its stand-in. Each project also gets `typescript`.

| Project | `vite`                          | Layout               |
| ------- | ------------------------------- | -------------------- |
| a       | `8.3.8`, the latest stable      | hoisted and isolated |
| b       | `8.1.4`, the floor              | hoisted              |
| c       | `8.4.0-beta.1`, the workspace's | hoisted              |

**In each:**

- **One copy.** `rolldown` resolved from the plugin and from `vite` is one real path.
- **Types against the consumer's Vite.** `tsc --noEmit`, with `skipLibCheck` off, passes on a module that:
  - passes `viteTraitsPlugin()` to `defineConfig({ plugins })` from `vite`;
  - passes it as the `plugins` of a `RolldownOptions` from `rolldown`.
- **The plugin's output survives a build.** A `vite build` of a fixture composition, such as one from the plugin's tests, writes the flattened class.

**The mutation:** project a, hoisted, with the tarball's manifest set back to `"rolldown": "1.3.2"` in `dependencies`. It shows two copies, and the build's output isn't flattened. That shows the proof tells the two manifests apart.

Save the transcript under [`checks/`](checks/). `@ydinjs/vite-custom-element-assets` is private, so task 1's workspace proofs cover it.

### Task 3. A host on another copy (only if the owner answers yes to question 1)

Both plugins return a string and a source map, as the traits plugin already does for the dev server, whenever the host's `rolldown` isn't the plugin's copy. A host that shares the plugin's copy keeps the native magic string. The test can be `this.meta.rolldownVersion !== VERSION`, with `VERSION` imported from `rolldown`: one string comparison per build or per module.

**Proof:** consumer D of the probe, with the real plugin, writes the flattened class. A node test with a stubbed `rolldownVersion` covers both branches, as its mutation.

**Amended 2026-11-20 by the architect,** on `reviewer-1` of task 3's [feature proof](../reviews/rolldown-peer-1/feature-proof-task3-claude.md). The property stands as written. The version comparison doesn't deliver it, and task 4 replaces it. Until this, the paragraph above was the whole task.

### Task 4. The host's binding, not its version

The plugins keep the native magic string only when the host's magic-string class is the plugin's own. That is the class the host's `instanceof` checks: the `BindingMagicString` of the native binding that the host's `rolldown` loaded. The version comparison stands in for that identity, and fails where two copies of one version each load their own binding. The feature proof shows that tree dropping the edit with exit 0 ([probe](../reviews/rolldown-peer-1/checks/same-version-copies.txt), `own-binding`). Whether a package manager produces it isn't established. A check of the identity itself makes the question moot, and costs no more than the comparison.

**How the host shows its class.** rolldown 1.3.2's transform bridge gives each `transform` handler a `meta.magicString`, a lazy `RolldownMagicString` of the module's code built from the host's own binding (`bindingify-input-options-*.mjs`, `bindingifyTransform`). It isn't behind `experimental.nativeMagicString`, which only gates `renderChunk`'s.

**Required properties:**

1. **Native means `meta.magicString instanceof RolldownMagicString`,** on the `transform` handler's own `meta` argument, with `RolldownMagicString` the plugin's import. `kind !== 'serve'` stays, as task 3 proved it load-bearing. The version comparison goes, and so does the `VERSION` import if nothing else uses it.
2. **Anything else gets a string and a source map:** no `meta.magicString`, as in a host whose bridge doesn't offer one, or one of another class. That fallback is correct in every host, and only slower.
3. **The native path costs no more than today:** a changed module gets at most the one native magic string it gets now. One way is for the plugin to edit the host's instance when it is of the plugin's class. A module the plugin doesn't change constructs nothing new.
4. **Both plugins:** the traits plugin's two transforms and `constructCSSTokens`'s production `transform` in `@ydinjs/vite-custom-element-assets`.

**Proofs:**

- **The node test** calls both transforms with a `meta.magicString` of the plugin's class, one of another class, and none. Only the first gives a `RolldownMagicString` and no map. The other two give a string and a map that names the module. Each branch fails under its mutation.
- **The feature proof's probe** (`same-version-copies.sh`), rerun with the real check in place of the stand-in. `shared-binding` takes the native path and keeps the edit. `own-binding` takes the string path and keeps it too.
- **Consumer D,** rerun with its mutant. The build is flattened, and with the check replaced by `true` it isn't.
- **Task 2's consumers,** at Vite 8.1.4, 8.3.8 hoisted and isolated, and 8.4.0-beta.1. Each build is flattened, and the record says which path each took. A host on the floor's rolldown that offers no `meta.magicString` takes the string path, which is correct.
- **material-x, on the native path:** its 213 build files are byte-identical to `main`'s, and docs-build and docs-smoke pass. A witness shows that the tsdown and Vite build hosts took the native path, not only produced the same bytes.
- **The private plugin's probe,** rerun with the three `meta` cases.

### Closing

- **`RF-55` closes** when tasks 1, 2, 3 and 4 are in and proven. The architect closes it on the branch, before the pull request merges, as `RF-23` and `RF-31` were closed. Until task 4, this said: _"when tasks 1 and 2 are in, and task 3 too if the owner answers yes"_.
- **The pull request says `Closes #48`** when it closes `RF-55`, and `Refs #48` otherwise.
- **Out of scope:** the proposals for `RD-27` above, which the release workflow's architect takes up.

## Questions for the owner

1. **A consumer whose own tree holds two `rolldown` copies** (consumer D: tsdown 0.23.7 beside Vite 8.3.8) gets a Vite build that silently drops the plugins' output. The peer is satisfied, and nothing warns. That consumer is using the plugin correctly, so under `CONTRIBUTING.md` §1.1 the plugin owes a correct build. The options:
   - **(a), recommended:** task 3. The plugin returns a string and a map when the host's copy differs. Such a build is correct and somewhat slower, and every other build is unchanged.
   - **(b)** Fail the build at `buildStart`, naming both versions. The consumer must then align tsdown and Vite.
   - **(c)** A published precondition in the README only. The build stays silently wrong for anyone who misses it.