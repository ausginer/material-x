import { writeFile } from 'node:fs/promises';
import { it } from 'vitest';
import { fixtureId, transform } from './helpers.ts';
const H = `import { compose, trait, bound, type Composed, type Bound } from '@ydinjs/core/traits/composition.js';
import { Base } from './base.ts';
`;
const INNER = `${H}const AnyBase: Bound<Base> = bound();
@trait
export class T extends AnyBase {
  #s = 0;
  constructor() { super(); this.#s = 1; }
  get s(): number { return this.#s; }
}
@trait
export class U extends AnyBase {
  get u(): number { return 1; }
}
const InnerBase: Composed<typeof Base, [typeof T]> = compose(Base);
export class Inner extends InnerBase {}
export class Middle extends Inner {}
`;
const rows: unknown[] = [];
async function probe(label: string, body: string) {
  const files = {
    [fixtureId('rv-inner.ts')]: INNER,
    [fixtureId('rv-outer.ts')]: `${H}${body}`,
  };
  try {
    await transform(fixtureId('rv-outer.ts'), { files });
    rows.push({ label, result: 'accepted' });
  } catch (error: any) {
    rows.push({ label, code: error.code, message: error.message });
  }
}
it('chain', async () => {
  await probe(
    'cross-module source base composes T, list [T]',
    `import { Inner, type T } from './rv-inner.ts';\nconst OBase: Composed<typeof Inner, [typeof T]> = compose(Inner);\nexport class O extends OBase {}\n`,
  );
  await probe(
    'through a hand-written subclass, list [T]',
    `import { Middle, type T } from './rv-inner.ts';\nconst OBase: Composed<typeof Middle, [typeof T]> = compose(Middle);\nexport class O extends OBase {}\n`,
  );
  await probe(
    'cross-module base composes T, list [U] (accepted)',
    `import { Inner, type U } from './rv-inner.ts';\nconst OBase: Composed<typeof Inner, [typeof U]> = compose(Inner);\nexport class O extends OBase {}\n`,
  );
  await writeFile(
    process.env.RV_OUT!,
    rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
  );
});
