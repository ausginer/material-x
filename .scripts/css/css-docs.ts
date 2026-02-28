import type {
  PseudoClass,
  Rule,
  Selector,
  SelectorComponent,
  Visitor,
} from 'lightningcss';
import type { TupleToUnion } from 'type-fest';

const pseudoClasses = ['hover', 'active', 'focus-within'] as const;

function transformStateToForcedState(
  cls: TupleToUnion<typeof pseudoClasses>,
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

// oxlint-disable-next-line typescript/no-empty-object-type
export function injectStateEnforcer(): Visitor<{}> {
  return {
    Rule(rule: Rule) {
      if (rule.type === 'style') {
        rule.value.selectors = rule.value.selectors.flatMap((selector) => {
          const [first] = selector;

          if (
            first?.type === 'pseudo-class' &&
            first.kind === 'host' &&
            first.selectors
          ) {
            const component = first.selectors.find(
              (
                component,
              ): component is {
                type: 'pseudo-class';
              } & PseudoClass =>
                component.type === 'pseudo-class' &&
                pseudoClasses.includes(component.kind),
            );

            if (component) {
              const replaced = first.selectors.map((c) =>
                c === component
                  ? transformStateToForcedState(
                      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                      component.kind as TupleToUnion<typeof pseudoClasses>,
                    )
                  : c,
              );

              return [
                selector,
                [
                  {
                    ...first,
                    selectors: replaced,
                  } satisfies SelectorComponent,
                  ...selector.slice(1),
                ] satisfies Selector,
              ];
            }
          }

          return [selector];
        });
      }

      return rule;
    },
  };
}
