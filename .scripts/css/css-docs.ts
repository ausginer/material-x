import type {
  PseudoClass,
  Rule,
  Selector,
  SelectorComponent,
  Visitor,
} from 'lightningcss';

const HOST_ENFORCEABLE_PSEUDO_CLASSES = {
  hover: 'hovered',
  active: 'pressed',
  'focus-within': 'focused',
} as const;
type HOST_ENFORCEABLE_PSEUDO_CLASSES = typeof HOST_ENFORCEABLE_PSEUDO_CLASSES;

const IMPL_ENFORCEABLE_PSEUDO_CLASSES = {
  'focus-visible': 'focused',
} as const;
type IMPL_ENFORCEABLE_PSEUDO_CLASSES = typeof IMPL_ENFORCEABLE_PSEUDO_CLASSES;

function transformStateToForcedState(
  cls: HOST_ENFORCEABLE_PSEUDO_CLASSES[keyof HOST_ENFORCEABLE_PSEUDO_CLASSES],
): SelectorComponent {
  return {
    type: 'attribute',
    namespace: null,
    name: 'data-force',
    operation: {
      operator: 'includes',
      value: cls,
      caseSensitivity: 'case-sensitive',
    },
  };
}

function isHostEnforceablePseudoClass(
  component: SelectorComponent,
): component is {
  type: 'pseudo-class';
  kind: keyof HOST_ENFORCEABLE_PSEUDO_CLASSES;
} & PseudoClass {
  return (
    component.type === 'pseudo-class' &&
    Object.hasOwn(HOST_ENFORCEABLE_PSEUDO_CLASSES, component.kind)
  );
}

function isImplEnforceablePseudoClass(
  component: SelectorComponent,
): component is {
  type: 'pseudo-class';
  kind: keyof IMPL_ENFORCEABLE_PSEUDO_CLASSES;
} & PseudoClass {
  return (
    component.type === 'pseudo-class' &&
    Object.hasOwn(IMPL_ENFORCEABLE_PSEUDO_CLASSES, component.kind)
  );
}

function enforceHostState(selector: Selector): Selector | undefined {
  const [first] = selector;
  if (
    first?.type !== 'pseudo-class' ||
    first.kind !== 'host' ||
    !first.selectors
  ) {
    return undefined;
  }

  const idx = first.selectors.findIndex(isHostEnforceablePseudoClass);
  if (idx === -1) {
    return undefined;
  }

  const component = first.selectors[idx];
  if (!component || !isHostEnforceablePseudoClass(component)) {
    return undefined;
  }

  const replaced = first.selectors.toSpliced(
    idx,
    1,
    transformStateToForcedState(
      HOST_ENFORCEABLE_PSEUDO_CLASSES[component.kind],
    ),
  );
  const nextSelector = [...selector];
  nextSelector[0] = {
    ...first,
    selectors: replaced,
  } satisfies SelectorComponent;
  return nextSelector satisfies Selector;
}

function enforceImplState(selector: Selector): Selector | undefined {
  const idx = selector.findIndex((component, index, components) => {
    if (!isImplEnforceablePseudoClass(component)) {
      return false;
    }

    return components[index - 1]?.type === 'class';
  });
  if (idx === -1) {
    return undefined;
  }

  const component = selector[idx];
  if (!component || !isImplEnforceablePseudoClass(component)) {
    return undefined;
  }

  return [
    {
      type: 'pseudo-class',
      kind: 'host',
      selectors: [
        transformStateToForcedState(
          IMPL_ENFORCEABLE_PSEUDO_CLASSES[component.kind],
        ),
      ],
    } satisfies SelectorComponent,
    {
      type: 'combinator',
      value: 'descendant',
    } satisfies SelectorComponent,
    ...selector.toSpliced(idx, 1),
  ] satisfies Selector;
}

// oxlint-disable-next-line typescript/no-empty-object-type
export function injectStateEnforcer(): Visitor<{}> {
  return {
    Rule(rule: Rule) {
      if (rule.type === 'style') {
        const nextSelectors: Selector[] = [];
        for (const selector of rule.value.selectors) {
          nextSelectors.push(selector);

          const hostStateEnforced = enforceHostState(selector);
          if (hostStateEnforced) {
            nextSelectors.push(hostStateEnforced);
          }

          const implStateEnforced = enforceImplState(selector);
          if (implStateEnforced) {
            nextSelectors.push(implStateEnforced);
          }
        }

        rule.value.selectors = nextSelectors;
      }

      return rule;
    },
  };
}
