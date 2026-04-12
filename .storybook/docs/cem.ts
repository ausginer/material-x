/* eslint-disable import-x/no-relative-packages */
import manifestJSON from '../../packages/material-x/custom-elements.json' with { type: 'json' };

type CEMAttribute = Readonly<{
  name?: string;
  description?: string;
  type?: string | Readonly<{ text?: string }>;
}>;

type CEMSlot = Readonly<{
  name?: string;
  description?: string;
}>;

type CEMCSSPart = Readonly<{
  name?: string;
  description?: string;
}>;

type CEMCSSProperty = Readonly<{
  name?: string;
  description?: string;
}>;

type CEMEvent = Readonly<{
  name?: string;
  description?: string;
}>;

export type CEMDeclaration = Readonly<{
  tagName?: string;
  summary?: string;
  attributes?: readonly CEMAttribute[];
  slots?: readonly CEMSlot[];
  cssParts?: readonly CEMCSSPart[];
  cssProperties?: readonly CEMCSSProperty[];
  events?: readonly CEMEvent[];
}>;

export type NormalizedAttribute = Readonly<{
  name: string;
  description?: string;
  type?: string | Readonly<{ text?: string }>;
}>;

export type NormalizedItem = Readonly<{
  name: string;
  description?: string;
}>;

type CEMModule = Readonly<{
  declarations?: readonly CEMDeclaration[];
}>;

const manifest: Readonly<{
  modules: readonly CEMModule[];
}> = manifestJSON;

const declarations: readonly CEMDeclaration[] = manifest.modules.flatMap(
  (moduleEntry) => moduleEntry.declarations ?? [],
);

function normalizeName(
  value: string | undefined,
  fallback?: string,
): string | undefined {
  const normalized = value?.trim();

  if (normalized) {
    return normalized;
  }

  return fallback;
}

export function getDeclarationByTag(tag: string): CEMDeclaration | undefined {
  return declarations.find((declaration) => declaration.tagName === tag);
}

export function getAttributes(
  declaration: CEMDeclaration | undefined,
): readonly NormalizedAttribute[] {
  return (declaration?.attributes ?? [])
    .map((attribute) => ({
      name: normalizeName(attribute.name),
      description: attribute.description,
      type: attribute.type,
    }))
    .filter((attribute) => Boolean(attribute.name))
    .map((attribute) => ({
      ...attribute,
      name: attribute.name!,
    }));
}

export function getSlots(
  declaration: CEMDeclaration | undefined,
): readonly NormalizedItem[] {
  return (declaration?.slots ?? [])
    .map((slot) => ({
      name: normalizeName(slot.name, 'default'),
      description: slot.description,
    }))
    .filter((slot) => Boolean(slot.name))
    .map((slot) => ({
      ...slot,
      name: slot.name!,
    }));
}

export function getCSSParts(
  declaration: CEMDeclaration | undefined,
): readonly NormalizedItem[] {
  return (declaration?.cssParts ?? [])
    .map((part) => ({
      name: normalizeName(part.name),
      description: part.description,
    }))
    .filter((part) => Boolean(part.name))
    .map((part) => ({
      ...part,
      name: part.name!,
    }));
}

export function getCSSProperties(
  declaration: CEMDeclaration | undefined,
): readonly NormalizedItem[] {
  return (declaration?.cssProperties ?? [])
    .map((property) => ({
      name: normalizeName(property.name),
      description: property.description,
    }))
    .filter((property) => Boolean(property.name))
    .map((property) => ({
      ...property,
      name: property.name!,
    }));
}

export function getEvents(
  declaration: CEMDeclaration | undefined,
): readonly NormalizedItem[] {
  return (declaration?.events ?? [])
    .map((event) => ({
      name: normalizeName(event.name),
      description: event.description,
    }))
    .filter((event) => Boolean(event.name))
    .map((event) => ({
      ...event,
      name: event.name!,
    }));
}

export function textOrDash(value: string | undefined): string {
  return value?.trim() ?? '-';
}

export function attributeType(attribute: NormalizedAttribute): string {
  if (typeof attribute.type === 'string') {
    return attribute.type || 'string';
  }

  return attribute.type?.text ?? 'string';
}
