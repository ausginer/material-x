import { describe, expect, it } from 'vitest';
import { useShadowDOM } from '../../src/controllers/useShadowDOM.ts';
import { ControlledElement } from '../../src/element.ts';
import { defineCE, nameCE } from '../browser.ts';

function createTemplate(html: string): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = html;

  return template;
}

describe('useShadowDOM', () => {
  it('should attach an open shadow root and clone all template contents', () => {
    const first = createTemplate('<div id="first"></div>');
    const second = createTemplate('<div id="second"></div>');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useShadowDOM(this, [first, second], []);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    expect(host.shadowRoot).not.toBeNull();
    expect(host.shadowRoot?.querySelector('#first')).not.toBeNull();
    expect(host.shadowRoot?.querySelector('#second')).not.toBeNull();
  });

  it('should adopt the provided stylesheets', () => {
    const template = createTemplate('<div></div>');
    const sheet = new CSSStyleSheet();
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useShadowDOM(this, [template], [sheet]);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    expect(host.shadowRoot?.adoptedStyleSheets).toEqual([sheet]);
  });

  it('should apply provided shadow root init options', () => {
    const template = createTemplate('<div></div>');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useShadowDOM(this, [template], [], { delegatesFocus: true });
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();

    expect(host.shadowRoot?.delegatesFocus).toBe(true);
  });

  it('should preserve template order when appending contents', () => {
    const first = createTemplate('<div id="first"></div>');
    const second = createTemplate('<div id="second"></div>');
    const Host = class extends ControlledElement {
      constructor() {
        super();
        useShadowDOM(this, [first, second], []);
      }
    };
    const tag = nameCE();

    defineCE(tag, Host);

    const host = new Host();
    const ids = Array.from(host.shadowRoot?.children ?? []).map(
      (child) => child.id,
    );

    expect(ids).toEqual(['first', 'second']);
  });
});
