import type { Readable, ValueOf } from './index.ts';
import { read } from './internal/graph.ts';
import { createEdge, type Edge, type Node } from './internal/node.ts';

/**
 * A declared input whose value is a list of member nodes: a collection whose
 * members change at runtime. A consumer declares the family once, and its runs
 * read members through the family's accessor. Each member read marks an edge to
 * that member, so a run subscribes to the list and to exactly the members it
 * read.
 */
export type Family<T> = Readonly<{
  /** The label an inspector shows for the family. */
  name: string | undefined;
  /** The node whose value is the current list of members. */
  list: Readable<ReadonlyArray<Readable<T>>>;
}>;

/** The accessor a consumer's callback receives for a family. */
export type FamilyAccessor<T> = {
  /** Reads the current members, and marks the edge to the list. */
  (): ReadonlyArray<Readable<T>>;
  /**
   * Reads the value of the member at `index` of the current list, and marks
   * the edges to the list and to that member. Outside the consumer's run it
   * reads the current value and marks nothing.
   */
  readonly at: (index: number) => T;
};

export type FamilyOptions = Readonly<{
  /** The label an inspector shows for the family. */
  name?: string;
}>;

/**
 * Declares a list node as a family, for use as an input of a computed or
 * effect.
 *
 * @param list - The node whose value is the current list of members.
 * @param options - The family's name.
 */
export function family<M extends Readable<unknown>>(
  list: Readable<readonly M[]>,
  options?: FamilyOptions,
): Family<ValueOf<M>> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return {
    name: options?.name,
    list,
    bind(edge: Edge) {
      // One edge per member that the consumer's last run read, created by the
      // first run that reads the member. The core deletes an entry when a run
      // doesn't read it, so a removed member keeps no edge here.
      const members = new Map<Node, Edge>();
      const accessor = () => read(edge);

      accessor.at = (index: number) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const member = (read(edge) as readonly Node[])[index]!;

        if (!edge.target.running) {
          return member.get!();
        }

        let memberEdge = members.get(member);

        if (memberEdge === undefined) {
          memberEdge = createEdge(member, edge.target);
          memberEdge.family = members;
          members.set(member, memberEdge);
        }

        return read(memberEdge);
      };

      return accessor;
    },
  } as unknown as Family<ValueOf<M>>;
}
