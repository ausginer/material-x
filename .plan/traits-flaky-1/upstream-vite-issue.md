# Upstream report draft: Vite's module runner evaluates a module twice

**A draft, not posted.** Written by the architect on 2026-11-19 for `repo:RF-60`, on the coordinator's task. Whether to report upstream is the owner's decision, because it writes to GitHub. Everything between the two rules below is ready to paste into a new issue at `vitejs/vite`. The evidence behind it is in [rf60-vite-only.txt](checks/rf60-vite-only.txt) and the implementer's [rf60-reproduction.txt](checks/rf60-reproduction.txt).

**Why Vite and not Vitest.** Every function in the mechanism is Vite's: `ModuleRunner`'s request deduplication, the server's `fetchModule` and its `invalidate` answer, and the runner's handling of that answer. The script below reproduces the defect with Vite alone, without Vitest. Vitest reaches it because its runner extends Vite's `ModuleRunner` and its project server calls Vite's exported `fetchModule`. Under Vitest the rate is lower: 1 in 3,000 repeats of the minimal case under a bare Vitest configuration, unloaded, and 8 in 1,000 repeats of this repository's test under load.

**Before posting:**

- **The issue form asks for a link to a reproduction** (vite.new or a repository). The script below needs only `vite` installed. Put it in a public repository or a StackBlitz project, and link it.
- **It was checked only on 8.4.0-beta.1.** Running it on the latest stable 8.x first would show whether the regression is new. If it reproduces there too, change the "Versions" lines.
- **Related, not a duplicate:** vitejs/vite#24062, open, read on 2026-11-19. It reports that an import by file URL misses the runner's cache and fetches the module again, and that the module _isn't_ evaluated again. That issue's case is sequential. This one is concurrent, and the module _is_ evaluated again.

---

### Title

Module runner evaluates a module twice when it is imported concurrently by its file URL and by a relative import

### Describe the bug

When one file is requested from `ModuleRunner` under two URL strings at the same time, the runner can evaluate it twice and give each importer a different module instance. The two URL strings are its `file://` URL, from `runner.import(fileUrl)`, and the root-relative URL that another module's `import './mod.js'` becomes. Each instance has its own top-level state, so a `Symbol()`, a class or a registry created at the top level differs between the two importers.

This happens in Vitest when a test dynamically imports a generated file by its file URL, while a module that it also imports reaches the same file by a relative import. We found it through a test that compared an `instanceof` brand symbol, which failed about once per thousand runs.

As far as we can read the built code, three behaviours combine:

1. `ModuleRunner.cachedModule` deduplicates in-flight requests by their URL string only (`concurrentModuleNodePromises`). So `file:///…/mod.js` and `/gen-x/mod.js` are two requests to the server.
2. The server's `fetchModule` answers `invalidate: !cached`, where `cached` means that the server's module node has a `transformResult` when the request arrives. Two requests that arrive before the first transform result is stored both get `invalidate: true`.
3. `ModuleRunner.getModuleInformation` finds the module node by its id, and applies `invalidate` to it. This happens even when the runner started evaluating that node for the other URL a moment earlier. `invalidateModule` clears the node's `promise` and `exports`, so the next `cachedRequest` for that node evaluates the file again.

Expected: one evaluation per module id. Both URL strings resolve to the same file and the same id, as they would in Node.

With one URL string for both imports (`/gen-x/mod.js` from the script, and the same string from the relative import), we saw no second evaluation in 4,000 repeats.

### Reproduction

`npm i vite@8.4.0-beta.1`, save this as `repro.mjs`, then run `node repro.mjs file` and `node repro.mjs root`:

```js
// One module, imported concurrently under two URL strings: its file URL, and
// the root-relative URL that another module's relative import becomes.
// Prints how many of the repeats evaluated the module twice.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer, createServerModuleRunner } from 'vite';

const root = join(import.meta.dirname, 'root');
const form = process.argv[2] ?? 'file'; // 'file' or 'root'
const repeats = 1000;

await mkdir(root, { recursive: true });
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true, ws: false, watch: null },
});
const runner = createServerModuleRunner(server.environments.ssr, {
  hmr: false,
});
const urlOf = (dir, file) =>
  form === 'file'
    ? pathToFileURL(join(dir, file)).href
    : `/${join(dir, file).slice(root.length + 1)}`;

let twice = 0;
for (let i = 0; i < repeats; i += 1) {
  const dir = await mkdtemp(join(root, 'gen-'));
  await writeFile(join(dir, 'mod.js'), "export const s = Symbol('s');\n");
  await writeFile(
    join(dir, 'user.js'),
    "export { s as viaUser } from './mod.js';\n",
  );
  const [{ viaUser }, { s }] = await Promise.all([
    runner.import(urlOf(dir, 'user.js')),
    runner.import(urlOf(dir, 'mod.js')),
  ]);
  if (viaUser !== s) twice += 1;
  await rm(dir, { recursive: true, force: true });
}

console.log(
  `form ${form}: ${twice} of ${repeats} repeats evaluated mod.js twice`,
);
await runner.close();
await server.close();
```

Observed on Linux, 12 processors, unloaded:

```
form file: 14 of 1000 repeats evaluated mod.js twice
form file: 23 of 1000 repeats evaluated mod.js twice
form file: 12 of 1000 repeats evaluated mod.js twice
form root: 0 of 1000 repeats evaluated mod.js twice
form root: 0 of 1000 repeats evaluated mod.js twice
```

With `.ts` files instead of `.js`, the `file` form gave 36, 50 and 50 of 1,000.

The same happens through Vitest 5.1.0, where the test's `import(fileUrl)` and a relative import from another module both reach the file. With a bare configuration, unloaded, 1 of 3,000 repeats evaluated the file twice. Logging the project server's fetches showed both answers carrying `invalidate: true` in every failing repeat.

### Versions

- vite 8.4.0-beta.1
- vitest 5.1.0, for the Vitest case
- Node v26.13.1, Linux x64

### Related

#24062 also concerns the runner's cache missing an import by file URL. Its case is sequential, and the module isn't evaluated again there. Here the requests are concurrent, and the module is evaluated twice. A fix that maps a file URL to the module's own URL before the in-flight lookup might cover both. We haven't tried one.

---