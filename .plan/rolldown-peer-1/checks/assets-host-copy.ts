// RF-55's task 3 for `@ydinjs/vite-custom-element-assets`, which has no test
// project: `constructCSSTokens({ isProd: true })`'s transform, called with a
// host that runs the plugin's copy of rolldown and with one that runs another
// version. It prints what each result's `code` is and whether it carries a map.
//
// Usage: node .plan/rolldown-peer-1/checks/assets-host-copy.ts, from the
// repository root, after `aube exec just build`.
import { readFile } from 'node:fs/promises';
import { constructCSSTokens } from '@ydinjs/vite-custom-element-assets';
import { RolldownMagicString, VERSION } from 'rolldown';

const props: Readonly<Record<string, string>> = JSON.parse(
  await readFile('node_modules/.cache/css/css-private-props.json', 'utf8'),
);
const [name, short] = Object.entries(props)[0]!;
const code = `export const prop = '${name}';\n`;
const id = '/virtual/prop.ts';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const { handler } = constructCSSTokens({ isProd: true }).transform as {
  handler: (this: unknown, code: string, id: string) => unknown;
};

for (const rolldownVersion of [VERSION, `${VERSION}-other`]) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const result = handler.call({ meta: { rolldownVersion } }, code, id) as {
    code: RolldownMagicString | string;
    map?: string;
  };
  const text = result.code.toString();
  const kind =
    result.code instanceof RolldownMagicString
      ? 'magic string'
      : typeof result.code;
  const map = result.map
    ? `map sources ${JSON.stringify(JSON.parse(result.map).sources)}`
    : 'no map';
  console.log(
    `host rolldown ${rolldownVersion === VERSION ? 'VERSION' : 'VERSION-other'}: code is a ${kind}, ${map}, replaced: ${text.includes(`'${short}'`) && !text.includes(name)}`,
  );
}
