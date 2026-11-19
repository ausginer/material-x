import { ControlledElement } from '@ydinjs/core/element.js';
import { expect, it } from 'vitest';
import files from '../files.json' with { type: 'json' };

/**
 * The runtime shape of every custom element that a runtime entry of
 * `files.json` defines, compared with a stored snapshot:
 *
 * - its tag and class name;
 * - `observedAttributes`, with duplicates removed in first-occurrence order;
 * - the reflection of each observed attribute that has an accessor of the same
 *   name, both ways;
 * - `instanceof` against every trait;
 * - its own statics;
 * - each prototype level's own keys up to `ControlledElement`.
 *
 * Every module is imported after `customElements.define` is wrapped, so the
 * wrapper sees each tag that an entry defines.
 */

/** Values set through the property; the attribute is read after each. */
const PROPERTY_SAMPLES: readonly unknown[] = [true, false, 'x', null, 1];

/** Values set on the attribute, `null` removing it; the property is read after each. */
const ATTRIBUTE_SAMPLES: ReadonlyArray<string | null> = [null, '', 'x', '1'];

const entries = import.meta.glob<unknown>('../src/**/*.ts');

const defined = new Map<string, CustomElementConstructor>();
const define = customElements.define.bind(customElements);
customElements.define = (name, constructor, options) => {
  defined.set(name, constructor);
  define(name, constructor, options);
};

for (const entry of files.runtime) {
  // oxlint-disable-next-line no-await-in-loop
  await entries[`../src/${entry}.ts`]!();
}

const { Checkable } = await import('@ydinjs/core/traits/checkable.js');
const { Disableable } = await import('@ydinjs/core/traits/disableable.js');
const { Linkable } = await import('@ydinjs/core/traits/linkable.js');
const { Nameable } = await import('@ydinjs/core/traits/nameable.js');
const { Reorderable } = await import('@ydinjs/core/traits/reorderable.js');
const { Selectable } = await import('@ydinjs/core/traits/selectable.js');
const { Typeable } = await import('@ydinjs/core/traits/typeable.js');
const { Valuable } = await import('@ydinjs/core/traits/valuable.js');
const { ButtonLike } = await import('../src/button/ButtonCore.ts');
const { IconButtonLike } = await import('../src/button/IconButtonCore.ts');
const { FABLike } = await import('../src/fab/fab.ts');
const { SplitButtonLike } = await import('../src/button/split-button.ts');
const { ButtonGroupLike } =
  await import('../src/button-group/ButtonGroupCore.ts');
const { Indeterminable } = await import('../src/checkbox/checkbox.ts');
const { TextFieldLike } = await import('../src/text-field/TextFieldCore.ts');
const { FocusForwarding } =
  await import('../src/core/traits/focus-forwarding.ts');

/** Every trait, by name. Only the import lines above change with the trait API. */
const TRAITS: Readonly<Record<string, unknown>> = {
  Checkable,
  Disableable,
  Linkable,
  Nameable,
  Reorderable,
  Selectable,
  Typeable,
  Valuable,
  ButtonLike,
  IconButtonLike,
  FABLike,
  SplitButtonLike,
  ButtonGroupLike,
  Indeterminable,
  TextFieldLike,
  FocusForwarding,
};

type Reading = string | number | boolean | null | Readonly<{ error: string }>;

/** A JSON value for what was read: `undefined` and other kinds become text. */
function encode(value: unknown): Reading {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  return `<${typeof value}>`;
}

function attempt(read: () => unknown): Reading {
  try {
    return encode(read());
  } catch (error) {
    return { error: String(error) };
  }
}

function keyName(key: string | symbol): string {
  return typeof key === 'symbol' ? `symbol:${key.description}` : key;
}

function descriptorKind(descriptor: PropertyDescriptor): string {
  if (descriptor.get && descriptor.set) {
    return 'get+set';
  }

  if (descriptor.get) {
    return 'get';
  }

  if (descriptor.set) {
    return 'set';
  }

  return typeof descriptor.value === 'function' ? 'function' : 'value';
}

/** Whether `name` is an accessor somewhere on the element's prototype chain. */
function hasAccessor(element: HTMLElement, name: string): boolean {
  for (
    let level: object | null = Object.getPrototypeOf(element);
    level;
    level = Object.getPrototypeOf(level)
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(level, name);

    if (descriptor) {
      // An accessor's descriptor has no `value`.
      return !('value' in descriptor);
    }
  }

  return false;
}

function reflection(tag: string, name: string) {
  const property = Object.fromEntries(
    PROPERTY_SAMPLES.map((sample) => {
      const element = document.createElement(tag);

      return [
        JSON.stringify(sample),
        attempt(() => {
          Reflect.set(element, name, sample);

          return element.getAttribute(name);
        }),
      ];
    }),
  );
  const attribute = Object.fromEntries(
    ATTRIBUTE_SAMPLES.map((sample) => {
      const element = document.createElement(tag);

      return [
        JSON.stringify(sample),
        attempt(() => {
          if (sample === null) {
            element.removeAttribute(name);
          } else {
            element.setAttribute(name, sample);
          }

          return Reflect.get(element, name);
        }),
      ];
    }),
  );

  return { name, property, attribute };
}

/**
 * Each own static's name, and its value when the value is a primitive or an
 * array of primitives. `observedAttributes` is recorded without duplicates in
 * the shape's own field, so its value isn't repeated here.
 */
function statics(constructor: CustomElementConstructor) {
  return Reflect.ownKeys(constructor).map((key) => {
    const value: unknown = Reflect.get(constructor, key);
    const primitive =
      value === null ||
      (typeof value !== 'object' && typeof value !== 'function');
    const primitives =
      Array.isArray(value) &&
      value.every((item) => item === null || typeof item !== 'object');

    return key !== 'observedAttributes' && (primitive || primitives)
      ? { key: keyName(key), value: primitive ? encode(value) : value }
      : { key: keyName(key) };
  });
}

function prototypeChain(constructor: CustomElementConstructor) {
  const levels = [];

  for (
    let level: object = constructor.prototype as object;
    level !== ControlledElement.prototype;
    level = Object.getPrototypeOf(level) as object
  ) {
    levels.push({
      constructor: (level as { constructor: { name: string } }).constructor
        .name,
      keys: Reflect.ownKeys(level).map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(level, key)!;

        return {
          key: keyName(key),
          kind: descriptorKind(descriptor),
          enumerable: descriptor.enumerable ?? false,
        };
      }),
    });
  }

  return levels;
}

function elementShape(tag: string, constructor: CustomElementConstructor) {
  const sample = document.createElement(tag);
  const observed: readonly string[] = [
    ...new Set(
      (constructor as { observedAttributes?: readonly string[] })
        .observedAttributes ?? [],
    ),
  ];

  return {
    tag,
    className: constructor.name,
    observedAttributes: observed,
    reflection: observed
      .filter((name) => hasAccessor(sample, name))
      .map((name) => reflection(tag, name)),
    instanceOf: Object.fromEntries(
      Object.entries(TRAITS).map(([name, trait]) => [
        name,
        sample instanceof (trait as new () => unknown),
      ]),
    ),
    statics: statics(constructor),
    prototype: prototypeChain(constructor),
  };
}

it('should keep the runtime shape of every element', async () => {
  const shapes = [...defined]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([tag, constructor]) => elementShape(tag, constructor));

  await expect(`${JSON.stringify(shapes, null, 2)}\n`).toMatchFileSnapshot(
    './__snapshots__/traits-baseline.json',
  );
});
