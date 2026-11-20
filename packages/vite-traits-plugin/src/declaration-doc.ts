/**
 * The `load` stage that keeps a decorated class's JSDoc in the published
 * declarations. oxc's declaration emitter, which tsdown runs, drops a JSDoc in
 * front of a class's decorators, and tsdown's declaration plugin records each
 * module before any transform of the flattener runs. So for each exported
 * class declaration whose decorators come before `export`, with a JSDoc
 * directly in front of the first decorator, the stage moves `export` to the
 * first decorator's start:
 *
 * ```ts
 * /** doc *\/            /** doc *\/
 * @trait          →     export @trait
 * export class X        class X
 * ```
 *
 * JavaScript and TypeScript read both the same way, and the emitter keeps the
 * doc of the second. The rest of the build reads the second, which the
 * flattener accepts as written.
 */
import type { Program } from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { RolldownMagicString } from 'rolldown';

/** The stage's output, and the names of the classes whose `export` it moved. */
export type ExportMoves = Readonly<{
  magic: RolldownMagicString;
  classes: ReadonlySet<string>;
}>;

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
  const classes = new Set<string>();
  for (const statement of program.body) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'ClassDeclaration' ||
      !statement.declaration.id
    ) {
      continue;
    }
    const [first] = statement.declaration.decorators;
    if (!first || first.start > statement.start) {
      continue;
    }
    const documented = comments.some(
      (comment) =>
        comment.type === 'Block' &&
        comment.value.startsWith('*') &&
        comment.end <= first.start &&
        code.slice(comment.end, first.start).trim() === '',
    );
    if (!documented) {
      continue;
    }
    const [space] = /^export\s*/u.exec(code.slice(statement.start))!;
    magic ??= new RolldownMagicString(code);
    magic.move(statement.start, statement.start + space.length, first.start);
    classes.add(statement.declaration.id.name);
  }

  return magic ? { magic, classes } : null;
}

/**
 * The position `pos` in a later hook's input `code` would have had without
 * the stage. In that text, a moved class reads `export @… class X`: `export`
 * and its space, then the decorators, then `class`. Without the stage, the
 * decorators came first, and `export` and its space stood just before
 * `class`. Text outside those spans is where it was.
 *
 * @param classes - The classes the stage moved in this module.
 */
export function positionWithoutStage(
  program: Program,
  code: string,
  classes: ReadonlySet<string>,
  pos: number,
): number {
  for (const statement of program.body) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'ClassDeclaration' ||
      !classes.has(statement.declaration.id?.name ?? '')
    ) {
      continue;
    }
    const { decorators } = statement.declaration;
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
