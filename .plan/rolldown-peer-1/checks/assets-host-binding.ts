// RF-55's task 4 for `@ydinjs/vite-custom-element-assets`, which has no test
// project: `constructCSSTokens({ isProd: true })`'s transform, in the four
// cases of the amended task: a `meta.magicString` of the plugin's own class at
// another rolldown version, one of another class at the same version, and
// none at the same version and at another. It prints what each result's
// `code` is, whether it is the host's instance, and whether it carries a map.
//
// Usage: node .plan/rolldown-peer-1/checks/assets-host-binding.ts, from the
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

/** A magic string of a binding that isn't this rolldown's. */
class ForeignMagicString {
  readonly #code: string;

  constructor(code: string) {
    this.#code = code;
  }

  toString(): string {
    return this.#code;
  }
}

const OTHER_VERSION = `${VERSION}-other`;

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const { handler } = constructCSSTokens({ isProd: true }).transform as {
  handler: (
    this: unknown,
    code: string,
    id: string,
    meta: Readonly<{ magicString?: unknown }>,
  ) => unknown;
};

const cases: ReadonlyArray<
  readonly [string, Readonly<{ magicString?: unknown }>, string]
> = [
  [
    "the plugin's class, another version",
    { magicString: new RolldownMagicString(code) },
    OTHER_VERSION,
  ],
  [
    'another class, the same version',
    { magicString: new ForeignMagicString(code) },
    VERSION,
  ],
  ['none, the same version', {}, VERSION],
  ['none, another version', {}, OTHER_VERSION],
];

for (const [label, meta, rolldownVersion] of cases) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const result = handler.call(
    { meta: { rolldownVersion } },
    code,
    id,
    meta,
  ) as {
    code: RolldownMagicString | string;
    map?: string;
  };
  const text = result.code.toString();
  const kind =
    result.code instanceof RolldownMagicString
      ? `magic string${result.code === meta.magicString ? " (the host's instance)" : ''}`
      : typeof result.code;
  const map = result.map
    ? `map sources ${JSON.stringify(JSON.parse(result.map).sources)}`
    : 'no map';
  console.log(
    `meta.magicString of ${label}: code is a ${kind}, ${map}, replaced: ${text.includes(`'${short}'`) && !text.includes(name)}`,
  );
}
