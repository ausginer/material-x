/**
 * A probe, not production code. A Rolldown plugin that runs after
 * `@ydinjs/vite-traits-plugin` in a package's tsdown build and turns its
 * flattened output into the mixin form the owner asked about:
 *
 * - each trait class becomes a mixin, `const T = (base) => class extends base
 *   { …members }`, whose `observedAttributes` concatenates the base's, whose
 *   static block brands the prototype as `impl` does, and whose
 *   `Symbol.hasInstance` reads the brand as the flattened trait's does;
 * - each component drops what the flattener put at the start of its body (the
 *   merged statics, the copied members and `static { impl(this, …) }`) and
 *   extends its traits applied in list order to its base, `Tn(…T1(Base))`, so
 *   the later trait wins a shared key, as it does when flattened.
 *
 * It reads the flattener's output, so the trait list, its order and each
 * member's text are the flattener's own. It runs on the TypeScript the
 * flattener emits, before tsdown strips the types.
 */
import MagicString from 'magic-string';
import { parseSync } from 'oxc-parser';
import type { Plugin } from 'rolldown';

type AnyNode = { type: string; start: number; end: number; [key: string]: any };

function upperFirst(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function classesOf(statement: AnyNode): AnyNode[] {
  if (statement.type === 'ClassDeclaration') {
    return [statement];
  }

  if (
    (statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportDefaultDeclaration') &&
    statement.declaration?.type === 'ClassDeclaration'
  ) {
    return [statement.declaration];
  }

  return [];
}

function isHasInstance(element: AnyNode, code: string): boolean {
  return (
    element.type === 'MethodDefinition' &&
    element.static &&
    element.computed &&
    code.slice(element.key.start, element.key.end) === 'Symbol.hasInstance'
  );
}

export type MixinReport = { traits: string[]; components: string[] };

/**
 * The shared helper of the `helper` form, appended to core's
 * `traits/composition.ts`: it brands each application's prototype and gives
 * the mixin the flattened trait's `Symbol.hasInstance`.
 */
const HELPER = `
export function mixin<F extends (base: any) => any>(brand: symbol, apply: F): F {
  return Object.defineProperty(
    ((base: any) => {
      const c = apply(base);
      Object.defineProperty(c.prototype, brand, { value: true });
      return c;
    }) as F,
    Symbol.hasInstance,
    { value: (o: any): boolean => o != null && o[brand] === true },
  );
}
`;

/**
 * `helper: false` writes each mixin's brand and `Symbol.hasInstance` inline;
 * `helper: true` calls one shared helper from core's `traits/composition.ts`.
 */
export function traitMixinPlugin(
  report?: MixinReport,
  { helper = false }: Readonly<{ helper?: boolean }> = {},
): Plugin {
  return {
    name: 'trait-mixin-probe',
    transform(code, id) {
      if (!/\.ts$/u.test(id) || id.includes('/node_modules/')) {
        return null;
      }

      if (helper && id.endsWith('/packages/core/src/traits/composition.ts')) {
        return { code: code + HELPER, map: null };
      }

      if (!code.includes('Symbol.hasInstance') && !code.includes('impl(')) {
        return null;
      }

      const { program } = parseSync(id, code) as unknown as {
        program: { body: AnyNode[] };
      };
      const s = new MagicString(code);

      // local name → [specifier, imported name], and the local name of `impl`.
      const imports = new Map<string, readonly [string, string]>();
      let implName: string | undefined;

      for (const statement of program.body) {
        if (statement.type !== 'ImportDeclaration') {
          continue;
        }

        for (const specifier of statement.specifiers) {
          if (specifier.type !== 'ImportSpecifier') {
            continue;
          }

          const imported: string =
            specifier.imported.name ?? specifier.imported.value;
          imports.set(specifier.local.name, [statement.source.value, imported]);

          if (
            imported === 'impl' &&
            /\/traits\/composition(\.[jt]s)?$/u.test(statement.source.value)
          ) {
            implName = specifier.local.name;
          }
        }
      }

      const added: string[] = [];
      let changed = false;

      for (const statement of program.body) {
        for (const node of classesOf(statement)) {
          const elements: AnyNode[] = node.body.body;
          const hasInstance = elements.find((e) => isHasInstance(e, code));

          if (hasInstance) {
            // A trait class, after the flattener's own trait-module transform.
            const name: string = node.id.name;
            const brand = /\[\s*([\w$]+)\s*\]\s*===\s*true/u.exec(
              code.slice(hasInstance.start, hasInstance.end),
            )?.[1];

            if (brand == null) {
              this.error(`${id}: no brand in ${name}'s hasInstance`);
            }

            const members = elements
              .filter((e) => e !== hasInstance)
              // A field with no value is the type-only brand, `#brand!: true`.
              .filter(
                (e) => !(e.type === 'PropertyDefinition' && e.value == null),
              )
              .map((e) => {
                const text = code.slice(e.start, e.end);

                if (
                  e.type === 'PropertyDefinition' &&
                  e.static &&
                  !e.computed &&
                  e.key.name === 'observedAttributes'
                ) {
                  const value = code.slice(e.value.start, e.value.end);

                  return `static observedAttributes = [...(base.observedAttributes ?? []), ...${value}];`;
                }

                if (e.type === 'PropertyDefinition' && e.static) {
                  this.error(
                    `${id}: ${name} has a static field the probe doesn't model: ${text}`,
                  );
                }

                return text;
              });

            if (helper) {
              const line = `import { mixin as __mxmix_mixin } from ${JSON.stringify(
                id.includes('/packages/core/src/traits/')
                  ? './composition.ts'
                  : '@ydinjs/core/traits/composition.js',
              )};`;

              if (!added.includes(line)) {
                added.push(line);
              }
              s.overwrite(
                node.start,
                node.end,
                `const ${name} = /* @__PURE__ */ __mxmix_mixin(${brand}, (base: any) => class extends base {\n${members.join('\n')}\n});`,
              );
              report?.traits.push(`${id}: ${name}`);
              changed = true;
              continue;
            }

            s.overwrite(
              node.start,
              node.end,
              `const ${name} = /* @__PURE__ */ Object.defineProperty(\n` +
                `(base: any) => class extends base {\n${members.join('\n')}\n` +
                `static { Object.defineProperty(this.prototype, ${brand}, { value: true }); }\n},\n` +
                `Symbol.hasInstance,\n` +
                `{ value: (o: any): boolean => o != null && o[${brand}] === true },\n);`,
            );
            report?.traits.push(`${id}: ${name}`);
            changed = true;
            continue;
          }

          const implIndex = elements.findIndex(
            (e) =>
              e.type === 'StaticBlock' &&
              e.body.length === 1 &&
              e.body[0].type === 'ExpressionStatement' &&
              e.body[0].expression.type === 'CallExpression' &&
              e.body[0].expression.callee.type === 'Identifier' &&
              e.body[0].expression.callee.name === implName,
          );

          if (implIndex === -1) {
            continue;
          }

          // A flattened component: drop what the flattener emitted and extend
          // the traits applied in list order.
          const brands: string[] = elements[
            implIndex
          ].body[0].expression.arguments
            .slice(1)
            .map((a: AnyNode) => a.name);
          let base = code.slice(node.superClass.start, node.superClass.end);

          for (const brand of brands) {
            const link = imports.get(brand);
            let ref: string;

            if (link) {
              const [source, imported] = link;
              ref = `__mxmix_${imported.slice(1)}`;

              if (!added.some((line) => line.includes(` as ${ref} `))) {
                added.push(
                  `import { ${upperFirst(imported.slice(1))} as ${ref} } from ${JSON.stringify(source)};`,
                );
              }
            } else {
              ref = upperFirst(brand.slice(1));
            }

            base = `${ref}(${base})`;
          }

          s.overwrite(node.superClass.start, node.superClass.end, base);
          s.remove(elements[0].start, elements[implIndex].end);
          report?.components.push(
            `${id}: ${node.id?.name ?? 'default'} extends ${base}`,
          );
          changed = true;
        }
      }

      if (!changed) {
        return null;
      }

      if (added.length > 0) {
        s.prepend(`${added.join('\n')}\n`);
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
}
