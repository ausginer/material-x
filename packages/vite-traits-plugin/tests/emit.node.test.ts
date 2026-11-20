import { readFile } from 'node:fs/promises';
import { RolldownMagicString, VERSION } from 'rolldown';
import { describe, expect, it } from 'vitest';
import { lowerForAnalysis, viteTraitsPlugin } from '../src/plugin.ts';
import { fixtureId } from './helpers.ts';

type Meta = Readonly<{ magicString?: unknown }>;

type Hook = (this: unknown, code: string, id: string, meta: Meta) => unknown;

type Result = Readonly<{ code: RolldownMagicString | string; map?: string }>;

const ID = fixtureId('checkable.ts');
const SOURCE = await readFile(ID, 'utf8');

/**
 * A magic string of a binding that isn't this module's rolldown's: it holds
 * the module's code, and its class isn't `RolldownMagicString`.
 */
class ForeignMagicString {
  readonly #code: string;

  constructor(code: string) {
    this.#code = code;
  }

  toString(): string {
    return this.#code;
  }
}

/** Each hook, with the module text it transforms. */
function hooks(): ReadonlyArray<readonly [string, Hook, string]> {
  const [attributes, flattener] = viteTraitsPlugin();

  return [
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    ['trait-attributes', attributes!.transform as Hook, SOURCE],
    [
      'trait-flattener',
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      flattener!.transform as Hook,
      lowerForAnalysis(ID, SOURCE),
    ],
  ];
}

/** A rolldown version that isn't this module's. */
const OTHER_VERSION = `${VERSION}-other`;

/** Runs `hook` in a host on `rolldownVersion` that passes `meta`. */
async function transform(
  hook: Hook,
  code: string,
  meta: Meta,
  rolldownVersion: string,
) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await hook.call(
    { meta: { rolldownVersion } },
    code,
    ID,
    meta,
  )) as Result;
}

function expectStringAndMap(result: Result, code: string) {
  expect(result.code).toBeTypeOf('string');
  expect(result.code).not.toBe(code);
  expect(JSON.parse(result.map!)).toMatchObject({ sources: [ID] });
}

describe('a transform result', () => {
  it.each(hooks())(
    "should edit and return the host's magic string from %s when it is of this rolldown's class, whatever the version",
    async (_, hook, code) => {
      const magicString = new RolldownMagicString(code);
      const result = await transform(
        hook,
        code,
        { magicString },
        OTHER_VERSION,
      );

      expect(result.code).toBe(magicString);
      expect(magicString.hasChanged()).toBe(true);
      expect(result.map).toBeUndefined();
    },
  );

  it.each(hooks())(
    "should give a string and a source map from %s when the host's magic string is of another class, at the same version",
    async (_, hook, code) => {
      const result = await transform(
        hook,
        code,
        { magicString: new ForeignMagicString(code) },
        VERSION,
      );

      expectStringAndMap(result, code);
    },
  );

  it.each(hooks())(
    "should return a magic string from %s to a host that offers none and runs this rolldown's version",
    async (_, hook, code) => {
      const result = await transform(hook, code, {}, VERSION);

      expect(result.code).toBeInstanceOf(RolldownMagicString);
      expect(result.map).toBeUndefined();
    },
  );

  it.each(hooks())(
    'should give a string and a source map from %s to a host that offers no magic string and runs another version',
    async (_, hook, code) => {
      expectStringAndMap(await transform(hook, code, {}, OTHER_VERSION), code);
    },
  );
});
