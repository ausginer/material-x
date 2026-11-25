// The hooks that the ruling compares, from main's source.
// Run from the repository root: node .plan/roving-upgrade-1/probes/ruling-variants.mjs <out dir>
// zz-roving-<name>.ts there is what the review's fuzz reads.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const file = 'packages/core/src/controllers/useRovingTabindex.ts';
const show = (rev) =>
  execFileSync('git', ['show', `${rev}:${file}`], { encoding: 'utf8' });
const main = show('e57c9f074');
const subject = show('df687de7d');
const swap = (source, ...pairs) => {
  let out = source;
  for (const [from, to] of pairs) {
    if (out.split(from).length !== 2) throw new Error(`not one match: ${from}`);
    out = out.replace(from, () => to);
  }
  return out;
};
// A definition is read as a slot change is.
const READ = [
  `  useSlot(host, slotSelector, (_, nodes) => {
    items.value = nodes.filter(isItem);
    // When slot content changes, recompute the active tab stop.
    items.setTabStop(items.getTabStopCandidate());
  });`,
  `  const read = (nodes: readonly Node[]) => {
    items.value = nodes.filter(isItem);
    items.setTabStop(items.getTabStopCandidate());
  };

  useSlot(host, slotSelector, (slot, nodes) => {
    read(nodes);

    for (const node of nodes) {
      if (
        node instanceof HTMLElement &&
        node.localName.includes('-') &&
        !node.matches(':defined')
      ) {
        void customElements.whenDefined(node.localName).then(() => {
          const current = slot.assignedNodes();

          if (current.includes(node)) {
            customElements.upgrade(node);
            read(current);
          }
        });
      }
    }
  });`,
];
// The default choice isn't kept: the value's match, the item that focus chose, the first enabled.
const CHOICE = [
  [
    `      (this.active && !this.active.disabled && this.contains(this.active)
        ? this.active
        : undefined) ??
      enabled[0]`,
    `      enabled.find((item) => item === this.focused) ??
      enabled.find((item) => item === this.chosen) ??
      enabled[0]`,
  ],
  [
    '  #items: readonly Item[] = [];\n',
    '  #items: readonly Item[] = [];\n  chosen: Item | undefined;\n',
  ],
  [
    '        items.setTabStop(target);\n      }\n    },\n  });\n}',
    '        items.setTabStop(target);\n        items.chosen = target;\n      }\n    },\n  });\n}',
  ],
];
// A removed item isn't kept in memory, and one put back isn't the chosen one.
const FORGET = [
  '    this.#items = value;\n',
  '    this.#items = value;\n    this.chosen = value.find((item) => item === this.chosen);\n',
];
// RF-143's reads, as in hidden-1's candidate.
const HEAR = [
  [
    'filter((item) => !item.disabled)',
    "filter((item) => !item.disabled && getComputedStyle(item).display !== 'none')",
  ],
  [
    '  const read = (nodes: readonly Node[]) => {\n    items.value = nodes.filter(isItem);\n    items.setTabStop(items.getTabStopCandidate());\n  };',
    `  const select = () => items.setTabStop(items.getTabStopCandidate());
  const observer = new MutationObserver(select);
  const read = (nodes: readonly Node[]) => {
    items.value = nodes.filter(isItem);
    observer.disconnect();
    for (const item of nodes.filter(isItem)) observer.observe(item, { attributeFilter: ['hidden', 'disabled'] });
    select();
  };`,
  ],
];
// The same, where a read takes the focused item as the chosen one.
const SETTLED = [
  ['      enabled.find((item) => item === this.focused) ??\n', ''],
  [
    '    this.chosen = value.find((item) => item === this.chosen);\n',
    '    const { focused } = this;\n    this.chosen = focused ?? value.find((item) => item === this.chosen);\n',
  ],
];
const plain = swap(main, READ);
const current = swap(main, READ, ...CHOICE, FORGET);
const variants = {
  main,
  subject,
  plain,
  current,
  // `current`'s choice with main's reads: what the same items do when none is late.
  base: swap(main, ...CHOICE, FORGET),
  settled: swap(current, ...SETTLED),
  settledBase: swap(main, ...CHOICE, FORGET, ...SETTLED),
  settledHeard: swap(current, ...SETTLED, ...HEAR),
  unforgotten: swap(main, READ, ...CHOICE),
  currentHeard: swap(current, ...HEAR),
  plainHeard: swap(plain, ...HEAR),
};
for (const [name, source] of Object.entries(variants))
  writeFileSync(
    `${process.argv[2]}/zz-roving-${name}.ts`,
    `// @ts-nocheck\n${source}`,
  );
