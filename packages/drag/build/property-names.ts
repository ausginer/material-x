/**
 * Reads property names and string texts from a module's syntax, for the
 * publication step, the script that generates its map, and the publication test.
 *
 * A property name is the name of a class member, an object literal or pattern
 * key, an interface or type member, or a non-computed member access. A private
 * `#name`, a computed key and a quoted key are not property names here: the
 * step never renames them, so a quoted prefixed key stays in the output, where
 * the test finds it as a string.
 */
import { parseSync, Visitor, type ESTree } from 'rolldown/utils';

const PREFIXED = /^_[A-Za-z]/u;

/** Whether the publication build renames a property, or a string names one: `_` and then a letter. */
export function isPrefixed(name: string): boolean {
  return PREFIXED.test(name);
}

export type PropertyName = Readonly<{
  name: string;
  /** UTF-16 offsets of the name in the code. */
  start: number;
  end: number;
  /** An object key written once for both the key and the binding it reads. */
  shorthand: boolean;
}>;

export type StringText = Readonly<{ text: string; start: number }>;

export type ModuleNames = Readonly<{
  properties: readonly PropertyName[];
  strings: readonly StringText[];
}>;

/** Every property name and string text in `code`, in source order. */
export function readNames(fileName: string, code: string): ModuleNames {
  const { program, errors } = parseSync(fileName, code, {
    sourceType: 'module',
  });

  if (errors.length > 0) {
    throw new Error(`${fileName}: ${errors[0]!.message}`);
  }

  const properties: PropertyName[] = [];
  const strings: StringText[] = [];
  const key = (
    node: ESTree.Node | null | undefined,
    computed: boolean,
    shorthand = false,
  ): void => {
    if (!computed && node?.type === 'Identifier') {
      properties.push({
        name: node.name,
        start: node.start,
        end: node.end,
        shorthand,
      });
    }
  };

  new Visitor({
    MemberExpression(node) {
      key(node.property, node.computed);
    },
    Property(node) {
      key(node.key, node.computed, node.shorthand);
    },
    PropertyDefinition(node) {
      key(node.key, node.computed);
    },
    MethodDefinition(node) {
      key(node.key, node.computed);
    },
    AccessorProperty(node) {
      key(node.key, node.computed);
    },
    TSPropertySignature(node) {
      key(node.key, node.computed);
    },
    TSMethodSignature(node) {
      key(node.key, node.computed);
    },
    Literal(node) {
      if (typeof node.value === 'string') {
        strings.push({ text: node.value, start: node.start });
      }
    },
    TemplateElement(node) {
      strings.push({
        text: node.value.cooked ?? node.value.raw,
        start: node.start,
      });
    },
  }).visit(program);

  // Parsed offsets are UTF-16 code units, the unit a JavaScript string and a
  // source map column count in. A name that does not read back would mean
  // they are not.
  for (const { name, start, end } of properties) {
    if (code.slice(start, end) !== name) {
      throw new Error(`${fileName}: ${name} is not at ${start}`);
    }
  }

  return {
    properties: properties.sort((a, b) => a.start - b.start),
    strings: strings.sort((a, b) => a.start - b.start),
  };
}
