import { writeFile } from 'node:fs/promises';
import kebabCase from 'just-kebab-case';
import { root, type JSONModule } from '../src/core/tokens/utils.ts';
import { fileURLToPath } from 'node:url';
import type { MaterialTheme } from '../src/core/tokens/MaterialTheme.ts';

const { light, dark } = (
  (await import(
    fileURLToPath(new URL('src/core/tokens/default-theme.json', root)),
    { with: { type: 'json' } }
  )) as JSONModule<MaterialTheme>
).default.schemes;

const [lightCSS, darkCSS] = [light, dark].map((scheme) => {
  return Object.entries(scheme).map(
    ([name, value]) =>
      `--md-sys-color-${kebabCase(name)}: ${value.toLowerCase()};`,
  );
});

const contents = `:root {
  ${lightCSS!.join('\n  ')}
}

html[data-theme="dark"] {
  ${darkCSS!.join('\n  ')}
}
`;

const url = new URL(`.ladle/theme.css`, root);

await writeFile(url, contents, 'utf8');
