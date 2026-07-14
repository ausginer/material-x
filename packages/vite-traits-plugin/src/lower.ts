import { createHash } from 'node:crypto';
import type { Program, Statement } from '@oxc-project/types';
import { RolldownMagicString } from 'rolldown';
import type { AnalyzedComposition } from './analyze.ts';
import type { BindingRef, DescriptorTraitIR } from './ir.ts';
import { type SyntheticExport, unwrapTS } from './normalize.ts';

/** Marks the annotated call side-effect-free for the downstream bundler. */
const PURE_ANNOTATION = '/*@__PURE__*/ ';

/** Appends a synthetic export clause to `magic`; returns whether it changed. */
function appendSyntheticExportsInto(
  magic: RolldownMagicString,
  synthetics: readonly SyntheticExport[],
): boolean {
  if (synthetics.length === 0) {
    return false;
  }
  const clause = synthetics
    .map(({ local, exportName }) => `${local} as ${exportName}`)
    .join(', ');
  magic.append(`\nexport { ${clause} };\n`);

  return true;
}

/**
 * Appends build-only synthetic exports for a trait module's private bindings so
 * flattened consumers can link them. Returns the edited `RolldownMagicString`
 * (whose sourcemap the bundler derives natively), or `null` when nothing
 * changes.
 */
export function appendSyntheticExports(
  code: string,
  synthetics: readonly SyntheticExport[],
): RolldownMagicString | null {
  const magic = new RolldownMagicString(code);
  return appendSyntheticExportsInto(magic, synthetics) ? magic : null;
}

/**
 * Prepends `/*@__PURE__*\/` to every top-level descriptor `trait(...)` call so a
 * downstream bundler can tree-shake trait scaffolding (the intermediary trait
 * objects and their trait-list arrays) left unused once a composition is
 * flattened. `trait()` only builds and brands a class — no external side
 * effects — so the annotation is sound; anything still referenced (e.g. an
 * `instanceof` check) keeps the binding alive. Returns the number annotated.
 */
export function annotatePureTraitCalls(
  magic: RolldownMagicString,
  program: Program,
  factoryLocals: ReadonlySet<string>,
): number {
  let count = 0;

  const annotate = (statement: Statement): void => {
    if (statement.type !== 'VariableDeclaration') {
      return;
    }
    for (const declarator of statement.declarations) {
      if (!declarator.init) {
        continue;
      }
      const call = unwrapTS(declarator.init);
      if (
        call.type === 'CallExpression' &&
        call.callee.type === 'Identifier' &&
        factoryLocals.has(call.callee.name)
      ) {
        magic.appendLeft(call.start, PURE_ANNOTATION);
        count += 1;
      }
    }
  };

  for (const node of program.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      annotate(node.declaration);
    } else {
      annotate(node);
    }
  }

  return count;
}

/**
 * Origin-module transform: exposes private trait bindings as synthetic exports
 * and marks descriptor `trait(...)` calls pure. Returns the edited magic string,
 * or `null` when neither applies.
 */
export function augmentOrigin(
  code: string,
  synthetics: readonly SyntheticExport[],
  program: Program,
  factoryLocals: ReadonlySet<string>,
): RolldownMagicString | null {
  const magic = new RolldownMagicString(code);
  const exported = appendSyntheticExportsInto(magic, synthetics);
  const annotated = annotatePureTraitCalls(magic, program, factoryLocals) > 0;

  return exported || annotated ? magic : null;
}

/** Public entry of the default attribute operator. */
const ATTR_SPECIFIER = '@ydinjs/core/attribute.js';
/** Local name the flattened output binds the operator to. */
const ATTR_LOCAL = '__mxflat_attr';

/**
 * Name the flattened output references a linked binding by. A binding local to
 * the consumer module is already in scope, so it is used verbatim; every other
 * binding gets a stable import alias, unique per (specifier, export).
 */
function linkLocal(ref: BindingRef): string {
  if (ref.local) {
    return ref.exportName;
  }
  const hash = createHash('sha1')
    .update(ref.specifier)
    .update('\0')
    .update(ref.exportName)
    .digest('hex')
    .slice(0, 8);

  return `__mxflat_lnk_${hash}`;
}

function converterExpression(ref: BindingRef, path: readonly string[]): string {
  return [linkLocal(ref), ...path].join('.');
}

/**
 * Emits the converter-backed attribute accessors of one descriptor trait as real
 * class getters/setters. Class accessors land on the prototype as
 * non-enumerable, configurable members — matching what the runtime `trait()`
 * installs via `Object.defineProperty` — so this is a faithful lowering for the
 * `attributes.js` accessor shape while reading more naturally than a per-property
 * `defineProperty` call. A string-literal accessor name (`get "color"()`) stays
 * valid for any attribute string, including non-identifier ones like
 * `"aria-checked"`. (Symbol brands stay data properties; see below.)
 */
function accessorMembers(trait: DescriptorTraitIR): readonly string[] {
  return trait.accessors.flatMap((accessor) => {
    const key = JSON.stringify(accessor.key);
    const conv = converterExpression(
      accessor.converter,
      accessor.converterPath,
    );
    return [
      `  get ${key}() { return ${ATTR_LOCAL}.get(this, ${key}, ${conv}); }`,
      `  set ${key}(value) { ${ATTR_LOCAL}.set(this, ${key}, value, ${conv}); }`,
    ];
  });
}

/**
 * Renders the class members that flatten one composition: the merged
 * `observedAttributes`, one class getter/setter pair per trait attribute, and a
 * single `static {}` block that installs every trait brand — a symbol-keyed data
 * property, which class syntax can't express — through one `Object.defineProperties`.
 */
function compositionStatics(analyzed: AnalyzedComposition): string {
  const { traits } = analyzed.composition;
  const observed = traits
    .flatMap((t) => t.observedAttributes)
    .map((a) => JSON.stringify(a));

  const observedField =
    `\n  static observedAttributes = [...new Set([` +
    `...(${analyzed.baseSource}.observedAttributes ?? []), ${observed.join(', ')}])];`;

  const accessors = traits.flatMap(accessorMembers);
  const accessorBlock = accessors.length > 0 ? `\n${accessors.join('\n')}` : '';

  const brands = traits
    .map((t) => `      [${linkLocal(t.brand)}]: { value: true },`)
    .join('\n');
  const brandBlock =
    `\n  static {\n    Object.defineProperties(this.prototype, {\n` +
    `${brands}\n    });\n  }\n`;

  return `${observedField}${accessorBlock}${brandBlock}`;
}

/** Every linked binding referenced by a composition (converters + brands). */
function compositionLinks(
  analyzed: AnalyzedComposition,
): readonly BindingRef[] {
  const refs: BindingRef[] = [];
  for (const trait of analyzed.composition.traits) {
    refs.push(trait.brand);
    for (const accessor of trait.accessors) {
      refs.push(accessor.converter);
    }
  }

  return refs;
}

/**
 * Rewrites a consumer module, flattening every analyzed composition: the
 * `impl(...)` intermediary is removed, its class is re-parented onto the base,
 * the trait layers are inlined as static members, and the required links are
 * imported once at the top.
 */
export function lowerModule(
  code: string,
  compositions: readonly AnalyzedComposition[],
): RolldownMagicString {
  const magic = new RolldownMagicString(code);
  const links = new Map<string, BindingRef>();
  let needsAttr = false;

  for (const analyzed of compositions) {
    magic.remove(...analyzed.declarationSpan);
    magic.overwrite(...analyzed.superClassSpan, analyzed.baseSource);
    magic.appendRight(analyzed.classBodyInsert, compositionStatics(analyzed));

    for (const ref of compositionLinks(analyzed)) {
      // Local bindings are already in scope; only cross-module links import.
      if (!ref.local) {
        links.set(linkLocal(ref), ref);
      }
      if (analyzed.composition.traits.some((t) => t.accessors.length > 0)) {
        needsAttr = true;
      }
    }
  }

  const importLines: string[] = [];
  if (needsAttr) {
    importLines.push(
      `import ${ATTR_LOCAL} from ${JSON.stringify(ATTR_SPECIFIER)};`,
    );
  }
  for (const [local, ref] of links) {
    importLines.push(
      `import { ${ref.exportName} as ${local} } from ${JSON.stringify(ref.specifier)};`,
    );
  }
  magic.prepend(`${importLines.join('\n')}\n`);

  return magic;
}
