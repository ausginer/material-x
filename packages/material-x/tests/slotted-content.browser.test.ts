import { describe, expect, it } from 'vitest';
import '../src/button-group/connected-button-group.ts';
import '../src/button/switch-button.ts';
import '../src/list/list-item.ts';
import '../src/text-field/multiline-text-field.ts';
import '../src/text-field/text-field.ts';
import { nextFrame } from './browser.ts';

type Change = (element: HTMLElement) => void;

type Way = Readonly<{
  when: string;
  /** Applies `change` while the element is out, and then connects it. */
  run: (element: HTMLElement, change: Change) => Promise<void>;
}>;

const CHANGED_WHILE_OUT: Way = {
  when: 'changes while it is out of the document',
  async run(element, change) {
    document.body.append(element);
    await nextFrame();
    element.remove();
    await nextFrame();
    change(element);
    await nextFrame();
    document.body.append(element);
    await nextFrame();
  },
};

const APPENDED_LATER: Way = {
  when: 'is there in a task before its first connection',
  async run(element, change) {
    change(element);
    await nextFrame();
    document.body.append(element);
    await nextFrame();
  },
};

const WAYS = [CHANGED_WHILE_OUT, APPENDED_LATER] as const;

function createContent(slot: string): HTMLElement {
  const content = document.createElement('span');
  content.slot = slot;
  content.textContent = slot;

  return content;
}

function getInput(field: HTMLElement): HTMLElement {
  return field.shadowRoot!.querySelector<HTMLElement>('.input')!;
}

describe('mx-text-field label', () => {
  it.each(WAYS)(
    'should name the control when the label $when',
    async ({ run }) => {
      const field = document.createElement('mx-text-field');
      await run(field, () => field.append(createContent('label')));

      expect(getInput(field).getAttribute('aria-labelledby')).toBe('label');
    },
  );

  it('should not name the control when the label is removed while it is out of the document', async () => {
    const field = document.createElement('mx-text-field');
    const label = createContent('label');
    field.append(label);
    await CHANGED_WHILE_OUT.run(field, () => label.remove());

    expect(getInput(field).hasAttribute('aria-labelledby')).toBe(false);
  });
});

describe.each(['mx-text-field', 'mx-multiline-text-field'] as const)(
  '%s supporting content',
  (tag) => {
    describe.each(['support', 'counter'])('in the %s slot', (slot) => {
      it.each(WAYS)(
        'should describe the control when the content $when',
        async ({ run }) => {
          const field = document.createElement(tag);
          await run(field, () => field.append(createContent(slot)));

          expect(getInput(field).getAttribute('aria-describedby')).toBe(slot);
        },
      );

      it.each(WAYS)(
        'should be shown when the content $when',
        async ({ run }) => {
          const field = document.createElement(tag);
          const content = createContent(slot);
          await run(field, () => field.append(content));

          expect(content.getBoundingClientRect().height).toBeGreaterThan(0);
        },
      );
    });
  },
);

describe('mx-connected-button-group buttons', () => {
  function createButton(value: string): HTMLElement {
    const button = document.createElement('mx-switch-button');
    button.setAttribute('value', value);
    button.textContent = value;

    return button;
  }

  function createGroup(values: readonly string[]): HTMLElement {
    const group = document.createElement('mx-connected-button-group');
    group.append(...values.map(createButton));

    return group;
  }

  function tabIndexes(group: HTMLElement): ReadonlyArray<string | null> {
    return Array.from(group.children, (button) =>
      button.getAttribute('tabindex'),
    );
  }

  /** The values of the buttons that have the group's end shapes. */
  function ends(
    group: HTMLElement,
  ): Readonly<{ first: readonly string[]; last: readonly string[] }> {
    const valuesOf = (selector: string) =>
      Array.from(group.querySelectorAll(selector), (button) =>
        button.getAttribute('value')!,
      );

    return {
      first: valuesOf('[data-first]'),
      last: valuesOf('[data-last]'),
    };
  }

  const CHANGES = [
    {
      what: 'an added button',
      initial: ['one', 'two'],
      change: (group: HTMLElement) => group.append(createButton('three')),
      expectedTabIndexes: ['0', '-1', '-1'],
      expectedEnds: { first: ['one'], last: ['three'] },
    },
    {
      what: 'the rest after the first button is removed',
      initial: ['one', 'two', 'three'],
      change: (group: HTMLElement) => group.firstElementChild!.remove(),
      expectedTabIndexes: ['0', '-1'],
      expectedEnds: { first: ['two'], last: ['three'] },
    },
  ] as const;

  describe.each(CHANGES)(
    'with $what',
    ({ initial, change, expectedTabIndexes, expectedEnds }) => {
      it.each(WAYS)(
        'should have one tab stop when the content $when',
        async ({ run }) => {
          const group = createGroup(initial);
          await run(group, change);

          expect(tabIndexes(group)).toEqual(expectedTabIndexes);
        },
      );

      it.each(WAYS)(
        'should have the end shapes on the end buttons when the content $when',
        async ({ run }) => {
          const group = createGroup(initial);
          await run(group, change);

          expect(ends(group)).toEqual(expectedEnds);
        },
      );
    },
  );
});

describe('mx-list-item large image', () => {
  async function createHeight(run: Way['run']): Promise<number> {
    const item = document.createElement('mx-list-item');
    item.textContent = 'Label';
    await run(item, () => {
      const image = document.createElement('img');
      image.slot = 'lead';
      image.dataset['large'] = '';
      image.alt = '';
      item.append(image);
    });

    return item.getBoundingClientRect().height;
  }

  it.each(WAYS)(
    'should give the item its height when the image $when',
    async ({ run }) => {
      const expected = await createHeight(async (item, change) => {
        document.body.append(item);
        await nextFrame();
        change(item);
        await nextFrame();
      });

      expect(await createHeight(run)).toBe(expected);
    },
  );
});
