import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/button/switch-button.ts';
import { whenFontsReady } from '../support/dom.ts';

function createFixture(name: string): HTMLDivElement {
  const fixture = document.createElement('div');
  fixture.className = 'mx-test-fixture';
  fixture.dataset['testid'] = name;
  document.body.append(fixture);
  return fixture;
}

function appendButton(
  fixture: HTMLElement,
  attributes: Readonly<Record<string, string>> = {},
  { icon = false }: Readonly<{ icon?: boolean }> = {},
): HTMLElement {
  const button = document.createElement('mx-button');

  if (icon) {
    const glyph = document.createElement('span');
    glyph.slot = 'icon';
    glyph.textContent = '★';
    button.append(glyph);
  }

  button.append(document.createTextNode('Button'));

  for (const [name, value] of Object.entries(attributes)) {
    button.setAttribute(name, value);
  }

  fixture.append(button);
  return button;
}

function appendSwitch(
  fixture: HTMLElement,
  attributes: Readonly<Record<string, string>> = {},
): void {
  const element = document.createElement('mx-switch-button');
  element.append(document.createTextNode('Switch'));

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  fixture.append(element);
}

describe('mx-button visual regression', () => {
  it('should match the color variant matrix', async () => {
    const fixture = createFixture('color-variants');

    for (const color of ['', 'elevated', 'tonal', 'outlined', 'text']) {
      appendButton(fixture, color ? { color } : {});
    }

    await whenFontsReady();
    await expect
      .element(page.getByTestId('color-variants'))
      .toMatchScreenshot('button-color-variants.png');
  });

  it('should match the size and shape matrix', async () => {
    const fixture = createFixture('sizes-and-shapes');

    for (const size of ['xsmall', '', 'medium', 'large', 'xlarge']) {
      appendButton(fixture, size ? { size } : {});
      appendButton(
        fixture,
        size ? { size, shape: 'square' } : { shape: 'square' },
      );
    }

    await whenFontsReady();
    await expect
      .element(page.getByTestId('sizes-and-shapes'))
      .toMatchScreenshot('button-sizes-and-shapes.png');
  });

  it('should match buttons composed with a leading icon', async () => {
    const fixture = createFixture('icon-composition');

    for (const color of ['', 'elevated', 'tonal', 'outlined', 'text']) {
      appendButton(fixture, color ? { color } : {}, { icon: true });
    }

    await whenFontsReady();
    await expect
      .element(page.getByTestId('icon-composition'))
      .toMatchScreenshot('button-icon-composition.png');
  });

  it('should match the switch variant matrix', async () => {
    const fixture = createFixture('switch-variants');

    for (const color of ['', 'elevated', 'tonal', 'outlined']) {
      appendSwitch(fixture, color ? { color } : {});
      appendSwitch(fixture, color ? { color, checked: '' } : { checked: '' });
    }

    await whenFontsReady();
    await expect
      .element(page.getByTestId('switch-variants'))
      .toMatchScreenshot('button-switch-variants.png');
  });

  it('should match enabled and disabled buttons', async () => {
    const fixture = createFixture('enabled-and-disabled');
    appendButton(fixture, { color: 'elevated' });
    appendButton(fixture, { color: 'elevated', disabled: '' });

    await whenFontsReady();
    await expect
      .element(page.getByTestId('enabled-and-disabled'))
      .toMatchScreenshot('button-enabled-and-disabled.png');
  });

  it('should match the hovered elevated button', async () => {
    const fixture = createFixture('hovered');
    const button = appendButton(fixture, { color: 'elevated' });

    await whenFontsReady();
    await userEvent.hover(button);

    await expect
      .element(page.getByTestId('hovered'))
      .toMatchScreenshot('button-hovered.png');
  });

  it('should match the keyboard-focused button', async () => {
    const fixture = createFixture('focused');
    appendButton(fixture, { color: 'elevated' });

    await whenFontsReady();
    await userEvent.tab();

    await expect
      .element(page.getByTestId('focused'))
      .toMatchScreenshot('button-focused.png');
  });
});
