import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'tsdown';
import ts from 'typescript';
import { it } from 'vitest';
import { viteTraitsPlugin } from '../src/plugin.ts';
import { FIXTURES } from './helpers.ts';

const TRAITS = `import { AnyElement } from '@ydinjs/core/traits/attribute-traits.js';
import { compose, trait, type Composed } from '@ydinjs/core/traits/composition.js';

@trait
export class Sup extends AnyElement {
  #ready = false;
  constructor() {
    super();
    this.#ready = true;
  }
  get ready(): boolean { return this.#ready; }
}

const SubBase: Composed<typeof AnyElement, [typeof Sup]> = compose(AnyElement);

@trait
export class Sub extends SubBase {
  #x = 'sub';
  constructor() {
    super();
    this.#x += String(this.ready);
  }
  get subX(): string { return this.#x; }
}

@trait
export class Other extends AnyElement {
  #m(): number { return 1; }
  get other(): number { return this.#m(); }
}
`;
const component = (
  extra: string,
) => `import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import type { Other, Sub } from './out/traits.js';

const ItemBase: Composed<typeof HTMLElement, [typeof Sub, typeof Other]> = compose(HTMLElement);

export class Item extends ItemBase {
  #x = 1;
  constructor() {
    super();
  }
  read(): string {
    ${extra}
    return this.subX + String(this.ready) + String(this.other + this.#x);
  }
}
export const made: Item = new Item();
`;

it('declarations', async () => {
  const dir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-rvdts-'));
  const lines: string[] = [];
  try {
    await writeFile(join(dir, 'traits.ts'), TRAITS);
    await build({
      config: false,
      entry: [join(dir, 'traits.ts')],
      outDir: join(dir, 'out'),
      format: 'esm',
      platform: 'neutral',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
      dts: true,
      deps: { neverBundle: [/^@ydinjs\//u] },
      plugins: viteTraitsPlugin(),
      logLevel: 'silent',
    });
    lines.push(
      '--- traits.d.ts',
      await readFile(join(dir, 'out', 'traits.d.ts'), 'utf8'),
    );
    const config = ts.getParsedCommandLineOfConfigFile(
      fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
      {},
      { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
    )!;
    for (const [label, extra] of [
      ['clean', ''],
      ['mutation: reads a trait private name', 'void this.#ready;'],
      ['mutation: reads a missing member', 'void this.missing;'],
    ] as const) {
      const file = join(dir, `item-${label.length}.ts`);
      await writeFile(file, component(extra));
      const program = ts.createProgram([file], {
        ...config.options,
        noEmit: true,
      });
      const diags = ts
        .getPreEmitDiagnostics(program)
        .map(
          (d) =>
            `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`,
        );
      lines.push(
        `--- typecheck ${label}: ${diags.length} diagnostics`,
        ...diags,
      );
    }
  } finally {
    await writeFile(process.env.RV_OUT!, lines.join('\n') + '\n');
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);
