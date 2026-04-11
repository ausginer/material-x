import { readFile } from 'node:fs/promises';
import { register, type LoadHook } from 'node:module';
import { escapeTemplateLiteral } from '../utils.ts';

const EXT = '.styles.css';

register(import.meta.url);

export const load: LoadHook = async (url, context, nextLoad) => {
  if (url.endsWith(EXT)) {
    const result = await readFile(new URL(url), 'utf8');

    return {
      format: 'module',
      shortCircuit: true,
      source: `export default \`${escapeTemplateLiteral(result)}\``,
    };
  }

  return await nextLoad(url, context);
};
