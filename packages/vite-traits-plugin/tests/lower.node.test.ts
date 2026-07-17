import { describe, expect, it } from 'vitest';
import { analyzeModule, parseModule } from '../src/analyze.ts';
import { appendSyntheticExports, lowerModule } from '../src/lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
} from '../src/normalize.ts';
import { fixtureId, nodeLoader, readFixture } from './helpers.ts';

async function lowerConsumer(): Promise<string> {
  const id = fixtureId('consumer.ts');
  const code = await readFixture('consumer.ts');
  const { compositions } = await analyzeModule(id, code, nodeLoader);

  return lowerModule(code, compositions).toString();
}

describe('appendSyntheticExports', () => {
  it('should return null when there are no synthetics', () => {
    expect(appendSyntheticExports('const x = 1;', [])).toBeNull();
  });

  it('should append an export clause for each synthetic binding', async () => {
    const id = fixtureId('checkable.ts');
    const code = await readFixture('checkable.ts');
    const program = parseModule(id, code);
    const synthetics = collectModuleSyntheticExports(
      program,
      id,
      resolveFactoryLocals(program),
    );

    const augmented = appendSyntheticExports(code, synthetics)?.toString();

    expect(augmented).toMatch(
      /export \{ \$checkable as __mxflat_\$checkable_[0-9a-f]{8}, \$checkable \};/u,
    );
  });
});

describe('lowerModule', () => {
  it('should remove the runtime impl() intermediary', async () => {
    expect(await lowerConsumer()).not.toContain('impl(');
  });

  it('should re-parent the component class onto the base', async () => {
    expect(await lowerConsumer()).toMatch(/class Foo extends Base/u);
  });

  it('should merge observedAttributes with the base', async () => {
    expect(await lowerConsumer()).toMatch(
      /static observedAttributes = \[\.\.\.new Set\(\[\.\.\.\(Base\.observedAttributes/u,
    );
  });

  it('should emit class getters/setters for trait attributes', async () => {
    const flat = await lowerConsumer();
    expect(flat).toMatch(/get "checked"\(\) \{ return __mxflat_attr\.get\(/u);
    expect(flat).toMatch(/set "checked"\(value\) \{ __mxflat_attr\.set\(/u);
    expect(flat).toMatch(/get "name"\(\)/u);
  });

  it('should not install attribute accessors via defineProperty', async () => {
    // Only the symbol brands use a data-property install now.
    expect(await lowerConsumer()).not.toContain('Object.defineProperty(');
  });

  it('should install every brand through a single Object.defineProperties', async () => {
    const flat = await lowerConsumer();
    expect(
      flat.match(/Object\.defineProperties\(this\.prototype, \{/gu),
    ).toHaveLength(1);
    expect(flat).toMatch(/\]: \{ value: true \},/u);
  });

  it('should import the attribute operator once', async () => {
    const flat = await lowerConsumer();
    expect(flat.match(/from "@ydinjs\/core\/attribute\.js"/gu)).toHaveLength(1);
  });

  it('should produce parseable output', async () => {
    const flat = await lowerConsumer();
    expect(() => parseModule('/virtual/foo-flat.ts', flat)).not.toThrow();
  });
});
