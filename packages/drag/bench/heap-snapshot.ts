/**
 * Retained JavaScript objects on a page, from one heap snapshot: the self size of
 * object, closure, array and string nodes. Code, native, hidden and synthetic nodes
 * are excluded, so a difference in compiled code between arms does not read as
 * retained memory.
 *
 * `compare.ts` calls `retainedObjects` after destruction and forced GC.
 */
import type { CDPSession } from 'playwright';

type HeapSnapshot = Readonly<{
  snapshot: Readonly<{
    meta: Readonly<{
      node_fields: readonly string[];
      node_types: readonly unknown[];
    }>;
  }>;
  nodes: readonly number[];
  strings: readonly string[];
}>;

/** The node types counted. Each is a JavaScript value a page can retain. */
export const COUNTED_TYPES: readonly string[] = [
  'object',
  'closure',
  'array',
  'string',
  'concatenated string',
  'sliced string',
];

export type RetainedObjects = Readonly<{
  /** Self bytes of the counted node types. */
  bytes: number;
  /** Self bytes per constructor name, for attributing a flag. */
  byName: Readonly<Record<string, number>>;
}>;

async function takeSnapshot(cdp: CDPSession): Promise<HeapSnapshot> {
  const chunks: string[] = [];
  const collect = (params: { chunk: string }): void => {
    chunks.push(params.chunk);
  };

  cdp.on('HeapProfiler.addHeapSnapshotChunk', collect);

  try {
    await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  } finally {
    cdp.off('HeapProfiler.addHeapSnapshotChunk', collect);
  }

  return JSON.parse(chunks.join('')) as HeapSnapshot;
}

/** Forces GC twice, then sums the counted nodes of one snapshot. */
export async function retainedObjects(
  cdp: CDPSession,
): Promise<RetainedObjects> {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');

  const { snapshot, nodes, strings } = await takeSnapshot(cdp);
  const fields = snapshot.meta.node_fields;
  const types = snapshot.meta.node_types[0] as readonly string[];
  const typeField = fields.indexOf('type');
  const nameField = fields.indexOf('name');
  const sizeField = fields.indexOf('self_size');
  const counted = new Set(
    COUNTED_TYPES.map((type) => types.indexOf(type)).filter((i) => i >= 0),
  );
  const byName: Record<string, number> = {};
  let bytes = 0;

  for (let i = 0; i < nodes.length; i += fields.length) {
    const type = nodes[i + typeField]!;

    if (counted.has(type)) {
      const size = nodes[i + sizeField]!;
      // Objects and closures by constructor; arrays and strings by type, with an
      // array's internal name, which says what holds it.
      const name =
        types[type] === 'object' || types[type] === 'closure'
          ? strings[nodes[i + nameField]!]!
          : types[type] === 'array'
            ? `array ${strings[nodes[i + nameField]!]!}`
            : types[type]!;

      bytes += size;
      byName[name] = (byName[name] ?? 0) + size;
    }
  }

  return { bytes, byName };
}
