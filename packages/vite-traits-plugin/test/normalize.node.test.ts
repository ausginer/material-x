import { describe, expect, it } from 'vitest';
import { parseModule } from '../src/analyze.ts';
import { BailoutError } from '../src/diagnostics.ts';
import {
  collectModuleSyntheticExports,
  normalizeDescriptorTrait,
  resolveFactoryLocals,
  type SyntheticExport,
  syntheticExportName,
} from '../src/normalize.ts';
import { fixtureId, nodeLoader, readFixture } from './helpers.ts';

const resolveFrom =
  (id: string) =>
  (specifier: string): Promise<string | null> =>
    nodeLoader.resolve(specifier, id);

async function factoryLocalsFor(name: string): Promise<ReadonlySet<string>> {
  const id = fixtureId(name);
  const program = parseModule(id, await readFixture(name));

  return await resolveFactoryLocals(program, resolveFrom(id));
}

describe('syntheticExportName', () => {
  it('should be deterministic for the same inputs', () => {
    expect(syntheticExportName('/a/mod.ts', '$brand')).toBe(
      syntheticExportName('/a/mod.ts', '$brand'),
    );
  });

  it('should differ when the module id differs', () => {
    expect(syntheticExportName('/a/mod.ts', '$brand')).not.toBe(
      syntheticExportName('/b/mod.ts', '$brand'),
    );
  });

  it('should differ when the local name differs', () => {
    expect(syntheticExportName('/a/mod.ts', '$one')).not.toBe(
      syntheticExportName('/a/mod.ts', '$two'),
    );
  });

  it('should produce a safe, prefixed identifier', () => {
    expect(syntheticExportName('/a/mod.ts', '$brand')).toMatch(
      /^__mxflat_\$brand_[0-9a-f]{8}$/u,
    );
  });
});

describe('resolveFactoryLocals', () => {
  it('should recognize the descriptor factory by resolved path', async () => {
    expect([...(await factoryLocalsFor('checkable.ts'))]).toEqual(['trait']);
  });

  it('should ignore modules that do not import the factory', async () => {
    expect([...(await factoryLocalsFor('base.ts'))]).toEqual([]);
  });
});

describe('normalizeDescriptorTrait', () => {
  it('should normalize a descriptor trait into IR', async () => {
    const id = fixtureId('checkable.ts');
    const program = parseModule(id, await readFixture('checkable.ts'));
    const synthetics = new Map<string, SyntheticExport>();

    const ir = normalizeDescriptorTrait(
      program,
      id,
      './checkable.ts',
      'Checkable',
      synthetics,
      await factoryLocalsFor('checkable.ts'),
    );

    expect(ir).toMatchObject({
      kind: 'descriptor',
      name: 'Checkable',
      observedAttributes: ['checked'],
      accessors: [{ key: 'checked', converterPath: ['checked'] }],
    });
  });

  it('should surface a synthetic export for the private brand', async () => {
    const id = fixtureId('checkable.ts');
    const program = parseModule(id, await readFixture('checkable.ts'));
    const synthetics = new Map<string, SyntheticExport>();

    normalizeDescriptorTrait(
      program,
      id,
      './checkable.ts',
      'Checkable',
      synthetics,
      await factoryLocalsFor('checkable.ts'),
    );

    expect([...synthetics.keys()]).toEqual(['$checkable']);
  });

  it('should link the exported converter directly, without a synthetic', async () => {
    const id = fixtureId('checkable.ts');
    const program = parseModule(id, await readFixture('checkable.ts'));
    const synthetics = new Map<string, SyntheticExport>();

    const ir = normalizeDescriptorTrait(
      program,
      id,
      './checkable.ts',
      'Checkable',
      synthetics,
      await factoryLocalsFor('checkable.ts'),
    );

    expect(ir?.accessors[0]?.converter).toMatchObject({
      exportName: 'CHECKABLE_ATTRS',
      specifier: './checkable.ts',
    });
    expect(ir?.accessors[0]?.converter.synthetic).toBeUndefined();
  });

  it('should return null for a non-descriptor export', async () => {
    const id = fixtureId('base.ts');
    const program = parseModule(id, await readFixture('base.ts'));

    const ir = normalizeDescriptorTrait(
      program,
      id,
      './base.ts',
      'Base',
      new Map(),
      await factoryLocalsFor('base.ts'),
    );

    expect(ir).toBeNull();
  });

  it('should bail when the trait factory arity is wrong', () => {
    const id = '/virtual/bad.ts';
    const code = [
      "import { trait } from '@ydinjs/core/traits/traits.js';",
      'const ATTRS = { checked: null };',
      'export const Bad = trait(ATTRS);',
    ].join('\n');
    const program = parseModule(id, code);

    expect(() =>
      normalizeDescriptorTrait(
        program,
        id,
        './bad.ts',
        'Bad',
        new Map(),
        new Set(['trait']),
      ),
    ).toThrow(BailoutError);
  });
});

describe('collectModuleSyntheticExports', () => {
  it('should collect the private brand of a descriptor module', async () => {
    const id = fixtureId('nameable.ts');
    const program = parseModule(id, await readFixture('nameable.ts'));

    const synthetics = collectModuleSyntheticExports(
      program,
      id,
      await factoryLocalsFor('nameable.ts'),
    );

    expect(synthetics.map((s) => s.local)).toEqual(['$nameable']);
  });

  it('should collect nothing from a module without descriptor traits', async () => {
    const id = fixtureId('base.ts');
    const program = parseModule(id, await readFixture('base.ts'));

    expect(
      collectModuleSyntheticExports(
        program,
        id,
        await factoryLocalsFor('base.ts'),
      ),
    ).toEqual([]);
  });
});
