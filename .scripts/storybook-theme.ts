import { writeFile } from 'node:fs/promises';
import kebabCase from 'just-kebab-case';
// eslint-disable-next-line import-x/no-relative-packages
import db from '../packages/tproc/src/DB/index.ts';
import { root } from './utils.ts';

const { light, dark } = db.theme.schemes;

const [lightCSS, darkCSS] = [light, dark].map((scheme) =>
  Object.entries(scheme).map(
    ([name, value]) =>
      `--md-sys-color-${kebabCase(name)}: ${value.toLowerCase()};`,
  ),
);

const contents = `:root {
  ${lightCSS!.join('\n  ')}
}

html[data-theme="dark"] {
  ${darkCSS!.join('\n  ')}
}
`;

const url = new URL(`.storybook/theme.css`, root);

await writeFile(url, contents, 'utf8');
