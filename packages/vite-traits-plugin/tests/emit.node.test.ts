import { readFile } from 'node:fs/promises';
import { RolldownMagicString, VERSION } from 'rolldown';
import { describe, expect, it } from 'vitest';
import { lowerForAnalysis, viteTraitsPlugin } from '../src/plugin.ts';
import { fixtureId } from './helpers.ts';

type Hook = (this: unknown, code: string, id: string) => unknown;

type Result = Readonly<{ code: RolldownMagicString | string; map?: string }>;

const ID = fixtureId('checkable.ts');
const SOURCE = await readFile(ID, 'utf8');

/** A host's plugin context, with the rolldown version it runs. */
function host(rolldownVersion: string) {
  return { meta: { rolldownVersion } };
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

describe('a transform result', () => {
  it.each(hooks())(
    "should keep %s's magic string for a host on this copy of rolldown",
    async (_, hook, code) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const result = (await hook.call(host(VERSION), code, ID)) as Result;

      expect(result.code).toBeInstanceOf(RolldownMagicString);
      expect(result.map).toBeUndefined();
    },
  );

  it.each(hooks())(
    'should give a string and a source map from %s to a host on another copy of rolldown',
    async (_, hook, code) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const result = (await hook.call(
        host(`${VERSION}-other`),
        code,
        ID,
      )) as Result;

      expect(result.code).toBeTypeOf('string');
      expect(result.code).not.toBe(code);
      expect(JSON.parse(result.map!)).toMatchObject({ sources: [ID] });
    },
  );
});
