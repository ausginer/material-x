import type { Result } from 'axe-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { server } from 'vitest/browser';
import files from '../files.json' with { type: 'json' };
import { nextFrame } from './browser.ts';
import arrowFontUrl from './support/fonts/keyboard-arrow-down.ttf?url';

/**
 * axe-core over every element that a runtime entry of `files.json` defines, in
 * each state that changes its role, name or ARIA.
 *
 * The check is supplementary: a component's accessibility contract stays in the
 * rows that assert it, and no such row is removed because axe passes.
 *
 * - A new element or state takes a row in `ROWS`, in one fixture of its own, so
 *   axe's target selectors depend on nothing else in the page.
 * - A row's `violations` are exactly what axe reports on it. A violation that
 *   axe starts to report fails, and so does a listed one that is gone. Add a
 *   line with the address of the record entry that owns it, and remove it with
 *   the repair.
 * - A row is marked `hasNoRule` when axe has no rule for anything in it. Such a
 *   row fails once axe applies one.
 * - An icon in a control is `aria-hidden`. axe takes an `mx-icon`'s text into
 *   the control's name although the icon's slot is hidden from the browsers'
 *   trees, so without the attribute a control that loses its name isn't
 *   reported.
 * - A fixture's icons are `check`, because an icon that the test font doesn't
 *   have renders its name as text. The split button renders its own icon, so
 *   its rows use a font that has it.
 *
 * Limits: axe doesn't see a role that a host has through `ElementInternals`,
 * axe names an `mx-icon` by its text, and it reports only what it has a rule
 * for. `color-contrast` is off, because
 * contrast belongs to the palette and the page's theme. `incomplete`, what axe
 * can't decide, isn't asserted.
 *
 * Chromium only: axe reads the DOM and computed styles, and the engines gave
 * the same results. The others import neither axe nor the elements.
 */

type Violation = Readonly<{
  rule: string;
  /** The selector in each shadow tree, from the document inwards. */
  target: string;
  /** The address of the record entry that owns the violation. */
  owner: string;
}>;

type Row = Readonly<{
  state: string;
  html: string;
  /** Changes the fixture after it is rendered. */
  change?(fixture: HTMLElement): void;
  hasNoRule?: boolean;
  violations?: readonly Violation[];
}>;

const CHECKBOX_LABEL: readonly Violation[] = [
  { rule: 'label', target: 'mx-checkbox > #input', owner: 'repo:RF-94' },
];

const RADIO_LABEL: readonly Violation[] = [
  { rule: 'label', target: 'mx-radio > #input', owner: 'repo:RF-94' },
];

const ITEM_SELECTED: readonly Violation[] = [
  {
    rule: 'aria-allowed-attr',
    target: 'mx-list-button-item > button',
    owner: 'repo:RF-132',
  },
];

const ITEM_NESTED: readonly Violation[] = [
  {
    rule: 'nested-interactive',
    target: 'mx-list-button-item > button',
    owner: 'repo:RF-144',
  },
];

const ICON = '<mx-icon aria-hidden="true">check</mx-icon>';
const ICON_SLOT = '<mx-icon slot="icon" aria-hidden="true">check</mx-icon>';
const LABEL_SLOT = '<span slot="label">Name</span>';
/** A family of its own, so the document's icon font renders the other icons. */
const ARROW_FAMILY = 'Keyboard Arrow Down';
const ARROW_STYLE = `style="--md-icon-font: ${ARROW_FAMILY}"`;
const HANDLE = '<span data-handle slot="lead" aria-label="Move A">=</span>';

/** The rows of each element, by tag. */
const ROWS: Readonly<Record<string, readonly Row[]>> = {
  'mx-button': [
    { state: 'enabled', html: '<mx-button>Go</mx-button>' },
    { state: 'disabled', html: '<mx-button disabled>Go</mx-button>' },
    {
      state: 'icon only',
      html: `<mx-button aria-label="Go">${ICON_SLOT}</mx-button>`,
    },
  ],
  'mx-link-button': [
    {
      state: 'enabled',
      html: '<mx-link-button href="#x">Go</mx-link-button>',
    },
    {
      state: 'disabled',
      html: '<mx-link-button href="#x" disabled>Go</mx-link-button>',
    },
  ],
  'mx-icon-button': [
    {
      state: 'enabled',
      html: `<mx-icon-button aria-label="Edit">${ICON}</mx-icon-button>`,
    },
    {
      state: 'disabled',
      html: `<mx-icon-button disabled aria-label="Edit">${ICON}</mx-icon-button>`,
    },
  ],
  'mx-switch-button': [
    { state: 'off', html: '<mx-switch-button>On</mx-switch-button>' },
    { state: 'on', html: '<mx-switch-button checked>On</mx-switch-button>' },
    {
      state: 'disabled',
      html: '<mx-switch-button disabled>On</mx-switch-button>',
    },
    {
      state: 'required with an error',
      html: '<mx-switch-button error required>On</mx-switch-button>',
    },
  ],
  'mx-switch-icon-button': [
    {
      state: 'off',
      html: `<mx-switch-icon-button aria-label="Like">${ICON}</mx-switch-icon-button>`,
    },
    {
      state: 'on',
      html: `<mx-switch-icon-button checked aria-label="Like">${ICON}</mx-switch-icon-button>`,
    },
    {
      state: 'required with an error',
      html: `<mx-switch-icon-button error required aria-label="Like">${ICON}</mx-switch-icon-button>`,
    },
  ],
  'mx-split-button': [
    {
      state: 'closed',
      html: `<mx-split-button ${ARROW_STYLE} secondarylabel="More options">Go</mx-split-button>`,
    },
    {
      state: 'open',
      html: `<mx-split-button ${ARROW_STYLE} open secondarylabel="More options">Go</mx-split-button>`,
    },
    {
      state: 'disabled',
      html: `<mx-split-button ${ARROW_STYLE} disabled secondarylabel="More options">Go</mx-split-button>`,
    },
    {
      state: 'without secondarylabel',
      html: `<mx-split-button ${ARROW_STYLE}>Go</mx-split-button>`,
      violations: [
        {
          rule: 'button-name',
          target: 'mx-split-button > mx-icon-button > button',
          owner: 'repo:RD-58',
        },
      ],
    },
  ],
  'mx-button-group': [
    {
      state: 'named',
      html: '<mx-button-group aria-label="View"><mx-button>A</mx-button><mx-button>B</mx-button></mx-button-group>',
    },
  ],
  'mx-connected-button-group': [
    {
      state: 'named',
      html: '<mx-connected-button-group aria-label="View"><mx-switch-button value="a" checked>A</mx-switch-button><mx-switch-button value="b">B</mx-switch-button></mx-connected-button-group>',
    },
  ],
  'mx-card': [
    { state: 'static', html: '<mx-card>Card</mx-card>', hasNoRule: true },
  ],
  'mx-checkbox': [
    {
      state: 'unchecked',
      html: '<mx-checkbox aria-label="C"></mx-checkbox>',
      violations: CHECKBOX_LABEL,
    },
    {
      state: 'checked',
      html: '<mx-checkbox checked aria-label="C"></mx-checkbox>',
      violations: CHECKBOX_LABEL,
    },
    {
      state: 'indeterminate',
      html: '<mx-checkbox indeterminate aria-label="C"></mx-checkbox>',
      violations: CHECKBOX_LABEL,
    },
    {
      state: 'disabled',
      html: '<mx-checkbox disabled aria-label="C"></mx-checkbox>',
      violations: CHECKBOX_LABEL,
    },
    {
      state: 'required with an error',
      html: '<mx-checkbox error required aria-label="C"></mx-checkbox>',
      violations: CHECKBOX_LABEL,
    },
    {
      state: 'with a label element',
      html: '<label for="c">C</label><mx-checkbox id="c"></mx-checkbox>',
      violations: [
        { rule: 'label', target: '#c > #input', owner: 'repo:RF-94' },
      ],
    },
  ],
  'mx-radio': [
    {
      state: 'unchecked',
      html: '<mx-radio aria-label="R"></mx-radio>',
      violations: RADIO_LABEL,
    },
    {
      state: 'checked',
      html: '<mx-radio checked aria-label="R"></mx-radio>',
      violations: RADIO_LABEL,
    },
    {
      state: 'disabled',
      html: '<mx-radio disabled aria-label="R"></mx-radio>',
      violations: RADIO_LABEL,
    },
    {
      state: 'required with an error',
      html: '<mx-radio error required aria-label="R"></mx-radio>',
      violations: RADIO_LABEL,
    },
  ],
  'mx-fab': [
    {
      state: 'icon only',
      html: `<mx-fab aria-label="Add">${ICON_SLOT}</mx-fab>`,
    },
    {
      state: 'extended and open',
      html: `<mx-fab extended="open">${ICON_SLOT}Add</mx-fab>`,
    },
    {
      state: 'extended and closed',
      html: `<mx-fab extended="closed" aria-label="Add">${ICON_SLOT}Add</mx-fab>`,
    },
    {
      state: 'disabled',
      html: `<mx-fab disabled aria-label="Add">${ICON_SLOT}</mx-fab>`,
    },
  ],
  'mx-icon': [
    { state: 'exposed', html: '<mx-icon>check</mx-icon>', hasNoRule: true },
    { state: 'hidden', html: ICON },
  ],
  'mx-list': [
    {
      state: 'with a static item',
      html: '<mx-list><mx-list-item>Item</mx-list-item></mx-list>',
      hasNoRule: true,
    },
  ],
  'mx-list-item': [
    {
      state: 'with a handle',
      html: `<mx-sortable-list><mx-list-item>${HANDLE}A</mx-list-item></mx-sortable-list>`,
    },
  ],
  'mx-list-button-item': [
    {
      state: 'enabled',
      html: '<mx-list><mx-list-button-item>Item</mx-list-button-item></mx-list>',
    },
    {
      state: 'selected',
      html: '<mx-list><mx-list-button-item selected>Item</mx-list-button-item></mx-list>',
      violations: ITEM_SELECTED,
    },
    {
      state: 'deselected',
      html: '<mx-list><mx-list-button-item selected>Item</mx-list-button-item></mx-list>',
      change(fixture) {
        fixture
          .querySelector('mx-list-button-item')!
          .removeAttribute('selected');
      },
      violations: ITEM_SELECTED,
    },
    {
      state: 'disabled',
      html: '<mx-list><mx-list-button-item disabled>Item</mx-list-button-item></mx-list>',
    },
    {
      state: 'with a handle',
      html: `<mx-sortable-list><mx-list-button-item>${HANDLE}A</mx-list-button-item></mx-sortable-list>`,
      violations: ITEM_NESTED,
    },
    {
      state: 'disabled with a handle',
      html: `<mx-sortable-list><mx-list-button-item disabled>${HANDLE}A</mx-list-button-item></mx-sortable-list>`,
      violations: ITEM_NESTED,
    },
    {
      state: 'with a trailing control',
      html: `<mx-list><mx-list-button-item>A<mx-icon-button slot="trail" aria-label="More">${ICON}</mx-icon-button></mx-list-button-item></mx-list>`,
      violations: ITEM_NESTED,
    },
  ],
  'mx-list-link-item': [
    {
      state: 'enabled',
      html: '<mx-list><mx-list-link-item href="#x">Item</mx-list-link-item></mx-list>',
    },
    {
      state: 'selected',
      html: '<mx-list><mx-list-link-item href="#x" selected>Item</mx-list-link-item></mx-list>',
    },
    {
      state: 'disabled',
      html: '<mx-list><mx-list-link-item href="#x" disabled>Item</mx-list-link-item></mx-list>',
    },
  ],
  'mx-sortable-list': [
    {
      state: 'with items',
      html: '<mx-sortable-list><mx-list-item>A</mx-list-item><mx-list-item>B</mx-list-item></mx-sortable-list>',
    },
    {
      state: 'with an icon as a handle',
      html: '<mx-sortable-list><mx-list-item><mx-icon data-handle slot="lead" aria-label="Move A">check</mx-icon>A</mx-list-item></mx-sortable-list>',
    },
    {
      state: "with an icon as a handle and no label of the page's",
      html: '<mx-sortable-list><mx-list-item><mx-icon data-handle slot="lead">check</mx-icon>A</mx-list-item></mx-sortable-list>',
    },
    {
      state: 'with a handle that the component names',
      html: '<mx-sortable-list><mx-list-item><span data-handle slot="lead"><mx-icon aria-hidden="true">check</mx-icon></span>A</mx-list-item></mx-sortable-list>',
    },
    {
      state: 'with button items',
      html: '<mx-sortable-list><mx-list-button-item>A</mx-list-button-item><mx-list-button-item disabled>B</mx-list-button-item></mx-sortable-list>',
    },
  ],
  'mx-slider': [
    {
      state: 'with a label',
      html: `<mx-slider value="40">${LABEL_SLOT}</mx-slider>`,
    },
    {
      state: 'with aria-label',
      html: '<mx-slider value="40" aria-label="Volume"></mx-slider>',
    },
    {
      state: 'with a value text',
      html: `<mx-slider value="40" valuetext="40 percent">${LABEL_SLOT}</mx-slider>`,
    },
    {
      state: 'disabled',
      html: `<mx-slider value="40" disabled>${LABEL_SLOT}</mx-slider>`,
    },
    {
      state: 'with an error',
      html: `<mx-slider value="40" error>${LABEL_SLOT}</mx-slider>`,
    },
  ],
  'mx-text-field': [
    {
      state: 'with a label',
      html: `<mx-text-field value="v">${LABEL_SLOT}</mx-text-field>`,
    },
    {
      state: 'with aria-label',
      html: '<mx-text-field aria-label="Name"></mx-text-field>',
    },
    {
      state: 'outlined',
      html: `<mx-text-field outlined value="v">${LABEL_SLOT}</mx-text-field>`,
    },
    {
      state: 'required with an error, a support text and a counter',
      html: `<mx-text-field error required value="v">${LABEL_SLOT}<span slot="support">Bad</span><span slot="counter">1/9</span></mx-text-field>`,
    },
    {
      state: 'disabled',
      html: `<mx-text-field disabled value="v">${LABEL_SLOT}</mx-text-field>`,
    },
    {
      state: 'read-only',
      html: `<mx-text-field readonly value="v">${LABEL_SLOT}</mx-text-field>`,
    },
  ],
  'mx-multiline-text-field': [
    {
      state: 'with a label',
      html: `<mx-multiline-text-field value="v">${LABEL_SLOT}</mx-multiline-text-field>`,
    },
    {
      state: 'required with an error and a support text',
      html: `<mx-multiline-text-field error required value="v">${LABEL_SLOT}<span slot="support">Bad</span></mx-multiline-text-field>`,
    },
    {
      state: 'disabled',
      html: `<mx-multiline-text-field disabled value="v">${LABEL_SLOT}</mx-multiline-text-field>`,
    },
  ],
  'mx-top-app-bar': [
    {
      state: 'with controls',
      html: `<mx-top-app-bar><mx-icon-button slot="lead" aria-label="Menu">${ICON}</mx-icon-button><h1>Head</h1><mx-icon-button slot="trail" aria-label="More">${ICON}</mx-icon-button></mx-top-app-bar>`,
    },
  ],
};

const modules = import.meta.glob<unknown>('../src/**/*.ts');

/** Renders `html` as the page's only fixture. */
async function render(html: string): Promise<HTMLElement> {
  const fixture = document.createElement('div');
  fixture.innerHTML = html;
  document.body.append(fixture);
  await nextFrame();
  // A slot change that the first frame settles can render in the second.
  await nextFrame();

  return fixture;
}

/** Runs axe on `fixture` alone, which leaves out the rules about a page. */
async function check(
  fixture: HTMLElement,
): Promise<Readonly<{ violations: readonly string[]; applied: boolean }>> {
  const { default: axe } = await import('axe-core');
  const { passes, violations, incomplete } = await axe.run(fixture, {
    rules: { 'color-contrast': { enabled: false } },
  });

  return {
    violations: violations.flatMap(describeNodes).toSorted(),
    applied: passes.length + violations.length + incomplete.length > 0,
  };
}

function describeNodes({ id, nodes }: Result): readonly string[] {
  return nodes.map(({ target }) => `${id} at ${target.flat().join(' > ')}`);
}

describe.runIf(server.browser === 'chromium')('axe-core', () => {
  let tags: readonly string[];

  beforeAll(async () => {
    const define = vi.spyOn(customElements, 'define');

    for (const entry of files.runtime) {
      // oxlint-disable-next-line no-await-in-loop
      await modules[`../src/${entry}.ts`]!();
    }

    tags = define.mock.calls.map(([tag]) => tag);
    define.mockRestore();

    const arrow = new FontFace(ARROW_FAMILY, `url(${arrowFontUrl})`);
    document.fonts.add(await arrow.load());
  });

  it('should have a row for each element that a runtime entry defines', () => {
    expect(Object.keys(ROWS).toSorted()).toEqual(tags.toSorted());
  });

  it('should report an unnamed control inside a shadow tree', async () => {
    const { violations } = await check(
      await render('<mx-icon-button></mx-icon-button>'),
    );

    expect(violations).toEqual(['button-name at mx-icon-button > button']);
  });

  describe.each(Object.entries(ROWS))('%s', (tag, rows) => {
    it.each(rows)(
      'should have exactly its listed violations: $state',
      async ({ html, change, hasNoRule = false, violations: listed = [] }) => {
        const fixture = await render(html);

        if (change) {
          change(fixture);
          await nextFrame();
        }

        expect(fixture.querySelector(tag)).not.toBeNull();

        const { violations, applied } = await check(fixture);
        const owners = listed.map(
          ({ rule, target, owner }) => `${rule} at ${target} (${owner})`,
        );

        expect(violations, `Listed: ${owners.join(', ') || 'none'}`).toEqual(
          listed.map(({ rule, target }) => `${rule} at ${target}`).toSorted(),
        );
        expect(applied, 'Whether axe applied a rule').toBe(!hasNoRule);
      },
    );
  });
});
