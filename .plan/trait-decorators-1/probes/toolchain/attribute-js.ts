// P15. What JavaScript each attribute form of P13 and P14 leaves after the
// TypeScript transform, with no flattener, and whether Node parses it.
// Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/attribute-js.ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { transformSync } = createRequire(
  new URL('../../../../package.json', import.meta.url),
)('oxc-transform') as typeof import('oxc-transform');

const types = fileURLToPath(new URL('../types/', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'p15-'));

const cases: ReadonlyArray<readonly [string, string]> = [
  [
    'explicit get/set',
    "class Explicit extends ControlledElement {\n  static override observedAttributes: readonly string[] = ['disabled'];\n  get disabled(): boolean { return attr.get(this, 'disabled', Bool); }\n  set disabled(value: boolean) { attr.set(this, 'disabled', value, Bool); }\n}",
  ],
  [
    'table + declare',
    'class Declared extends ControlledElement {\n  static readonly attributes: AttributeTable<Declared> = { disabled: Bool };\n  declare disabled: boolean;\n}',
  ],
  [
    'table + plain accessor',
    'class PlainAuto extends ControlledElement {\n  static readonly attributes: AttributeTable<PlainAuto> = { disabled: Bool };\n  accessor disabled!: boolean;\n}',
  ],
  [
    'getter alone',
    "class GetterOnly extends ControlledElement {\n  get busy(): boolean { return attr.get(this, 'busy', Bool); }\n}",
  ],
  [
    '@attr accessor',
    'class Decorated extends ControlledElement {\n  @attr(Bool) accessor disabled!: boolean;\n}',
  ],
  [
    '@attr getter',
    'class DecoratedGetter extends ControlledElement {\n  @attr(Bool) get busy(): boolean { return false; }\n}',
  ],
];

for (const [label, body] of cases) {
  const source = `import { ControlledElement, attr, Bool, type AttributeTable } from './x.ts';\nexport ${body}\n`;
  const { code, errors } = transformSync(`${types}${label}.ts`, source, {
    target: 'esnext',
  });
  const file = join(dir, 'case.mjs');
  writeFileSync(file, code);
  let parse = 'parses';
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    parse = `SyntaxError: ${String((error as { stderr: Buffer }).stderr)
      .split('\n')
      .find((l) => l.startsWith('SyntaxError'))}`;
  }
  console.log(
    `== ${label} — transform errors: ${errors.length}; node ${process.version} --check: ${parse}`,
  );
  console.log(code.split('\n').slice(1).join('\n').trim());
}
rmSync(dir, { recursive: true });
void readFileSync;
