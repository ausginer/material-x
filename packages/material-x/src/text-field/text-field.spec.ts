import { afterEach, describe, expect, it } from 'vitest';

const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

if (isBrowser) {
  await import('./text-field.ts');
  await import('./multiline-text-field.ts');
}

type FieldTag = 'mx-text-field' | 'mx-multiline-text-field';
type FieldElement = HTMLElement & {
  isPopulated: boolean;
  value: string | null;
};
type InternalFieldElement = HTMLInputElement | HTMLTextAreaElement;

const FIELD_TAGS = ['mx-text-field', 'mx-multiline-text-field'] as const;

function createField(tag: FieldTag): FieldElement {
  return document.createElement(tag) as FieldElement;
}

function getInput(field: HTMLElement): InternalFieldElement {
  const input = field.shadowRoot?.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >('.input');

  if (!input) {
    throw new Error('Missing internal text field');
  }

  return input;
}

function addSlottedContent(
  field: HTMLElement,
  slot: string,
  text = slot,
): HTMLElement {
  const element = document.createElement('span');
  element.slot = slot;
  element.textContent = text;
  field.append(element);
  return element;
}

async function nextFrame(): Promise<void> {
  return await new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function flushDOM(): Promise<void> {
  await Promise.resolve();
  await nextFrame();
  await Promise.resolve();
}

afterEach(() => {
  if (isBrowser) {
    document.body.replaceChildren();
  }
});

if (isBrowser) {
  describe.each(FIELD_TAGS)('%s', (tag) => {
    it('should restore slot label fallback after aria-labelledby removal', async () => {
      const field = createField(tag);

      addSlottedContent(field, 'label', 'Field label');
      field.setAttribute('aria-labelledby', 'external-label');
      document.body.append(field);

      await flushDOM();

      const input = getInput(field);

      expect(input.getAttribute('aria-labelledby')).toBe('external-label');

      field.removeAttribute('aria-labelledby');

      await flushDOM();

      expect(input.getAttribute('aria-labelledby')).toBe('label');
    });

    it('should restore support and counter fallback after aria-describedby removal', async () => {
      const field = createField(tag);

      addSlottedContent(field, 'support', 'Supporting text');
      addSlottedContent(field, 'counter', '1/10');
      field.setAttribute('aria-describedby', 'external-description');
      document.body.append(field);

      await flushDOM();

      const input = getInput(field);

      expect(input.getAttribute('aria-describedby')).toBe(
        'external-description',
      );

      field.removeAttribute('aria-describedby');

      await flushDOM();

      expect(input.getAttribute('aria-describedby')).toBe('support counter');
    });

    it('should remove fallback aria-describedby when related slots become empty', async () => {
      const field = createField(tag);
      const support = addSlottedContent(field, 'support', 'Supporting text');
      const counter = addSlottedContent(field, 'counter', '1/10');

      document.body.append(field);

      await flushDOM();

      const input = getInput(field);

      expect(input.getAttribute('aria-describedby')).toBe('support counter');

      support.remove();
      counter.remove();

      await flushDOM();

      expect(input.hasAttribute('aria-describedby')).toBe(false);
    });

    it('should update slot label fallback as label content is added and removed', async () => {
      const field = createField(tag);

      document.body.append(field);

      await flushDOM();

      const input = getInput(field);

      expect(input.hasAttribute('aria-labelledby')).toBe(false);

      const label = addSlottedContent(field, 'label', 'Field label');

      await flushDOM();

      expect(input.getAttribute('aria-labelledby')).toBe('label');

      label.remove();

      await flushDOM();

      expect(input.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('should keep populated state in sync for value setter and input events', async () => {
      const field = createField(tag);

      document.body.append(field);

      await flushDOM();

      const input = getInput(field);

      field.value = 'filled';

      expect(field.isPopulated).toBe(true);

      input.value = '';
      input.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );

      await flushDOM();

      expect(field.isPopulated).toBe(false);
    });
  });
} else {
  describe('text-field browser tests', () => {
    it.skip('should run in browser mode', () => {});
  });
}
