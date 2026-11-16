/**
 * Prints each selected browser project's resolved headless mode, workers, file
 * parallelism and trace view, and whether its commands include
 * `fitSafariWindow`, without running a test. Usage, from the repository root:
 * `MX_TEST_ENGINES=<engines> node <this file> [--project <pattern>]...`
 */
import { parseArgs } from 'node:util';
import { createVitest } from 'vitest/node';

const { values } = parseArgs({
  options: { project: { type: 'string', multiple: true } },
});
const vitest = await createVitest('test', {
  project: values.project,
  watch: false,
});

for (const project of vitest.projects) {
  const { browser, maxWorkers, fileParallelism, setupFiles } = project.config;

  console.log(
    JSON.stringify({
      name: project.name,
      headless: browser.headless,
      maxWorkers,
      fileParallelism,
      traceView: browser.traceView,
      provider: browser.provider?.name,
      fitSafariWindow: 'fitSafariWindow' in (browser.commands ?? {}),
      safariWindowSetup: setupFiles.some((file) =>
        file.endsWith('safari-window.browser.ts'),
      ),
    }),
  );
}

await vitest.close();
