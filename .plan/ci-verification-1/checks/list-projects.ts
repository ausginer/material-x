/**
 * Prints the project names a Vitest configuration declares, after `--project`
 * filtering, without running a test. Usage, from the configuration's directory:
 * `node <this file> <config> [--project <pattern>]...`
 */
import { parseArgs } from 'node:util';
import { createVitest } from 'vitest/node';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { project: { type: 'string', multiple: true } },
});
const vitest = await createVitest('test', {
  config: positionals[0],
  project: values.project,
  watch: false,
});

console.log(JSON.stringify(vitest.projects.map((project) => project.name)));
await vitest.close();
