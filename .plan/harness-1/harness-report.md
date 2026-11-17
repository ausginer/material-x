# Harness unit report

**Status: done, with no stop.** Items 1 to 6 are implemented and witnessed. The `RF-48` reading reproduced the finding in isolation, and the architect decides it from [the reading](checks/rf48-reading.txt). Two readings are for the architect: [session names](#witness-4-session-names) and [`RF-48`](#the-rf-48-reading).

**Branch** `repo/harness-1`. The input was the [handoff](harness-handoff.md) at `2643f2d7d`, amended at `c4df9cc0d`. **Commits:** `4c489e745` (items 4, 3 and 1), `0b6eba25a` (item 2 before the rebuild), `51a992b49` (this report), and, after the architect's `1d6cbb5c2`, the commit that adds items 5 and 6. **Governing records:** `repo:RD-17` as amended, `repo:RD-18`, `repo:RD-16` property 12 and `repo:RF-48`, in [`../00-index.md`](../00-index.md).

## Item 4: `aube install` after a merge

`aube install` ran first in the main checkout, after the merge at `d6838d0f1`, and linked all seven workspace packages. `.claude/agents/implementer.md` has the rule beside the `aube add -D -W` rule, as the handoff words it.

## Item 3: the `${VAR:?}` rule

`AGENTS.md` §Evidence has the counter-example appended to the same paragraph, as the handoff words it.

## Item 1: the guard and the launcher removed (`RD-18`)

**Removed:** `.claude/plugins/harness-effort-guard/`, `.claude-plugin/marketplace.json`, `.scripts/claude-role.sh`, `.agents/docs/harness-effort-guard.md` and `.agents/docs/harness-orchestration.md`. In `.claude/settings.json`: `env.HARNESS_EFFORT_GUARD_MODE`, `extraKnownMarketplaces.material-x` and the guard's `enabledPlugins` entry. `.oxlintrc.json`'s override for the plugin's tests. ESLint's camelcase allow list loses both groups, the hook payload's 8 names and the observation log's 9, because no remaining source uses any of them.

**Rewritten:**

- `AGENTS.md`: §Before running a governed role is deleted, with its _"dispatch only from the main checkout"_ paragraph. §Where things are says that a role session starts with `cl <profile> [<slot>]`, and no longer says that the guard governs sessions.
- `CLAUDE.md` §Running a role: the launcher and guard paragraphs are replaced by one saying that the owner starts each role session with `cl`, which passes the definition's effort.
- `README.md`: the marketplace step and its sentence.
- `coordinator-setup.md`: §Start a guarded role becomes §Start a role session (see item 2).
- `agent-workflow.md`: the guard links. The consolidator's dispatch is governed by its role definition.
- `coordinator.md`, `.claude/agents/coordinator.md` and `documentation.md`: _"governed role"_ and _"guarded"_ become _"role"_.
- `.claude/agents/consolidator.md`: _"whether it is governed"_ goes. The no-`name`, no-`model` rule and its reason stay, reworded where they said _"ungoverned"_, and the claim that both are _"refused at the boundary"_ becomes _"Nothing checks either rule at dispatch, so this definition is where it holds."_

**`cl` reads the effort** from the `effort:` field of the session root's `.claude/agents/<agent>.md` frontmatter. It refuses, with exit 78, when that field is missing or empty or the file is missing, and when `CLAUDE_CODE_EFFORT_LEVEL` is set. Its table keeps the profile, the agent and the session name. Every definition's level equals the level the table hardcoded.

**Witnesses:**

1. **The search** matches only under `.plan/` directories: 0 lines outside them ([output](checks/guard-search.txt), read before the commit that removed the guard; the head gives the same files).
2. **Settings.** `.claude/settings.json` parses as `{"enabledPlugins":{"typescript-lsp@claude-plugins-official":true}}`.
3. **Lint and format.** `just lint`, `just fmt-check` and `just typecheck` exit 0 at `4c489e745` and again at `0b6eba25a`. A `git grep -w` per removed name, outside `.plan/`, finds nothing, except `subagent_type` in `.claude/agents/consolidator.md`'s prose, which no linter reads.
4. **`cl` reads the level.** [`.scripts/cl.node.test.ts`](../../.scripts/cl.node.test.ts), in the root `repo` node project, passes `--effort high` for `architect` and `--effort medium` for `implementer`, follows a changed `effort:`, and refuses a definition without `effort:`, a missing definition and a set `CLAUDE_CODE_EFFORT_LEVEL`. With the effort hardcoded again, 4 cases fail ([mutations](checks/cl-mutations.txt)).

## Item 2: session slots and the parallel process (`RD-17`)

**`cl [--init] <profile> [<slot>]`:**

- No slot gives the main checkout and today's names.
- A slot is one of `b` to `z`, each listed, because a bracket range can match upper case in some locales. Anything else exits 64.
- A slot's root is `/workspaces/worktrees`. When it isn't a mount point, `cl` exits 78 and names the `<workspace>_worktrees` volume, and creates nothing. It never creates the root.
- A missing slot is created with `git worktree add -q --detach --lock --reason 'session slot' <dir> origin/main`. An existing one is reused as it is.
- The session runs in the slot as `Mx <Role> <S>`, and the effort is read from the slot's own definition.
- `CL_SLOT_ROOT` is the one test hook, and every path assembled from it is checked with `${…:?}`.

**The volume and the shared store:** `devcontainer.json` mounts `${localWorkspaceFolderBasename}_worktrees` at `/workspaces/worktrees` and sets `AUBE_STORE_DIR` and `AUBE_CACHE_DIR` under it. `post-create/chown.sh` gives the volume to `node`, and it runs before `setup.sh`'s install. `.scripts/link-tsserver.ts` writes a new file and renames it over `tsserver.js`. With a probe hardlink standing for the store's copy, the probe kept its content and the target got a new inode ([reading](checks/tsserver-replace.txt)).

**Documentation:**

- `coordinator-setup.md` §Start a role session, with §Slots, §Session names and §Slot limits: the slot names, `/clear` in place of renaming, `--init` once per slot, the lock and how to remove a slot, the volume being invisible on the host, the shared store, the rule against writing into a dependency's file, and `.claude/worktrees/` staying Claude Code's.
- `agent-workflow.md` §Parallel units, with §Stacks: who runs where and the main slot's architect as the only minter, one unit per slot and one open task per session, the index kept as one file, and the stack procedure with what a squash merge does to it.
- `coordinator.md`: several open units, the per-slot summary, and the count of index conflicts.

### Witness 1: `cl` in a scratch clone

`.scripts/cl.node.test.ts` runs `cl.sh` from a clone whose `origin` is a sibling repository, with a stub `claude` that prints its arguments and working directory. All 18 cases pass:

- `cl implementer b` creates the slot under the slot root, detached at `origin/main` and `locked session slot` in `git worktree list --porcelain`, and runs the stub there with `--agent implementer --effort medium --resume 'Mx Implementer B'`;
- `--init` passes `--name` instead;
- a second call keeps an untracked file and a new commit in the slot;
- `cl implementer B`, `bb` and `a` exit 64;
- `cl coordinator` resumes `Mx Coordinator` in the main checkout;
- with a slot root that isn't a mount point, `cl implementer b` exits non-zero with nothing on standard output, names the root and the volume, and leaves the root empty and `.git/worktrees` absent.

**The mount point:** the success cases put a stub `mountpoint` that exits 0 on `PATH` beside the stub `claude`. The refusal case leaves it off, so `/usr/bin/mountpoint` reads the scratch root. Six mutations of `cl.sh` each fail at least one case ([mutations](checks/cl-mutations.txt)).

### Witness 2: slots on the volume, after the rebuild

Read in the rebuilt container ([transcript](checks/slot-volume.txt)). Slot `b` existed, created by the owner with `cl` at `8cf9781fa`, and was detached at `0b6eba25a`. Slot `c` was created with `cl implementer c` with a stub `claude` first on `PATH`, so no session started, and was detached at `0b6eba25a`.

1. In `b`, before any install, `require.resolve('vite')` fails with _"Cannot find module 'vite'"_. Resolution doesn't reach another tree.
2. `aube store path` prints `/workspaces/worktrees/.aube/store/v1`.
3. `aube install` in `b` downloads 895 packages in 38 s, and `vite` then resolves to `/workspaces/worktrees/b/node_modules/vite/dist/node/index.js`.
4. `aube install` in `c` takes 1 s. `node_modules/vite/package.json` in `b` and `c` is inode 147010175, with 4 links.
5. `typescript/lib/tsserver.js` in `b` has 1 link and holds the wrapper. `aube store status` says _"Store is consistent: 897 packages verified"_.
6. `git worktree list --porcelain` shows `b` and `c` detached and `locked session slot`.
7. `aube install` in the main checkout passes in 2 s with no warning about copying. Its `vite/package.json` has 1 link: the main tree copies, as `RD-17` property 9 accepts.

The only warning in the transcript is a slow-registry notice during `b`'s download. **No stop applies:** the slots share an inode, the store check passes, and no file under `node_modules` showed a write in place.

### Witness 3: the stack procedure

[`stack-procedure.txt`](checks/stack-procedure.txt), in a scratch repository with a 30-line file. `a` changes L05 and L15, `b` changes L05 again and L25. After `a` squash-merges into `main` and `b` merges `main`, only L05 conflicts. L15, which only `a` changed, merges cleanly. Keeping `b`'s side, `git diff main...b` shows only `b`'s L05 and L25. `agent-workflow.md` §Stacks cites it.

### Witness 4: session names

Read in the Claude Code 2.1.326 bundle without starting a session ([reading](checks/session-names.txt)):

- `--resume <name>` matches session titles exactly, case-insensitively, over the sessions of **every worktree of the repository** (`git worktree list`), not only the session's own directory. It resumes the one match.
- **Different directories don't collide** because the names differ: `Mx Implementer` and `Mx Implementer B` are different titles. So the stop _"can't tell sessions in different directories apart"_ doesn't apply, but the directory isn't the key.
- **With more than one match, it doesn't choose.** It opens the resume picker with the name as its search text.
- **`/clear` starts a new session id with the same title.** This session did, and the main checkout's project directory already holds 63 transcripts titled `Mx Implementer`, each with one session id. So after a `/clear`, `cl <profile>` reaches the picker, not the session. **For the architect:** this bears on `RD-17` property 2's `/clear` in place of renaming.
- `cl --init` can't refuse in advance, because the CLI offers no command that lists session titles. `coordinator-setup.md` says to run `--init` once per slot and profile, and that the picker appears after a `/clear`.

**Limit:** which key the search deduplicates by wasn't read, so whether a session and the session that `/clear` started from it count as one match is inferred, not read. Nothing was observed interactively.

## The `RF-48` reading

In slot `b` after witness 2's readings, with no other command using it ([reading](checks/rf48-reading.txt)). The package was `left-pad@1.3.0`: published in 2018, with only `test` and `bench` scripts, and absent from the lockfile.

- **Before:** `node_modules/@ydinjs` holds all seven workspace packages.
- **`aube add -D -W left-pad@1.3.0`** exits 0 and changes `package.json` and `package-lock.json`. **After it, `node_modules/@ydinjs` doesn't exist.**
- **Repeated,** with `aube install` while the links are gone: it answers _"Already up to date"_, and `node_modules/@ydinjs` still doesn't exist. `left-pad` is installed.
- **Reverting** `package.json` and `package-lock.json` and running `aube install` restores all seven links, both times. `aube install --frozen-lockfile --force` wasn't needed. `aube store status` passes afterwards.

**So the links were lost in a worktree that no other session used,** on aube 2.10.0 with the hoisted linker. The cause is aube's `add`, not a concurrent operation. The architect decides `RF-48`. Nothing from the reading is committed outside `checks/`, and slot `b` is clean at `0b6eba25a`.

## Item 5: the repair after `aube add` (`RF-48`)

Added by the architect at `1d6cbb5c2`, from `RF-48`'s decision. **The witness came first,** in slot `c`, clean and detached at `0b6eba25a`, with no other command using it ([reading](checks/rf48-repair.txt)):

1. `aube install` answered _"Already up to date"_, and `node_modules/@ydinjs` held all seven workspace packages, with `size-limit-preset-rolldown` beside them.
2. **`aube add -D -W left-pad@1.3.0`** exited 0. Then neither `node_modules/@ydinjs` nor `node_modules/size-limit-preset-rolldown` existed.
3. **`aube install --frozen-lockfile --force`** installed 980 packages in 1 s. All seven links and `size-limit-preset-rolldown` were back, and `left-pad` was installed. `aube store status`: _"Store is consistent: 912 packages verified"_. `tsserver.js` has 1 link.
4. **`aube remove`:** `aube remove -W left-pad` fails with _"package '-W' is not a dependency"_, because `remove` has no `-W`. At the checkout root, `aube remove left-pad` is the root's. It exited 0, and then **neither `node_modules/@ydinjs` nor `size-limit-preset-rolldown` existed again.** Step 3's command restored both.
5. After reverting `package.json` and `package-lock.json`, `aube install` answered _"Already up to date"_, every link was present, and `git status --short` was empty.

**So `remove` has the same defect as `add`, and the same command repairs both.** No stop applies: step 3 restored every link, the store check passed, and `tsserver.js` has one link.

**Then the rule:** `.claude/agents/implementer.md` has it beside the `aube add -D -W` rule. It says that 2.10.0's `add` and `remove` drop the links, which step 4 shows, where the handoff's wording named only `add`.

## Item 6: the picker's order (`RD-17` property 2)

`coordinator-setup.md` §Session names says that the picker lists the matches newest first, and that the newest is the session `cl` means, in place of _"the owner chooses"_. The ordering is the architect's reading in `RD-17` property 2, not a new one.

## What wasn't verified

- `cl` against the real `claude`: every case uses the stub, and the owner's own `cl` starts are the live evidence.
- The resume behaviour in an interactive session (witness 4's limit above).
- `shellcheck` isn't installed. `cl.sh` was read, and `sh -n` and `dash -n` pass.
- A rebuild of the container from scratch with an empty `_worktrees` volume: the store was nearly empty (6.8 MB) at the first reading, so the downloads in step 3 show the cold path, but `post-create`'s chown of a new volume wasn't watched.

## Left in place

Slots `b` and `c` stay, with their `node_modules`: `RD-17` property 3 gives their removal to the owner. `b` holds the owner's sessions `Mx Architect B` and `Mx Implementer B`. `c` has no session.

## Next

The stopping boundary: this report committed and pushed, and the pull request open with `verify` green. The targeted feature-proof review follows (handoff §Review before merge). (_Dated 2026-11-17:_ the architect decided both readings at `1d6cbb5c2`, and items 5 and 6 implement them.) After the merge, the owner runs `claude plugin marketplace remove material-x` (owner decision 1).