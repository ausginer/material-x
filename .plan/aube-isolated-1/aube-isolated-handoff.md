# Handoff: three layout-independent fixes (`RF-51`, `RF-52`, `RF-53`)

**Recipient:** the implementer, in slot `b`.

**Branch:** `repo/aube-isolated-1`. **Input:** the architect's commit that adds this file, on top of `1ee6ff6dd`.

**Decided** by the owner, relayed by the coordinator on 2026-11-18: the layout stays hoisted (`RD-19`), and the isolated-layout report's three findings are fixed.

**Governing records,** in [`../00-index.md`](../00-index.md):

- `repo:RF-51`: material-x's React typings import by an absolute path;
- `repo:RF-52`: `.storybook/manager.tsx` imports an undeclared package;
- `repo:RF-53`: the root `just clean-build` exits 1;
- `repo:RD-16` and `repo:RF-48`: how dependencies change, and the reinstall after `aube add`.

Each entry's _Required property_ binds. This handoff adds the form where the entry leaves it open, and the witnesses. The entries hold the readings and the alternatives weighed.

**Not part of this unit:** a standing check for absolute imports in published declarations, such as turning on `import-x/no-extraneous-dependencies`. `RF-51` leaves that to the owner. Nothing here depends on the answer.

**Order:** one commit per item, in this order. The items are independent, so a stop in one doesn't block the others.

## Item 1. The React peer of `@ydinjs/material-x` (`RF-51`)

**Required:**

- `packages/material-x/package.json` gains, directly after `devDependencies`:

  ```json
  "peerDependencies": {
    "react": "^19"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  },
  ```

  The range form matches the repository's other peers (`"vite": "^8.1.4"`, `"size-limit": "^14"`). `^19` covers React 19, the major the workspace builds and tests against.

- Then `aube install`, so that `package-lock.json` records the peer. Afterwards, confirm that `node_modules/@ydinjs` holds all seven workspace packages. If any is missing, run `aube install --frozen-lockfile --force` and confirm again (`RF-48`). Report which was needed.
- No source file and no tsdown configuration changes. The architect read, at `1ee6ff6dd` with the manifest edited and nothing installed ([probe](checks/react-peer-probe.txt)), that tsdown then writes `import { DetailedHTMLProps, HTMLAttributes } from "react";` into `react.d.ts`.

**Witnesses:**

1. **The lockfile diff** is confined to the `packages/material-x` entry, and adds no `name@version` that the lockfile didn't already hold. Quote the diff in the report.
2. **The built typings.** Build every package that publishes declarations: `aube exec just build`, then `aube exec -- nx run-many -t build --projects=box-quad,drag,vite-custom-element-assets,vite-traits-plugin,size-limit-preset-rolldown --skipNxCache`.
   - `packages/material-x/react.d.ts` imports React's types from `"react"`.
   - **The absolute-path search** finds nothing. Run it over every built `.d.ts` under `packages/`, outside `node_modules`, `src` and `tests`, for an import or export whose specifier starts with `/` or a drive letter. That covers `from "/…"`, `import("/…")` and `import "/…"`. Save the command and its output.
3. **The search discriminates.** Run the same search before the manifest change, after the same builds. It finds `packages/material-x/react.d.ts`, and nothing else. Save that output too.
4. `aube exec just typecheck` and `aube exec just lint` exit 0.

**Stop and return to the architect** if the build still writes an absolute path with the peer declared, or if the lockfile diff resolves a new version.

## Item 2. Declare `@storybook/icons` (`RF-52`)

**Required:**

- `aube add -D -W @storybook/icons@2.0.2`, as `RD-16` says. 2.0.2 is the version the lockfile already holds for Storybook.
- Then the reinstall from the lockfile, which `RF-48` requires after every `aube add`: `aube install --frozen-lockfile --force`. Confirm that `node_modules/@ydinjs` holds all seven workspace packages.

**Witnesses:**

1. **The lockfile diff** adds the root's devDependency and changes no resolved version. Quote it.
2. **Every import under `.storybook/` is declared.** List the bare specifiers that `.storybook/*.ts` and `*.tsx` import, statically or dynamically, and reduce each to its package name (`@scope/name` or `name`). Every name except a `node:` builtin is a key of the root `package.json`'s `dependencies` or `devDependencies`. Save the listing and the comparison. Before the change it reports `@storybook/icons` alone. After it reports nothing.
3. `aube exec just lint`, `aube exec just typecheck` and `aube exec just docs-build` exit 0. Then `aube exec just docs-smoke` passes every page.

**Stop and return to the architect** if the add resolves any version other than 2.0.2, or changes another entry's resolution.

## Item 3. A `files.json` for the preset (`RF-53`)

**The form.** Add `packages/size-limit-preset-rolldown/files.json`:

```json
{
  "runtime": ["index"]
}
```

- **One mechanism.** Every other package cleans through `.scripts/package-files.ts` and its `files.json`. `vite-traits-plugin` already has a `files.json` that only its clean reads, so the preset follows that precedent.
- **Its own outputs and nothing else.** `index` gives the pathspecs `index.js`, `index.js.map`, `index.d.ts` and `index.d.ts.map`. Those are the three files the manifest publishes, plus the declaration map if tsdown writes one. `git clean -fx` removes only untracked files at those paths, so the tracked `src/size-limit-file.d.ts` is out of reach.
- **Nothing else changes.** `.scripts/package-files.ts` keeps failing on a missing `files.json`: a package without one is a defect to see, not a package that cleans nothing. The preset's `tsdown.config.ts` keeps its literal entry, as `vite-traits-plugin`'s does.

**Witnesses:**

1. **The root recipe.** `aube exec just clean-build` exits 0 after a build of all packages, as in item 1's second witness.
2. **The preset's clean is exact.** Before and after `aube exec just clean-build` in `packages/size-limit-preset-rolldown`, list its untracked and ignored files outside `node_modules` (`git status --ignored --porcelain .`). Save both lists. The difference is exactly the build outputs that existed, and includes `index.js`, `index.js.map` and `index.d.ts`. `git status --short` shows no tracked file deleted.
3. **The discriminator.** Without the new file, the root recipe exits 1 with `ERR_MODULE_NOT_FOUND` for the preset's `files.json`, as the [reading](checks/clean-build-reading.txt) shows. The architect's reading stands, and doesn't need to be repeated.
4. `aube exec just build` and `aube exec just size` still exit 0 after the clean. The size recipe rebuilds what it measures and loads the preset.

## Verification and handoff

- Follow [`.agents/docs/handoff.md`](../../.agents/docs/handoff.md) for the files changed: `fmt`, `lint` and `typecheck`, and `aube exec just fmt-check` at the root, which covers the JSON files.
- **Tests:** `aube exec -- just test --project repo` is enough for item 3, which changes no script. Items 1 and 2 change no test input beyond the build. Run material-x's browser tests if the lockfile diff in item 1 shows more than the peer.
- **The report** is `.plan/aube-isolated-1/aube-isolated-fixes-report.md`: each item, its commit, its witnesses with saved outputs under `checks/`, and any stop. Don't change the findings' status in `00-index.md`. The architect closes them from the report and the review.
- Commit each item, then the report, and push `repo/aube-isolated-1`.