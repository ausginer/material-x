// Mutation witnesses for the converter, run on in-memory copies of the 14
// tables in DB.load()'s order. Prints each mutation's outcome: the refusal's
// "table: token: field" prefix, or whether the mutated text reached the store.
// No table value is printed. Usage: node mutate.ts <tproc dir> <tables dir>
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const [tproc, dir] = process.argv.slice(2) as [string, string];
const { convert } = await import(join(tproc, 'scripts/convert.ts'));
const ORDER: Array<[string, string]> = [
  ['COLOR', '20543ce18892f7d9'],
  ['ELEVATION', '20543ce18892f7d9'],
  ['TOKEN_TYPE_UNSPECIFIED', '20543ce18892f7d9'],
  ['TYPOGRAPHY', '20543ce18892f7d9'],
  ['TOKEN_TABLE', '1c4257f8804f9478'],
  ['TOKEN_TABLE', '41587918e51cca98'],
  ['TOKEN_TABLE', '60990dd98dea0998'],
  ['TOKEN_TABLE', '36500f77b86d20a5'],
  ['TOKEN_TABLE', '0fe2282006ae098b'],
  ['TOKEN_TABLE', '082d7fd6e058b011'],
  ['TOKEN_TABLE', '624e8f2da4007fc8'],
  ['TOKEN_TABLE', '31f16b44fe03b0c0'],
  ['TOKEN_TABLE', '6acb269a58d5f93f'],
  ['TOKEN_TABLE', '6c818a16475113bd'],
];
const raw = await Promise.all(
  ORDER.map(async ([kind, componentId]) => ({
    kind,
    componentId,
    text: await readFile(join(dir, `${kind}.${componentId}.json`), 'utf8'),
  })),
);
const MARK = 'zzreviewmarker';
const run = (name: string, mutate: (tables: any[]) => void) => {
  const sources = raw.map(({ kind, componentId, text }) => ({
    kind,
    componentId,
    table: JSON.parse(text),
  }));
  mutate(sources.map((s) => s.table));
  try {
    const { files } = convert(sources, {
      release: null,
      fetchDate: null,
      legacy: true,
    });
    const leaked = [...files.values()].some((t: string) => t.includes(MARK));
    console.log(
      `${name}: converted; the mutation ${leaked ? 'REACHED the store' : 'is absent from the store'}`,
    );
  } catch (e) {
    console.log(
      `${name}: refused: ${String((e as Error).message)
        .split(': ')
        .slice(0, 3)
        .join(': ')}`,
    );
  }
};
const firstComposite = (tables: any[]) => {
  for (const t of tables)
    for (const tree of Object.values<any>(
      t.system.contextualReferenceTrees ?? {},
    ))
      for (const e of tree.contextualReferenceTree ?? [])
        if (e.resolvedCustomCompositeValue) return e;
  throw new Error('no composite');
};
const firstColor = (tables: any[]) => {
  for (const t of tables)
    for (const v of t.system.values ?? []) if (v.color) return v;
  throw new Error('no color');
};

run(
  "a composite property's resolvedValue with two literal fields, no other key",
  (t) => {
    const p = Object.values<any>(
      firstComposite(t).resolvedCustomCompositeValue.properties,
    )[0];
    p.resolvedValue = { numeric: 1, opacity: 0.5 };
  },
);

run("a composite property's resolvedValue with no literal field", (t) => {
  const p = Object.values<any>(
    firstComposite(t).resolvedCustomCompositeValue.properties,
  )[0];
  p.resolvedValue = {};
});
