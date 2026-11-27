import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/card/card.ts';
import '../../src/divider/divider.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list.ts';
import { whenFontsReady } from '../browser.ts';

describe('mx-divider visual regression', () => {
  it('should match the insets, a vertical divider, a list and a card', async () => {
    const fixture = document.createElement('div');
    fixture.className = 'mx-test-fixture';
    fixture.dataset['testid'] = 'dividers';
    fixture.style.display = 'grid';
    fixture.style.gap = '16px';
    fixture.style.inlineSize = '320px';
    fixture.innerHTML = `
      <mx-divider></mx-divider>
      <mx-divider inset="start"></mx-divider>
      <mx-divider inset="middle"></mx-divider>
      <div style="display: flex; gap: 8px; block-size: 32px; align-items: center">
        <span>Before</span><mx-divider orientation="vertical"></mx-divider><span>After</span>
      </div>
      <mx-list>
        <mx-list-item>One</mx-list-item>
        <mx-divider inset="start"></mx-divider>
        <mx-list-item>Two</mx-list-item>
        <mx-divider></mx-divider>
        <mx-list-item>Three</mx-list-item>
      </mx-list>
      <mx-card variant="outlined">
        <p style="margin: 0">Above</p>
        <mx-divider style="margin-block: 16px"></mx-divider>
        <p style="margin: 0">Below</p>
      </mx-card>`;
    document.body.append(fixture);

    await whenFontsReady();
    await expect
      .element(page.getByTestId('dividers'))
      .toMatchScreenshot('dividers.png');
  });
});
