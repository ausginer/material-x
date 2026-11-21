// Probe for the trait constructor's lowering (RD-33, amended 2026-11-21).
// Run: node constructor-lowering.ts

// 1. `#constructor` is reserved, so `#constructor_<hash>` is never the
//    renamed form of a source private name.
for (const source of [
  'class A { #constructor = 1 }',
  'class A { #constructor() {} }',
]) {
  try {
    new Function(source);
    console.log(`parses: ${source}`);
  } catch (error) {
    console.log(`refused: ${source}: ${(error as Error).message}`);
  }
}

// 2. The lowered form: the trait's fields, then its constructor body in an
//    arrow initializer, then the component's own fields. `this` is the
//    instance, a bare `return` ends the body, and the hidden field adds no own
//    key.
const order: unknown[] = [];
class Base {
  base = order.push('base');
}
class Component extends Base {
  #x_h = (order.push('trait field'), 1);
  #constructor_h = (() => {
    order.push(`trait constructor reads ${this.#x_h}`);
    if (this.#x_h) {
      return;
    }
    order.push('unreached');
  })();
  own = order.push('component field');
}
const instance = new Component();
console.log(order.join(' < '));
console.log('own keys:', Reflect.ownKeys(instance));
