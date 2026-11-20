// P48 probe only: the `load` stage. For an exported class declaration whose
// decorators come before `export`, with a JSDoc directly in front of the first
// decorator, `export` and the space after it move to the first decorator's
// start. The written `/** doc */ @trait export class` becomes
// `/** doc */ export @trait class`, which TypeScript and JavaScript read the
// same way, and which the declaration emitter keeps the doc of (P47).
import { parseSync } from 'oxc-parser';
import { RolldownMagicString } from 'rolldown';

export function moveExportAboveDecorators(
  id: string,
  code: string,
): RolldownMagicString | null {
  if (!/^\s*@/mu.test(code)) {
    return null;
  }
  const { program, comments } = parseSync(id, code);
  let magic: RolldownMagicString | null = null;
  for (const statement of program.body) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'ClassDeclaration'
    ) {
      continue;
    }
    const [first] = statement.declaration.decorators;
    if (!first || first.start > statement.start) {
      continue;
    }
    const doc = comments.find(
      (c) =>
        c.type === 'Block' &&
        c.value.startsWith('*') &&
        c.end <= first.start &&
        code.slice(c.end, first.start).trim() === '',
    );
    if (!doc || !code.startsWith('export', statement.start)) {
      continue;
    }
    magic ??= new RolldownMagicString(code);
    const [space] = /^\s*/u.exec(code.slice(statement.start + 6))!;
    magic.move(
      statement.start,
      statement.start + 6 + space.length,
      first.start,
    );
  }
  return magic;
}
