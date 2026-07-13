/**
 * Rewrites native-looking `:has-slotted` selectors to the internal
 * `.has-slotted` class that Material X toggles at runtime.
 *
 * Examples:
 *
 * ```css
 * slot:has-slotted {}
 * ```
 *
 * becomes:
 *
 * ```css
 * slot.has-slotted {}
 * ```
 *
 * And:
 *
 * ```css
 * :host:has(.lead:has-slotted) {}
 * ```
 *
 * becomes:
 *
 * ```css
 * :host:has(.lead.has-slotted),
 * :host(:state(has-lead)) {}
 * ```
 *
 * The transform is intentionally small and internal-only. Host state fallback
 * names are derived from the class immediately associated with
 * `:has-slotted`; selectors without such a class only receive the plain
 * `.has-slotted` rewrite.
 */

import type {
  CustomAtRules,
  Selector,
  SelectorComponent,
  Visitor,
} from 'lightningcss';

const HAS_SLOTTED = 'has-slotted';

function isHasSlotted(component: SelectorComponent): boolean {
  return (
    component.type === 'pseudo-class' &&
    component.kind === 'custom' &&
    component.name === HAS_SLOTTED
  );
}

function findSlottedClass(selector: Selector): string | undefined {
  let className: string | undefined;

  for (const component of selector) {
    if (component.type === 'class') {
      className = component.name;
      continue;
    }

    if (isHasSlotted(component)) {
      return className;
    }
  }

  return undefined;
}

function trimAfterHasSlotted(selector: Selector): Selector {
  const index = selector.findIndex(isHasSlotted);

  return index < 0 ? selector : selector.slice(0, index + 1);
}

function dedupeSelectors(selectors: readonly Selector[]): Selector[] {
  const seen = new Set<string>();

  return selectors.filter((selector) => {
    const key = JSON.stringify(selector);
    const isNew = !seen.has(key);
    seen.add(key);
    return isNew;
  });
}

function hasSlotted(selector: Selector): boolean {
  return selector.some((component) => {
    if (isHasSlotted(component)) {
      return true;
    }

    return (
      component.type === 'pseudo-class' &&
      component.kind === 'has' &&
      component.selectors.some(hasSlotted)
    );
  });
}

function replaceHasSlotted(selector: Selector): Selector {
  return selector.map((component) => {
    if (isHasSlotted(component)) {
      return { type: 'class', name: HAS_SLOTTED };
    }

    if (component.type === 'pseudo-class' && component.kind === 'has') {
      return {
        ...component,
        selectors: component.selectors.map(replaceHasSlotted),
      };
    }

    return component;
  });
}

function appendHostState(
  host: SelectorComponent,
  stateName: string,
): SelectorComponent {
  if (host.type !== 'pseudo-class' || host.kind !== 'host' || !host.selectors) {
    return {
      type: 'pseudo-class',
      kind: 'host',
      selectors: [
        {
          type: 'pseudo-class',
          kind: 'state',
          state: stateName,
        },
      ],
    };
  }

  return {
    ...host,
    selectors: [
      ...host.selectors,
      {
        type: 'pseudo-class',
        kind: 'state',
        state: stateName,
      },
    ],
  };
}

function createHostStateFallback(
  selector: Selector,
): readonly Selector[] | undefined {
  const hostIndex = selector.findIndex(
    (component) =>
      component.type === 'pseudo-class' && component.kind === 'host',
  );

  if (hostIndex < 0) {
    return undefined;
  }

  const slottedSelectors = selector.flatMap((component, index) =>
    index > hostIndex &&
    component.type === 'pseudo-class' &&
    component.kind === 'has'
      ? component.selectors.filter(hasSlotted).map(trimAfterHasSlotted)
      : [],
  );
  const classNames = slottedSelectors
    .map(findSlottedClass)
    .map((className) => className ?? 'default');

  if (classNames.length === 0) {
    return undefined;
  }

  const fallback = selector.flatMap((component, index): Selector => {
    if (
      index > hostIndex &&
      component.type === 'pseudo-class' &&
      component.kind === 'has' &&
      component.selectors.some(hasSlotted)
    ) {
      return [];
    }

    return [
      index === hostIndex
        ? classNames.reduce(
            (host, name) => appendHostState(host, `has-${name}`),
            component,
          )
        : component,
    ];
  });

  return dedupeSelectors([replaceHasSlotted(fallback)]);
}

const hasSlottedFallbackVisitor: Visitor<CustomAtRules> = {
  Selector(selector) {
    if (!hasSlotted(selector)) {
      return;
    }

    const fallbacks = createHostStateFallback(selector);

    return dedupeSelectors([replaceHasSlotted(selector), ...(fallbacks ?? [])]);
  },
};

export default hasSlottedFallbackVisitor;
