/**
 * The `load` stage that keeps a decorated class's JSDoc in the published
 * declarations. oxc's declaration emitter, which tsdown runs, drops a JSDoc in
 * front of a class's decorators, and tsdown's declaration plugin records each
 * module before any transform of the flattener runs. So for each `export
 * class` and `export default class` declaration whose decorators come before
 * `export`, and which is documented, the stage moves `export`, or `export
 * default`, to the first decorator's start:
 *
 * ```ts
 * /** doc *\/            /** doc *\/
 * @trait          →     export @trait
 * export class X        class X
 * ```
 *
 * A declaration is documented when a JSDoc lies between the previous
 * statement and the first decorator. Other comments may follow the JSDoc.
 *
 * JavaScript and TypeScript read both the same way, and the emitter keeps the
 * doc of the second. The rest of the build reads the second, which the
 * flattener accepts as written.
 */
import type { Class, Program, Statement } from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { RolldownMagicString } from 'rolldown';

/**
 * The stage's output, and the names that the classes whose `export` it moved
 * are exported as: `default` for an `export default` class, named or not.
 */
export type ExportMoves = Readonly<{
  magic: RolldownMagicString;
  exports: ReadonlySet<string>;
}>;

/** An exported class declaration, and the name it is exported as. */
type ExportedClass = Readonly<{ exportName: string; node: Class }>;

function exportedClass(statement: Statement): ExportedClass | null {
  if (
    statement.type === 'ExportNamedDeclaration' &&
    statement.declaration?.type === 'ClassDeclaration'
  ) {
    return {
      exportName: statement.declaration.id?.name ?? '',
      node: statement.declaration,
    };
  }
  if (
    statement.type === 'ExportDefaultDeclaration' &&
    statement.declaration.type === 'ClassDeclaration'
  ) {
    return { exportName: 'default', node: statement.declaration };
  }

  return null;
}

/** Moves `export` before a documented exported class's decorators. */
export function moveExportBeforeDecorators(
  id: string,
  code: string,
): ExportMoves | null {
  if (!/^\s*@/mu.test(code)) {
    return null;
  }
  // The stage's own parse: the parse cache holds the text the transforms
  // read under this id.
  const { program, comments } = parseSync(id, code);
  let magic: RolldownMagicString | null = null;
  const exports = new Set<string>();
  // The end of the previous statement, and the first comment not yet read:
  // both move forward only, so each comment is read once.
  let previousEnd = 0;
  let next = 0;
  for (const statement of program.body) {
    const start = previousEnd;
    previousEnd = statement.end;
    const exported = exportedClass(statement);
    const first = exported?.node.decorators[0];
    if (!exported || !first || first.start > statement.start) {
      continue;
    }
    let documented = false;
    while (next < comments.length && comments[next]!.end <= first.start) {
      const comment = comments[next]!;
      documented ||=
        comment.start >= start &&
        comment.type === 'Block' &&
        comment.value.startsWith('*');
      next += 1;
    }
    if (!documented) {
      continue;
    }
    const [keywords] = (
      statement.type === 'ExportDefaultDeclaration'
        ? /^export\s*default\s*/u
        : /^export\s*/u
    ).exec(code.slice(statement.start))!;
    magic ??= new RolldownMagicString(code);
    magic.move(statement.start, statement.start + keywords.length, first.start);
    exports.add(exported.exportName);
  }

  return magic ? { magic, exports } : null;
}

/**
 * The position `pos` in a later hook's input `code` would have had without
 * the stage. In that text, a moved class reads `export @… class X` or `export
 * default @… class X`: the keywords and their spaces, then the decorators,
 * then `class`. Without the stage, the decorators came first, and the
 * keywords and their spaces stood just before `class`. Text outside those
 * spans is where it was.
 *
 * @param exports - The names that the classes the stage moved in this module
 *   are exported as.
 */
export function positionWithoutStage(
  program: Program,
  code: string,
  exports: ReadonlySet<string>,
  pos: number,
): number {
  for (const statement of program.body) {
    const exported = exportedClass(statement);
    if (!exported || !exports.has(exported.exportName)) {
      continue;
    }
    const { decorators } = exported.node;
    const [first] = decorators;
    const last = decorators.at(-1);
    if (!first || !last || first.start < statement.start) {
      continue;
    }
    const moved = first.start - statement.start;
    const [space] = /^\s*/u.exec(code.slice(last.end))!;
    const keyword = last.end + space.length;
    if (pos >= statement.start && pos < first.start) {
      return keyword - moved + (pos - statement.start);
    }
    if (pos >= first.start && pos < keyword) {
      return pos - moved;
    }
  }

  return pos;
}
