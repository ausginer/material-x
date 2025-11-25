import { css, prettify } from '../../../core/tokens/css.ts';
import {
  asterisk,
  attribute,
  pseudoClass,
  pseudoElement,
  selector,
} from '../../../core/tokens/selector.ts';
import type { TypedObjectConstructor } from '../../../interfaces.ts';
import packs from './tokens.ts';

const _styles = (Object as TypedObjectConstructor)
  .entries(packs)
  .flatMap(([type, superset]) =>
    (Object as TypedObjectConstructor).entries(superset).map(([size, set]) => {
      const host = selector(
        ':host',
        type === 'standard' ? null : attribute('type', type),
        attribute('size', size),
      );

      const vars = (Object as TypedObjectConstructor)
        .entries(set)
        .map(([state, variables]) => {
          const slotted = selector(
            pseudoElement(
              `slotted`,
              state === 'default'
                ? asterisk
                : state === 'selected'
                  ? attribute('checked')
                  : pseudoClass('active'),
            ),
          );

          return css`
            ${slotted} {
              ${variables};
            }
          `;
        });

      return css`
        ${host} {
          ${vars};
        }
      `;
    }),
  );

const styles: string = await prettify(css`
  :host {
    ${packs.standard.medium.default};

    gap: 8px;
    display: flex;
  }

  ${_styles}
`);

export default styles;
