// Probe: a trait's constructor body inserted into the component's
// constructor, right after its `super()` (RD-33, decision 7).
// Run: node constructor-insertion.ts
const order: string[] = [];

class Base {
  base = order.push('base field');
  constructor() {
    order.push('base constructor');
  }
}

// Lowered: Super is a supertrait of Sub, the component lists [Sub], which
// expands to [Super, Sub]. Fields take no `this`; each body is a block.
class Component extends Base {
  #superState_h = (order.push('Super field'), new Map<string, number>());
  #subState_h = (order.push('Sub field'), 0);
  own = order.push('component field');
  constructor(value: number) {
    super();
    {
      order.push('Super constructor');
      this.#superState_h.set('ready', 1);
    }
    {
      order.push(
        `Sub constructor sees Super: ${this.#superState_h.get('ready')}`,
      );
      this.#subState_h = 2;
    }
    order.push(`component constructor, value ${value}`);
  }
}

class Subclass extends Component {
  sub = order.push('subclass field');
  constructor() {
    super(7);
    order.push('subclass constructor');
  }
}

new Subclass();
console.log(order.join('\n'));

// Why each body is a block: a `const` beside a parameter of the same name is a
// syntax error in one scope, and is accepted in a block.
for (const source of [
  'class A extends Object { constructor(value) { super(); const value = 1; } }',
  'class A extends Object { constructor(value) { super(); { const value = 1; } } }',
]) {
  try {
    new Function(source);
    console.log(`parses: ${source}`);
  } catch (error) {
    console.log(`refused: ${source}: ${(error as Error).message}`);
  }
}
