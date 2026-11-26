# Feature proof: the devcontainer installs Firefox (#285)

**Read at `62733e871`** on `repo/devcontainer-firefox-1`, pull request [#298](https://github.com/ausginer/material-x/pull/298), against `origin/main` at `ef84f3c0f`. `verify` passed on that head: every job succeeded, and `records` and `deploy` were skipped. Reviewed by the `reviewer`, on the coordinator's request. The governing records are `RD-13` property 7, `RD-62` property 4 and the issue's request.

**Verdict:** the change does what #285 asks, and its amendment of `RD-13` property 7 is worded correctly for the architect to adopt. One pre-existing finding is routed to the architect: `RD-9` property 1 still says what the devcontainer installs, and it says otherwise.

## Scope

- **Read:** the three changed files; `.devcontainer/devcontainer.json`, `post-create.sh`, `on-start.sh` and `on-start/playwright-browsers.sh`; `RD-9`, `RD-12` property 8, `RD-13` property 7, `RD-62` property 4, and `drag:DRO-18` with its dated notes. Every tracked text that pairs the devcontainer with an engine, or names a `playwright install`, was searched with `git grep`. Saved transcripts under `checks/`, handoffs, reports, reviews and dated notes were left out as records.
- **Run in this container, with no rebuild:** see [Evidence](#evidence).
- **Not read:** a container created from scratch. The cold path was read for Firefox alone, in a separate browser cache.

## Evidence

- **The script is correct.** It installs `chromium firefox webkit` from the worktree's locked `playwright` (1.65.0). Its fallback message names the same three. `bash -n` passes. `postCreateCommand` runs it through `post-create.sh`, and `postStartCommand` runs it through `on-start.sh` and `on-start/playwright-browsers.sh`. So the test-architecture sentence _"when it is created and each time it starts"_ holds. `devcontainer.json` has no `initializeCommand`, so nothing runs on the host.
- **The install is idempotent.** `WORKSPACE_DIR=/workspaces/worktrees/e bash .devcontainer/on-start/playwright-browsers.sh` exits 0. Playwright's cache holds `chromium-1254`, `chromium_headless_shell-1254`, `ffmpeg-1013`, `firefox-1572` and `webkit-2388` before and after the run.
- **The cold path works for Firefox.** With `PLAYWRIGHT_BROWSERS_PATH` set to an empty scratch directory, `playwright install firefox` exits 0 and downloads `firefox-1572` and `ffmpeg-1013`. A second run exits 0 and prints nothing. A launch from that cache reports `firefox 159.0` and the user agent `rv:159.0 … Firefox/159.0`. So the development image carries Firefox's system libraries. The scratch cache was removed afterwards.
- **Live texts.** `test-architecture.md` §Engines in development and in review, the script's comment, and `RD-13` property 7 now name the three engines. `RD-62`'s _Not in this unit_ and its `integrity-5` triage still say that no script installs Firefox. They are dated records and stay as they are.

## Findings

### reviewer-1 — `RD-9` property 1 says that the devcontainer installs no browser but Chromium

- **Tier:** B. No program behaviour changes, but a live decision tells a reader the wrong set of installed engines. **Pre-existing,** and this change widens it. **Routed to the architect,** because the text is a decision property.
- **Current text** (`.plan/00-index.md`, `RD-9` property 1): _"The devcontainer installs the locked Chromium build when the container is created and each time it starts, and no other browser (`RD-13` property 7). CI installs Chromium and Firefox. No Playwright WebKit build is installed anywhere, and Safari runs only in CI (`RD-12`)."_
- **Why it is a problem:** the property it cites, `RD-13` property 7, says that the devcontainer installs Chromium, Firefox and WebKit. Before this branch, it already said Chromium and WebKit (amended 2026-11-17 by `RD-12`). `RD-12` property 11 adds the gate's `webkit` job, so CI installs WebKit too. No amendment note on `RD-9` records either change. #285 asks that _"the text that names them says so"_. This is the one live text left that names the devcontainer's engines and doesn't.
- **Required property:** each live decision text that says which engines the devcontainer or CI installs agrees with `RD-13` property 7 and `RD-12`, or states that it is superseded.

## The `RD-13` property 7 amendment

The coordinator asked whether its wording is right. It is, for the architect to adopt.

- **The sentence matches the script:** _"installs Playwright's Chromium, Firefox and WebKit builds"_, at creation and at each start, through the same script.
- **The quote is the replaced text, word for word:** _"The devcontainer installs Playwright's Chromium and WebKit builds"_. It is the clause that changed, and the rest of the sentence stays as it was.
- **The reason is accurate.** `RD-62` property 4 has a feature proof run Chromium, Firefox and WebKit.
- **The marker names no author.** Every other amendment in the entry names its source: _"by `RD-12`"_, _"by `RD-62`"_. This one says _"for #285"_. The property is the architect's, so the marker names whoever adopts it. It is placed before the older 2026-11-17 marker, newest first, as `RD-12` property 8 orders its markers.
- **The implementer's dated note** below the entry says what was done and how it was read, and it matches the diff.

## Next

**Architect:** adopt the `RD-13` property 7 amendment, and rule on `reviewer-1`, including whether it belongs in this pull request or in one of its own.