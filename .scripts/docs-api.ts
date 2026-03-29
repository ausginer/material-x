import { mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { root } from './utils.ts';

const { values } = parseArgs({
  options: {
    out: {
      type: 'string',
    },
  },
});

if (!values.out) {
  throw new Error('Expected --out <path> for API docs output.');
}

const outputRoot = new URL(values.out.replace(/\/?$/, '/'), root);
const materialXRoot = new URL('material-x/', outputRoot);

const renderPage = ({
  title,
  heading,
  body,
}: {
  title: string;
  heading: string;
  body: string;
}): string => {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, sans-serif;
      }

      body {
        margin: 0;
        padding: 2rem;
        line-height: 1.5;
      }

      main {
        max-width: 48rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${heading}</h1>
      ${body}
    </main>
  </body>
</html>
`;
};

await mkdir(outputRoot, { recursive: true });
await mkdir(materialXRoot, { recursive: true });

await writeFile(
  new URL('index.html', outputRoot),
  renderPage({
    title: 'API reference',
    heading: 'API reference',
    body: `
      <p>Package-level API docs published for this site.</p>
      <ul>
        <li><a href="./ydin/index.html">ydin Typedoc</a></li>
        <li><a href="./material-x/index.html">material-x API landing page</a></li>
        <li><a href="../?path=/docs/reference-api--docs">Storybook API overview</a></li>
      </ul>
    `,
  }),
  'utf8',
);

await writeFile(
  new URL('index.html', materialXRoot),
  renderPage({
    title: 'material-x API',
    heading: 'material-x API',
    body: `
      <p>
        This section is reserved for future package-level API reference.
        For now, the canonical documentation for components lives in Storybook.
      </p>
      <ul>
        <li><a href="../../?path=/docs/reference-api--docs">Storybook API overview</a></li>
        <li><a href="../../">Storybook component docs</a></li>
        <li><a href="../ydin/index.html">ydin Typedoc</a></li>
      </ul>
    `,
  }),
  'utf8',
);
