/**
 * One V8 heap snapshot, read over CDP. Node side: the browser commands and
 * `bench/heap-snapshot.ts` take it, each after its own garbage collection, and
 * count its nodes their own way.
 */

type ChunkListener = (params: { chunk: string }) => void;

/** The part of a CDP session that a snapshot needs. */
export interface SnapshotSession {
  send(method: string, params?: unknown): Promise<unknown>;
  on(
    event: 'HeapProfiler.addHeapSnapshotChunk',
    listener: ChunkListener,
  ): unknown;
  off(
    event: 'HeapProfiler.addHeapSnapshotChunk',
    listener: ChunkListener,
  ): unknown;
}

export type HeapSnapshot = Readonly<{
  snapshot: Readonly<{
    meta: Readonly<{
      node_fields: readonly string[];
      node_types: readonly unknown[];
    }>;
  }>;
  nodes: readonly number[];
  strings: readonly string[];
}>;

/** Takes a snapshot and parses its chunks. It collects no garbage. */
export async function takeHeapSnapshot(
  cdp: SnapshotSession,
): Promise<HeapSnapshot> {
  const chunks: string[] = [];
  const collect: ChunkListener = (params) => {
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
