/**
 * The declaration surface of `@ydinjs/core` and `@ydinjs/material-x`, read from
 * their built `.d.ts` through TypeScript 6's checker, written as `surface.json`
 * beside this file, or to the path given as the first argument.
 *
 * For each entry that a package's `exports` names with a `types` condition, it
 * records each exported class's instance and static members, and each exported
 * type alias's expanded type with its properties. Each type is the checker's
 * `typeToString`. Members that only the default library declares, such as
 * `HTMLElement`'s, are left out.
 *
 * Run `just build` in both packages first. Run from anywhere:
 * `node .plan/trait-migration-1/baseline/surface.ts [out.json]`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = new URL('../../../', import.meta.url);
const PACKAGES = ['core', 'material-x'] as const;
const FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.InTypeAlias |
  ts.TypeFormatFlags.UseFullyQualifiedType;

type Exports = Readonly<Record<string, string | Readonly<{ types?: string }>>>;

async function entries(name: string): Promise<Array<[string, string]>> {
  const dir = new URL(`packages/${name}/`, ROOT);
  const manifest = JSON.parse(
    await readFile(new URL('package.json', dir), 'utf8'),
  ) as { exports: Exports };

  return Object.entries(manifest.exports).flatMap(([subpath, target]) =>
    typeof target === 'object' && target.types
      ? [
          [
            `${name}/${subpath.slice(2)}`,
            fileURLToPath(new URL(target.types, dir)),
          ],
        ]
      : [],
  );
}

const files = (await Promise.all(PACKAGES.map(entries))).flat();
const program = ts.createProgram(
  files.map(([, path]) => path),
  {
    strict: true,
    skipLibCheck: true,
    types: [],
    noEmit: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  },
);
const checker = program.getTypeChecker();

/** Whether only the default library declares `symbol`. */
function isLibraryMember(symbol: ts.Symbol): boolean {
  const declarations = symbol.declarations ?? [];

  return (
    declarations.length > 0 &&
    declarations.every((declaration) =>
      program.isSourceFileDefaultLibrary(declaration.getSourceFile()),
    )
  );
}

function members(
  type: ts.Type,
  location: ts.Node,
  skip: ReadonlySet<string> = new Set(),
): Record<string, string> {
  return Object.fromEntries(
    checker
      .getPropertiesOfType(type)
      .filter((symbol) => !isLibraryMember(symbol))
      .map((symbol): [string, string] => [
        checker.symbolToString(symbol),
        `${symbol.flags & ts.SymbolFlags.Optional ? '?: ' : ''}${checker.typeToString(
          checker.getTypeOfSymbolAtLocation(symbol, location),
          undefined,
          FLAGS,
        )}`,
      ])
      .filter(([name]) => !skip.has(name))
      .toSorted(([a], [b]) => a.localeCompare(b)),
  );
}

function classSurface(symbol: ts.Symbol, location: ts.Node) {
  return {
    instance: members(checker.getDeclaredTypeOfSymbol(symbol), location),
    static: members(
      checker.getTypeOfSymbolAtLocation(symbol, location),
      location,
      new Set(['prototype']),
    ),
  };
}

function aliasSurface(symbol: ts.Symbol, location: ts.Node) {
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  const generic = (
    symbol.declarations?.[0] as ts.TypeAliasDeclaration | undefined
  )?.typeParameters;

  return {
    type: checker.typeToString(type, undefined, FLAGS),
    ...(generic ? {} : { properties: members(type, location) }),
  };
}

const surface: Record<string, unknown> = {};

for (const [entry, path] of files) {
  const source = program.getSourceFile(path);
  const module = source && checker.getSymbolAtLocation(source);

  if (!source || !module) {
    surface[entry] = null;
    continue;
  }

  const classes: Record<string, unknown> = {};
  const aliases: Record<string, unknown> = {};

  for (const exported of checker
    .getExportsOfModule(module)
    .toSorted((a, b) => a.name.localeCompare(b.name))) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exported)
        : exported;

    if (symbol.flags & ts.SymbolFlags.Class) {
      classes[exported.name] = classSurface(symbol, source);
    }

    if (symbol.flags & ts.SymbolFlags.TypeAlias) {
      aliases[exported.name] = aliasSurface(symbol, source);
    }
  }

  surface[entry] = { classes, aliases };
}

const out =
  process.argv[2] ?? fileURLToPath(new URL('surface.json', import.meta.url));

// Module paths in a type's text are written from the repository root, so the
// reading doesn't depend on the checkout's location.
await writeFile(
  out,
  `${JSON.stringify(surface, null, 2).replaceAll(fileURLToPath(ROOT), '<root>/')}\n`,
);
