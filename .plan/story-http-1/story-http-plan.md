# Stories over plain HTTP — plan

**Status: proposed.** Written by the architect on 2026-11-19, on the coordinator's task, on `repo/story-http-1` at `10eaa68cc` (`origin/main`). It plans `repo:RF-62`, which is registered on `repo/work-queue-1` (read at `1028c65f6`). **No identifier is minted and no record is edited:** the main slot's architect owns `RF-62`'s entry, `RD-14` and the index, and [Proposed record changes](#proposed-record-changes) lists what this plan asks of them.

Canonical entry: `RF-62` — the checkbox's `WithLabel` story calls `crypto.randomUUID`, so it throws in a Storybook served over plain HTTP from a LAN address. Its required property: no story or docs code calls an API that the platform restricts to secure contexts, so every story renders over plain HTTP from any host.

## Scope: only `WithLabel`

- **In the code.** The architect searched everything Storybook loads for APIs that need a secure context ([search](checks/rf62-scope-search.txt)): `.storybook/`, and `packages/*/src`, which holds every story and MDX page and the runtime code they reach. The search covered `crypto.randomUUID` and `crypto.subtle`, the clipboard, service workers, media devices, sharing, storage, locks, credentials, geolocation, device sensors, notifications, payments, the device APIs, `SharedArrayBuffer`, `isSecureContext`, file pickers and the cache API. **The one hit is `packages/material-x/src/checkbox/checkbox.stories.tsx:93`**, `WithLabel`'s `crypto.randomUUID()`. Every story import outside its own directory resolves into `.storybook/docs/`, which the search covered.
- **At runtime, which the entry inferred and this plan ran.** The architect built the site and ran `just docs-smoke` twice on the same build ([run](checks/rf62-insecure-origin.txt)):
  - from `127.0.0.1`, as it does now: 102 of 102 pages passed;
  - from an origin that isn't a secure context: 101 of 102 passed.

  The second run's only failure is the story `checkbox--with-label`, with `TypeError: crypto.randomUUID is not a function`. Storybook's manager, every other story, every docs page and the API page passed. So no third-party code that the site ships fails to render without a secure context.

- **The checkbox docs page** embeds `WithLabel` through `<Canvas>`. From the insecure origin, that canvas doesn't render, and the same error is in the console. `docs-smoke` still passed the page, because the error comes after the page's completion signal, which the check's header states is outside it. The story's own entry fails, so the check covers the defect there.
- **Outside the required property:** typedoc's API page calls `navigator.clipboard.writeText` from its copy button, and only on a click. That is third-party code, and the page renders.
- **Why the gate never saw it.** `docs-smoke` serves on `127.0.0.1` and opens that address. A browser treats loopback as a secure context, so `crypto.randomUUID` exists there. `RF-61`, in `@ydinjs/core`, was the same kind of defect, and the gate couldn't see it either.

## The repair

These properties hold after the repair. The implementer chooses the code.

1. **The story's id needs no secure context.** `WithLabel` gets the id that its `<label htmlFor>` names without calling a secure-context API. The id is unique wherever the story renders, which is its own canvas and the checkbox docs page. That page renders only `Checked` and `WithLabel`, once each, and `Checked` sets no id. So a constant id is enough, like the playground's `PLAYGROUND_ID` in the same file, as long as it differs from the playground's. React's `useId()` would be needed only if one page rendered the story twice, which none does.
2. **`docs-smoke` loads the site from an origin that isn't a secure context.** The server stays on `127.0.0.1`, unchanged. Chromium launches with a host-resolver rule that maps a reserved, non-loopback name such as `mx-docs.test` to `127.0.0.1`, and the check opens every page under that name. The check's rule for requests outside its origin applies to the new origin unchanged.
3. **The check proves its own condition.** The first page that `docs-smoke` opens fails the run unless it reports `isSecureContext === false`. Without this, a later change to the origin or the launch could make the check secure again without anyone seeing it.
4. **Its header states the rule,** and why: the deployed site is served over HTTPS, but a Storybook that someone serves from another machine is not, and loopback hides the difference.

The [run](checks/rf62-insecure-origin.txt) applied property 2's origin and launch argument by hand, two lines, and reverted them. It didn't apply property 3.

**Size: small, as the work queue says.** It changes one line in a story and two lines in `docs-smoke`, and adds one assertion and a header paragraph. The docs job's time doesn't grow, because the same pages load.

### Why the instrument is part of the repair

The required property says _every story renders over plain HTTP from any host_. The repository's own check of _every page renders_ is `docs-smoke` (`RD-14` property 6), and it runs where that property can't fail. This is the second defect of this kind in a few days. With properties 2 and 3, the gate holds the required property, and a third one fails the pull request that adds it. This adds no new machinery, only one launch argument, one origin and one check.

### Not adopted

- **Fixing the story only.** It meets the required property today, and nothing would keep it. Searching by hand is what found this defect, and that search depends on a list of APIs, which no one maintains.
- **A lint rule against secure-context APIs in stories.** It would need the same list of APIs, and it couldn't see a third-party call. Rendering from an insecure origin sees both.
- **Serving on the machine's network address** instead of a mapped name. The address differs between runners and containers, and the server would listen outside loopback. The host-resolver rule changes only how the browser classifies the origin.
- **Extending the docs page's observation past its completion signal.** It would catch an error that a docs page's own content raises late. That isn't this entry's defect, and the story's own entry catches this one.

## How a reviewer proves it

1. **The search is empty.** At the repair's commit, the [search](checks/rf62-scope-search.txt)'s pattern over the same paths finds nothing.
2. **The gate passes from an insecure origin.** `just docs-build`, then `just docs-smoke`, reports every page passed under the mapped name, for example _"102 of 102 pages passed at http://mx-docs.test:…/material-x/"_.
3. **The gate sees the defect.** With property 1 reverted, `docs-smoke` fails `checkbox--with-label` with the `randomUUID` error. Restore it afterwards.
4. **The check proves its condition.** With the host-resolver rule removed, so that the mapped name doesn't resolve, or with the origin set back to `127.0.0.1`, the run fails. In the second case, property 3's assertion is what fails it. Restore it afterwards.
5. **CI:** the pull request's `docs` job runs the changed check and passes.

Save 2 to 4 in this record's `checks/`.

## What the closure needs

`RF-62` closes when the repair is merged to `main`, witnesses 1 to 4 are saved and a feature proof has read them, and the pull request's `docs` job passed (witness 5). The main architect records `RD-14` property 6's new origin as the decision's owner chooses: a dated note, or an amendment.

## Proposed record changes

For the main slot's architect. This plan doesn't edit them.

- **`RF-62`, _Inferred, not run_:** now run. From an insecure origin, 101 of 102 pages pass, and only the story `checkbox--with-label` fails, with the `randomUUID` error. The checkbox docs page doesn't render the story either, but passes, because the error comes after its completion signal. No other story, docs page or third-party page is affected ([scope](#scope-only-withlabel)).
- **`RF-62`, a cause to add:** `docs-smoke` serves and opens `127.0.0.1`, a secure context, so the gate couldn't fail on this defect, nor on `RF-61`'s.
- **`RF-62`, the direction:** link this plan, its properties 1 to 4, its witnesses and its closure.
- **`RD-14` property 6:** _"serves `.docs` at the base path …, and opens it in Playwright's pinned Chromium"_ gains _"under a name that isn't a secure context, which the check asserts"_. Whether that is a dated note or an amendment is the main architect's call. It changes what the gate checks.