import { writeFile } from 'node:fs/promises';
import kebabCase from 'just-kebab-case';
import DB from '../src/core/tokens/DB.ts';
import { root } from '../src/core/tokens/utils.ts';

const { light, dark } = DB.theme.schemes;

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
