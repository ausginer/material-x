import { readFile } from 'node:fs/promises';
import { RolldownMagicString } from 'rolldown';
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

async function transform(hook: Hook, code: string, meta: Meta) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await hook.call({}, code, ID, meta)) as Result;
}

function expectStringAndMap(result: Result, code: string) {
  expect(result.code).toBeTypeOf('string');
  expect(result.code).not.toBe(code);
  expect(JSON.parse(result.map!)).toMatchObject({ sources: [ID] });
}

describe('a transform result', () => {
  it.each(hooks())(
    "should edit and return the host's magic string from %s when it is of this rolldown's class",
    async (_, hook, code) => {
      const magicString = new RolldownMagicString(code);
      const result = await transform(hook, code, { magicString });

      expect(result.code).toBe(magicString);
      expect(magicString.hasChanged()).toBe(true);
      expect(result.map).toBeUndefined();
    },
  );

  it.each(hooks())(
    "should give a string and a source map from %s when the host's magic string is of another class",
    async (_, hook, code) => {
      const result = await transform(hook, code, {
        magicString: new ForeignMagicString(code),
      });

      expectStringAndMap(result, code);
    },
  );

  it.each(hooks())(
    'should give a string and a source map from %s when the host offers no magic string',
    async (_, hook, code) => {
      expectStringAndMap(await transform(hook, code, {}), code);
    },
  );
});
