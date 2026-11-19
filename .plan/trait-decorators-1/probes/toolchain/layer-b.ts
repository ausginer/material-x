// P34. Layer (b) at runtime, in Node with an HTMLElement stand-in, on core's
// real ControlledElement and attribute operator. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/layer-b.ts
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const layerB = fileURLToPath(new URL('../types/layer-b/', import.meta.url));
const { parseSync } = createRequire(
  join(root, 'packages/vite-traits-plugin/package.json'),
)('oxc-parser') as typeof import('oxc-parser');

// What an element needs in Node: attributes, internals and focus.
class HTMLElementStandIn {
  readonly #attributes = new Map<string, string>();
  attachInternals(): object {
    return {};
  }
  getAttribute(name: string): string | null {
    return this.#attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.#attributes.set(name, String(value));
  }
  removeAttribute(name: string): void {
    this.#attributes.delete(name);
  }
  hasAttribute(name: string): boolean {
    return this.#attributes.has(name);
  }
  focus(): void {}
}
Object.assign(globalThis, {
  HTMLElement: HTMLElementStandIn,
  document: { createElement: () => new HTMLElementStandIn() },
});

const attempt = async (label: string, run: () => unknown): Promise<void> => {
  try {
    console.log(`${label} →`, await run());
  } catch (error) {
    console.log(
      `${label} → throws`,
      `${(error as Error).name}: ${(error as Error).message}`,
    );
  }
};

const traitsPath = join(layerB, 'traits.ts');
const source = readFileSync(traitsPath, 'utf8');

console.log('== 1. node on the trait module as written');
const unbuilt = spawnSync(process.execPath, [traitsPath], { encoding: 'utf8' });
console.log(
  'exit',
  unbuilt.status,
  unbuilt.stderr.split('\n').find((line) => /Error/.test(line)),
);

console.log('== 2. what the flattener reads in each trait class');
const { program } = parseSync(traitsPath, source);
const deletions: Array<[number, number]> = [];
for (const statement of program.body) {
  const node = (statement as any).declaration ?? statement;
  if (node.type !== 'ClassDeclaration') continue;
  const accessors: string[] = [];
  let table: string[] = [];
  let brand = false;
  for (const member of node.body.body) {
    if (member.type === 'AccessorProperty') {
      accessors.push(member.key.name);
      deletions.push([member.start, member.end]);
    }
    if (member.type !== 'StaticBlock') continue;
    for (const s of member.body) {
      const call = s.expression;
      if (call?.type !== 'CallExpression') continue;
      if (call.callee.name === 'trait') brand = true;
      if (call.callee.name === 'attributes') {
        table = call.arguments[1].properties.map(
          (p: any) =>
            `${p.key.name}: ${source.slice(p.value.start, p.value.end)}`,
        );
      }
    }
  }
  const missing = accessors.filter(
    (a) => !table.some((entry) => entry.startsWith(`${a}:`)),
  );
  console.log(
    `class ${node.id.name} extends ${node.superClass?.name ?? '(nothing)'}`,
    `| trait(this): ${brand}`,
    `| accessors: [${accessors.join(', ')}]`,
    `| table: {${table.join(', ')}}`,
    `| accessor without an entry: [${missing.join(', ')}]`,
  );
}

console.log(
  '== 3. the trait module as the flattener lowers it: accessor lines deleted',
);
let lowered = source;
for (const [start, end] of deletions.sort((a, b) => b[0] - a[0])) {
  lowered = lowered.slice(0, start) + lowered.slice(end);
}
const loweredPath = join(layerB, '.lowered-traits.ts');
writeFileSync(loweredPath, lowered);
try {
  const traits = await import(pathToFileURL(loweredPath).href);
  const { trait, impl } = await import(
    pathToFileURL(join(layerB, 'piirre.ts')).href
  );
  const {
    default: attr,
    Bool,
    Str,
  } = await import(
    pathToFileURL(join(root, 'packages/core/src/attribute.ts')).href
  );
  const { ControlledElement } = await import(
    pathToFileURL(join(root, 'packages/core/src/element.ts')).href
  );
  console.log('the lowered trait module evaluates: ok');
  console.log(
    'Disableable.prototype has disabled:',
    'disabled' in traits.Disableable.prototype,
  );
  void trait;

  console.log('== 4. a component as the flattener emits it');
  // The component's own `static observedAttributes = ['aria-label']` is merged
  // into the one the flattener emits.
  class Button extends ControlledElement {
    static observedAttributes = [
      ...new Set([
        ...((ControlledElement as any).observedAttributes ?? []),
        'color',
        'size',
        'disabled',
        ...['aria-label'],
      ]),
    ];
    get color() {
      return attr.get(this, 'color', Str);
    }
    set color(value) {
      attr.set(this, 'color', value, Str);
    }
    get size() {
      return attr.get(this, 'size', Str);
    }
    set size(value) {
      attr.set(this, 'size', value, Str);
    }
    get disabled() {
      return attr.get(this, 'disabled', Bool);
    }
    set disabled(value) {
      attr.set(this, 'disabled', value, Bool);
    }
    static {
      impl(this, traits.ButtonLike, traits.Disableable, traits.FocusForwarding);
    }
    static formAssociated = true;
  }
  class SubButton extends Button {}
  const b: any = new Button();
  console.log(
    'ControlledElement.observedAttributes:',
    (ControlledElement as any).observedAttributes,
  );
  console.log('Button.observedAttributes:', Button.observedAttributes);
  console.log('SubButton.observedAttributes:', SubButton.observedAttributes);
  b.disabled = true;
  b.color = 'tonal';
  console.log(
    'after disabled = true, color = "tonal": attributes',
    JSON.stringify({
      disabled: b.getAttribute('disabled'),
      color: b.getAttribute('color'),
    }),
    '| read back',
    b.disabled,
    b.color,
  );
  b.disabled = false;
  b.color = null;
  console.log(
    'after disabled = false, color = null: attributes',
    JSON.stringify({
      disabled: b.getAttribute('disabled'),
      color: b.getAttribute('color'),
    }),
  );
  console.log(
    'instanceof ButtonLike, Disableable, FocusForwarding, ButtonGroupLike:',
    b instanceof traits.ButtonLike,
    b instanceof traits.Disableable,
    b instanceof traits.FocusForwarding,
    b instanceof traits.ButtonGroupLike,
  );
  console.log(
    'a SubButton instanceof Disableable:',
    new SubButton() instanceof traits.Disableable,
  );
  await attempt('Button.formAssociated', () => Button.formAssociated);
} finally {
  rmSync(loweredPath, { force: true });
}
