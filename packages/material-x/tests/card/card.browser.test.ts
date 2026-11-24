import { afterEach, describe, expect, it } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import type Card from '../../src/card/card.ts';
import '../../src/card/card.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

function createCard(html = 'Content'): Card {
  const card = document.createElement('mx-card');
  card.id = 'card';
  card.innerHTML = html;
  document.body.append(card);
  return card;
}

afterEach(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

describe('mx-card', () => {
  describe('variant', () => {
    it('should have no variant by default', () => {
      expect(createCard().variant).toBeNull();
    });

    it('should reflect the property to the attribute', () => {
      const card = createCard();

      card.variant = 'elevated';

      expect(card.getAttribute('variant')).toBe('elevated');
    });

    it('should read the attribute through the property', () => {
      const card = createCard();

      card.setAttribute('variant', 'outlined');

      expect(card.variant).toBe('outlined');
    });

    it('should remove the attribute when the property is null', () => {
      const card = createCard();
      card.variant = 'elevated';

      card.variant = null;

      expect(card.hasAttribute('variant')).toBe(false);
    });

    it('should replace the previous state when the variant changes', () => {
      const card = createCard();
      card.variant = 'elevated';

      card.variant = 'outlined';

      expect({
        elevated: card.matches(':state(elevated)'),
        outlined: card.matches(':state(outlined)'),
      }).toEqual({ elevated: false, outlined: true });
    });

    it('should clear the state when the variant is removed', () => {
      const card = createCard();
      card.variant = 'elevated';

      card.removeAttribute('variant');

      expect(card.matches(':state(elevated)')).toBe(false);
    });
  });

  describe('shadow tree', () => {
    it('should hold only the default slot', () => {
      const { children } = createCard().shadowRoot!;

      expect([...children].map((child) => child.outerHTML)).toEqual([
        '<slot></slot>',
      ]);
    });
  });

  describe('focus', () => {
    it('should reach a link and a button inside it in order, with no stop on the card', async () => {
      const card = createCard(
        '<a href="#target">Link</a><mx-button>Button</mx-button>',
      );
      const before = document.createElement('button');
      card.before(before);
      before.focus();

      await userEvent.keyboard(TAB);
      const first = document.activeElement;
      await userEvent.keyboard(TAB);

      expect([first?.localName, document.activeElement?.localName]).toEqual([
        'a',
        'mx-button',
      ]);
    });

    it('should not focus the card', () => {
      const card = createCard();

      card.focus();

      expect(document.activeElement).not.toBe(card);
    });
  });

  // Only Chromium exposes its accessibility tree to the test.
  describe.runIf(server.browser === 'chromium')('accessibility tree', () => {
    it('should add no role', async () => {
      createCard();

      expect((await commands.readAccessibilityTree('#card')).role).toBe(
        'generic',
      );
    });

    it('should keep the roles of a heading and a link inside it', async () => {
      createCard('<h2>Heading</h2><a href="#target">Link</a>');

      const { children } = await commands.readAccessibilityTree('#card');

      expect(children.map(({ role, name }) => ({ role, name }))).toEqual([
        { role: 'heading', name: 'Heading' },
        { role: 'link', name: 'Link' },
      ]);
    });

    it("should keep the consumer's role and name", async () => {
      const card = createCard();
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', 'Package');

      const { role, name } = await commands.readAccessibilityTree('#card');

      expect({ role, name }).toEqual({ role: 'article', name: 'Package' });
    });
  });
});
