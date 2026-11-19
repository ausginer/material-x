# RF-62's repair, stories over plain HTTP: feature proof

**Files were read at:** `b04ece9ec`, `repo/story-http-1`'s head, in a detached scratch worktree outside the slots. **Diff reviewed:** `e02ee7a3a..d6674ecfb`, the repair: `.scripts/docs-smoke.ts` and `packages/material-x/src/checkbox/checkbox.stories.tsx`. `d60eb77e8` adds the implementer's witnesses and the plan's implementation note. `b04ece9ec` merges `origin/main` and isn't reviewed. It changes neither file, nothing under `.storybook/` or `.github/actions/`, no line of the `Justfile`, and no docs line of `verify.yml`.

**Governing records:** the [stories-over-HTTP plan](../../story-http-1/story-http-plan.md): [The repair](../../story-http-1/story-http-plan.md#the-repair), properties 1 to 4, and [How a reviewer proves it](../../story-http-1/story-http-plan.md#how-a-reviewer-proves-it), witnesses 1 to 5. `repo:RF-62` is registered on `repo/work-queue-1` and isn't on this branch, so I read its required property as the plan quotes it. `repo:RD-14` property 6 ([`00-index.md`](../../00-index.md)).

**Lens:** feature proof. Every claim below is from my own reading or from a run I made. My runs are saved in [`checks/feature-proof-witnesses.txt`](checks/feature-proof-witnesses.txt), one at a time, in one new tree, with each mutation reverted afterwards. Nothing is repaired, no record is amended, and nothing was written to GitHub.

**Verdict: the repair meets properties 1 to 4, and witnesses 1 to 4 hold as I re-ran them. No finding.**

- The id is unique wherever the story renders. I checked that statically, and in the rendered canvas and docs page from the non-secure origin.
- CI's `docs` job runs `docs-smoke` the same way as my local runs.
- **Pending, not a finding:** witness 5, the pull request's `docs` job. No pull request exists yet.

## Scope

**Covered.**

- **Property 1, the story's id.** `WithLabel` uses `WITH_LABEL_ID = 'mx-with-label-checkbox'` for both the `id` and the `<label htmlFor>`. It no longer calls `crypto.randomUUID`. The id differs from `PLAYGROUND_ID`, `'mx-playground-checkbox'`.
- **Whether the id stays unique wherever the story renders.**
  - **Statically.** The story renders in its own canvas and in `checkbox.mdx`, which has two `<Canvas>` blocks: `Checked` (line 59) and `WithLabel` (line 65). There is no `<Stories>` or `<Primary>` block, and the playground isn't on the page.
  - **Nothing else imports `checkbox.stories`.** No other MDX file, no file under `.storybook/`, and no test or `composeStories` does.
  - **The id string appears once in the repository.** Radio's `WithLabel` sets no id.
  - **At runtime,** from `http://mx-docs.test:<port>`, the same origin docs-smoke uses:
    - On both `checkbox--with-label` and `checkbox--docs`, `isSecureContext` is `false` and `typeof crypto.randomUUID` is `"undefined"`.
    - `[id="mx-with-label-checkbox"]` matches one element on each page, and `[id="mx-playground-checkbox"]` none. No id occurs twice on either page.
    - The label's `control` is the `mx-checkbox`. Neither page logged an error.
- **Property 2, the origin.**
  - The server still listens on `127.0.0.1`. Pages open at `http://mx-docs.test:<port>`, and Chromium launches with `--host-resolver-rules=MAP mx-docs.test 127.0.0.1`.
  - `.test` is a reserved top-level domain.
  - The rule for requests outside the origin, `url.origin !== origin`, applies to the new origin unchanged. So do the `requestfailed` and 4xx/5xx checks, which match on `origin`.
- **Property 3, the check proves its condition.**
  - After `targets[0]`, the manager's `index.html`, has settled, `page.evaluate(() => globalThis.isSecureContext)` must return `false`. A throw counts as `null`, and anything but `false` fails the run with a line that names the value.
  - Workers claim targets in list order, so `targets[0]` is always checked.
  - The assertion runs even when navigation fails, as witness 4a shows.
- **Property 4, the header.** The module comment states the rule: the first page fails unless `isSecureContext === false`. It states the reason: HTTPS when deployed, a non-secure Storybook served from another machine, and loopback treated as secure. It names `mx-docs.test`. The earlier paragraphs remain true under the new origin.
- **Witness 1.** The scope search's pattern, with the `:(glob)` pathspecs, finds line 93 at `e02ee7a3a` and nothing at `d6674ecfb` or `b04ece9ec`. Those pathspecs cover 309 files at each commit, the same count as a `git ls-tree` filter over the same paths.
  - **The implementer's point holds.** In `git grep` against a commit, the plain pathspec `packages/*/src` matches 0 files. `.storybook`, `'packages/*/src'`, `'packages/*/docs'` and `index.html` together match 14, and miss line 93 at the parent. A plain-pathspec search would have been empty without proving anything.
- **Witness 2.** `just docs-build` and then `just docs-smoke` exit 0 with _"102 of 102 pages passed at http://mx-docs.test:42945/material-x/"_. After the mutations and a rebuild from the restored tree, the same holds again (port 38121).
- **Witness 3.** With `e02ee7a3a`'s story and a rebuild, `docs-smoke` exits 1. The only failure is `story checkbox--with-label`, with _"TypeError: crypto.randomUUID is not a function"_, and 101 of 102 pages pass.
- **Witness 4a.** With the launch's `args` set to `[]`, every one of the 102 targets fails with `net::ERR_NAME_NOT_RESOLVED`. `index.html` also reports _"isSecureContext is null … where it must be false"_.
- **Witness 4b.** With `HOST = '127.0.0.1'`, every page loads, and the run exits 1 on `index.html` alone: _"secure context: isSecureContext is true at http://127.0.0.1:…, where it must be false"_, with 101 of 102 passing. Property 3's assertion is the only failure.
- **CI's `docs` job runs docs-smoke the same way.**
  - Its steps are `aube ci`, `./.github/actions/browser` with `engine: chromium`, `aube exec just docs-build` and `aube exec just docs-smoke`.
  - The `Justfile`'s `docs-smoke` is `node .scripts/docs-smoke.ts`, which launches its own Chromium with its own `args`. So the same code, rule and assertion run there, in the lockfile's Playwright Chromium.
  - No job or step sets a proxy or a Playwright variable, and nothing else in `.github/` names a host-resolver rule. The one difference from my runs is the runner image.
- **Gates on the two files.**
  - `oxfmt --check`, `oxlint` and the root ESLint configuration pass on `docs-smoke.ts`.
  - material-x's `just lint` passes on the stories file, and material-x's `just typecheck` passes.
  - The root `tsc -p tsconfig.json --noEmit`, whose `include` covers `.scripts/**`, passes.

**Not covered.**

- **Witness 5.** No pull request exists for `repo/story-http-1`, and `verify.yml` has no run on it. The CI claim above comes from reading the workflow, not from a run.
- **The record changes the plan proposes:** `RD-14` property 6's new origin, and `RF-62`'s entry. They are for the main architect at closure, as the plan's [What the closure needs](../../story-http-1/story-http-plan.md#what-the-closure-needs) says. Property 6 at `b04ece9ec` still says only that the check _"opens it in Playwright's pinned Chromium"_. That is expected, because the closure hasn't come.
- **The scope search's pattern list.** I re-ran the architect's pattern, and I didn't judge whether the list of secure-context APIs is complete. The plan's own argument is that properties 2 and 3 make the list unnecessary from here on.

## Findings

**None.** The forward pass found no defect in properties 1 to 4, in the witnesses or in the CI path. The one open item is witness 5, which needs the pull request's run.