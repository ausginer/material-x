export type APIMemberDoc = Readonly<{
  name: string;
  optional: boolean;
  type: string;
  description?: string;
}>;

export type SlotDoc = Readonly<{
  name: string;
  description?: string;
}>;

export type PartDoc = Readonly<{
  name: string;
  description?: string;
}>;

export type M3Mapping = Readonly<{
  overview: string;
  specs?: string;
  accessibility?: string;
}>;

export type DescriptionOverrides = Readonly<{
  properties?: Readonly<Record<string, string>>;
  events?: Readonly<Record<string, string>>;
  slots?: Readonly<Record<string, string>>;
  parts?: Readonly<Record<string, string>>;
  cssProperties?: Readonly<Record<string, string>>;
}>;

export type A11yCaveat = Readonly<{
  title: string;
  detail: string;
}>;

export type ComponentDocMeta = Readonly<{
  id: string;
  title: string;
  docPage: string;
  summary?: string;
  whenToUse: readonly string[];
  pitfalls?: readonly string[];
  deltas: readonly string[];
  a11yCaveats: readonly A11yCaveat[];
  m3: M3Mapping;
  descriptionOverrides?: DescriptionOverrides;
}>;

export type ComponentApiDoc = Readonly<{
  id: string;
  title: string;
  tagName: string;
  importPath: string;
  properties: readonly APIMemberDoc[];
  events: readonly APIMemberDoc[];
  cssProperties: readonly APIMemberDoc[];
  slots: readonly SlotDoc[];
  parts: readonly PartDoc[];
  exportedParts: readonly PartDoc[];
  meta: ComponentDocMeta;
}>;

export type ComponentDocDefinition = Readonly<{
  id: string;
  title: string;
  exportPath: string;
  sourceFile: string;
  typeSourceFiles: readonly string[];
  templateFiles: readonly string[];
  propertiesType: string;
  eventsType: string;
  cssPropertiesType: string;
  additionalEvents?: readonly APIMemberDoc[];
  meta: ComponentDocMeta;
}>;
