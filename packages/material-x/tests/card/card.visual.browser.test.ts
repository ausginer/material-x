import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/card/card.ts';
import { whenFontsReady } from '../browser.ts';

describe('mx-card visual regression', () => {
  it('should match the variant matrix', async () => {
    const fixture = document.createElement('div');
    fixture.className = 'mx-test-fixture';
    fixture.dataset['testid'] = 'variants';

    for (const variant of [null, 'elevated', 'outlined'] as const) {
      const card = document.createElement('mx-card');
      card.variant = variant;
      card.innerHTML =
        '<h3 style="margin: 0; font-size: 16px; font-weight: 500">Heading</h3><p>Text</p><mx-button>Button</mx-button>';
      fixture.append(card);
    }

    document.body.append(fixture);

    await whenFontsReady();
    await expect
      .element(page.getByTestId('variants'))
      .toMatchScreenshot('card-variants.png');
  });
});
