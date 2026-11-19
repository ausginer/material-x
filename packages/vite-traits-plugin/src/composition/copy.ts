/**
 * The copy rule: whether a member's source text, written in its origin's
 * language, can be inserted into a module of the consumer's language with the
 * same meaning.
 *
 * Two modules of one file extension are parsed with one language and one set
 * of options, so the text copies. Any other pair copies when the text, as a
 * class member, parses without error in both languages and the two trees are
 * equal apart from positions. That refuses a member whose syntax one parser
 * rejects, and one that the other parser reads with another meaning, such as
 * JavaScript's `a < b > (c)`, which TypeScript reads as a call with a type
 * argument.
 */
import { parseSync } from 'oxc-parser';
import { extensionOf } from '../syntax.ts';

const POSITIONS = new Set(['start', 'end', 'range', 'loc']);

/** A node tree without positions, as JSON. */
function shape(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(shape);
  }
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !POSITIONS.has(key))
        .map(([key, value]) => [key, shape(value)]),
    );
  }

  return node;
}

/** The tree of `member` as a class member in `extension`'s language. */
function memberTree(member: string, extension: string): string | null {
  const { program, errors } = parseSync(
    `member.${extension}`,
    `(class {\n${member}\n});`,
    { astType: 'ts' },
  );

  return errors.length > 0 ? null : JSON.stringify(shape(program.body[0]));
}

/**
 * Whether `member`'s text from module `originId` keeps its meaning in module
 * `consumerId`.
 */
export function canCopy(
  member: string,
  originId: string,
  consumerId: string,
): boolean {
  const origin = extensionOf(originId);
  const consumer = extensionOf(consumerId);
  if (origin === consumer) {
    return true;
  }
  const tree = memberTree(member, origin);

  return tree !== null && tree === memberTree(member, consumer);
}
