// oxlint-disable no-console, no-await-in-loop, typescript/no-unsafe-member-access, typescript/no-unsafe-call, typescript/require-await
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeModule,
  parseModule,
  type ModuleLoader,
} from '../../analyze.ts';
import { appendSyntheticExports, lowerModule } from '../../lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
} from '../../normalize.ts';

const here = new URL('./', import.meta.url);
const genDir = new URL('.gen/', here);

const loader: ModuleLoader = {
  resolve: async (specifier, importer) => {
    if (specifier.startsWith('.')) {
      return fileURLToPath(new URL(specifier, pathToFileURL(importer)));
    }
    try {
      return fileURLToPath(
        import.meta.resolve(specifier, pathToFileURL(importer)),
      );
    } catch {
      return null;
    }
  },
  load: (id) => readFile(id, 'utf8'),
};

async function main(): Promise<void> {
  await mkdir(genDir, { recursive: true });

  const consumerId = fileURLToPath(new URL('consumer.ts', here));
  const consumerCode = await readFile(consumerId, 'utf8');

  const { compositions, dependencies } = await analyzeModule(
    consumerId,
    consumerCode,
    loader,
  );

  assert.equal(compositions.length, 1, 'one eligible composition');
  assert.equal(dependencies.length, 2, 'depends on both trait modules');

  const flat = lowerModule(consumerCode, compositions).toString();

  // Structural assertions on the flattened output.
  assert.ok(!flat.includes('impl('), 'no runtime impl() remains');
  assert.match(flat, /class Foo extends Base/u, 'reparented onto Base');
  assert.match(
    flat,
    /static observedAttributes = \[\.\.\.new Set\(\[\.\.\.\(Base\.observedAttributes/u,
    'merged observedAttributes',
  );
  assert.match(flat, /"checked"/u, 'checked accessor emitted');
  assert.match(flat, /"name"/u, 'name accessor emitted');
  assert.ok(parseModule(`${consumerId}#flat`, flat), 'output parses');

  // Write the flattened consumer and synthetic-augmented trait modules into a
  // sibling .gen dir, reusing the ORIGINAL module ids so synthetic names match
  // what the flattened consumer imports.
  await writeFile(
    new URL('base.ts', genDir),
    await readFile(fileURLToPath(new URL('base.ts', here))),
  );

  for (const name of ['checkable', 'nameable']) {
    const id = fileURLToPath(new URL(`${name}.ts`, here));
    const code = await readFile(id, 'utf8');
    const program = parseModule(id, code);
    const factoryLocals = await resolveFactoryLocals(program, (specifier) =>
      loader.resolve(specifier, id),
    );
    const synthetics = collectModuleSyntheticExports(
      program,
      id,
      factoryLocals,
    );
    assert.equal(synthetics.length, 1, `${name} exposes its private brand`);
    const augmented = appendSyntheticExports(code, synthetics);
    await writeFile(new URL(`${name}.ts`, genDir), augmented!.toString());
  }

  await writeFile(new URL('foo-flat.ts', genDir), flat);
  await writeFile(new URL('foo-composed.ts', genDir), consumerCode);

  // Runtime equivalence: compose vs. flatten must behave identically.
  const composed = (await import(new URL('foo-composed.ts', genDir).href))
    .default;
  const flattened = (await import(new URL('foo-flat.ts', genDir).href)).default;
  const { Checkable } = await import(new URL('checkable.ts', genDir).href);
  const { Nameable } = await import(new URL('nameable.ts', genDir).href);

  for (const [label, Ctor] of [
    ['composed', composed],
    ['flattened', flattened],
  ] as const) {
    const instance = new Ctor();

    assert.equal(instance.checked, false, `${label}: default checked`);
    instance.checked = true;
    assert.equal(instance.checked, true, `${label}: checked round-trips`);
    assert.equal(
      instance.getAttribute('checked'),
      '',
      `${label}: checked attr`,
    );

    assert.equal(instance.name, null, `${label}: default name`);
    instance.name = 'hi';
    assert.equal(instance.name, 'hi', `${label}: name round-trips`);

    assert.ok(instance instanceof Checkable, `${label}: instanceof Checkable`);
    assert.ok(instance instanceof Nameable, `${label}: instanceof Nameable`);
    assert.equal(instance.extra, 'here', `${label}: component field kept`);

    const observed = (Ctor as { observedAttributes: readonly string[] })
      .observedAttributes;
    assert.deepEqual(
      [...observed].sort(),
      ['checked', 'data-base', 'name'],
      `${label}: observedAttributes`,
    );
  }

  console.log('OK: descriptor flattening matches runtime composition');
}

await main();
