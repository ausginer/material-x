import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeModule, parseModule } from '../src/analyze.ts';
import { appendSyntheticExports, lowerModule } from '../src/lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
} from '../src/normalize.ts';
import { FIXTURES, fixtureId, nodeLoader, readFixture } from './helpers.ts';

type Ctor = new () => {
  checked: boolean;
  name: string | null;
  extra: string;
  getAttribute(name: string): string | null;
};

/**
 * Materializes both the flattened and the runtime-composed form of the fixture
 * into a temp dir and imports them, so behavioral equivalence can be asserted.
 * Synthetic export names are hashed from the ORIGINAL fixture ids, so the
 * augmented trait modules must reuse those ids — which they do, because the
 * flattened consumer keeps the original relative specifiers.
 */
async function buildForms(): Promise<{
  composed: Ctor;
  flattened: Ctor;
  Checkable: abstract new () => object;
  Nameable: abstract new () => object;
}> {
  // Generate inside the package tree (not the OS temp dir) so the emitted
  // modules resolve `@ydinjs/core` through the workspace node_modules.
  const genDir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-'));
  const consumerId = fixtureId('consumer.ts');
  const consumerCode = await readFixture('consumer.ts');
  const { compositions } = await analyzeModule(
    consumerId,
    consumerCode,
    nodeLoader,
  );
  const flat = lowerModule(consumerCode, compositions).toString();

  // Augment each trait module with its build-only synthetic exports, reusing
  // the ORIGINAL id for hashing so the flattened consumer's imports line up.
  const augmentTrait = async (name: string): Promise<void> => {
    const id = fixtureId(`${name}.ts`);
    const code = await readFixture(`${name}.ts`);
    const program = parseModule(id, code);
    const factoryLocals = await resolveFactoryLocals(program, (specifier) =>
      nodeLoader.resolve(specifier, id),
    );
    const synthetics = collectModuleSyntheticExports(
      program,
      id,
      factoryLocals,
    );
    const augmented = appendSyntheticExports(code, synthetics);
    await writeFile(join(genDir, `${name}.ts`), augmented!.toString());
  };

  await Promise.all([
    // Base carries no traits; copy it verbatim.
    writeFile(join(genDir, 'base.ts'), await readFixture('base.ts')),
    augmentTrait('checkable'),
    augmentTrait('nameable'),
    writeFile(join(genDir, 'foo-flat.ts'), flat),
    writeFile(join(genDir, 'foo-composed.ts'), consumerCode),
  ]);

  const url = (file: string): string => pathToFileURL(join(genDir, file)).href;

  const [composed, flattened, checkable, nameable] = (await Promise.all([
    import(url('foo-composed.ts')),
    import(url('foo-flat.ts')),
    import(url('checkable.ts')),
    import(url('nameable.ts')),
  ])) as [
    { default: Ctor },
    { default: Ctor },
    { Checkable: abstract new () => object },
    { Nameable: abstract new () => object },
  ];

  // Best-effort cleanup once the modules are loaded into the ESM cache.
  await rm(genDir, { recursive: true, force: true });

  return {
    composed: composed.default,
    flattened: flattened.default,
    Checkable: checkable.Checkable,
    Nameable: nameable.Nameable,
  };
}

describe('descriptor flattening runtime equivalence', () => {
  let forms: Awaited<ReturnType<typeof buildForms>>;

  beforeAll(async () => {
    forms = await buildForms();
  });

  const cases = (): ReadonlyArray<readonly [string, Ctor]> => [
    ['composed', forms.composed],
    ['flattened', forms.flattened],
  ];

  it('should default the boolean accessor to false', () => {
    for (const [label, Ctor] of cases()) {
      expect(new Ctor().checked, label).toBe(false);
    }
  });

  it('should round-trip the boolean accessor through the attribute', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      instance.checked = true;
      expect(instance.checked, label).toBe(true);
      expect(instance.getAttribute('checked'), label).toBe('');
    }
  });

  it('should round-trip the string accessor', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      expect(instance.name, label).toBeNull();
      instance.name = 'hi';
      expect(instance.name, label).toBe('hi');
    }
  });

  it('should keep the component instance field', () => {
    for (const [label, Ctor] of cases()) {
      expect(new Ctor().extra, label).toBe('here');
    }
  });

  it('should preserve trait brands for instanceof', () => {
    for (const [label, Ctor] of cases()) {
      const instance = new Ctor();
      expect(instance, label).toBeInstanceOf(forms.Checkable);
      expect(instance, label).toBeInstanceOf(forms.Nameable);
    }
  });

  it('should merge observedAttributes with the base', () => {
    for (const [label, Ctor] of cases()) {
      const observed = (Ctor as unknown as { observedAttributes: string[] })
        .observedAttributes;
      expect([...observed].sort(), label).toEqual([
        'checked',
        'data-base',
        'name',
      ]);
    }
  });
});
