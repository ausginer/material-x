# The three layout-independent fixes — report

**Status: implemented 2026-11-18,** in slot `b` on `repo/aube-isolated-1`. All three items landed, and no item stopped. The findings' status in [`../00-index.md`](../00-index.md) is unchanged. The architect closes them from this report and the review.

**Input:** [the handoff](aube-isolated-handoff.md) at `5cdc7e019`, and its item 1 as amended at `5020911b5`. **Governing records:** `repo:RF-51`, `repo:RF-52`, `repo:RF-53`, `repo:RD-16` and `repo:RF-48`, in [`../00-index.md`](../00-index.md). aube 2.10.0, with the hoisted linker.

| Item                                                 | Finding | Commit      |
| ---------------------------------------------------- | ------- | ----------- |
| 1. The React peer of `@ydinjs/material-x`            | `RF-51` | `ef530af97` |
| 1, amended. `@types/react` as a second optional peer | `RF-51` | `9fadeb8ec` |
| 2. Declare `@storybook/icons`                        | `RF-52` | `8bf346d94` |
| 3. A `files.json` for the preset                     | `RF-53` | `292b1649b` |

## Item 1. The React peer (`RF-51`)

`packages/material-x/package.json` gains `peerDependencies` (`"react": "^19"`) and `peerDependenciesMeta` (`react` optional) directly after `devDependencies`, in the handoff's form. No source file or tsdown configuration changed.

**The install was different from the handoff's.** The handoff expected `aube install` to record the peer in `package-lock.json`. It didn't: it answered _"Already up to date"_ and left the lockfile unchanged. `aube install --fix-lockfile`, which re-resolves only the entries whose spec drifted from `package.json`, recorded it. It reported _"resolved 895 · reused 895"_. It then left `node_modules/@ydinjs` and `node_modules/size-limit-preset-rolldown` missing, which is `RF-48`'s defect, observed here for `install --fix-lockfile` as well as `add` and `remove`. `aube install --frozen-lockfile --force` restored all seven `@ydinjs` links and the preset. **So the forced reinstall was needed.** Transcript: [`checks/react-peer-install.txt`](checks/react-peer-install.txt).

**Witnesses.**

1. **The lockfile diff** is confined to the `packages/material-x` entry and adds no `name@version`:

   ```diff
   @@ -19619,6 +19619,14 @@
          },
          "engines": {
            "node": ">=24"
   +      },
   +      "peerDependencies": {
   +        "react": "^19"
   +      },
   +      "peerDependenciesMeta": {
   +        "react": {
   +          "optional": true
   +        }
          }
        },
   ```

2. **The built typings.** After `aube exec just build` and the nx build of the other five packages, `packages/material-x/react.d.ts:21` reads `import { DetailedHTMLProps, HTMLAttributes } from "react";`. The absolute-path search over the 108 built declaration files under `packages/`, outside `node_modules`, `src` and `tests`, finds nothing: [`checks/abs-import-search-after.txt`](checks/abs-import-search-after.txt). The search matches `from`, `import(` and `import` followed by a quoted specifier that starts with `/` or a drive letter.
3. **The search discriminates.** The same search at `5cdc7e019`, after the same builds and before the manifest change, finds `packages/material-x/react.d.ts:21` with `/workspaces/worktrees/b/node_modules/react/index.js`, and nothing else: [`checks/abs-import-search-before.txt`](checks/abs-import-search-before.txt).
4. `aube exec just typecheck` and `aube exec just lint` exit 0.

### The amendment: `@types/react` (`9fadeb8ec`)

`peerDependencies` gains `"@types/react": "^19"`, and `peerDependenciesMeta` marks it optional, in the amended handoff's form. The root already installs `@types/react` 19.3.0.

The install went as in the first pass. `aube install` left the lockfile unchanged, `aube install --fix-lockfile` recorded the peer (_"resolved 895 · reused 895"_) and dropped `node_modules/@ydinjs` and the preset, and `aube install --frozen-lockfile --force` restored all seven links and the preset. **So the forced reinstall was needed again.** Transcript: [`checks/types-react-peer-install.txt`](checks/types-react-peer-install.txt).

**Witnesses.**

1. **The lockfile diff** is confined to the `packages/material-x` entry, adds no `name@version`, and names both peers:

   ```diff
   @@ -19622,9 +19622,13 @@
            "node": ">=24"
          },
          "peerDependencies": {
   +        "@types/react": "^19",
            "react": "^19"
          },
          "peerDependenciesMeta": {
   +        "@types/react": {
   +          "optional": true
   +        },
            "react": {
              "optional": true
            }
   ```

2. **The rebuilt typings.** After the same builds, `react.d.ts:21` still imports from `"react"`, and the absolute-path search over the 108 built declaration files finds nothing: [`checks/abs-import-search-amended.txt`](checks/abs-import-search-amended.txt).
3. `aube exec just typecheck` and `aube exec just lint` exit 0.

The lockfile diffs show only the peers, so material-x's browser tests were not run, as the handoff allows.

## Item 2. `@storybook/icons` (`RF-52`)

`aube add -D -W @storybook/icons@2.0.2`, then `aube install --frozen-lockfile --force`. The add left `node_modules/@ydinjs` and the preset missing again, and the reinstall restored all seven links and the preset. Transcript: [`checks/storybook-icons-install.txt`](checks/storybook-icons-install.txt).

**Witnesses.**

1. **The lockfile diff** adds the root's devDependency and changes no resolved version. The `node_modules/@storybook/icons` entry stays at 2.0.2 with the same `resolved` and `integrity`.

   ```diff
   @@ -20,6 +20,7 @@
            "@storybook/addon-docs": "10.6.7",
            "@storybook/addon-links": "10.6.7",
            "@storybook/addon-themes": "10.6.7",
   +        "@storybook/icons": "2.0.2",
            "@storybook/react-vite": "10.6.7",
   ```

2. **Every import under `.storybook/` is declared.** The listing covers every `.ts` and `.tsx` file under `.storybook/`, including `.storybook/docs/`, which the handoff's `.storybook/*.ts` glob would miss. Before the change, the comparison reports `@storybook/icons` alone: [`checks/storybook-imports-before.txt`](checks/storybook-imports-before.txt), which also holds the script. After it, the comparison reports nothing: [`checks/storybook-imports-after.txt`](checks/storybook-imports-after.txt).
3. `aube exec just lint`, `aube exec just typecheck` and `aube exec just docs-build` exit 0. `aube exec just docs-smoke` passes 102 of 102 pages.

## Item 3. The preset's `files.json` (`RF-53`)

`packages/size-limit-preset-rolldown/files.json` is `{ "runtime": ["index"] }`, the handoff's form. `vite-traits-plugin`'s file writes `"index.js"`, and `.scripts/package-files.ts`'s `normalizeEntryPath` reduces both forms to `index`. Nothing else changed.

**Witnesses,** in [`checks/preset-clean.txt`](checks/preset-clean.txt):

1. **The root recipe.** After a build of all packages, `aube exec just clean-build` exits 0, with 7 of 7 tasks succeeded.
2. **The preset's clean is exact.** Before the clean, the preset's untracked and ignored files outside `node_modules` are `files.json`, `index.d.ts`, `index.js` and `index.js.map`. After it, only `files.json` remains, so the difference is exactly the three build outputs. tsdown wrote no `index.d.ts.map`. No tracked file is deleted.
3. **The discriminator** is the architect's [reading](checks/clean-build-reading.txt) and was not repeated.
4. `aube exec just build` and `aube exec just size` exit 0 after the clean.

## Verification

- `aube exec just fmt-check` at the root exits 0 after each item.
- `aube exec -- just test --project repo`: 4 files, 65 tests passed.
- `lint` and `typecheck` at the root, as each item lists. This report changes Markdown only. No linter is configured for Markdown, so lint did not apply. Its relative links were checked by listing their targets.

## Not in this unit

While this unit ran, the main slot's architect wrote into slot `b` and committed `5020911b5` there: the owner's answers on `RF-51`, the amended handoff, the _Dependencies of a published package_ section of `CONTRIBUTING.md`, and [`checks/rf51-declarations-typecheck.txt`](checks/rf51-declarations-typecheck.txt). It sits between `8bf346d94` and `292b1649b`, so the branch needed no merge. This unit didn't change those files.

## Next

The architect reviews this report and closes `RF-51`, `RF-52` and `RF-53`, or returns them.