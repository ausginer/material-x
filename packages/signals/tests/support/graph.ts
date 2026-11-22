import type { Readable } from '../../src/index.ts';
import type { Edge, Node } from '../../src/internal/node.ts';

/**
 * Reads the runtime's own fields, which an inspector would read: the tests
 * observe subscriptions without a public inspection interface.
 */
function internal(node: Readable<unknown>): Node {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return node as unknown as Node;
}

/** The edges in a node's subscriber list: the consumers that receive its marks. */
export function subscriberEdges(node: Readable<unknown>): Edge[] {
  const edges: Edge[] = [];

  for (
    let edge = internal(node).firstSubscriber;
    edge !== null;
    edge = edge.nextSubscriber
  ) {
    edges.push(edge);
  }

  return edges;
}

/** How many consumers are subscribed to a node. */
export function subscriberCount(node: Readable<unknown>): number {
  return subscriberEdges(node).length;
}

/** The edges a consumer's last completed run read, in reading order. */
export function activeEdges(node: Readable<unknown>): Edge[] {
  const edges: Edge[] = [];

  for (
    let edge = internal(node).activeHead;
    edge !== null;
    edge = edge.nextActive
  ) {
    edges.push(edge);
  }

  return edges;
}

/** The names of the sources a consumer's last completed run read. */
export function activeSourceNames(
  node: Readable<unknown>,
): Array<string | undefined> {
  return activeEdges(node).map((edge) => edge.source.name);
}
