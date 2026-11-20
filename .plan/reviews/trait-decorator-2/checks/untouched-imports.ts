// Probe: imports the plugin didn't empty stay as written, through lowerAttributes
// then flattenModule (the tests' `transform` helper), for a module with a
// trait, an attribute trait and an empty composition.
// argv[2] is the checkout.
const T = `${process.argv[2]}/packages/vite-traits-plugin/tests/`;
const { transform, fixtureId } = await import(T + 'helpers.ts');

const KEPT = [
  "import 'side-effect-a';",
  'import "side-effect-b";',
  "import {} from 'empty-braces';",
  "import { type X } from 'inline-type';",
  "import type { Y } from 'type-only';",
  "import { type Z, value } from 'mixed';",
  "import * as ns from 'namespace';",
  "import def from 'default';",
];
const source = `${KEPT.join('\n')}
import { compose, trait, type Composed } from '@ydinjs/core/traits/composition.js';
import { attributes, type AttributeTable } from '@ydinjs/core/traits/attribute-traits.js';
import { Bool } from '@ydinjs/core/attribute.js';
import { Base } from './base.ts';

/** Doc. */
@trait
@attributes({ open: Bool })
export class Named {
  accessor open!: boolean;
}

const FooBase: Composed<typeof Base, []> = compose(Base);
export class Foo extends FooBase {}
`;
const id = fixtureId('virtual-untouched.ts');
const { code } = await transform(id, { files: { [id]: source } });
for (const line of KEPT) {
  console.log(`${code.includes(line) ? 'kept   ' : 'REMOVED'} ${line}`);
}
for (const spec of ['composition.js', 'attribute-traits.js']) {
  const lines = code
    .split('\n')
    .filter((l) => l.startsWith('import') && l.includes(spec));
  console.log(
    `imports of ${spec}: ${lines.length ? lines.join(' | ') : 'none'}`,
  );
}
console.log('--- output head');
console.log(code.split('\n').slice(0, 16).join('\n'));
