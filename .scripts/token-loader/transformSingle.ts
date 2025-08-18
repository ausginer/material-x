import {
  type ProcessedTokenDescriptor,
  type TokenDescriptor,
  TokenValueType,
} from '../utils.ts';
import type DependencyManager from './DependencyManager.ts';
import type TransformUnifier from './TransformUnifier.ts';
import { camelCaseToKebabCase, sassName } from './utils.ts';

export type TransformResult = Readonly<{
  order: number;
  value: string | Readonly<Record<string, string | undefined>>;
}>;

export function transformSingle(
  descriptor: TokenDescriptor,
  unifier: TransformUnifier,
  dependencyManager: DependencyManager,
): TransformResult {
  if (descriptor.type === TokenValueType.COLOR) {
    const { red, green, blue, alpha } = descriptor.value;
    return {
      order: descriptor.order,
      value: `rgba(${red}, ${green}, ${blue}, ${alpha})`,
    };
  }

  if (
    descriptor.type === TokenValueType.LENGTH ||
    descriptor.type === TokenValueType.LINE_HEIGHT
  ) {
    return { order: descriptor.order, value: `${descriptor.value}px` };
  }

  if (
    descriptor.type === TokenValueType.NUMERIC ||
    descriptor.type === TokenValueType.FONT_WEIGHT ||
    descriptor.type === TokenValueType.FONT_SIZE ||
    descriptor.type === TokenValueType.OPACITY ||
    descriptor.type === TokenValueType.AXIS_VALUE ||
    descriptor.type === TokenValueType.ELEVATION
  ) {
    return { order: descriptor.order, value: String(descriptor.value) };
  }

  if (descriptor.type === TokenValueType.FONT_NAMES) {
    return { order: descriptor.order, value: descriptor.value.join(', ') };
  }

  if (descriptor.type === TokenValueType.DURATION) {
    return { order: descriptor.order, value: `${descriptor.value}ms` };
  }

  if (descriptor.type === TokenValueType.FONT_TYPE) {
    const value = Object.fromEntries(
      Object.entries(descriptor.value).map(
        ([name, value]) =>
          [
            camelCaseToKebabCase(name),
            value
              ? useImportedTokenName(
                  findLinkedToken(value, unifier),
                  dependencyManager,
                )
              : undefined,
          ] as const,
      ),
    );

    return {
      order: descriptor.order,
      value,
    };
  }

  if (descriptor.type === TokenValueType.SHAPE) {
    if (typeof descriptor.value === 'number') {
      return { order: descriptor.order, value: `${descriptor.value}px` };
    }

    const value = Object.fromEntries(
      Object.entries(descriptor.value).map(([name, value]) => [
        camelCaseToKebabCase(name),
        `${value}px`,
      ]),
    );

    return {
      order: descriptor.order,
      value,
    };
  }

  if (descriptor.type === TokenValueType.BEZIER) {
    const { x0, y0, x1, y1 } = descriptor.value;
    return {
      order: descriptor.order,
      value: `cubic-bezier(${x0}, ${y0}, ${x1}, ${y1})`,
    };
  }

  if (
    descriptor.type === TokenValueType.MOTION_PATH ||
    descriptor.type === TokenValueType.TEXT_TRANSFORM
  ) {
    return { order: descriptor.order, value: descriptor.value };
  }

  return {
    order: descriptor.order,
    value: useImportedTokenName(
      findLinkedToken(descriptor.value, unifier),
      dependencyManager,
    ),
  };
}

function findLinkedToken(tokenLinkName: string, unifier: TransformUnifier) {
  const token = unifier.tokens.find(
    ([, tokenName]) => tokenName === tokenLinkName,
  );

  if (!token) {
    throw new Error(`Token "${tokenLinkName}" not found.`);
  }

  return token;
}

function useImportedTokenName(
  [setName, , { suffix }]: ProcessedTokenDescriptor,
  dependencyManager: DependencyManager,
) {
  if (dependencyManager.set === setName) {
    return `$${sassName(suffix)}`;
  }

  dependencyManager.add(setName);
  return `${sassName(setName)}.$${sassName(suffix)}`;
}
