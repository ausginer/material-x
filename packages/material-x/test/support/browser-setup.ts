import { afterEach, beforeEach } from 'vitest';

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
