import type { ControlledElement } from '../controlled-element.ts';

const sheetCache = new Map<string, CSSStyleSheet>();

function resolveStyleSheet(style: CSSStyleSheet | string): CSSStyleSheet {
  if (typeof style !== 'string') {
    return style;
  }

  const cached = sheetCache.get(style);

  if (cached) {
    return cached;
  }

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(style);
  sheetCache.set(style, sheet);

  return sheet;
}

function resolveStyles(
  styles: ReadonlyArray<CSSStyleSheet | string>,
): CSSStyleSheet[] {
  return styles.map(resolveStyleSheet);
}

export function useShadowDOM(
  host: ControlledElement,
  templates: readonly HTMLTemplateElement[],
  styles: ReadonlyArray<CSSStyleSheet | string>,
  init?: Partial<ShadowRootInit>,
): void {
  const root = host.attachShadow({ mode: 'open', ...init });
  root.adoptedStyleSheets = resolveStyles(styles);

  for (const template of templates) {
    root.append(template.content.cloneNode(true));
  }
}
