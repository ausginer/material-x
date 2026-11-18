# Isolated-layout fixes — feature proof

**Files were read at:** `661af4cacf5676b5539039c621d58d99f2b57aea` (`repo/aube-isolated-1`, slot `b`, clean), the head of pull request [#34](https://github.com/ausginer/material-x/pull/34). **Diff reviewed:** `5cdc7e019` (exclusive) to `661af4cac` (inclusive), against the base `e9236603e`. **Records read at the same commit.**

**Governing records:** [`aube-isolated-handoff.md`](../../aube-isolated-1/aube-isolated-handoff.md) items 1 to 3, with item 1 as amended at `5020911b5`; the implementer's [report](../../aube-isolated-1/aube-isolated-fixes-report.md) and its readings under [`checks/`](../../aube-isolated-1/checks/); `repo:RD-16`, `repo:RD-19`, `repo:RF-48`'s _Decision_, and `repo:RF-51` to `repo:RF-55`, in [`00-index.md`](../../00-index.md); [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) Part I, _Dependencies of a published package_.

**Lens:** feature proof. Each claim below is my own reading of the tree, CI or a local probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the proof holds.** All three items are implemented as the records require, and every witness I repeated agrees with the report. There are two Tier C findings, and neither blocks the merge. Both concern the record, not the tree. They are routed to the architect.

**The deviation the implementer names.** The handoff's item 1 says to run `aube install` so that the lockfile records the peer. That command recorded nothing, so the implementer used `aube install --fix-lockfile`, which dropped the `node_modules/@ydinjs` links.

- **For this unit, it is covered.** Item 1 itself requires the `RF-48` check after the install and the forced reinstall if a link is missing. The implementer ran both, twice. The result meets the handoff: the lockfile records both peers, its diff is confined to the `packages/material-x` entry, and it resolves no new version. Neither stop condition of item 1 applies.
- **The standing record doesn't cover it.** `RF-48`'s decision, its required property and the rule in `implementer.md:22` name `aube add` and `aube remove` only. The defect also follows `aube install --fix-lockfile`, and in a scratch workspace it follows a plain `aube install` after a hand edit of a manifest's `dependencies` (reviewer-1). For a peer, a plain `aube install` doesn't record the edit, and no frozen install detects the drift (reviewer-2).

## Scope

**Covered.**

- The non-record diff, line by line: `package.json`, `package-lock.json`, `packages/material-x/package.json` and `packages/size-limit-preset-rolldown/files.json`.
- The manifest against `RF-51`'s required property as answered, and against _Dependencies of a published package_.
- The preset's `files.json` against `.scripts/package-files.ts` (`normalizeEntryPath`, `packageFilesToCleanPathspecs`, `clean`) and against `vite-traits-plugin`'s precedent.
- The commit order and contents against the handoff's _Order_ and its amendment.
- The implementer's saved readings: the three install transcripts, the three absolute-path searches, the two Storybook listings and `preset-clean.txt`.
- **Repeated in slot `b` at the head:**
  - `aube exec just build`, then the nx build of `box-quad`, `drag`, `vite-custom-element-assets`, `vite-traits-plugin` and `size-limit-preset-rolldown`: exit 0;
  - the absolute-path search over the 108 built declaration files: no match (exit 123 from `xargs`). `react.d.ts:21` reads `import { DetailedHTMLProps, HTMLAttributes } from "react";`. A wider search for `/workspaces/` in every built `.d.ts` and `.js` under `packages/`, outside `node_modules`, `src` and `tests`, also finds nothing;
  - the Storybook listing script from `storybook-imports-before.txt`: no undeclared name;
  - the root `aube exec just clean-build`: exit 0. Before it, the preset held the ignored files `index.d.ts`, `index.js` and `index.js.map`, and after it none, with no tracked file deleted;
  - then `aube exec just build`, `just size`, `just typecheck`, `just lint` and `just fmt-check`: each exit 0;
  - `aube exec -- just test --project repo`: 4 files, 65 tests passed.
- **A scratch probe** of aube's behaviour after a hand edit of a workspace manifest, outside the repository: [`checks/manifest-edit-probe.txt`](checks/manifest-edit-probe.txt).
- **CI,** run 44231089582 at the head: `scope`, `static`, `docs` and `measurements` passed. `chromium`, `firefox` and `webkit` were still pending when this review was committed.

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no `aube install`, `aube add` or `aube remove` in slot `b`. The install transcripts are the implementer's. I checked them against the lockfile diff at the head and the current links: `node_modules/@ydinjs` holds all seven packages, and `node_modules/size-limit-preset-rolldown` exists.
- I didn't repeat the "before" searches at `5cdc7e019`. The implementer's [before search](../../aube-isolated-1/checks/abs-import-search-before.txt) and the architect's [isolated reading](../../aube-isolated-1/checks/isolated-reading.txt) agree on the one absolute path.
- I ran neither `just docs-build` nor `just docs-smoke`. CI's `docs` job runs both and passed.
- I ran no browser test. The lockfile diff adds only peer fields, so the handoff doesn't require them.
- I didn't run `aube add --save-peer` (reviewer-2).

## Items that hold, with no finding

- **Item 1, the manifest (`RF-51`).** `packages/material-x/package.json` has `peerDependencies` `{"@types/react": "^19", "react": "^19"}` and both marked optional in `peerDependenciesMeta`, directly after `devDependencies`, as the amended block shows. The root installs `react` 19.3.1 and `@types/react` 19.3.0, inside the range, which meets _Dependencies of a published package_'s third peer rule. No source file and no tsdown configuration changed.
- **Item 1, the lockfile.** `git diff 5cdc7e019 661af4cac -- package-lock.json` changes two places: the root's devDependency from item 2, and the `packages/material-x` entry's two peer fields. No `name@version` entry is added or changed.
- **Item 1, the typings.** Rebuilt at the head, `react.d.ts` imports from `"react"`, and no built declaration file imports by an absolute path. The implementer's before search finds only `react.d.ts:21`, so the search discriminates.
- **Item 1, the amendment.** It landed as a further commit of its own (`9fadeb8ec`), after item 3. The handoff orders items 1 to 3 and doesn't place the amendment, so this order meets it. The report quotes both lockfile diffs.
- **Item 2 (`RF-52`).** The root `package.json` declares `"@storybook/icons": "2.0.2"`, exact, as `RD-16` and `savePrefix=` require. The lockfile's `node_modules/@storybook/icons` stays at 2.0.2, and `storybook`'s own range is `^2.0.2`. The listing covers `.storybook/docs/` too, which the handoff's glob would miss, and finds no undeclared name at the head.
- **Item 3 (`RF-53`).** `files.json` is `{"runtime": ["index"]}`. `packageFilesToCleanPathspecs` turns it into `index.d.ts`, `index.d.ts.map`, `index.js` and `index.js.map`, and `git clean -fx` removes only untracked files at those paths. The preset's three published files are among them, and the tracked `src/size-limit-file.d.ts` is not. `package-files.ts` and the preset's `tsdown.config.ts` are unchanged. The root clean exits 0, and the preset cleans through the same script as the other six packages.
- **The report's claims** agree with its transcripts, with one difference in wording. In `types-react-peer-install.txt`, the first plain `aube install` prints _"installed 979 packages in 1.1s"_, not _"Already up to date"_ as in the first pass. The report's point holds: the lockfile was unchanged in both.

## Findings

### reviewer-1 — `RF-48`'s defect follows more aube commands than its record and rule name

**Tier C.** Routed to the architect: the scope of `RF-48`'s decision and of the rule in `implementer.md`.

- **Current record.** `RF-48`'s _Decision_ says _"the cause is aube's `add` and `remove`"_. Its required property reads _"after `aube add` or `aube remove`, `node_modules` links every workspace package, or the install command fails"_. `implementer.md:22` asks for the reinstall after `aube add` or `aube remove` only. Its _Not adopted_ list says _"nobody has read whether `install` after a manifest change has the same defect"_.
- **What was read.**
  - In slot `b`, twice: `aube install --fix-lockfile` recorded the peer and left `node_modules/@ydinjs` and `node_modules/size-limit-preset-rolldown` missing. `aube install --frozen-lockfile --force` restored them (the implementer's [first](../../aube-isolated-1/checks/react-peer-install.txt) and [second](../../aube-isolated-1/checks/types-react-peer-install.txt) transcripts).
  - In a scratch hoisted workspace of two packages with no registry dependency ([probe](checks/manifest-edit-probe.txt)):
    - section A: `aube install --fix-lockfile` after a peer edit drops both workspace links, and a plain `aube install` doesn't restore them;
    - section B: a plain `aube install` after a hand edit of `dependencies` updates the lockfile and drops both links;
    - in both, `aube install --frozen-lockfile --force` restores them.
- **Why it matters.** The record names `--fix-lockfile` as a repair command (`RF-47`) and as the path for this unit. Hand edits of a manifest are the only path for `peerDependenciesMeta`, and the path this handoff prescribed. A developer who follows either one isn't told to reinstall. The failure is loud: the next typecheck can't find a `@ydinjs` package. So no consumer or gate is affected, and the tier is C.
- **Limit.** Section B is read only in the scratch workspace, not in the repository. In that workspace, the first `aube install` without a lockfile also linked nothing, which the repository's tree doesn't show. Its behaviour may differ from the repository's in other ways.
- **Required property.** The record's repair rule names every aube command it teaches for changing a manifest or the lockfile, or the record states which of them leave the links in place. The _Not adopted_ sentence about `install` after a manifest change agrees with the reading.

### reviewer-2 — A peer-only manifest change doesn't reach the lockfile through `aube install`, and no frozen install detects the drift

**Tier C.** Routed to the architect: how a peer change is installed and recorded under `RD-16`.

- **Current record.** The handoff's item 1 says _"Then `aube install`, so that `package-lock.json` records the peer."_ `RD-16` property 2 makes `package-lock.json` the one lockfile, and the gate's jobs install with `aube ci`.
- **What was read.**
  - In slot `b`, twice, a plain `aube install` after the peer edit left `package-lock.json` unchanged (the implementer's transcripts).
  - In the scratch workspace ([probe](checks/manifest-edit-probe.txt), section A), after a peer-only edit, `aube install --frozen-lockfile` and `aube ci` exit 0 against a lockfile that lacks the peer fields. A plain `aube install` answers _"Already up to date"_. Only `--fix-lockfile` writes the fields. Section B is the control: after a `dependencies` edit, both frozen installs exit 1.
  - `aube add --help` lists `--save-peer` (section C). Whether it writes `peerDependenciesMeta`, records the lockfile, or drops the links is not read.
- **Why it matters.** A later change to a published package's peers can land with a lockfile that doesn't record it, and the gate passes. Nothing I found reads a workspace entry's peer fields from the lockfile, so I know of no consumer that this misleads, and the tier is C. In this unit, the lockfile does record both peers.
- **Required property.** The record says which command records a peer change in the lockfile, and whether a lockfile that lacks a manifest's peer fields is acceptable, since no gate detects it.

## Outside this unit

`.agents/docs/architecture.md:85` says that tsdown builds each package's entry points from its `files.json`. The preset and `vite-traits-plugin` keep literal tsdown entries, and their `files.json` feeds only the clean. The handoff decided the preset's form on that precedent, so this unit adds no drift. The architect may want the sentence to name the exception.

## Next

The architect closes `RF-51`, `RF-52` and `RF-53` from the report and this review, and decides reviewer-1 and reviewer-2. CI's three engine jobs at `661af4cac` were pending when this review was committed. The owner reads them before the merge.