import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/button-group/button-group.ts';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import '../../src/button/switch-button.ts';
import { nextFrame, whenFontsReady } from '../browser.ts';

const SIZES = ['xsmall', '', 'medium', 'large', 'xlarge'] as const;

function createFixture(name: string): HTMLDivElement {
  const fixture = document.createElement('div');
  fixture.className = 'mx-test-fixture';
  fixture.dataset['testid'] = name;
  document.body.append(fixture);
  return fixture;
}

function appendStandard(
  fixture: HTMLElement,
  attributes: Readonly<Record<string, string>>,
  labels: readonly string[] = ['One', 'Two', 'Three'],
): void {
  const group = document.createElement('mx-button-group');

  for (const [name, value] of Object.entries(attributes)) {
    group.setAttribute(name, value);
  }

  for (const label of labels) {
    const button = document.createElement('mx-button');
    button.textContent = label;
    group.append(button);
  }

  fixture.append(group);
}

function appendConnected(
  fixture: HTMLElement,
  attributes: Readonly<Record<string, string>>,
  values: readonly string[] = ['One', 'Two', 'Three'],
): void {
  const group = document.createElement('mx-connected-button-group');

  for (const [name, value] of Object.entries(attributes)) {
    group.setAttribute(name, value);
  }

  for (const value of values) {
    const button = document.createElement('mx-switch-button');
    button.setAttribute('value', value);
    button.textContent = value;
    group.append(button);
  }

  fixture.append(group);
}

describe('button-group visual regression', () => {
  it('should match the standard size matrix', async () => {
    const fixture = createFixture('standard-sizes');

    for (const size of SIZES) {
      appendStandard(fixture, size ? { size } : {});
    }

    await whenFontsReady();
    await nextFrame();
    await expect
      .element(page.getByTestId('standard-sizes'))
      .toMatchScreenshot('button-group-standard-sizes.png');
  });

  it('should match the connected size matrix', async () => {
    const fixture = createFixture('connected-sizes');

    for (const size of SIZES) {
      appendConnected(fixture, size ? { size } : {});
    }

    await whenFontsReady();
    await nextFrame();
    await expect
      .element(page.getByTestId('connected-sizes'))
      .toMatchScreenshot('button-group-connected-sizes.png');
  });

  it('should match a connected group with a selected button', async () => {
    const fixture = createFixture('connected-selected');
    appendConnected(fixture, { value: 'Two' });

    await whenFontsReady();
    await nextFrame();
    await expect
      .element(page.getByTestId('connected-selected'))
      .toMatchScreenshot('button-group-connected-selected.png');
  });

  it('should match a disabled standard group', async () => {
    const fixture = createFixture('standard-disabled');
    appendStandard(fixture, { disabled: '' });

    await whenFontsReady();
    await nextFrame();
    await expect
      .element(page.getByTestId('standard-disabled'))
      .toMatchScreenshot('button-group-standard-disabled.png');
  });
});
