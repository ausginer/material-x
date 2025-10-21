/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import getDeep from 'just-safe-get';
import setDeep from 'just-safe-set';
import type { Simplify, TupleToUnion } from 'type-fest';
import type { Values } from '../utils/interfaces.ts';

export const $leaf: unique symbol = Symbol('leaf');
export type Leaf = typeof $leaf;

export type Schema = Readonly<{
  [group: string]: Leaf | Schema;
}>;

export type SchemaKeys<S extends Schema> = {
  [K in keyof S & string]: K | (S[K] extends Schema ? SchemaKeys<S[K]> : K);
}[keyof S & string];

type OptionalShapeKeys<S extends Schema> = TupleToUnion<
  Values<{
    [K in keyof S & string]: undefined extends S[K] ? K : never;
  }>
>;

export type Shape<T, S extends Schema> = Readonly<
  Simplify<
    {
      [K in OptionalShapeKeys<S>]?: Leaf extends S[K]
        ? T
        : NonNullable<S[K]> extends Schema
          ? Shape<T, NonNullable<S[K]>>
          : never;
    } & {
      [K in Exclude<keyof S, OptionalShapeKeys<S>>]: S[K] extends Leaf
        ? T
        : S[K] extends Schema
          ? Shape<T, S[K]>
          : never;
    }
  >
>;

type Paths = ReadonlyArray<readonly string[]>;

const collectPaths = (() => {
  function collectPaths(schema: Schema, path: string[] = []): Paths {
    const paths = Object.entries(schema)
      .flatMap(([key, value]) => {
        if (value === $leaf) {
          return [[...path, key]];
        }

        if (typeof value === 'object') {
          return collectPaths(value, [...path, key]);
        }

        throw new Error('Invalid shape value');
      })
      .sort((a, b) => {
        if (a.length > b.length) {
          return -1;
        }

        if (b.length > a.length) {
          return 1;
        }

        if (a.at(-1) === 'default') {
          return 1;
        }

        if (b.at(-1) === 'default') {
          return -1;
        }

        return 0;
      });

    return paths;
  }

  const map = new WeakMap<Schema, Paths>();

  return (schema: Schema) => {
    if (map.has(schema)) {
      return map.get(schema)!;
    }

    const paths = collectPaths(schema);
    map.set(schema, paths);
    return paths;
  };
})();

export function reshape<
  T extends Readonly<Record<string, unknown>>,
  S extends Schema,
>(tokens: T, schema: S): Shape<T, S> {
  const paths = collectPaths(schema);

  return Object.entries(tokens).reduce<Shape<T, S>>(
    (acc, [key, value]) => {
      const tokenPath: string[] = [];

      let remained = key;

      for (const path of paths) {
        for (const section of path) {
          if (tokenPath.includes(section)) {
            continue;
          } else if (remained.includes(section)) {
            tokenPath.push(section);
            remained = remained.replace(`${section}.`, '');
          } else if (section === 'default') {
            tokenPath.push(section);
          } else {
            break;
          }
        }

        if (tokenPath.length === path.length) {
          break;
        }
      }

      setDeep(acc, [...tokenPath, remained], value);

      return acc;
    },
    {} as Shape<T, S>,
  );
}

export function applyToShape<T, U, S extends Schema>(
  shape: Shape<T, S>,
  schema: S,
  applicator: (value: T, path: ReadonlyArray<SchemaKeys<S>>) => U,
): Shape<U, S> {
  const paths = collectPaths(schema);

  return paths.reduce(
    (acc, path) => {
      const value = getDeep(shape, path as string[]);

      if (value !== undefined) {
        const applied = applicator(value, path);
        setDeep(acc, path as string[], applied);
      }

      return acc;
    },
    {} as Shape<U, S>,
  );
}

export function inherit<T>(
  group: Readonly<Record<string, T>> | undefined,
  comparator: (v1: T | undefined, v2: T | undefined) => boolean,
  extensions: ReadonlyArray<
    Readonly<Record<string, T>> | null | undefined
  > = [],
): Readonly<Record<string, T>> {
  if (!group) {
    return {};
  }

  if (extensions.length === 0) {
    return group;
  }

  const nonNullExtensions = extensions.filter((ext) => ext != null);

  return Object.fromEntries(
    Object.entries(group).filter(([name, value]) =>
      nonNullExtensions.every((ext) => !comparator(ext[name], value)),
    ),
  );
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('shapes the object correctly', () => {
    // Real-world example of `md.comp.button` tokens.
    const input: Readonly<Record<string, string>> = {
      'focus.indicator.outline.offset':
        'md.sys.state.focus-indicator.outer-offset',
      'focus.indicator.thickness': 'md.sys.state.focus-indicator.thickness',
      'focus.indicator.color': 'md.sys.color.secondary',
      'trailing-space': '24px',
      'pressed.container.shape': 'md.sys.shape.corner.small',
      'icon-label-space': '8px',
      'selected.container.shape.square': 'md.sys.shape.corner.full',
      'pressed.container.corner-size.motion.spring.stiffness':
        'md.sys.motion.spring.fast.spatial.stiffness',
      'pressed.container.corner-size.motion.spring.damping':
        'md.sys.motion.spring.fast.spatial.damping',
      'selected.container.shape.round': 'md.sys.shape.corner.medium',
      'hovered.container.elevation': 'md.sys.elevation.level1',
      'container.color': 'md.sys.color.primary',
      'unselected.container.color': 'md.sys.color.surface-container',
      'selected.container.color': 'md.sys.color.primary',
      'container.shadow-color': 'md.sys.color.shadow',
      'label-text.color': 'md.sys.color.on-primary',
      'label-text.unselected.color': 'md.sys.color.on-surface-variant',
      'label-text.selected.color': 'md.sys.color.on-primary',
      'icon.color': 'md.sys.color.on-primary',
      'unselected.icon.color': 'md.sys.color.on-surface-variant',
      'selected.icon.color': 'md.sys.color.on-primary',
      'container.elevation': 'md.sys.elevation.level0',
      'disabled.container.color': 'md.sys.color.on-surface',
      'disabled.container.opacity': '0.1',
      'disabled.container.elevation': 'md.sys.elevation.level0',
      'disabled.label-text.color': 'md.sys.color.on-surface',
      'disabled.label-text.opacity': '0.38',
      'disabled.icon.color': 'md.sys.color.on-surface',
      'disabled.icon.opacity': '0.38',
      'hovered.state-layer.color': 'md.sys.color.on-primary',
      'unselected.hovered.state-layer.color': 'md.sys.color.on-surface-variant',
      'selected.hovered.state-layer.color': 'md.sys.color.on-primary',
      'hovered.state-layer.opacity': 'md.sys.state.hover.state-layer-opacity',
      'hovered.label-text.color': 'md.sys.color.on-primary',
      'unselected.hovered.label-text.color': 'md.sys.color.on-surface-variant',
      'selected.hovered.label-text.color': 'md.sys.color.on-primary',
      'hovered.icon.color': 'md.sys.color.on-primary',
      'unselected.hovered.icon.color': 'md.sys.color.on-surface-variant',
      'selected.hovered.icon.color': 'md.sys.color.on-primary',
      'focused.state-layer.color': 'md.sys.color.on-primary',
      'unselected.focused.state-layer.color': 'md.sys.color.on-surface-variant',
      'selected.focused.state-layer.color': 'md.sys.color.on-primary',
      'focused.state-layer.opacity': 'md.sys.state.focus.state-layer-opacity',
      'focused.container.elevation': 'md.sys.elevation.level0',
      'focused.label-text.color': 'md.sys.color.on-primary',
      'unselected.focused.label-text.color': 'md.sys.color.on-surface-variant',
      'selected.focused.label-text.color': 'md.sys.color.on-primary',
      'focused.icon.color': 'md.sys.color.on-primary',
      'unselected.focused.icon.color': 'md.sys.color.on-surface-variant',
      'selected.focused.icon.color': 'md.sys.color.on-primary',
      'pressed.state-layer.color': 'md.sys.color.on-primary',
      'unselected.pressed.state-layer.color': 'md.sys.color.on-surface-variant',
      'selected.pressed.state-layer.color': 'md.sys.color.on-primary',
      'pressed.state-layer.opacity': 'md.sys.state.pressed.state-layer-opacity',
      'pressed.container.elevation': 'md.sys.elevation.level0',
      'pressed.label-text.color': 'md.sys.color.on-primary',
      'unselected.pressed.label-text.color': 'md.sys.color.on-surface-variant',
      'selected.pressed.label-text.color': 'md.sys.color.on-primary',
      'pressed.icon.color': 'md.sys.color.on-primary',
      'unselected.pressed.icon.color': 'md.sys.color.on-surface-variant',
      'selected.pressed.icon.color': 'md.sys.color.on-primary',
      'container.shape.square': 'md.sys.shape.corner.medium',
      'container.shape.round': 'md.sys.shape.corner.full',
      'icon.size': '20px',
      'label-text': 'md.sys.typescale.label-large',
      'container.height': '40px',
      'leading-space': '24px',
    };

    const expected = {
      default: {
        'focus.indicator.outline.offset':
          'md.sys.state.focus-indicator.outer-offset',
        'focus.indicator.thickness': 'md.sys.state.focus-indicator.thickness',
        'focus.indicator.color': 'md.sys.color.secondary',
        'trailing-space': '24px',
        'icon-label-space': '8px',
        'container.color': 'md.sys.color.primary',
        'container.shadow-color': 'md.sys.color.shadow',
        'label-text.color': 'md.sys.color.on-primary',
        'icon.color': 'md.sys.color.on-primary',
        'container.elevation': 'md.sys.elevation.level0',
        'container.shape.square': 'md.sys.shape.corner.medium',
        'container.shape.round': 'md.sys.shape.corner.full',
        'icon.size': '20px',
        'label-text': 'md.sys.typescale.label-large',
        'container.height': '40px',
        'leading-space': '24px',
      },
      pressed: {
        'container.shape': 'md.sys.shape.corner.small',
        'container.corner-size.motion.spring.stiffness':
          'md.sys.motion.spring.fast.spatial.stiffness',
        'container.corner-size.motion.spring.damping':
          'md.sys.motion.spring.fast.spatial.damping',
        'state-layer.color': 'md.sys.color.on-primary',
        'state-layer.opacity': 'md.sys.state.pressed.state-layer-opacity',
        'container.elevation': 'md.sys.elevation.level0',
        'label-text.color': 'md.sys.color.on-primary',
        'icon.color': 'md.sys.color.on-primary',
      },
      selected: {
        default: {
          'container.shape.square': 'md.sys.shape.corner.full',
          'container.shape.round': 'md.sys.shape.corner.medium',
          'container.color': 'md.sys.color.primary',
          'label-text.color': 'md.sys.color.on-primary',
          'icon.color': 'md.sys.color.on-primary',
        },
        hovered: {
          'state-layer.color': 'md.sys.color.on-primary',
          'label-text.color': 'md.sys.color.on-primary',
          'icon.color': 'md.sys.color.on-primary',
        },
        focused: {
          'state-layer.color': 'md.sys.color.on-primary',
          'label-text.color': 'md.sys.color.on-primary',
          'icon.color': 'md.sys.color.on-primary',
        },
        pressed: {
          'state-layer.color': 'md.sys.color.on-primary',
          'label-text.color': 'md.sys.color.on-primary',
          'icon.color': 'md.sys.color.on-primary',
        },
      },
      hovered: {
        'container.elevation': 'md.sys.elevation.level1',
        'state-layer.color': 'md.sys.color.on-primary',
        'state-layer.opacity': 'md.sys.state.hover.state-layer-opacity',
        'label-text.color': 'md.sys.color.on-primary',
        'icon.color': 'md.sys.color.on-primary',
      },
      unselected: {
        default: {
          'container.color': 'md.sys.color.surface-container',
          'label-text.color': 'md.sys.color.on-surface-variant',
          'icon.color': 'md.sys.color.on-surface-variant',
        },
        hovered: {
          'state-layer.color': 'md.sys.color.on-surface-variant',
          'label-text.color': 'md.sys.color.on-surface-variant',
          'icon.color': 'md.sys.color.on-surface-variant',
        },
        focused: {
          'state-layer.color': 'md.sys.color.on-surface-variant',
          'label-text.color': 'md.sys.color.on-surface-variant',
          'icon.color': 'md.sys.color.on-surface-variant',
        },
        pressed: {
          'state-layer.color': 'md.sys.color.on-surface-variant',
          'label-text.color': 'md.sys.color.on-surface-variant',
          'icon.color': 'md.sys.color.on-surface-variant',
        },
      },
      disabled: {
        'container.color': 'md.sys.color.on-surface',
        'container.opacity': '0.1',
        'container.elevation': 'md.sys.elevation.level0',
        'label-text.color': 'md.sys.color.on-surface',
        'label-text.opacity': '0.38',
        'icon.color': 'md.sys.color.on-surface',
        'icon.opacity': '0.38',
      },
      focused: {
        'state-layer.color': 'md.sys.color.on-primary',
        'state-layer.opacity': 'md.sys.state.focus.state-layer-opacity',
        'container.elevation': 'md.sys.elevation.level0',
        'label-text.color': 'md.sys.color.on-primary',
        'icon.color': 'md.sys.color.on-primary',
      },
    };

    const baseSchema = {
      default: $leaf,
      hovered: $leaf,
      focused: $leaf,
      pressed: $leaf,
      disabled: $leaf,
    } as const;

    const schema = {
      ...baseSchema,
      unselected: baseSchema,
      selected: baseSchema,
    } as const;

    const result = reshape(input, schema);

    expect(result).toEqual(expected);
  });
}
