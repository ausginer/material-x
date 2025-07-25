export type TokenColor = Readonly<{
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}>;

export type TokenLength = Readonly<{
  value?: number;
  unit?: string;
}>;

export type TokenTypographyAxis = Readonly<{
  tag: string;
  value?: number;
}>;

export const TokenShapeFamily = {
  FULL: 'SHAPE_FAMILY_CIRCULAR',
  ROUNDED: 'SHAPE_FAMILY_ROUNDED_CORNERS',
} as const;
export type TokenShapeFamily =
  (typeof TokenShapeFamily)[keyof typeof TokenShapeFamily];

export const TextTransform = {
  NONE: 'TEXT_TRANSFORM_NONE',
} as const;
export type TextTransform = (typeof TextTransform)[keyof typeof TextTransform];

export type TokenShape = Readonly<{
  family: TokenShapeFamily;
  defaultSize?: TokenLength;
  top?: TokenLength;
  bottom?: TokenLength;
  left?: TokenLength;
  right?: TokenLength;
  topLeft?: TokenLength;
  topRight?: TokenLength;
  bottomLeft?: TokenLength;
  bottomRight?: TokenLength;
}>;

export type TokenValues = Readonly<{
  values: readonly string[];
}>;

export type TokenType = Readonly<{
  fontNameTokenName: string;
  fontWeightTokenName: string;
  fontSizeTokenName: string;
  fontTrackingTokenName: string;
  lineHeightTokenName: string;
}>;

export type Token = Readonly<{
  name: string;
  revisionId: string;
  revisionCreateTime: string;
  state: string;
  tokenName: string;
  displayName: string;
  displayGroup: string;
  orderInDisplayGroup: 5;
  deprecationMessage?: { message: string; replacementTokenName?: string };
  tokenNameSuffix: string;
  tokenValueType: string;
  createTime: string;
}>;

export type Value = ResolvedValue &
  Readonly<{
    name: string;
    color?: TokenColor;
    revisionId: string;
    revisionCreateTime: string;
    state: string;
    tokenName?: string;
    contextTags: readonly string[];
    specificityScore: string;
    createTime: string;
  }>;

export type TokenSet = Readonly<{
  name: string;
  revisionId: string;
  revisionCreateTime: string;
  state: string;
  tokenSetName: string;
  displayName: string;
  description: string;
  custom: { token_class: string };
  tokenSetNameSuffix: string;
  tokenType: string;
  order: number;
  createTime: string;
}>;

export type ReferenceTreeValue = Readonly<{
  name: string;
  version: string;
  revisionId: string;
}>;

export type ReferenceTree = Readonly<{
  value: ReferenceTreeValue;
  childNodes: readonly ReferenceTreeValue[];
}>;

export type CubicBezier = Readonly<{
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}>;

export type MotionPath = Readonly<{
  standardPath: string;
}>;

export type ResolvedValue = Readonly<{
  color?: TokenColor;
  length?: TokenLength;
  undefined?: boolean;
  shape?: TokenShape;
  elevation?: TokenLength;
  type?: TokenType;
  opacity?: number;
  numeric?: number;
  durationMs?: number;
  cubicBezier?: CubicBezier;
  motionPath?: MotionPath;
  customComposite?: {
    properties: {
      damping: {
        tokenName: string;
      };
      stiffness: {
        tokenName: string;
      };
    };
  };
  axisValue?: TokenTypographyAxis;
  textTransform?: TextTransform;
  fontNames?: TokenValues;
  fontWeight?: number;
  fontSize?: TokenLength;
  fontTracking?: TokenLength;
  lineHeight?: TokenLength;
}>;

export type ContextualReferenceTreeValue = Readonly<{
  contextTags?: readonly string[];
  referenceTree: ReferenceTree;
  resolvedValue: ResolvedValue;
  numeric?: number;
}>;

export type ContextualReferenceTree = Readonly<{
  contextualReferenceTree: readonly ContextualReferenceTreeValue[];
}>;

export type ContextTag = Readonly<{
  name: string;
  revisionId: string;
  revisionCreateTime: string;
  state: string;
  displayName: string;
  tagName: string;
  tagOrder: number;
  createTime: string;
}>;

export type ContextTagGroup = Readonly<{
  name: string;
  revisionId: string;
  revisionCreateTime: string;
  state: string;
  displayName: string;
  contextTagGroupName: string;
  defaultTag: string;
  specificity: number;
  createTime: string;
}>;

export type TokenSystem = Readonly<{
  tokenSets: readonly TokenSet[];
  tokens: readonly Token[];
  values: readonly Value[];
  contextualReferenceTrees: Readonly<
    Record<string, ContextualReferenceTree | undefined>
  >;
  contextTagGroups: readonly ContextTagGroup[];
  tags: readonly ContextTag[];
}>;

export type TokenTable = Readonly<{
  system: TokenSystem;
}>;
