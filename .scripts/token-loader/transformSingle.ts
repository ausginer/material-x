import { type TokenDescriptor, TokenValueType } from '../utils.ts';
import type DependencyManager from './DependencyManager.ts';
import type TransformUnifier from './TransformUnifier.ts';
import { sassName } from './utils.ts';

export type TransformResult = Readonly<{
  order: number;
  value: string;
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
    const { fontName, fontWeight, fontSize, lineHeight } = descriptor.value;
    const _fontWeight = fontWeight
      ? `#{${transformTokenLink(fontWeight, unifier, dependencyManager)}} `
      : '';
    const _fontSize = fontSize
      ? `#{${transformTokenLink(fontSize, unifier, dependencyManager)}} / `
      : '';
    const _lineHeight = lineHeight
      ? `#{${transformTokenLink(lineHeight, unifier, dependencyManager)}} `
      : '';

    const _fontName = fontName
      ? `#{${transformTokenLink(fontName, unifier, dependencyManager)}}`
      : '';

    return {
      order: descriptor.order,
      value: `${_fontWeight}${_fontSize}${_lineHeight}${_fontName}`,
    };
  }

  if (descriptor.type === TokenValueType.SHAPE) {
    if (typeof descriptor.value === 'number') {
      return { order: descriptor.order, value: `${descriptor.value}px` };
    }

    const { topLeft, topRight, bottomRight, bottomLeft } = descriptor.value;
    return {
      order: descriptor.order,
      value: `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`,
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
    value: transformTokenLink(descriptor.value, unifier, dependencyManager),
  };
}

function transformTokenLink(
  tokenLinkName: string,
  unifier: TransformUnifier,
  dependencyManager: DependencyManager,
): string {
  const token = unifier.tokens.find(
    ([, tokenName]) => tokenName === tokenLinkName,
  );

  if (!token) {
    throw new Error(`Token "${tokenLinkName}" not found.`);
  }

  const [setName, , { suffix }] = token;

  if (dependencyManager.set === setName) {
    return `$${sassName(suffix)}`;
  }

  dependencyManager.add(setName);
  return `${sassName(setName)}.$${sassName(suffix)}`;
}
