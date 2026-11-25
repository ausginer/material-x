import { readFileSync, writeFileSync } from 'node:fs';
const d = process.argv[2];
const head = readFileSync(`${d}/head.js`, 'utf8');
const sub = (t, a, b) => {
  if (t.split(a).length !== 2)
    throw new Error(`${t.split(a).length - 1} of ${a}`);
  return t.replace(a, () => b);
};
// The candidate: reads the computed display, and hears `hidden` and `disabled`.
let c = sub(
  head,
  'filter((item) => !item.disabled);',
  "filter((item) => !item.disabled && getComputedStyle(item).display !== 'none');",
);
c = sub(
  c,
  'this.active && !this.active.disabled && this.contains(this.active) ?',
  'this.active && enabled.includes(this.active) ?',
);
c = sub(
  c,
  'useSlot(host, slotSelector, (_, nodes) => {\n\t\t\titems.value = nodes.filter(isItem);',
  `const observer = new MutationObserver(() => items.setTabStop(items.getTabStopCandidate()));
		useSlot(host, slotSelector, (_, nodes) => {
			items.value = nodes.filter(isItem);
			observer.disconnect();
			for (const item of items.enabledOrNot) observer.observe(item, { attributeFilter: ['hidden', 'disabled'] });`,
);
c = sub(
  c,
  'get enabled() {',
  'get enabledOrNot() { return this.#items; }\n\t\tget enabled() {',
);
writeFileSync(`${d}/roving.js`, c);
const rule = '&::slotted([data-avatar]){';
writeFileSync(
  `${d}/avatar.js`,
  sub(
    head,
    rule,
    rule.replace(
      '[data-avatar]',
      '[data-avatar]:not([hidden]:not([hidden=until-found i]))',
    ),
  ),
);
