// Text edits between the two trait source forms, for the probe only. They
// recognize the forms by name (`trait`, `attributes`), not by import, which is
// enough for this repository's sources and is not what the plugin will do.
import type { Class, Decorator, Program } from '@oxc-project/types';
import type { Comment } from 'oxc-parser';
import { parseSync } from 'oxc-parser';
import { RolldownMagicString } from 'rolldown';

type Site = Readonly<{
  cls: Class;
  /** Start of the statement: `export`, or `class` when not exported. */
  statementStart: number;
}>;

function sites(program: Program): Site[] {
  const result: Site[] = [];
  for (const statement of program.body) {
    if (statement.type === 'ClassDeclaration') {
      result.push({ cls: statement, statementStart: statement.start });
    } else if (
      (statement.type === 'ExportNamedDeclaration' ||
        statement.type === 'ExportDefaultDeclaration') &&
      statement.declaration?.type === 'ClassDeclaration'
    ) {
      result.push({
        cls: statement.declaration,
        statementStart: statement.start,
      });
    }
  }
  return result;
}

function skipSpace(code: string, index: number): number {
  let i = index;
  while (i < code.length && /\s/u.test(code[i]!)) {
    i += 1;
  }
  return i;
}

type TraitDecorators = Readonly<{
  first: Decorator;
  last: Decorator;
  /** The `@attributes(…)` argument's text, if any. */
  table: string | null;
}>;

function traitDecorators(code: string, cls: Class): TraitDecorators | null {
  const decorators = cls.decorators;
  if (decorators.length === 0) {
    return null;
  }
  let isTrait = false;
  let table: string | null = null;
  for (const { expression } of decorators) {
    if (expression.type === 'Identifier' && expression.name === 'trait') {
      isTrait = true;
    } else if (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier' &&
      expression.callee.name === 'attributes'
    ) {
      const [arg] = expression.arguments;
      table = code.slice(arg!.start, arg!.end);
    }
  }
  return isTrait
    ? { first: decorators[0]!, last: decorators.at(-1)!, table }
    : null;
}

/** The JSDoc directly in front of the first decorator, with only space between. */
function docBefore(
  code: string,
  comments: readonly Comment[],
  at: number,
): Comment | null {
  for (const comment of comments) {
    if (
      comment.type === 'Block' &&
      comment.value.startsWith('*') &&
      comment.end <= at &&
      code.slice(comment.end, at).trim() === ''
    ) {
      return comment;
    }
  }
  return null;
}

/**
 * Today's form to the decorator form: `static { trait(this); attributes(this,
 * T); }` first in the body becomes `@trait` and `@attributes(T)` above the
 * statement, below any JSDoc, or with `afterExport` between `export` and
 * `class`.
 */
export function migrateSource(
  id: string,
  code: string,
  afterExport = false,
): string | null {
  const { program } = parseSync(id, code);
  const magic = new RolldownMagicString(code);
  let changed = false;
  for (const { cls, statementStart } of sites(program)) {
    const block = cls.body.body[0];
    if (block?.type !== 'StaticBlock') {
      continue;
    }
    let isTrait = false;
    let table: string | null = null;
    let other = false;
    for (const statement of block.body) {
      const call =
        statement.type === 'ExpressionStatement' &&
        statement.expression.type === 'CallExpression'
          ? statement.expression
          : null;
      const callee =
        call?.callee.type === 'Identifier' ? call.callee.name : null;
      if (callee === 'trait' && call!.arguments.length === 1) {
        isTrait = true;
      } else if (callee === 'attributes' && call!.arguments.length === 2) {
        const arg = call!.arguments[1]!;
        table = code.slice(arg.start, arg.end);
      } else {
        other = true;
      }
    }
    if (!isTrait || other) {
      continue;
    }
    magic.remove(block.start, skipSpace(code, block.end));
    // With `afterExport`, `export @trait class`: the decorators go in front
    // of `class`, inside the export statement.
    magic.appendLeft(
      afterExport ? cls.start : statementStart,
      `@trait\n${table === null ? '' : `@attributes(${table})\n`}`,
    );
    changed = true;
  }
  return changed ? magic.toString() : null;
}

/**
 * The stand-in for the `@trait` compilation the implementer is writing: the
 * decorator form back to today's static block, which the current plugin then
 * compiles. Decorators go with the space after them, so a comment between them
 * and `export` stays where it is.
 */
export function desugar(id: string, code: string): RolldownMagicString | null {
  if (!code.includes('@trait')) {
    return null;
  }
  const { program } = parseSync(id, code);
  const magic = new RolldownMagicString(code);
  let changed = false;
  for (const { cls } of sites(program)) {
    const found = traitDecorators(code, cls);
    if (!found) {
      continue;
    }
    magic.remove(found.first.start, skipSpace(code, found.last.end));
    magic.appendLeft(
      cls.body.start + 1,
      `\n  static {\n    trait(this);\n${
        found.table === null ? '' : `    attributes(this, ${found.table});\n`
      }  }\n`,
    );
    changed = true;
  }
  return changed ? magic : null;
}

/**
 * Way 3a's early step: a JSDoc in front of a trait's decorators moves below
 * them, in front of `export`. Nothing else changes.
 */
export function moveDocBelowDecorators(
  id: string,
  code: string,
): RolldownMagicString | null {
  if (!code.includes('@trait')) {
    return null;
  }
  const { program, comments } = parseSync(id, code);
  const magic = new RolldownMagicString(code);
  let changed = false;
  for (const { cls } of sites(program)) {
    const found = traitDecorators(code, cls);
    const doc = found && docBefore(code, comments, found.first.start);
    if (!found || !doc) {
      continue;
    }
    // The comment and the space after it, to just in front of `export`.
    magic.move(doc.start, found.first.start, skipSpace(code, found.last.end));
    changed = true;
  }
  return changed ? magic : null;
}

/** Way 3b: each trait class's name and the JSDoc in front of its decorators. */
export function decoratedDocs(id: string, code: string): Map<string, string> {
  const docs = new Map<string, string>();
  if (!code.includes('@trait')) {
    return docs;
  }
  const { program, comments } = parseSync(id, code);
  for (const { cls } of sites(program)) {
    const found = traitDecorators(code, cls);
    const doc = found && docBefore(code, comments, found.first.start);
    if (found && doc && cls.id) {
      docs.set(cls.id.name, code.slice(doc.start, doc.end));
    }
  }
  return docs;
}
