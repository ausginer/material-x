import { createHash } from 'node:crypto';
import { RolldownMagicString } from 'rolldown';
import type { AnalyzedComposition } from './analyze.ts';
import type { BindingRef, DescriptorTraitIR } from './ir.ts';
import type { SyntheticExport } from './normalize.ts';

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
  if (synthetics.length === 0) {
    return null;
  }

  const magic = new RolldownMagicString(code);
  const clause = synthetics
    .map(({ local, exportName }) => `${local} as ${exportName}`)
    .join(', ');
  magic.append(`\nexport { ${clause} };\n`);

  return magic;
}

/** Public entry of the default attribute operator. */
const ATTR_SPECIFIER = '@ydinjs/core/attribute.js';
/** Local name the flattened output binds the operator to. */
const ATTR_LOCAL = '__mxflat_attr';

/** Stable local alias for a linked binding, unique per (specifier, export). */
function linkLocal(ref: BindingRef): string {
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

/** Emits the static members that replace one descriptor trait layer. */
function descriptorStatics(trait: DescriptorTraitIR): string {
  const lines: string[] = [];

  for (const accessor of trait.accessors) {
    const key = JSON.stringify(accessor.key);
    const conv = converterExpression(
      accessor.converter,
      accessor.converterPath,
    );
    lines.push(
      `    Object.defineProperty(this.prototype, ${key}, { configurable: true, ` +
        `get() { return ${ATTR_LOCAL}.get(this, ${key}, ${conv}); }, ` +
        `set(value) { ${ATTR_LOCAL}.set(this, ${key}, value, ${conv}); } });`,
    );
  }

  lines.push(
    `    Object.defineProperty(this.prototype, ${linkLocal(trait.brand)}, { value: true });`,
  );

  return lines.join('\n');
}

/**
 * Renders the class members that flatten one composition: the merged
 * `observedAttributes` and a `static {}` block installing every trait layer's
 * accessors and brand, in declaration order.
 */
function compositionStatics(analyzed: AnalyzedComposition): string {
  const { traits } = analyzed.composition;
  const observed = traits
    .flatMap((t) => t.observedAttributes)
    .map((a) => JSON.stringify(a));

  const observedField =
    `\n  static observedAttributes = [...new Set([` +
    `...(${analyzed.baseSource}.observedAttributes ?? []), ${observed.join(', ')}])];`;

  const block = `\n  static {\n${traits.map(descriptorStatics).join('\n')}\n  }\n`;

  return `${observedField}${block}`;
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
      links.set(linkLocal(ref), ref);
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
