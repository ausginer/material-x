import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../src/text-field/multiline-text-field.ts';
import '../../src/text-field/text-field.ts';
import { nextFrame, pixels } from '../browser.ts';

type FieldTag = 'mx-text-field' | 'mx-multiline-text-field';
type FieldElement = HTMLElement & {
  isPopulated: boolean;
  value: string | null;
};
type InternalFieldElement = HTMLInputElement | HTMLTextAreaElement;

const FIELD_TAGS = ['mx-text-field', 'mx-multiline-text-field'] as const;

function createField(tag: FieldTag): FieldElement {
  return document.createElement(tag);
}

function getInput(field: HTMLElement): InternalFieldElement {
  const input = field.shadowRoot!.querySelector<
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

/**
 * The slot rows find each slot and supporting row by `part`, which no
 * stylesheet rule selects, so a slot whose class disagrees with its stylesheet
 * fails the rule's assertion rather than the lookup. `.notched-outline` and
 * `.input` are found by class; no selector beside `:has-slotted` names either.
 */
function getShadowElement(field: HTMLElement, selector: string): HTMLElement {
  const element = field.shadowRoot!.querySelector<HTMLElement>(selector);

  if (!element) {
    throw new Error(`Missing internal text field element ${selector}`);
  }

  return element;
}

/**
 * Slots a box of fixed inline size, so every column the slot's presence opens
 * has an integer width and the geometry compares exactly.
 */
function addSlottedBox(field: HTMLElement, slot: string): HTMLElement {
  const element = document.createElement('span');
  element.slot = slot;
  element.style.display = 'inline-block';
  element.style.inlineSize = '24px';
  element.style.blockSize = '24px';
  field.append(element);
  return element;
}

/** The inline offset of the internal field's start from the host's start. */
function getInputStart(field: HTMLElement): number {
  return (
    getInput(field).getBoundingClientRect().left -
    field.getBoundingClientRect().left
  );
}

/** The inline offset of the internal field's end from the host's end. */
function getInputEnd(field: HTMLElement): number {
  return (
    field.getBoundingClientRect().right -
    getInput(field).getBoundingClientRect().right
  );
}

const SLOT_TOKENS = [
  'container.icon.padding.inline',
  'container.padding.inline',
  'input-text.prefix.gap',
  'input-text.suffix.gap',
  'supporting-text.row-gap',
] as const;

type SlotTokenValues = Readonly<Record<(typeof SLOT_TOKENS)[number], number>>;

describe.each(FIELD_TAGS)('%s slotted content', (tag) => {
  let tokens: SlotTokenValues;

  beforeAll(async () => {
    const { values } = await commands.resolveTokenContract({
      contract: 'text-field.default',
      state: 'default',
      tokens: SLOT_TOKENS,
    });

    tokens = Object.fromEntries(
      SLOT_TOKENS.map((token) => [token, pixels(values[token]!)]),
    );
  }, 120_000);

  async function renderField(): Promise<FieldElement> {
    const field = createField(tag);
    document.body.append(field);
    await nextFrame();
    return field;
  }

  it('should open the lead column with the icon padding and gap while lead has content', async () => {
    const field = await renderField();
    const empty = getInputStart(field);
    const lead = getShadowElement(field, '[part=lead]');
    const content = addSlottedBox(field, 'lead');

    await nextFrame();

    expect(lead.getBoundingClientRect().width).toBe(
      content.getBoundingClientRect().width,
    );
    expect(getInputStart(field)).toBe(
      tokens['container.icon.padding.inline'] +
        content.getBoundingClientRect().width +
        tokens['container.padding.inline'],
    );

    content.remove();
    await nextFrame();

    expect(getInputStart(field)).toBe(empty);
  });

  it('should open the trail column with the icon padding and gap while trail has content', async () => {
    const field = await renderField();
    const empty = getInputEnd(field);
    const trail = getShadowElement(field, '[part=trail]');
    const content = addSlottedBox(field, 'trail');

    await nextFrame();

    expect(trail.getBoundingClientRect().width).toBe(
      content.getBoundingClientRect().width,
    );
    expect(getInputEnd(field)).toBe(
      tokens['container.icon.padding.inline'] +
        content.getBoundingClientRect().width +
        tokens['container.padding.inline'],
    );

    content.remove();
    await nextFrame();

    expect(getInputEnd(field)).toBe(empty);
  });

  it('should open the prefix column with the prefix gap while prefix has content', async () => {
    const field = await renderField();
    const empty = getInputStart(field);
    const prefix = getShadowElement(field, '[part=prefix]');
    const content = addSlottedBox(field, 'prefix');

    await nextFrame();

    expect(prefix.getBoundingClientRect().width).toBe(
      content.getBoundingClientRect().width,
    );
    expect(getInputStart(field)).toBe(
      tokens['container.padding.inline'] +
        content.getBoundingClientRect().width +
        tokens['input-text.prefix.gap'],
    );

    content.remove();
    await nextFrame();

    expect(getInputStart(field)).toBe(empty);
  });

  it('should open the suffix column with the suffix gap while suffix has content', async () => {
    const field = await renderField();
    const empty = getInputEnd(field);
    const suffix = getShadowElement(field, '[part=suffix]');
    const content = addSlottedBox(field, 'suffix');

    await nextFrame();

    expect(suffix.getBoundingClientRect().width).toBe(
      content.getBoundingClientRect().width,
    );
    expect(getInputEnd(field)).toBe(
      tokens['container.padding.inline'] +
        content.getBoundingClientRect().width +
        tokens['input-text.suffix.gap'],
    );

    content.remove();
    await nextFrame();

    expect(getInputEnd(field)).toBe(empty);
  });

  it.each(['support', 'counter'])(
    'should open the supporting row below the row gap while %s has content',
    async (slot) => {
      const field = await renderField();
      const empty = field.getBoundingClientRect().height;
      const container = getShadowElement(field, '.notched-outline');
      const row = getShadowElement(field, `[part=${slot}]`);
      const rowSlot = getShadowElement(field, `[part=${slot}] slot`);
      const content = addSlottedContent(field, slot);

      await nextFrame();

      expect(row.getBoundingClientRect().height).toBe(
        rowSlot.getBoundingClientRect().height,
      );
      expect(
        row.getBoundingClientRect().top -
          container.getBoundingClientRect().bottom,
      ).toBe(tokens['supporting-text.row-gap']);

      content.remove();
      await nextFrame();

      expect(field.getBoundingClientRect().height).toBe(empty);
    },
  );
});

describe.each(FIELD_TAGS)('%s', (tag) => {
  it('should restore slot label fallback after aria-labelledby removal', async () => {
    const field = createField(tag);

    addSlottedContent(field, 'label', 'Field label');
    field.setAttribute('aria-labelledby', 'external-label');
    document.body.append(field);

    await nextFrame();

    const input = getInput(field);

    expect(input.getAttribute('aria-labelledby')).toBe('external-label');

    field.removeAttribute('aria-labelledby');

    await nextFrame();

    expect(input.getAttribute('aria-labelledby')).toBe('label');
  });

  it('should restore support and counter fallback after aria-describedby removal', async () => {
    const field = createField(tag);

    addSlottedContent(field, 'support', 'Supporting text');
    addSlottedContent(field, 'counter', '1/10');
    field.setAttribute('aria-describedby', 'external-description');
    document.body.append(field);

    await nextFrame();

    const input = getInput(field);

    expect(input.getAttribute('aria-describedby')).toBe('external-description');

    field.removeAttribute('aria-describedby');

    await nextFrame();

    expect(input.getAttribute('aria-describedby')).toBe('support counter');
  });

  it('should remove fallback aria-describedby when related slots become empty', async () => {
    const field = createField(tag);
    const support = addSlottedContent(field, 'support', 'Supporting text');
    const counter = addSlottedContent(field, 'counter', '1/10');

    document.body.append(field);

    await nextFrame();

    const input = getInput(field);

    expect(input.getAttribute('aria-describedby')).toBe('support counter');

    support.remove();
    counter.remove();

    await nextFrame();

    expect(input.hasAttribute('aria-describedby')).toBeFalsy();
  });

  it('should update slot label fallback as label content is added and removed', async () => {
    const field = createField(tag);

    document.body.append(field);

    await nextFrame();

    const input = getInput(field);

    expect(input.hasAttribute('aria-labelledby')).toBeFalsy();

    const label = addSlottedContent(field, 'label', 'Field label');

    await nextFrame();

    expect(input.getAttribute('aria-labelledby')).toBe('label');

    label.remove();

    await nextFrame();

    expect(input.hasAttribute('aria-labelledby')).toBeFalsy();
  });

  it('should keep populated state in sync for value setter and input events', async () => {
    const field = createField(tag);

    document.body.append(field);

    await nextFrame();

    const input = getInput(field);

    field.value = 'filled';

    expect(field.isPopulated).toBeTruthy();

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    await nextFrame();

    expect(field.isPopulated).toBeFalsy();
  });

  it('should expose the original native-like input event', async () => {
    const field = createField(tag);

    document.body.append(field);

    await nextFrame();

    const input = getInput(field);
    const events: Array<
      Readonly<{ event: Event; target: EventTarget | null }>
    > = [];

    field.addEventListener('input', (event) => {
      events.push({ event, target: event.target });
    });

    const event = new InputEvent('input', {
      bubbles: true,
      composed: true,
      data: 'a',
      inputType: 'insertText',
    });
    input.dispatchEvent(event);

    expect(events).toEqual([{ event, target: field }]);
  });

  it('should bridge change from the internal field to the host', async () => {
    const field = createField(tag);

    document.body.append(field);

    await nextFrame();

    const input = getInput(field);
    const events: Event[] = [];

    field.addEventListener('change', (event) => {
      events.push(event);
    });

    const internalEvent = new Event('change', { bubbles: true });
    input.dispatchEvent(internalEvent);

    expect(events).toHaveLength(1);

    const [event] = events;

    expect(event).not.toBe(internalEvent);
    expect(event?.target).toBe(field);
    expect(event?.bubbles).toBeTruthy();
    expect(event?.composed).toBeFalsy();
    expect(event?.cancelable).toBeFalsy();
  });
});

describe('mx-multiline-text-field', () => {
  it('should grow the textarea by one line for each line typed', async () => {
    const field = createField('mx-multiline-text-field');

    document.body.append(field);

    await nextFrame();

    const textarea = getInput(field);
    const lineHeight = pixels(getComputedStyle(textarea).lineHeight);
    const oneLine = textarea.getBoundingClientRect().height;

    await userEvent.click(textarea);
    await userEvent.keyboard('first{Enter}second{Enter}third');
    await nextFrame();

    expect([textarea.value, textarea.getBoundingClientRect().height]).toEqual([
      'first\nsecond\nthird',
      oneLine + 2 * lineHeight,
    ]);
  });

  it('should grow the textarea by one line for each line of a value set through the host', async () => {
    const field = createField('mx-multiline-text-field');

    document.body.append(field);

    await nextFrame();

    const textarea = getInput(field);
    const lineHeight = pixels(getComputedStyle(textarea).lineHeight);
    const oneLine = textarea.getBoundingClientRect().height;

    field.value = 'first\nsecond\nthird\nfourth';
    await nextFrame();

    expect([
      textarea.getBoundingClientRect().height,
      textarea.scrollHeight,
    ]).toEqual([oneLine + 3 * lineHeight, 4 * lineHeight]);
  });

  it('should wrap a line that has no break opportunity within the field', async () => {
    const field = createField('mx-multiline-text-field');
    field.style.display = 'block';
    field.style.inlineSize = '300px';

    document.body.append(field);

    await nextFrame();

    const textarea = getInput(field);
    const oneLine = textarea.getBoundingClientRect().height;

    field.value = 'x'.repeat(200);
    await nextFrame();

    expect([
      textarea.scrollWidth,
      textarea.getBoundingClientRect().height > oneLine,
    ]).toEqual([textarea.clientWidth, true]);
  });
});
