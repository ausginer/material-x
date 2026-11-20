# Removing Material's tables from the repository's history — plan

**Status: proposed, and deferred by the owner on 2026-11-20** ([his answer](#the-owners-answer-2026-11-20)). He means to run it later, and he executes it, after answering its questions. Until his answer, this line began: _"proposed. The owner executes it, and he answers its questions first."_ Written by the architect on 2026-11-20, on the coordinator's task, on `tproc/tokens-source-1`. It proposes `repo:RD-29` ([`00-index.md`](../00-index.md)). `RD-28` is the highest decision number on any branch on `origin` and in any slot, so this is the next free number.

**Agents never force-push or change a ruleset** (`AGENTS.md`). Each step below names who does it.

The owner's answer, relayed by the coordinator, is recorded in the [token-source plan's amendment](tokens-source-plan.md#amendment-tprocs-own-token-store): _"Да, конечно, всё переписываем"_ ("Yes, of course, we rewrite everything"). He then asked for the old pull requests to be checked as well (translated): _"The old pull requests need checking too: the data may have survived there."_

## The owner's answer, 2026-11-20

Relayed by the coordinator, after the plan was written (translated): _"По веткам: пока не делаем, но запоминаем - хочу сделать в какой-то момент. Хэши - не проблема, verify у меня после прошлого переписывания истории уже слетел 😅 Бэкап, возможно, можно вообще удалить, мы уже вполне норм живём на новой версии"_ ("Not doing it for now, but we keep it in mind: I want to do it at some point. The hashes aren't a problem: verification already broke after the previous history rewrite 😅 The backup could perhaps just be deleted, we're already living fine on the new version").

- **The rewrite is deferred,** and kept as planned. Nothing in the procedure runs until the owner schedules it (`QH4`).
- **He accepts the rewrite's cost to hashes:** every commit hash changes, and with it every _Verified_ badge ([what the rewrite does](#what-the-rewrite-does)).
- **On the `backup/*` branches, his inclination is to delete them** rather than rewrite them, which is option (c) of `QH1` for the backups. It isn't a decision: `QH1` stays open, and so does its part on the five older branches.
- **`QH2`–`QH4` stay open** until he schedules the rewrite.
- **The preconditions don't change.** `RD-28` step 1 doesn't wait for the rewrite, and the rewrite still needs step 1 on `main` first (precondition 1).

## Where the data is

Read on 2026-11-20 by the architect, read-only ([reading](checks/history-scan.txt)). Only counts and locations are recorded.

- **Git objects.** 63 blobs hold the data, under 39 paths in three directories:
  - `.data/tokens/` (11 blobs), from `chore: store tokens in repo` (2025-11-25) to `chore: add tokens for checkbox & radio + cleanup` (2026-04-10). This range overlaps the next one, because a commit after the monorepo move still changed the old path;
  - `packages/material-x/.data/tokens/` (38 blobs), from `refactor: move to monorepo` (2026-03-24) to `repo: split code to separate modules` (2026-07-13);
  - `packages/tproc/.data/tokens/` (14 blobs), since `repo: split code to separate modules` (2026-07-13), and on `main` today.

  No other path holds them. That includes the record: the record's checks cite counts only.

- **On GitHub, every ref reaches them.** A mirror clone has 72 refs: 13 branches, 55 `refs/pull/N/head` and 4 `refs/pull/N/merge`, and no tag. The history of each of the 72 refs includes those paths. The branches are `main`, the two `backup/*` branches, the units' branches and five older ones. GitHub serves the same 63 blobs.
- **Not on GitHub outside git.** A scan through `gh api` found no match in:
  - the bodies of the 84 issues and pull requests, their 71 comments, review comments (0), reviews (0) and commit comments (0);
  - the 56 unexpired artifacts, the deployed docs site's `github-pages` artifacts among them;
  - the 271 run logs that still exist. 124 have expired, and GitHub has deleted them.

  The wiki and discussions are off, and there are no releases and no forks. Earlier revisions of edited bodies weren't read. Every body and comment as it stands has no match, so an earlier revision could hold the data only if someone pasted it and then edited it out.

- **On this machine,** outside the repository's git:
  - the main checkout, slots b–f and two scratch worktrees of other sessions have the tables checked out;
  - one Claude Code transcript holds two of the addresses, from a probe in the architect's session that wrote this plan.

## What the rewrite does

`git filter-repo --sensitive-data-removal --invert-paths` with the three directories removes every blob under them from every commit. It was dry-run on a scratch copy of the mirror ([reading](checks/history-scan.txt) §6):

- **It changes all 72 refs and every commit** (1,980). The first changed commit is the initial commit, because the option removes every commit's signature. Every commit hash in the repository changes, with it every hash that the record, issues and pull requests cite, and every commit's _Verified_ badge.
- **Afterwards no blob holds the data,** and no commit touches the three paths. The pack goes from 57.35 MiB to 49.57 MiB.
- **filter-repo updates hashes inside commit messages,** and it doesn't touch file contents. So the hashes that the record, `.agents/docs/` and source comments cite stay the old ones. A commit map in the record translates them (RD-29 property 5).
- **Closed and merged pull requests lose their diffs** once GitHub Support dereferences them. Each of the 55 pull requests builds on history that includes the data, so each is affected. Their conversations stay, and they hold no data.

## Preconditions

1. **`RD-28` step 1 is on `main`.** The store at `packages/tproc/tokens/` replaces the tables, and `packages/tproc/.data/` is git-ignored. Without it, the rewrite removes the tables from `main`'s tip too, and tproc can't build its CSS.
2. **The owner has answered `QH1`–`QH3`.**
3. **Every unit's work is pushed.** Open pull requests needn't be merged or closed, because their branches are rewritten with `main` and the pull requests follow (see below). Unpushed work is the only work at risk.

## Procedure

**0. Freeze — the coordinator.**

- It tells every role session to commit and push its branch, then to stop.
- It records `git ls-remote --heads origin` as the list of heads before the rewrite.
- For the main checkout, each slot and each scratch worktree, it confirms read-only that `git status --porcelain` is empty and `git log @{u}..` shows nothing. Work that can't be pushed, such as a stash, is saved as a patch outside the checkout (`git format-patch`), and its owner is named.
- Nothing pushes until step 6.

**1. A fresh mirror — the owner, in the devcontainer** (the host stays free of tools):

```sh
mkdir -p /tmp/rewrite && cd /tmp/rewrite
git clone --mirror git@github.com:ausginer/material-x.git material-x.git
```

**2. git-filter-repo 2.47.0 — the owner, in the devcontainer.** It needs Python 3 and git, which the image has (git 2.47.3).

- `gh release download v2.47.0 --repo newren/git-filter-repo -p 'git-filter-repo-2.47.0.tar.xz'`.
- Check its SHA-256: `4662cbe5918196a9f1b5b3e1211a32e61cff1812419c21df4f47c5439f09e902`, as the architect read it.
- Unpack it outside the mirror and run its `git-filter-repo` script with `python3 -I`.

GitHub's [guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) requires 2.47 or later for `--sensitive-data-removal`.

**3. Rewrite — the owner:**

```sh
cd /tmp/rewrite/material-x.git
python3 -I /path/to/git-filter-repo --sensitive-data-removal --invert-paths \
  --path .data/tokens/ --path packages/material-x/.data/tokens/ --path packages/tproc/.data/tokens/
```

Keep the output's `NOTE: First Changed Commit(s)` line, and `filter-repo/commit-map`, `filter-repo/changed-refs` and `filter-repo/first-changed-commits`. None of them holds the data.

**4. Check — the owner, before anything is pushed:**

- `git log --all --oneline -- .data/tokens packages/material-x/.data/tokens packages/tproc/.data/tokens` prints nothing.
- Read every blob, and confirm that none holds an address at google.com or a `"gaiaId"` key:

  ```sh
  git rev-list --all --objects | git cat-file --batch-check='%(objecttype) %(objectname)' \
    | awk '$1=="blob"{print $2}' \
    | while read -r b; do git cat-file blob "$b" | grep -qE '@google\.com|"gaiaId"' && echo "$b"; done | wc -l
  ```

  It prints 0.

- `grep -c '^refs/pull/.*/head$' filter-repo/changed-refs` is the number of affected pull requests for step 8. It was 55 in the dry run.
- `main`'s tree has `packages/tproc/tokens/` and builds. Building in a worktree of the rewritten mirror is enough.

Until step 6, the rewrite can be thrown away.

**5. Rulesets off — the owner.** Two rulesets block the push.

- **`Main protection` (20963220)** blocks a force-push to `main`: `non_fast_forward`, `required_linear_history`, `pull_request` and `required_status_checks`.
- **`Backup preservation` (20963078)** blocks any update to `backup/**`.

Save each one, then turn it off:

```sh
for id in 20963220 20963078; do
  gh api repos/ausginer/material-x/rulesets/$id > /tmp/rewrite/ruleset-$id.json
  gh api -X PUT repos/ausginer/material-x/rulesets/$id -f enforcement=disabled
done
```

This is the shortest form that changes nothing else. Adding the owner as a bypass actor would change the rules' definition, which then has to be removed again.

**6. Push — the owner:**

```sh
cd /tmp/rewrite/material-x.git
git ls-remote --heads origin   # equals step 0's list: nothing was pushed since
git push --force origin 'refs/heads/*:refs/heads/*'
```

- The refspec pushes every branch and deletes nothing. It doesn't try `refs/pull/*`, which GitHub keeps read-only.
- GitHub's guide uses `git push --force --mirror origin`, which also deletes any remote ref missing from the mirror and reports a failure for each `refs/pull/*`. The refspec does the same work without either effect.
- The push to `main` starts `verify`. Open pull requests follow their rewritten branches, and GitHub recomputes their diffs.

**7. Rulesets on — the owner:**

```sh
for id in 20963220 20963078; do
  gh api -X PUT repos/ausginer/material-x/rulesets/$id -f enforcement=active
  diff <(jq 'del(.updated_at, .created_at, ._links)' /tmp/rewrite/ruleset-$id.json) \
       <(gh api repos/ausginer/material-x/rulesets/$id | jq 'del(.updated_at, .created_at, ._links)')
done
```

The `diff` prints nothing.

**8. GitHub Support — the owner.** Open a ticket on the [Support portal](https://support.github.com), with:

- the repository, `ausginer/material-x`;
- the number of affected pull requests from step 4;
- the First Changed Commit(s) from step 3;
- that there are no LFS objects and no forks.

Ask Support to:

- **dereference** the affected pull requests, not delete them (`QH2`);
- run a garbage collection;
- remove cached views.

Until Support acts, the old commits stay reachable by hash and through `refs/pull/N/head`, with the tables in them. The guide says Support helps only with sensitive data that can't be mitigated by rotating a credential. Third parties' email addresses can't be rotated, but whether the request qualifies is Support's decision.

**9. The record after the rewrite — an implementer, in an ordinary pull request.** This is `RD-29` property 5.

- The owner hands over `commit-map` and `first-changed-commits`, and the commit map is committed under `.plan/history-rewrite-1/`.
- The resolver's retired-scope commit (`.scripts/entry.ts`, `commit: '0870abd75'`) is re-pointed through the map.
- The guard of property 6 is added to `verify`.

**10. Local copies — the owner, then the coordinator.**

- After step 7, every role session ends, and so does this architect's.
- **The owner removes:**
  - the scratch worktrees under `/tmp/claude-1000/` (`git worktree remove --force`);
  - slots b–f (`git worktree unlock`, then `git worktree remove --force`);
  - the main checkout, after saving the untracked files it needs, such as `.claude/settings.local.json`. It is replaced by a fresh clone at `/workspaces/material-x`.
- `cl` recreates each slot, locked and detached at the new `origin/main`, the first time a session starts in it.
- The owner deletes the one transcript that holds two of the addresses (session `7f3eddea…` under `/agents/claude/projects/-workspaces-material-x/`), and removes `/tmp/rewrite`.
- Saved patches from step 0 are applied with `git am` onto the rewritten branch they came from.
- Any clone outside this devcontainer is deleted and cloned again (`QH3`).
- **What needs no cleanup.** aube's store, nx's cache and the CI caches hold installed packages and build output, and no build copies the tables.

**11. Record the run — the architect.** `RD-29` gets the dates, the counts from steps 3 and 4, the Support ticket's state, and its answer when it comes.

## After the rewrite

- **Nobody merges a branch from before the rewrite.** A merge brings the whole old history back, and with it the tables, which GitHub's guide warns about. Every branch on `origin` is rewritten in step 6, so no unit needs this. A copy that survived the cleanup is recognized by the old initial commit, `e1e11870`, in its history.
- **The guard** (property 6) makes that mechanical. `verify` fails when the pull request's head has `e1e11870` as an ancestor, or when any of its commits adds a path under `.data/tokens/` at any depth.
- **Old hashes in the record** are read through the commit map. Record text isn't rewritten, because the record is append-only, and a text rewrite of short hashes can't tell a hash from another hexadecimal string.

## Owner questions

- **QH1 — The `backup/*` branches and the five older branches** (`agents/shell-guards`, `repo/attributes-decorator-1`, `repo/dead-spread-1`, `repo/trait-decorators-1` and `repo/trait-jsdoc-probe-1`). (a) Rewrite all of them with the rest. (b) Delete the older branches before the rewrite and rewrite the backups. (c) Delete the backups too. **Recommended: (b)**, for the owner to confirm branch by branch. _Open._ On 2026-11-20 the owner inclined to deleting the backups ([his answer](#the-owners-answer-2026-11-20)). The backups keep their purpose without the tables. A branch nobody needs is a ref less to rewrite and restore. Deleting a backup needs `Backup preservation` turned off, which step 5 does anyway.
- **QH2 — What Support does with the 55 pull requests.** (a) Dereference: their conversations stay, and their diffs and commit links go. (b) Delete: the conversations go as well. **Recommended: (a).** The conversations hold no data, and the record cites pull requests by number.
- **QH3 — Copies outside this devcontainer.** Does the owner have another clone, such as on the host, another machine or a backup? Each one is deleted and cloned again after step 7.
- **QH4 — When.** The freeze stops every unit from step 0 until step 10. **Recommended:** right after `RD-28` step 1 merges, while #79, #81, #83 and #84 are still open. They don't need to merge first. _Deferred by the owner on 2026-11-20:_ not now, at a moment he chooses later. The recommendation then becomes: at a moment with few open pull requests, after `RD-28` step 1 is on `main`.