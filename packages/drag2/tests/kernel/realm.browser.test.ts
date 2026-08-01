import { describe, expect, it } from 'vitest';
import { createRealm } from '../../src/kernel/realm.ts';

describe('DOMRealm.isElement', () => {
  it('should accept an element of this realm', () => {
    const realm = createRealm(document.body);

    expect(realm.isElement(document.createElement('div'))).toBe(true);
  });

  it('should reject an element that is not an HTMLElement', () => {
    // A bare `nodeType === 1` test accepts SVG and MathML, which the
    // `value is HTMLElement` return type says they are not.
    const realm = createRealm(document.body);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    expect(realm.isElement(svg)).toBe(false);
  });

  it('should reject a plain object carrying nodeType', () => {
    const realm = createRealm(document.body);

    expect(realm.isElement({ nodeType: 1 })).toBe(false);
  });

  it('should reject a text node', () => {
    const realm = createRealm(document.body);

    expect(realm.isElement(document.createTextNode('x'))).toBe(false);
  });

  it('should accept an element from another realm', () => {
    // Cross-realm elements are not `instanceof` this realm's constructor, so
    // the check reaches the element's own realm through its document.
    const frame = document.createElement('iframe');

    document.body.append(frame);

    try {
      const realm = createRealm(document.body);
      const foreign = frame.contentDocument!.createElement('div');

      expect(realm.isElement(foreign)).toBe(true);
    } finally {
      frame.remove();
    }
  });
});
