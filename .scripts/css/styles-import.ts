import { readFile } from 'node:fs/promises';
import { register, type LoadHook } from 'node:module';

const EXT = '.styles.css';

register(import.meta.url);

export const load: LoadHook = async (url, context, nextLoad) => {
  if (url.endsWith(EXT)) {
    const result = await readFile(new URL(url), 'utf8');

    return {
      format: 'module',
      shortCircuit: true,
      source: `export default \`${result.trim()}\``,
    };
  }

  return await nextLoad(url, context);
};
