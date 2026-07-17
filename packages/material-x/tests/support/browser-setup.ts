import { afterEach, beforeAll, beforeEach } from 'vitest';
import iconFontUrl from './fonts/material-symbols-subset.ttf?url';

/*
 * `mx-icon` resolves its family through
 * `var(--md-icon-font, "Material Symbols Outlined")` and renders glyphs as
 * ligatures of their names. Storybook loads that font from the Google Fonts
 * CDN, which tests must not depend on, and nothing vendors it — so without this
 * the ligature never forms and the icon paints its raw name ("check_small") in
 * whatever last-resort font the machine happens to have. That is both wrong and
 * machine-dependent, which would silently poison visual baselines.
 *
 * The vendored file is a subset built from the same upstream family, holding
 * only the glyphs Material X renders internally (see `fonts/README.md`). It is
 * registered document-wide because the font must be reachable from inside each
 * component's shadow root, where a fixture-scoped rule cannot land.
 */
beforeAll(async () => {
  const font = new FontFace(
    'Material Symbols Outlined',
    `url(${iconFontUrl})`,
    { display: 'block' },
  );

  document.fonts.add(await font.load());
});

beforeEach(() => {
  document.documentElement.style.colorScheme = 'light';
  document.body.className = 'mx-test-body';

  const style = document.createElement('style');
  style.dataset['mxTest'] = '';
  style.textContent = `
    /*
     * Pin the Material reference typefaces to a locally installed, deterministic
     * stack. The button's shadow CSS resolves its font family through
     * \`var(--md-ref-typeface-plain, "Google Sans Text")\`; "Google Sans Text" is
     * not vendored, so without this override the browser silently falls back to
     * its default serif, which renders differently across machines and pollutes
     * the visual baselines. These custom properties inherit through the shadow
     * boundary, so declaring them on the root pins every component's typography.
     */
    :root {
      --md-ref-typeface-plain: Arial, "Liberation Sans", sans-serif;
      --md-ref-typeface-brand: Arial, "Liberation Sans", sans-serif;
    }

    .mx-test-body {
      margin: 0;
      padding: 24px;
      background: white;
      color: black;
      font-family: Arial, "Liberation Sans", sans-serif;
    }

    .mx-test-fixture {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: white;
      contain: layout paint;
    }

    .mx-test-fixture *,
    .mx-test-fixture *::before,
    .mx-test-fixture *::after {
      animation: none !important;
      transition: none !important;
    }
  `;
  document.head.append(style);
});

afterEach(() => {
  document.body.replaceChildren();
  document.body.className = '';
  document.head.querySelector('[data-mx-test]')?.remove();
});
