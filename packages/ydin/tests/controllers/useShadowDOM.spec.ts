import { describe, expect, it } from 'vitest';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import { host } from '../browser.ts';

function createTemplate(html: string): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = html;

  return template;
}

describe('useShadowDOM', () => {
  it('should attach an open shadow root and clone all template contents', () => {
    const first = createTemplate('<div id="first"></div>');
    const second = createTemplate('<div id="second"></div>');
    const el = host([], (h) => {
      useShadowDOM(h, [first, second], []);
    });

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.querySelector('#first')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('#second')).not.toBeNull();
  });

  it('should adopt the provided stylesheets', () => {
    const template = createTemplate('<div></div>');
    const sheet = new CSSStyleSheet();
    const el = host([], (h) => {
      useShadowDOM(h, [template], [sheet]);
    });

    expect(el.shadowRoot?.adoptedStyleSheets).toEqual([sheet]);
  });

  it('should apply provided shadow root init options', () => {
    const template = createTemplate('<div></div>');
    const el = host([], (h) => {
      useShadowDOM(h, [template], [], { delegatesFocus: true });
    });

    expect(el.shadowRoot?.delegatesFocus).toBe(true);
  });

  it('should preserve template order when appending contents', () => {
    const first = createTemplate('<div id="first"></div>');
    const second = createTemplate('<div id="second"></div>');
    const el = host([], (h) => {
      useShadowDOM(h, [first, second], []);
    });
    const ids = Array.from(el.shadowRoot?.children ?? []).map(
      (child) => child.id,
    );

    expect(ids).toEqual(['first', 'second']);
  });
});
