// P22. The owner's sketch through the toolchain. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/sketch.ts
// §1: what oxc-parser 0.158 gives the flattener to find a trait class with no
// `@trait`. §2: the brand at runtime, in Node, with plain classes in place of
// HTMLElement, which Node doesn't have.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(
  new URL(
    '../../../../packages/vite-traits-plugin/package.json',
    import.meta.url,
  ),
);
const { parseSync } = require('oxc-parser') as typeof import('oxc-parser');

const id = `${here}../types/sketch/_example.ts`;
const { program, errors } = parseSync(id, readFileSync(id, 'utf8'));
console.log('== 1. sketch/_example.ts through oxc-parser');
console.log('parse errors:', errors.length);
for (const statement of program.body) {
  const node = (statement as any).declaration ?? statement;
  if (node.type === 'ClassDeclaration') {
    console.log(
      `class ${node.id.name}: decorators`,
      node.decorators.map((d: any) => d.expression.name),
    );
    for (const member of node.body.body) {
      if (member.type !== 'StaticBlock') continue;
      for (const s of member.body) {
        const call = s.expression;
        const callee = call?.callee;
        if (
          call?.type === 'CallExpression' &&
          callee.object?.name === 'Object' &&
          callee.property?.name === 'defineProperty' &&
          call.arguments[0].type === 'MemberExpression' &&
          call.arguments[0].object.type === 'ThisExpression'
        ) {
          console.log(
            `  static block: Object.defineProperty(this.${call.arguments[0].property.name}, ${call.arguments[1].name}, …)`,
          );
        }
      }
    }
  }
  if (node.type === 'VariableDeclaration') {
    for (const d of node.declarations) {
      const t = d.id.typeAnnotation?.typeAnnotation;
      if (t?.type === 'TSTypeReference' && t.typeName.name === 'Trait') {
        console.log(
          `const ${d.id.name}: Trait<${t.typeArguments.params[0].typeName.name}>`,
        );
      }
    }
  }
}

console.log('\n== 2. the brand at runtime');
class Base {}
const $valuable = Symbol('Valuable');
const hasBrand = (brand: symbol) => (o: unknown) =>
  o != null && typeof o === 'object' && !!(o as Record<symbol, boolean>)[brand];

// The sketch: the static block brands the trait class's own prototype, and a
// separate object reads the brand.
class ValuableTrait extends Base {
  static {
    Object.defineProperty(this.prototype, $valuable, { value: true });
  }
}
const Valuable = { [Symbol.hasInstance]: hasBrand($valuable) };

// A flattened component: the trait's members copied, and the static block not.
class Flattened extends Base {}
// The same with the trait's static block copied into it.
class FlattenedWithBlock extends Base {
  static {
    Object.defineProperty(this.prototype, $valuable, { value: true });
  }
}
console.log(
  'new ValuableTrait() instanceof Valuable:',
  new ValuableTrait() instanceof Valuable,
);
console.log(
  'new Flattened() instanceof Valuable:',
  new Flattened() instanceof Valuable,
);
console.log(
  'new FlattenedWithBlock() instanceof Valuable:',
  new FlattenedWithBlock() instanceof Valuable,
);

// A class that carries its own Symbol.hasInstance, installed by a helper in
// its static block, as the study's `trait(this, $brand)` does.
function trait(target: Function, brand: symbol): void {
  Object.defineProperty(target.prototype, brand, { value: true });
  Object.defineProperty(target, Symbol.hasInstance, { value: hasBrand(brand) });
}
const $disableable = Symbol('Disableable');
class Disableable extends Base {
  static {
    trait(this, $disableable);
  }
}
// The flattener installs the brand only.
class Button extends Base {
  static {
    Object.defineProperty(this.prototype, $disableable, { value: true });
  }
}
// The trait's static block copied verbatim, which also installs a
// Symbol.hasInstance on the component.
class ButtonWithBlock extends Base {
  static {
    trait(this, $disableable);
  }
}
class Unrelated extends Base {
  static {
    Object.defineProperty(this.prototype, $disableable, { value: true });
  }
}
console.log(
  'new Button() instanceof Disableable:',
  new Button() instanceof Disableable,
);
console.log('new Button() instanceof Button:', new Button() instanceof Button);
console.log(
  'new Unrelated() instanceof Button:',
  new Unrelated() instanceof Button,
);
console.log(
  'new Unrelated() instanceof ButtonWithBlock:',
  new Unrelated() instanceof ButtonWithBlock,
  '(a wrong answer: Unrelated is not a ButtonWithBlock)',
);
