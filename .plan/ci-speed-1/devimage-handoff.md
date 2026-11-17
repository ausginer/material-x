# Handoff: preinstall aube and WebKit's system libraries in the `node` development image

**Recipient:** the agent that maintains the owner's development images, the repository that builds `ghcr.io/ausginer/devimages/node`. This file is self-contained. You need nothing else from the repository it comes from.

**Asked by the owner** on 2026-11-17, relayed by a coordinator: _"чтобы при ребилде всё устанавливалось заранее (aube и библиотеки для webkit)"_. In English: when the image is rebuilt, everything is installed in advance, aube and the libraries for WebKit.

**From:** the architect of [`ausginer/material-x`](https://github.com/ausginer/material-x), on its branch `repo/ci-speed-1`. That repository's devcontainer runs `ghcr.io/ausginer/devimages/node:latest`, so the next container it creates after you publish a new `latest` gets your change.

## Status of each part

The status is decided in material-x, and its architect updates these lines. Do a part only when its line says it is ready.

- **Part A, aube: ready,** at version 2.10.0. On 2026-11-17 the owner decided a full move from npm to aube, with no condition (material-x `repo:RD-16`).
- **Part B, WebKit's system libraries: ready.** Its check (below) decides whether WebKit really runs. If WebKit fails to launch even with the libraries, stop and report: material-x then drops local WebKit, and this part is reverted.

## What the image is today

These are readings from a container of `node:latest` on 2026-11-17:

- **The OS** is Debian GNU/Linux 13 (trixie), x86_64.
- **Node and npm:** Node 26.13.0 at `/usr/local/bin/node`, and npm 11.20.0.
- **The user** is `node`, with passwordless `sudo`.
- **The apt lists are empty.** `apt-get install -s` can't find any package until `apt-get update` has run.
- **Playwright's WebKit build** that material-x installs (Playwright 1.65.0, `webkit-2388`) fails to launch: _"Host system is missing dependencies to run browsers"_. That list names `libgstreamer-1.0.so.0`, `libgtk-4.so.1`, `libgraphene-1.0.so.0`, `libxslt.so.1`, `libevent-2.1.so.7`, `libopus.so.0`, `libavif.so.16`, `libenchant-2.so.2`, `libsecret-1.so.0`, `libhyphen.so.0`, `libGLESv2.so.2`, many GStreamer libraries, and more.
- **After `sudo apt-get update`,** `npx playwright@1.65.0 install-deps --dry-run webkit` lists 247 missing Debian packages, and every one resolves from trixie. Among them:
  - GStreamer and its plugins, GTK 4 and Mesa's GL;
  - `xvfb`;
  - the fonts `fonts-freefont-ttf`, `fonts-ipafont-gothic`, `fonts-noto-color-emoji`, `fonts-tlwg-loma-otf`, `fonts-unifont` and `fonts-wqy-zenhei`.

## Part A: aube

The status line above names the version.

- **Version:** exactly `2.10.0`, the npm package `@endevco/aube`, released 2026-11-09. Pin it exactly, never `latest`.
  - **Why not 2.10.1,** the newest: material-x accepts a release only once it is 7 days old, its supply-chain rule, and 2.10.1 came out on 2026-11-16.
  - **It must match exactly.** material-x's `package.json` names `"packageManager": "aube@2.10.0"`, and its `.npmrc` makes any other aube version fail the install rather than download the pinned one. An image with another version can't install material-x, so material-x asks for a rebuild whenever it moves the pin.
- **Install,** as root, in the image build, after Node:

  ```sh
  npm install -g --ignore-scripts=false @endevco/aube@2.10.0
  ```

  The package fetches its platform binary in a `preinstall` script, so scripts must be allowed. npm 11.20.0 still prints an `install-scripts` warning for it. The command line in the check below is what decides whether it worked. If the image is built for more than one architecture, run the check on each one.

- **Configuration: none.** aube's store and cache default to the user's XDG data and cache directories, and material-x configures aube in its own files. **Set no `AUBE_*` environment variable in the image:** an environment value overrides material-x's `.npmrc`, which keeps dependency build scripts and version pins strict.

## Part B: WebKit's system libraries

- **Install,** as root, in the image build, after Node:

  ```sh
  npx -y playwright@1.65.0 install-deps webkit
  ```

  This runs `apt-get update` and installs the set that Playwright 1.65.0's WebKit needs on this Debian release. Clean the apt lists afterwards, if the image already does that.

- **Don't install WebKit's browser build in the image.** material-x's own devcontainer scripts install it, `.devcontainer/post-create/playwright-browsers.sh` at creation and `on-start/playwright-browsers.sh` at each start, for the reasons below.
  - **The build follows material-x's lockfile.** Its revision changes whenever material-x updates its exact `playwright` dependency. A build in the image would be a second pin, wrong after the next update.
  - **The libraries need root and apt, and the build needs neither.** The build lives in the user's `~/.cache/ms-playwright`, and installing it is a no-op when it is already there.
  - **The libraries are slow to install and are lost on a container rebuild,** which is why the owner asked for them in the image. The build is quick to download.
- **When material-x updates Playwright,** the library set can change. material-x then asks for a rebuild with the new version in the command above. Until then, local WebKit may fail to launch. That is acceptable, because material-x's CI installs its own libraries, and a local WebKit run is never evidence there.
- **The fonts the set adds** change which fallback fonts a browser finds in the container. That's acceptable to material-x: its screenshot tests run only in CI and render text in Roboto only.

## Check

Run it in a container from the rebuilt image, as the user `node`, and save the output.

1. **aube:** `aube --version` prints `2.10.0 linux-x64`, or `linux-arm64`, and so on for each architecture. `env | grep '^AUBE_'` prints nothing.
2. **WebKit launches and Tab reaches every control** (Part B). In a scratch directory:

   ```sh
   npm init -y >/dev/null
   npm install --no-save playwright@1.65.0
   npx playwright install webkit
   cat > probe.mjs <<'EOF'
   import { webkit } from 'playwright';
   const browser = await webkit.launch();
   const page = await browser.newPage();
   await page.setContent(
     '<button>b</button><input type="checkbox"><input type="radio">',
   );
   const reached = [];
   for (let i = 0; i < 3; i += 1) {
     await page.keyboard.press('Tab');
     reached.push(
       await page.evaluate(() =>
         [document.activeElement.tagName, document.activeElement.type ?? '']
           .join(':'),
       ),
     );
   }
   console.log(browser.version(), reached.join(' '));
   await browser.close();
   EOF
   node probe.mjs
   ```

   **Expected:** a WebKit version, then `BUTTON:submit INPUT:checkbox INPUT:radio`.

3. **The cost:** the image's size before and after, and the build time added.

## Stops

Report back without publishing `latest` if:

- `install-deps webkit` fails on the image's Debian release;
- WebKit still fails to launch after it. Report the missing libraries that Playwright names;
- aube's binary doesn't run on one of the image's architectures (Part A).

If Tab reaches fewer than the three controls, publish anyway, and report the line the probe printed. That reading belongs to material-x, and the libraries are still needed.

## What material-x changes on its side

The material-x CI-speed unit makes these changes. Only local installs wait for you, as the last item says:

- **Its post-create script installs `chromium webkit`,** where it installed `chromium` alone.
- **Its record** says that the devcontainer installs both builds, and that WebKit launches where the image carries its libraries. `devcontainer.json` keeps `node:latest`, so nothing there changes.
- **aube is its package manager,** pinned to 2.10.0 in `package.json`'s `packageManager` and in its workflows. Until a container runs your rebuilt image, a developer installs that version by hand with Part A's command, as the user and with `--prefix ~/.local`, from a directory outside the checkout, so that npm doesn't read the checkout's `.npmrc`.

## Return

Report:

- the published tag and digest;
- the check's three outputs;
- for each architecture, the aube version that the image carries.

The coordinator relays this to the material-x architect, who records it.