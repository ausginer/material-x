import robotoLatin500Url from '@fontsource/roboto/files/roboto-latin-500-normal.woff2?url';
import robotoLatin700Url from '@fontsource/roboto/files/roboto-latin-700-normal.woff2?url';
import robotoRanges from '@fontsource/roboto/unicode.json';
import { afterEach, beforeAll, beforeEach } from 'vitest';
import { userEvent } from 'vitest/browser';
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

/*
 * Text renders in Roboto, from the `@fontsource/roboto` package that the
 * lockfile pins, and in no system font: the stacks below name Roboto alone. The
 * faces are the ones the fixtures render, the latin subset at weights 500 and
 * 700, each with the subset's character range as the package's own CSS
 * declares it. A character outside that range still falls back to a system
 * font, so a fixture's text keeps to it. Each face is awaited before the first
 * fixture, so a face that fails to load fails the file rather than a later
 * screenshot comparison.
 */
beforeAll(async () => {
  const faces = await Promise.all(
    (
      [
        [robotoLatin500Url, '500', robotoRanges.latin],
        [robotoLatin700Url, '700', robotoRanges.latin],
      ] as const
    ).map(
      async ([url, weight, unicodeRange]) =>
        await new FontFace('Roboto', `url(${url})`, {
          weight,
          unicodeRange,
          display: 'block',
        }).load(),
    ),
  );

  for (const face of faces) {
    document.fonts.add(face);
  }
});

/*
 * The pointer stays where the previous test left it, and that test may be in
 * another file in the same page. Over a fixture's control it would render the
 * control hovered, so each test starts with the pointer at the page's top-left
 * corner, inside the body's padding, where no fixture is.
 */
beforeEach(async () => {
  await userEvent.hover(document.documentElement, {
    position: { x: 0, y: 0 },
  });
});

beforeEach(() => {
  document.documentElement.style.colorScheme = 'light';
  document.body.className = 'mx-test-body';

  const style = document.createElement('style');
  style.dataset['mxTest'] = '';
  style.textContent = `
    /*
     * Pin the Material reference typefaces to the Roboto faces loaded above.
     * The button's shadow CSS resolves its font family through
     * \`var(--md-ref-typeface-plain, "Google Sans Text")\`; "Google Sans Text" is
     * not vendored, so without this override the browser silently falls back to
     * a system font, which renders differently across machines and pollutes
     * the visual baselines. These custom properties inherit through the shadow
     * boundary, so declaring them on the root pins every component's typography.
     */
    :root {
      --md-ref-typeface-plain: Roboto;
      --md-ref-typeface-brand: Roboto;
    }

    .mx-test-body {
      margin: 0;
      padding: 24px;
      background: white;
      color: black;
      font-family: Roboto;
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
