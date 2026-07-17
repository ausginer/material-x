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
import { fixtureId, readFixture } from './helpers.ts';

async function factoryLocalsFor(name: string): Promise<ReadonlySet<string>> {
  const program = parseModule(fixtureId(name), await readFixture(name));

  return resolveFactoryLocals(program);
}

describe('syntheticExportName', () => {
  it('should be deterministic for the same local name', () => {
    expect(syntheticExportName('$brand')).toBe(syntheticExportName('$brand'));
  });

  it('should be stable across modules (independent of module id)', () => {
    // A private brand keeps the same synthetic name whether it is seen in a
    // package's own source build or in another package's consuming build.
    expect(syntheticExportName('$disableable')).toBe(
      syntheticExportName('$disableable'),
    );
  });

  it('should differ when the local name differs', () => {
    expect(syntheticExportName('$one')).not.toBe(syntheticExportName('$two'));
  });

  it('should produce a safe, prefixed identifier', () => {
    expect(syntheticExportName('$brand')).toMatch(
      /^__mxflat_\$brand_[0-9a-f]{8}$/u,
    );
  });
});

describe('resolveFactoryLocals', () => {
  it('should recognize the descriptor factory by its import specifier', async () => {
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

  it('should recognize a trait exported via an `export { }` specifier', () => {
    // The bundler emits the brand/attrs as plain consts and exports them
    // together at the end — the built form of every core trait.
    const id = '/virtual/built.ts';
    const code = [
      "import { Bool } from '@ydinjs/core/attribute.js';",
      "import { trait } from '@ydinjs/core/traits/attributes.js';",
      'const $flag = Symbol("Flag");',
      'const FLAG_ATTRS = { flag: Bool };',
      'const Flag = trait(FLAG_ATTRS, $flag);',
      'export { FLAG_ATTRS, Flag };',
    ].join('\n');
    const program = parseModule(id, code);

    const synthetics = new Map<string, SyntheticExport>();
    const ir = normalizeDescriptorTrait(
      program,
      id,
      './built.ts',
      'Flag',
      synthetics,
      resolveFactoryLocals(program),
    );

    expect(ir?.observedAttributes).toEqual(['flag']);
    // Attrs exported → linked directly; brand private → synthetic.
    expect([...synthetics.keys()]).toEqual(['$flag']);
  });

  it('should normalize an inline attrs object, linking each converter', () => {
    const id = '/virtual/inline.ts';
    const code = [
      "import { Bool, Str } from '@ydinjs/core/attribute.js';",
      "import { trait } from '@ydinjs/core/traits/attributes.js';",
      'const $inline = Symbol("Inline");',
      'export const Inline = trait({ on: Bool, label: Str }, $inline);',
    ].join('\n');
    const program = parseModule(id, code);

    const ir = normalizeDescriptorTrait(
      program,
      id,
      './inline.ts',
      'Inline',
      new Map(),
      resolveFactoryLocals(program),
    );

    expect(ir?.observedAttributes).toEqual(['on', 'label']);
    // Each converter is linked to its own imported binding with no index path.
    expect(ir?.accessors[0]?.converter).toMatchObject({
      specifier: '@ydinjs/core/attribute.js',
      exportName: 'Bool',
    });
    expect(ir?.accessors[0]?.converterPath).toEqual([]);
  });

  it('should bail when the brand is an inline anonymous Symbol', () => {
    // Reorderable's shape: `trait({ reorderable: Bool }, Symbol('Reorderable'))`
    // — the brand has no linkable identity across modules.
    const id = '/virtual/anon.ts';
    const code = [
      "import { Bool } from '@ydinjs/core/attribute.js';",
      "import { trait } from '@ydinjs/core/traits/attributes.js';",
      "export const Anon = trait({ on: Bool }, Symbol('Anon'));",
    ].join('\n');
    const program = parseModule(id, code);

    expect(() =>
      normalizeDescriptorTrait(
        program,
        id,
        './anon.ts',
        'Anon',
        new Map(),
        resolveFactoryLocals(program),
      ),
    ).toThrow(BailoutError);
  });

  it('should bail when the trait factory arity is wrong', () => {
    const id = '/virtual/bad.ts';
    const code = [
      "import { trait } from '@ydinjs/core/traits/attributes.js';",
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
