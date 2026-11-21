// For each class that extends a composition (`compose(…)`), prints its
// instance fields, `accessor` included, and each initializer that references
// `this` or `super`, for RD-33's component rule (the plan's decision 8).
// Usage: node component-field-this.ts <file>…
// `eager` is a `this` evaluated while the initializer runs: not inside an
// arrow function's or a nested function's body. `deferred` is one inside such
// a body, which runs only when something calls it.
import { readFileSync } from 'node:fs';
import ts from 'typescript';

for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true);
  const compositions = new Set<string>();
  source.statements.forEach((statement) => {
    if (!ts.isVariableStatement(statement)) return;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (
        ts.isIdentifier(declaration.name) &&
        init &&
        ts.isCallExpression(init) &&
        ts.isIdentifier(init.expression) &&
        init.expression.text === 'compose'
      ) {
        compositions.add(declaration.name.text);
      }
    }
  });
  const visitClass = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const base = node.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
      )?.types[0]?.expression;
      if (base && ts.isIdentifier(base) && compositions.has(base.text)) {
        const fields = node.members.filter(
          (member): member is ts.PropertyDeclaration =>
            ts.isPropertyDeclaration(member) &&
            !member.modifiers?.some(
              (m) => m.kind === ts.SyntaxKind.StaticKeyword,
            ),
        );
        const initialized = fields.filter((member) => member.initializer);
        console.log(
          `${file} ${node.name?.text}: ${fields.length} instance fields, ${initialized.length} initialized`,
          fields
            .map((member) => `\n  ${member.getText(source).split('\n')[0]}`)
            .join(''),
        );
        for (const member of initialized) {
          if (!member.initializer) continue;
          let eager = 0;
          let deferred = 0;
          const walk = (n: ts.Node, inFunction: boolean): void => {
            if (
              n.kind === ts.SyntaxKind.ThisKeyword ||
              n.kind === ts.SyntaxKind.SuperKeyword
            ) {
              if (inFunction) deferred++;
              else eager++;
            }
            const enters =
              ts.isArrowFunction(n) ||
              ts.isFunctionExpression(n) ||
              ts.isMethodDeclaration(n) ||
              ts.isAccessor(n);
            ts.forEachChild(n, (child) => walk(child, inFunction || enters));
          };
          walk(member.initializer, false);
          if (eager || deferred) {
            const { line } = source.getLineAndCharacterOfPosition(
              member.getStart(),
            );
            const name = member.name.getText(source);
            const kind = eager ? 'eager' : 'deferred';
            const head = member.initializer.getText(source).split('\n')[0];
            console.log(
              `  ${file}:${line + 1} ${node.name?.text} ${name} ${kind}: ${head}`,
            );
          }
        }
      }
    }
    ts.forEachChild(node, visitClass);
  };
  visitClass(source);
}
