# Slot array report

**Handoff:** [`slot-array-handoff.md`](slot-array-handoff.md), at `8f18d2f67` on `drag/size`. **Governing record:** `DRD-58` in [`00-index.md`](00-index.md).

**Status: returned at item 1 step 1.** WebKit doesn't launch after the browser install. This is the handoff's first return condition. No source, test or build file changed. Item 1 steps 2 to 10 and items 2 to 5 didn't run.

## What happened

1. From `packages/drag`, inside the container (Debian 13, `/.dockerenv`), `npx playwright --version` printed `Version 1.65.0`. I then ran `npx playwright install firefox webkit`, without `--with-deps`. [Output](measurements/2026-11-13-slot-array-browser-install.txt), unedited.
2. **Before it downloaded anything, the install removed four entries from `~/.cache/ms-playwright/`** as "unused browser":
   - `firefox-1555`;
   - `webkit-2370`;
   - `webkit-deps-trixie`;
   - `webkit-env.sh`.

   Playwright removes the cache entries that its installed version doesn't name, and it counted the deps directory and the env script among them. The environment variable `PLAYWRIGHT_SKIP_BROWSER_GC` turns this removal off (`node_modules/playwright-core/lib/coreBundle.js`). I didn't set it, because the handoff's command doesn't, and I didn't check for it before the install. That is my omission: the handoff said to leave the old builds in place. The removal can't be undone from the checkout.

3. The install then downloaded `firefox-1572` (Firefox 159.0) and `webkit-2388` (WebKit 27.2), and printed the host validation warning for WebKit's missing system libraries.
4. **The launch check** ([probe and output](measurements/2026-11-13-slot-array-browser-launch.txt)):
   - Firefox launches: `159.0`.
   - WebKit fails: `browserType.launch: Host system is missing dependencies to run browsers`, listing `libgstreamer-1.0.so.0`, `libgtk-4.so.1` and others.
   - `webkit-env.sh` no longer exists, so the check couldn't source it.

## Why WebKit can't launch now

[`probes/session-owner/README.md`](probes/session-owner/README.md) describes the earlier setup. WebKit's system libraries were fetched with `apt-get download` from Debian trixie and unpacked into a scratch directory, which was `webkit-deps-trixie`. They were linked into WebKit's own `sys/lib`, which was inside `webkit-2370`. `webkit-env.sh` set `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` and Mesa's EGL vendor directory. The install removed all of that. The new `webkit-2388` has no links to the libraries.

**Restoring WebKit is an environment change that the handoff doesn't allow.** The handoff permits only the browser install. Restoring WebKit means fetching and unpacking the Debian packages again, linking them into `webkit-2388/…/sys/lib`, and writing a new `webkit-env.sh`. I didn't do it.

## State left

- **Checkout:** unchanged, apart from this report and the two `measurements/` files.
- **`node_modules`, lockfiles, Chrome:** unchanged.
- **`~/.cache/ms-playwright/`:** `ffmpeg-1013`, `firefox-1572` and `webkit-2388`. The old builds, `webkit-deps-trixie` and `webkit-env.sh` are gone.
- **The publication redesign and its worktree:** not read and not changed. `.plan/reviews/` wasn't touched.
- No timing or deferred campaign ran.

## For the architect

1. **Decide whether to authorize rebuilding WebKit's user-space libraries for `webkit-2388`,** and who does it. The method is the one in `probes/session-owner/README.md`. The unit can start again at item 1 step 1's launch check once `webkit-env.sh` exists and WebKit launches with it.
2. **Item 1 step 1's command removes the old builds unless `PLAYWRIGHT_SKIP_BROWSER_GC=1` is set.** A handoff that needs them kept should name the variable.