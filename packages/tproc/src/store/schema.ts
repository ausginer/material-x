/**
 * The shape of tproc's token store under `packages/tproc/tokens/`. Field names
 * and values are upstream's, from Material's design-system database. Internal
 * ids, revisions, times, states, authors and settings are not stored.
 */

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

export type TokenTypeVariationAxis = Readonly<{
  axisValueTokenName: string;
}>;

export type TokenTypeVariationAxes = Readonly<{
  wght: TokenTypeVariationAxis;
  GRAD: TokenTypeVariationAxis;
  wdth: TokenTypeVariationAxis;
  ROND: TokenTypeVariationAxis;
  opsz: TokenTypeVariationAxis;
  CRSV: TokenTypeVariationAxis;
  slnt: TokenTypeVariationAxis;
  FILL: TokenTypeVariationAxis;
  HEXP: TokenTypeVariationAxis;
}>;

export type TokenType = Readonly<{
  fontNameTokenName: string;
  fontWeightTokenName: string;
  fontSizeTokenName: string;
  fontTrackingTokenName: string;
  lineHeightTokenName: string;
  variationAxes: TokenTypeVariationAxes;
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

export type CustomComposite = Readonly<{
  properties: Readonly<Record<string, Readonly<{ tokenName: string }>>>;
}>;

/**
 * Upstream's literal value fields. A stored value or resolved value carries
 * exactly one of them, and a stored value may carry `tokenName` instead.
 */
export type Literal = Readonly<{
  color?: TokenColor;
  length?: TokenLength;
  shape?: TokenShape;
  type?: TokenType;
  opacity?: number;
  numeric?: number;
  durationMs?: number;
  cubicBezier?: CubicBezier;
  motionPath?: MotionPath;
  customComposite?: CustomComposite;
  axisValue?: TokenTypographyAxis;
  textTransform?: TextTransform;
  fontNames?: TokenValues;
  fontWeight?: number;
  fontSize?: TokenLength;
  fontTracking?: TokenLength;
  lineHeight?: TokenLength;
  elevation?: TokenLength;
  svgPath?: string;
  undefined?: boolean;
}>;

/** A context tag group name mapped to one of its tag names. */
export type ContextTags = Readonly<Record<string, string>>;

export type StoredValue = Literal &
  Readonly<{
    contextTags?: ContextTags;
    specificityScore?: string;
    /** The one-hop reference to another token. */
    tokenName?: string;
  }>;

export type ReferenceTree = Readonly<{
  tokenName: string;
  childNodes?: readonly ReferenceTree[];
}>;

export type ResolvedCustomCompositeValue = Readonly<{
  properties: Readonly<Record<string, Readonly<{ resolvedValue: Literal }>>>;
}>;

export type ContextualEntry = Readonly<{
  contextTags?: ContextTags;
  /** The index in the token's `values` of the value the tree starts from. */
  value: number;
  referenceTree: ReferenceTree;
  resolvedValue?: Literal;
  resolvedCustomCompositeValue?: ResolvedCustomCompositeValue;
}>;

export type DeprecationMessage = Readonly<{
  message: string;
  replacementTokenName?: string;
}>;

export type StoredToken = Readonly<{
  tokenName: string;
  displayName: string;
  tokenValueType: string;
  description?: string;
  displayGroup?: string;
  orderInDisplayGroup?: number;
  deprecationMessage?: DeprecationMessage;
  values: readonly StoredValue[];
  contextualReferenceTree?: readonly ContextualEntry[];
}>;

/**
 * One file under `sets/`. A set that no table carries, named only from its
 * tokens, has `tokenSetName` alone.
 */
export type StoredSet = Readonly<{
  tokenSetName: string;
  displayName?: string;
  description?: string;
  tokenType?: string;
  custom?: Readonly<{ token_class?: string }>;
  order?: number;
  tokens: readonly StoredToken[];
}>;

export type StoredTag = Readonly<{
  tagName: string;
  displayName: string;
  tagOrder: number;
}>;

export type StoredTagGroup = Readonly<{
  contextTagGroupName: string;
  displayName: string;
  specificity: number;
  defaultTag: string;
  tags: readonly StoredTag[];
}>;

/** `context.json`. */
export type StoredContext = Readonly<{
  contextTagGroups: readonly StoredTagGroup[];
}>;

export type ManifestDatabase = Readonly<{
  versionName: string;
  versionId: string;
  publishTime: string;
}>;

export type ManifestTable = Readonly<{
  kind: string;
  componentId: string;
  componentName: string;
}>;

export type ManifestFile = Readonly<{
  path: string;
  sha256: string;
}>;

/** `manifest.json`. */
export type Manifest = Readonly<{
  storeVersion: number;
  source: Readonly<{
    baseUrl: string;
    /** The site release, or `null` for the snapshot committed before it. */
    release: string | null;
    note?: string;
    databases: readonly ManifestDatabase[];
  }>;
  /** The fetch date, `YYYY-MM-DD`, or `null` when it isn't known. */
  fetchDate: string | null;
  tables: readonly ManifestTable[];
  files: readonly ManifestFile[];
}>;

export const STORE_VERSION = 1;
