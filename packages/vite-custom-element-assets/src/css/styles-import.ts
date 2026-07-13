import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { escapeTemplateLiteral } from '../utils.ts';

const EXT = '.styles.css';

// registerHooks requires synchronous hooks — readFileSync is the only option
// here.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(EXT)) {
      const result = readFileSync(new URL(url), 'utf8');

      return {
        format: 'module',
        shortCircuit: true,
        source: `export default \`${escapeTemplateLiteral(result)}\``,
      };
    }

    return nextLoad(url, context);
  },
});
