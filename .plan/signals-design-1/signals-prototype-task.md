# `@ydinjs/signals` — prototype task

**Author:** the architect, on `repo/signals-design-1`, 2026-11-22, beside revision 2 of the [design draft](signals-design-draft.md). **For:** an implementer. **Kind:** an architecture prototype, under [`agent-workflow.md` §Architecture prototypes](../../.agents/docs/agent-workflow.md#architecture-prototypes). It is provisional code for the owner to evaluate. It isn't production adoption, and it adopts no decision.

## Purpose

The owner chooses Q4, Q9, Q10 and Q11 of the draft, and whether to continue, after he has tried this prototype. So it has to show five things in runnable code:

1. the draft's narrow core, with computeds and effects that narrow to the edges each run read (draft §2.4, §3);
2. a declared family for collections, the owner's option (c) (draft §2.6);
3. the button group's attribute forwarding carried by signals in place of `EventEmitter`, in both shapes of draft §4.4;
4. what that costs in bytes and at runtime, against today's `EventEmitter` and against `@preact/signals-core` and `alien-signals`;
5. whether the draft's assumptions hold, P1 to P10 and C1 to C5, or which of them break.

## Where to work

- **Branch: `repo/signals-design-1`.** The plan and its prototype share one branch (`agent-workflow.md` §One branch and one pull request per unit). The architect's worktree has released it.
- **Worktree: a fresh slot.** The owner starts the session with:

  ```sh
  cl implementer g
  ```

  `g` is the first free slot when this task was written. Any free slot works. A new slot is created detached at `origin/main`, so the session's first commands are:

  ```sh
  git fetch origin
  git switch repo/signals-design-1
  ```

- **If `origin/main` has moved,** merge it into the branch before starting, with no rebase and no force-push. The base readings in [Readings](#readings) are then taken at the merge base.
- **The main checkout stays untouched.**

## What to build

Proposed code goes at its normal source paths. Names below that are not already in the draft are provisional: choose them by `technical-english.md`, and the report lists them for the owner.

### 1. The package `@ydinjs/signals`

- **`packages/signals/`,** version `0.1.0`, laid out as `packages/box-quad/` is: manifest, `Justfile`, `project.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `files.json`, `.size-limit.json`, `.oxlintrc.json` and `eslint.config.ts` as box-quad has them. Include a `browserslist` field set to `baseline newly available` (`repo:RD-27` property 3). Add no README beyond a few lines on running the prototype.
- **Wire it in where the workspace lists its packages,** as box-quad is wired: the root `Justfile`'s recipes, root `vitest.config.ts` and `.scripts/vitest-config.ts`, and `MEASURED` in `.scripts/size-reading.ts`.
- **`src/`** holds the core of draft §3, `signal`, `computed`, `effect` and `batch`, with a `name` option, and the declared family of §2.6 (c) in a module of its own, so that a composition without it doesn't contain it. Standalone exports, one node shape, no error-handler API, no `subscribe` export, no owner tree and no development build (draft §4.4).
- **Runtime dependencies:** none.
- **Dev dependencies:** `@preact/signals-core` and `alien-signals`, at exact versions, for the comparisons only. Add them with `aube add`.

### 2. The declared family

- **It is a declared input** whose value is a list of member nodes. The callback's accessor for it gives the current members, and a member read through it marks an edge to that member (draft §2.6 (c)).
- **Its shape is the implementer's,** within C1 to C5. Two variants are allowed if the first one breaks a property. The report shows the call site for the sketch's scan:

  ```ts
  const firstMatch = computed([rows, threshold], (rows, threshold) => {
    // read each row through the family until the first match
  });
  ```

- **Build (a), keyed mapping, or (b), rebuild,** only where (c) breaks one of P1 to P10. Then say which property broke and how.

### 3. The core consumer flow

The button group forwards `color`, `size`, `shape`, `disabled` and `value` to its buttons through `BUTTON_GROUP_CTX`. Today that goes through `EventEmitter` (draft §4.1). Carry it by signals, as draft §4.3 describes: one signal per forwarded attribute per group, one effect per connected button, and the effect's disposer as the context cleanup.

- **Files:** `packages/material-x/src/button-group/button-group-context.ts` and `packages/material-x/src/core/utils/useContext.ts`. Change `ButtonCore.ts`, `SwitchCore.ts` or `ButtonGroupCore.ts` only as far as the context's shape forces it.
- **Two commits, one for each shape of draft §4.4,** so that the owner can check out either without a patch:
  1. **(A)** the button's helper imports `effect`;
  2. **(B)** the context value carries a function that creates the button's effect, so the button imports nothing from signals.

  The branch's head is (B). The report names both commits.

- **The component's callback keeps its arguments,** `(attr, oldValue, newValue)` for each attribute that changed, with the previous value kept by the effect.

### 4. Core

- **Delete `packages/core/src/emitter.ts`,** its `exports` entry, its `files.json` entry, `tests/emitter.browser.test.ts` and its row in `.size-limit.json`. `Unsubscribe` moves to `controllers/useContext.ts`, its only importer. Core's `useContext` JSDoc names signals where it names `EventEmitter`.
- **Add one controller** that binds an effect to the host's connection (draft §4.3, Q10). It creates the effect on each connect and disposes it on each disconnect, so a reconnected host has a new effect. Give it a browser test beside the other controller tests. The report says whether the button-group flow uses it, and why or why not.

### 5. Manifests

The draft's recommendation for Q9, provisionally, because the prototype needs one: `@ydinjs/signals` is a peer of material-x, required, and a peer of core, optional through `peerDependenciesMeta`, because only the controller imports it. It is a dev dependency of both in the workspace, at `0.1.0`. Edit the peer fields by hand, then run `aube install --fix-lockfile`, as the repository does for peers.

## Properties to test

The draft's P1 to P10 (§2.10) and C1 to C5 (§2.6) are the test suite. Each is a test of `packages/signals`, in its `tests/` directory, in the layers box-quad uses. Each row below names the case that must be present.

| Property | Case |
| --- | --- |
| P1 consistency, P2 single evaluation | A diamond, `a → b, c → d`, with an effect on `d`: one write to `a` runs `b`, `c` and `d` once each, and the effect sees a consistent `d`. |
| P3 equality cut-off | A computed whose output doesn't change stops propagation: its consumers don't rerun. |
| P4 laziness | An unobserved computed doesn't evaluate on a write, and after it is read its source holds no link to it. |
| P5 narrowing, computed | A branch switch: after the switch, a write to the input no longer read doesn't rerun the computed, and a write to the newly read one does. |
| P6 narrowing, effect | The same for an effect, and a test that states its consequence: an effect that declares an input and doesn't read it doesn't rerun when that input changes. |
| P7 escaped reads | An accessor called from a timer and after an `await` returns the current value and marks no edge. |
| P8 steady-state allocation | A probe, not only a test: a run that reads the same edges as the previous run allocates nothing in the runtime. The report says how this was observed and what the probe can't see. |
| P9 inspection seam | A node's name and declared sources are readable. The production half of P9, a separate development build, isn't prototyped. |
| P10 batching | Writes in a batch propagate once at its end, and nested batches flush at the outermost end. |
| C1 to C3 | The scan of the family for the first matching row, with rows inserted, removed and reordered: only rows up to the match are subscribed, and a removed row holds no link to the consumer after the consumer's next run. |
| C4 | P8's probe, for a family run that reads the same members. |
| C5 | The family's declaration is readable before the first run, and its member edges after it. |

**Existing tests are the parity check.** They pass unchanged on both commits of the consumer flow: material-x's `tests/button-group/` and `tests/button/` behaviour and spec-contract tests, and core's `tests/controllers/useContext.browser.test.ts`. The visual suite runs only in CI (`repo:RD-13`), so the report says that no visual run was made locally.

## Readings

Every reading uses the repository's own instrument and states its environment. The report keeps observations and estimates apart (`CONTRIBUTING.md` §15).

### Size, in Brotli bytes

- **`@ydinjs/signals` rows:** `signal` alone; `signal` with `computed`; the complete core; and the core with the family.
- **The baselines:** `@preact/signals-core` and `alien-signals`, each in a fixture importing the same features, `signal`, `computed`, `effect` and `batch`, measured by the same preset. These are readings for the report, not rows in `.size-limit.json`.
- **material-x and core, at the base, (A) and (B):** each `button/*` and `button-group/*` row, `complete`, and the control rows `icon/icon` and `list/list`, which must not move (`CONTRIBUTING.md` §18), plus core's `element` row as a control and the deleted `emitter` row's last figure, 198 B at `7dbef17bb`. Use `just size-reading` and `just size-report`.
- **For each row that moved:** which modules entered or left it.

### Speed, against `@preact/signals-core` and `alien-signals`

A benchmark script under `packages/signals/bench/`, run with `node`, with warm-up and repeated samples. The report gives the median, the spread, the Node version and the machine. The cases:

1. propagation through a chain and a diamond, when each run reads the same edges as the previous one;
2. a branch switch on every write;
3. a wide declaration read sparsely: 100 declared inputs, 3 read per run. This is the sketch's worry about allocating accessors;
4. creation and disposal of nodes with 1, 10 and 100 declared inputs;
5. the family's scan compared with a Preact computed that loops over the current members.

### The consumer flow at runtime

A browser probe that connects and disconnects a group of 50 buttons 1,000 times, at the base, (A) and (B), and reads the time, and the retained heap where the browser exposes it. The report states what the probe can't see.

## How the owner tries it

The report gives these commands, as run:

```sh
aube install
cd packages/signals && aube exec just test
node packages/signals/bench/<script>.ts
cd packages/material-x && aube exec just test tests/button-group
just docs-dev   # at the root; then the button group stories on port 6006
```

The two group stories are `src/button-group/button-group.stories.tsx` and `connected-button-group.stories.tsx`. They should behave as on `main`.

## What isn't in scope

- the DevTools panel, the collector, the inspection interface and a development build;
- the bridges to Solid, Preact and Vue;
- keyed mapping or rebuild, unless (c) fails;
- async computeds and an owner tree;
- documentation beyond the prototype's README lines and the JSDoc that the changed source needs;
- record identifiers, decisions, a `packages/signals/.plan/` scope, or entries in any register;
- a pull request.

## The return

- **The report:** `.plan/signals-design-1/signals-prototype-report.md`, with its saved readings under `.plan/signals-design-1/checks/`. It names:
  - the two consumer-flow commits and the head;
  - the source paths;
  - the commands as run and their results;
  - the readings;
  - each property that held, broke or wasn't tested;
  - known defects, missing capabilities and measurement limits;
  - what the prototype shows for Q4, Q9, Q10 and Q11, as evidence and not as an answer.
- **Before committing:** run `handoff.md`'s checks for each changed file. Then push the branch.
- **Then stop** for the owner's evaluation. Don't continue into production work, and don't open a pull request.