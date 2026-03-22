import { useResizeObserver } from '../../controllers/useResizeObserver.ts';
import type { ReactiveElement } from '../../elements/reactive-element.ts';
import { $ } from '../../utils/DOM.ts';
import css from './outline.ctr.css' with { type: 'css' };
import template from './outline.tpl.html' with { type: 'html' };

const NOTCH_WIDTH_VAR_NAME = '--_outline-notch-width';

export function useOutline(
  host: ReactiveElement,
  label: HTMLElement,
  container: DocumentFragment | HTMLElement = host.shadowRoot!,
): void {
  host.shadowRoot!.adoptedStyleSheets.push(css);
  container.prepend(template.content.cloneNode(true));

  const outline = $<HTMLElement>(host, '.outline')!;

  useResizeObserver(
    host,
    {
      callback(entries) {
        if (entries[0]?.contentBoxSize[0]) {
          outline.style.setProperty(
            NOTCH_WIDTH_VAR_NAME,
            `${entries[0].contentBoxSize[0].inlineSize}px`,
          );
        }
      },
      box: 'content-box',
    },
    label,
  );
}
