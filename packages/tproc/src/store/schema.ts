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

/** A type's variation axes. Upstream gives `FILL` and `HEXP` on some only. */
export type VariationAxes<Axis> = Readonly<{
  wght: Axis;
  GRAD: Axis;
  wdth: Axis;
  ROND: Axis;
  opsz: Axis;
  CRSV: Axis;
  slnt: Axis;
  FILL?: Axis;
  HEXP?: Axis;
}>;

export type TokenTypeVariationAxes = VariationAxes<TokenTypeVariationAxis>;

/** A `type` value: each part is a reference to another token. */
export type TokenType = Readonly<{
  fontNameTokenName: string;
  fontWeightTokenName: string;
  fontSizeTokenName: string;
  fontTrackingTokenName: string;
  lineHeightTokenName: string;
  variationAxes?: TokenTypeVariationAxes;
}>;

/** A resolved `type`: each part is the literal its reference resolves to. */
export type ResolvedTokenType = Readonly<{
  fontNames: TokenValues;
  fontWeight: number;
  fontSize: TokenLength;
  fontTracking: TokenLength;
  lineHeight: TokenLength;
  variationAxes?: VariationAxes<Readonly<{ axisValue: number }>>;
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

/** A `customComposite` property: exactly one value field, as a value has. */
export type CompositeProperty = Literal &
  Readonly<{
    tokenName?: string;
  }>;

export type CustomComposite = Readonly<{
  properties: Readonly<Record<string, CompositeProperty>>;
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

/**
 * A resolved value's literal fields. They are a value's, except that a resolved
 * `type` holds literals where a value's holds references.
 */
export type ResolvedLiteral = Omit<Literal, 'type'> &
  Readonly<{
    type?: ResolvedTokenType;
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
  /**
   * On a child node, the index in its token's `values` of the value the tree
   * passes through. The root's is its entry's `value`.
   */
  value?: number;
  /** The composite properties the node feeds, as upstream names them. */
  fieldNames?: readonly string[];
  childNodes?: readonly ReferenceTree[];
}>;

export type ResolvedCustomCompositeValue = Readonly<{
  properties: Readonly<
    Record<string, Readonly<{ resolvedValue: ResolvedLiteral }>>
  >;
}>;

export type ContextualEntry = Readonly<{
  contextTags?: ContextTags;
  /** The index in the token's `values` of the value the tree starts from. */
  value: number;
  referenceTree: ReferenceTree;
  resolvedValue?: ResolvedLiteral;
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
  displayGroup?: DisplayGroupPath;
  orderInDisplayGroup?: number;
  deprecationMessage?: DeprecationMessage;
  values: readonly StoredValue[];
  contextualReferenceTree?: readonly ContextualEntry[];
}>;

/**
 * A display group's `displayName` and its ancestors', from the top. It
 * identifies the group within its set, where a `displayName` may repeat.
 */
export type DisplayGroupPath = readonly string[];

export type StoredDisplayGroup = Readonly<{
  displayName: string;
  /** The parent group's path. */
  parentGroup?: DisplayGroupPath;
  description?: string;
  orderInParentTokenSet?: number;
  orderInParentDisplayGroup?: number;
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
  displayGroups?: readonly StoredDisplayGroup[];
  tokens: readonly StoredToken[];
}>;

export type StoredTag = Readonly<{
  tagName: string;
  displayName: string;
  description?: string;
  tagOrder: number;
}>;

export type StoredTagGroup = Readonly<{
  contextTagGroupName: string;
  displayName: string;
  description?: string;
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

export const STORE_VERSION = 2;
