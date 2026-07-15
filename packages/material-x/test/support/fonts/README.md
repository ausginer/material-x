# Vendored test fonts

## `material-symbols-subset.ttf`

A subset of **Material Symbols Outlined** holding only the glyphs Material X
renders internally through `mx-icon`. Vendored so visual baselines are
deterministic and offline: `mx-icon` renders glyphs as ligatures of their names,
so without the real font the ligature never forms and the icon paints its raw
name in whatever last-resort font the machine provides — wrong, and different
per machine.

Registered document-wide in `test/support/browser-setup.ts`; component shadow
roots cannot see a fixture-scoped `@font-face`.

- **Upstream:** Material Symbols Outlined, the same family
  `.storybook/preview-frame.css` loads from the Google Fonts CDN.
- **License:** Apache-2.0 (Google Material Symbols).
- **Retrieved:** 2026-07-15.
- **Axes:** `opsz,wght,FILL,GRAD@24,400,0,0` (the static default instance).
- **Glyphs:** `check`, `check_small`, `check_indeterminate_small`,
  `radio_button_checked`, `radio_button_unchecked`.

### Regenerating

Google Fonts subsets server-side via `icon_names`, so no local tooling is
needed. Add any newly required glyph to the list, then re-download:

```sh
curl -sH 'User-Agent: Mozilla/5.0 Chrome/120' \
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=check,check_indeterminate_small,check_small,radio_button_checked,radio_button_unchecked&display=block'
# then fetch the url(...) from the returned @font-face into this directory
```

A component whose glyph is missing from the subset renders its ligature name as
text, which is visible in review as stray letters instead of an icon. Add the
glyph and regenerate rather than accepting such a baseline.
