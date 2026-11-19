// P29. The owner's _example4.ts and its fixed version at runtime, in Node with
// an HTMLElement stand-in. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/example4.ts
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const traits = fileURLToPath(
  new URL('../types/example4/traits/', import.meta.url),
);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const requireRoot = createRequire(join(root, 'package.json'));
const asIs = join(traits, '_example4.ts');
const fixed = join(traits, 'fixed.ts');

// What an element needs in Node: the members the probed code calls.
class HTMLElementStandIn {
  readonly #attributes = new Set<string>();
  attachInternals(): object {
    return {};
  }
  hasAttribute(name: string): boolean {
    return this.#attributes.has(name);
  }
  toggleAttribute(name: string, force?: boolean): boolean {
    const on = force ?? !this.#attributes.has(name);
    if (on) this.#attributes.add(name);
    else this.#attributes.delete(name);
    return on;
  }
  focus(): void {}
}
Object.assign(globalThis, { HTMLElement: HTMLElementStandIn });

const attempt = async (label: string, run: () => unknown): Promise<void> => {
  try {
    console.log(label, '→', await run());
  } catch (error) {
    console.log(
      label,
      '→ throws',
      `${(error as Error).name}: ${(error as Error).message}`,
    );
  }
};

console.log("== 1. node runs the owner's file unbuilt (type stripping)");
const unbuilt = spawnSync(process.execPath, [asIs], { encoding: 'utf8' });
console.log(
  'exit',
  unbuilt.status,
  unbuilt.stderr.split('\n').find((line) => /Error/.test(line)),
);

console.log(
  '== 1b. tsc 7 and tsc 6 emit JavaScript under experimentalDecorators',
);
{
  const out = mkdtempSync(join(tmpdir(), 'example4-tsc-'));
  try {
    const config = join(out, 'tsconfig.json');
    writeFileSync(
      config,
      JSON.stringify({
        extends: join(traits, '../tsconfig.json'),
        compilerOptions: {
          emitDeclarationOnly: false,
          rewriteRelativeImportExtensions: true,
          outDir: join(out, 'js'),
        },
        files: [asIs],
      }),
    );
    for (const tsc of ['tsc', 'tsc6']) {
      const run = spawnSync(
        join(root, 'node_modules/.bin', tsc),
        ['-p', config],
        {
          encoding: 'utf8',
        },
      );
      const js = readFileSync(
        join(
          out,
          'js/.plan/trait-decorators-1/probes/types/example4/traits/_example4.js',
        ),
        'utf8',
      );
      console.log(
        tsc,
        'exit',
        run.status,
        '| __decorate:',
        /^Disableable = __decorate\(/m.test(js),
        '| decorators kept:',
        /^(export )?@trait/m.test(js),
      );
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

console.log(
  '== 2. Vite 8 transformWithOxc, which reads the tsconfig that includes the file',
);
const vite = (await import(
  pathToFileURL(requireRoot.resolve('vite')).href
)) as typeof import('vite');
const code = readFileSync(asIs, 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'example4-'));
const lower = async (flag: boolean, source: string): Promise<string> => {
  const dir = join(scratch, String(flag));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { experimentalDecorators: flag },
      include: ['*.ts'],
    }),
  );
  const id = join(dir, '_example4.ts');
  writeFileSync(id, source);
  const config = await vite.resolveConfig(
    { root: dir, configFile: false, logLevel: 'silent' },
    'serve',
  );
  return (await vite.transformWithOxc(source, id, {}, undefined, config)).code;
};
for (const flag of [true, false]) {
  const out = await lower(flag, code);
  console.log(
    `experimentalDecorators: ${flag}:`,
    'decorators kept:',
    /^(export )?@trait/m.test(out),
    '| helper import:',
    out.match(/^import .* from "(@oxc-project[^"]*)"/m)?.[1] ?? '(none)',
  );
}
await attempt(
  'resolve @oxc-project/runtime/helpers/decorate from the root',
  () => requireRoot.resolve('@oxc-project/runtime/helpers/decorate'),
);

// Evaluates the owner's file as Vite lowers it under experimentalDecorators,
// with the helper import replaced by an equivalent, and core's element.ts
// imported by URL.
const evaluate = async (source: string, name: string): Promise<any> => {
  const lowered = (await lower(true, source))
    .replace(
      /^import (\w+) from "@oxc-project\/runtime\/helpers\/decorate";$/m,
      'const $1 = (decorators, target) => decorators.reduceRight((c, d) => d(c) ?? c, target);',
    )
    .replace(
      '"../element.ts"',
      JSON.stringify(
        pathToFileURL(join(root, 'packages/core/src/element.ts')).href,
      ),
    );
  const file = join(scratch, name);
  writeFileSync(file, lowered);
  return import(pathToFileURL(file).href);
};

console.log("== 3. the owner's file, lowered, evaluated");
await attempt('import', () => evaluate(code, 'as-is.mjs').then(() => 'ok'));

console.log("== 4. the owner's file with only bound() returning a class");
const owner = await evaluate(
  code.replace('return {} as any;', 'return class {} as any;'),
  'bound-class.mjs',
);
{
  const button = new owner.IconButton();
  console.log(
    'instanceof Disableable (impl is hand-written):',
    button instanceof owner.Disableable,
  );
  console.log('instanceof Counted:', button instanceof owner.Counted);
  console.log(
    'button.disabled:',
    button.disabled,
    '| button.count:',
    button.count,
  );
  await attempt('button.check()', () => button.check());
  await attempt('IconButton.zero()', () => owner.IconButton.zero());
  button.focus();
  console.log(
    'after focus(): own property "disabled":',
    Object.hasOwn(button, 'disabled'),
  );
}

console.log('== 5. the fixed file unbuilt: its component is not flattened');
await attempt('import fixed.ts', () =>
  import(pathToFileURL(fixed).href).then(() => 'ok'),
);

console.log(
  '== 6. the fixed mechanism, with components as the flattener emits them',
);
// The fixed file without its component, so the traits import unbuilt.
const mechanism = join(traits, '.fixed-traits.ts');
writeFileSync(
  mechanism,
  readFileSync(fixed, 'utf8').replace(/\nconst IconButtonBase[\s\S]*$/, '\n'),
);
try {
  const m = await import(pathToFileURL(mechanism).href);
  const { ControlledElement } = await import(
    pathToFileURL(join(root, 'packages/core/src/element.ts')).href
  );
  console.log('a trait class extends its bound: ok');
  await attempt('compose(AnyElement), a supertrait base', () =>
    m.compose(m.AnyElement) === m.AnyElement ? 'returns the bound' : 'other',
  );
  // A supertrait over a composition of a bound.
  class LabelledButton extends m.compose(m.AnyElement) {
    static {
      m.trait(this);
    }
  }
  // Flattened components: members copied (elided), and the generated block.
  class IconButton extends ControlledElement {
    static {
      m.impl(this, m.Disableable, m.FocusForwarding, m.Counted);
    }
  }
  class SubButton extends IconButton {}
  class Labelled extends ControlledElement {
    static {
      m.impl(this, LabelledButton);
    }
  }
  class LabelledExpanded extends ControlledElement {
    static {
      m.impl(this, LabelledButton, m.Disableable);
    }
  }
  const b = new IconButton();
  console.log(
    'IconButton instanceof Disableable, Counted:',
    b instanceof m.Disableable,
    b instanceof m.Counted,
  );
  console.log(
    'SubButton instanceof Disableable:',
    new SubButton() instanceof m.Disableable,
  );
  console.log(
    'ControlledElement instanceof Disableable:',
    new ControlledElement() instanceof m.Disableable,
  );
  console.log(
    '{}, null, 1 instanceof Disableable:',
    {} instanceof m.Disableable,
    (null as any) instanceof m.Disableable,
    (1 as any) instanceof m.Disableable,
  );
  const l = new Labelled();
  console.log(
    'impl(LabelledButton): instanceof LabelledButton, Disableable:',
    l instanceof LabelledButton,
    l instanceof m.Disableable,
  );
  const e = new LabelledExpanded();
  console.log(
    'impl(LabelledButton, Disableable): instanceof LabelledButton, Disableable:',
    e instanceof LabelledButton,
    e instanceof m.Disableable,
  );
  class NotATrait {}
  class Forgot extends ControlledElement {
    static {
      m.impl(this, NotATrait);
    }
  }
  console.log(
    'impl() with a class that is not a trait: no error,',
    new Forgot() instanceof NotATrait,
  );
  await attempt('compose(ControlledElement), a component base', () =>
    m.compose(ControlledElement),
  );
} finally {
  rmSync(mechanism, { force: true });
  rmSync(scratch, { recursive: true, force: true });
}
