import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { componentDocs } from '../../src/docs/data/components.ts';
import type {
  ComponentApiDoc,
  APIMemberDoc,
  PartDoc,
  SlotDoc,
} from '../../src/docs/types.ts';
import { root } from '../utils.ts';

type PackageJSON = Readonly<{
  name: string;
  exports: Readonly<Record<string, unknown>>;
}>;

const rootPath = fileURLToPath(root);
const generatedDir = resolve(rootPath, 'src/docs/.generated/components');

function isPackageJSON(value: unknown): value is PackageJSON {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  if (!Object.hasOwn(value, 'name') || !Object.hasOwn(value, 'exports')) {
    return false;
  }

  const name = Reflect.get(value, 'name');
  const exportsValue = Reflect.get(value, 'exports');

  return (
    typeof name === 'string' &&
    typeof exportsValue === 'object' &&
    exportsValue != null
  );
}

const packageJSONContents = JSON.parse(
  await readFile(resolve(rootPath, 'package.json'), 'utf8'),
);

if (!isPackageJSON(packageJSONContents)) {
  throw new Error('Invalid package.json shape for docs extraction script.');
}

const packageJSON = packageJSONContents;

const sourceFiles = new Set<string>();
for (const component of componentDocs) {
  for (const file of component.typeSourceFiles) {
    sourceFiles.add(resolve(rootPath, file));
  }
}

const program = ts.createProgram([...sourceFiles], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true,
  strict: true,
  jsx: ts.JsxEmit.ReactJSX,
  skipLibCheck: true,
});

const checker = program.getTypeChecker();

function sortByName<T extends Readonly<{ name: string }>>(
  items: readonly T[],
): T[] {
  return [...items].toSorted((a, b) => a.name.localeCompare(b.name));
}

function getTypeNode(
  filePath: string,
  typeName: string,
): ts.TypeAliasDeclaration | ts.InterfaceDeclaration {
  const sourceFile = program.getSourceFile(filePath);

  if (!sourceFile) {
    throw new Error(`Type source file not found: ${filePath}`);
  }

  let found: ts.TypeAliasDeclaration | ts.InterfaceDeclaration | undefined;

  const visit = (node: ts.Node): void => {
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      node.name.text === typeName
    ) {
      found = node;
      return;
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  if (!found) {
    throw new Error(`Type ${typeName} not found in ${filePath}`);
  }

  return found;
}

function getObjectMembers(
  filePaths: readonly string[],
  typeName: string,
): readonly APIMemberDoc[] {
  for (const filePath of filePaths) {
    const abs = resolve(rootPath, filePath);

    try {
      const typeNode = getTypeNode(abs, typeName);
      const type = ts.isTypeAliasDeclaration(typeNode)
        ? checker.getTypeFromTypeNode(typeNode.type)
        : checker.getTypeAtLocation(typeNode.name);

      const members = checker
        .getPropertiesOfType(type)
        .filter((symbol) => !symbol.getName().startsWith('__@'))
        .map((symbol): APIMemberDoc | undefined => {
          const declaration =
            symbol.valueDeclaration ?? symbol.declarations?.[0];

          if (!declaration) {
            return undefined;
          }

          const optional = (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0;
          const memberType = checker.getTypeOfSymbolAtLocation(
            symbol,
            declaration,
          );
          const typeText = checker.typeToString(
            memberType,
            declaration,
            ts.TypeFormatFlags.NoTruncation |
              ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType,
          );
          const description = ts
            .displayPartsToString(symbol.getDocumentationComment(checker))
            .trim();

          return {
            name: symbol.getName(),
            optional,
            type: typeText,
            description: description.length > 0 ? description : undefined,
          } satisfies APIMemberDoc;
        })
        .filter((item): item is APIMemberDoc => item != null);

      return sortByName(members);
    } catch {
      // Try next type source file.
    }
  }

  throw new Error(`Unable to resolve type ${typeName} from provided files.`);
}

async function parseSlotsAndParts(templatePaths: readonly string[]): Promise<{
  slots: readonly SlotDoc[];
  parts: readonly PartDoc[];
  exportedParts: readonly PartDoc[];
}> {
  return await Promise.all(
    templatePaths.map(async (templatePath) => ({
      content: await readFile(resolve(rootPath, templatePath), 'utf8'),
    })),
  ).then((templates) => {
    const slots = new Set<string>();
    const parts = new Set<string>();
    const exportedParts = new Set<string>();

    const slotPattern = /<slot\b([^>]*)>/gu;
    const partPattern = /\bpart=(['"])(.*?)\1/gu;
    const exportedPartsPattern = /\bexportparts=(['"])(.*?)\1/gu;

    for (const { content } of templates) {
      for (const slotMatch of content.matchAll(slotPattern)) {
        const attrs = slotMatch[1] ?? '';
        const nameMatch = /\bname=(['"])(.*?)\1/u.exec(attrs);
        slots.add(nameMatch?.[2] ?? 'default');
      }

      for (const partMatch of content.matchAll(partPattern)) {
        const value = partMatch[2] ?? '';

        for (const part of value.split(/\s+/u).filter(Boolean)) {
          parts.add(part);
        }
      }

      for (const exportedMatch of content.matchAll(exportedPartsPattern)) {
        const value = exportedMatch[2] ?? '';

        for (const entry of value.split(',').map((chunk) => chunk.trim())) {
          if (!entry) {
            continue;
          }

          const [, exported = entry] = entry.split(':');
          exportedParts.add(exported);
        }
      }
    }

    return {
      slots: sortByName([...slots].map((name) => ({ name }))),
      parts: sortByName([...parts].map((name) => ({ name }))),
      exportedParts: sortByName([...exportedParts].map((name) => ({ name }))),
    };
  });
}

function getImportPath(exportPath: string): string {
  const entry = packageJSON.exports[exportPath];

  if (!entry || typeof entry !== 'object') {
    throw new Error(`Export path not found in package.json: ${exportPath}`);
  }

  return `${packageJSON.name}/${exportPath.slice(2)}`;
}

function getTagName(sourceFile: string): string {
  const source = ts.sys.readFile(resolve(rootPath, sourceFile), 'utf8');

  if (!source) {
    throw new Error(`Unable to read source file: ${sourceFile}`);
  }

  const match = /define\(\s*'([^']+)'\s*,/u.exec(source);

  if (!match?.[1]) {
    throw new Error(`Unable to infer custom element tag from: ${sourceFile}`);
  }

  return match[1];
}

function mergeMembers(
  members: readonly APIMemberDoc[],
  extra: readonly APIMemberDoc[] | undefined,
): readonly APIMemberDoc[] {
  if (!extra || extra.length === 0) {
    return sortByName(members);
  }

  const merged = new Map(members.map((member) => [member.name, member]));

  for (const member of extra) {
    const previous = merged.get(member.name);

    merged.set(member.name, {
      ...member,
      description: member.description ?? previous?.description,
    });
  }

  return sortByName([...merged.values()]);
}

function normalizeCSSProperties(
  members: readonly APIMemberDoc[],
): readonly APIMemberDoc[] {
  return members.filter((member) => member.name.startsWith('--md-'));
}

function createFallbackSummary(title: string): string {
  return `${title} documentation includes usage guidance, interactive demos, and API reference generated from source types and templates.`;
}

function createFallbackPitfalls(component: {
  id: string;
  title: string;
}): readonly string[] {
  const generic = [
    'Validate behavior in your product context with keyboard and assistive technology testing.',
  ] as const;

  if (component.id.includes('switch')) {
    return [
      'Treat this control as stateful input and keep state updates explicit in your application logic.',
      ...generic,
    ];
  }

  if (component.id.includes('group')) {
    return [
      'Provide explicit accessible naming (`aria-label` or `aria-labelledby`) for grouped controls.',
      ...generic,
    ];
  }

  if (component.id.includes('text-field')) {
    return [
      'Always provide a meaningful label and supporting context for form input fields.',
      ...generic,
    ];
  }

  return generic;
}

await mkdir(generatedDir, { recursive: true });

const generatedDocs: ComponentApiDoc[] = [];

for (const component of componentDocs) {
  const tagName = getTagName(component.sourceFile);

  const properties = getObjectMembers(
    component.typeSourceFiles,
    component.propertiesType,
  );

  const events = mergeMembers(
    getObjectMembers(component.typeSourceFiles, component.eventsType),
    component.additionalEvents,
  );

  const cssProperties = normalizeCSSProperties(
    getObjectMembers(component.typeSourceFiles, component.cssPropertiesType),
  );

  const { slots, parts, exportedParts } = await parseSlotsAndParts(
    component.templateFiles,
  );

  const doc: ComponentApiDoc = {
    id: component.id,
    title: component.title,
    tagName,
    importPath: getImportPath(component.exportPath),
    properties,
    events,
    cssProperties,
    slots,
    parts,
    exportedParts,
    meta: {
      ...component.meta,
      summary: component.meta.summary ?? createFallbackSummary(component.title),
      pitfalls: component.meta.pitfalls ?? createFallbackPitfalls(component),
    },
  };

  generatedDocs.push(doc);

  await writeFile(
    resolve(generatedDir, `${component.id}.json`),
    `${JSON.stringify(doc, null, 2)}\n`,
    'utf8',
  );
}

const index = Object.fromEntries(
  [...generatedDocs]
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .map((doc) => [doc.id, `./${doc.id}.json`]),
);

await writeFile(
  resolve(generatedDir, 'index.json'),
  `${JSON.stringify(index, null, 2)}\n`,
  'utf8',
);

console.log(
  `Generated API docs for ${generatedDocs.length} public components.`,
);
