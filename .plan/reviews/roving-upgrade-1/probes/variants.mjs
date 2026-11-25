// Writes the hooks that fuzz.browser.test.ts compares to packages/core/src/controllers/zz-roving-*.ts.
// Run from the repository root: node .plan/reviews/roving-upgrade-1/probes/variants.mjs [--remove]
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const dir = 'packages/core/src/controllers';
const file = `${dir}/useRovingTabindex.ts`;
const head = readFileSync(file, 'utf8');
const base = execFileSync('git', ['show', `e57c9f074:${file}`], {
  encoding: 'utf8',
});
const swap = (source, ...pairs) => {
  let out = source;
  for (const [from, to] of pairs) {
    if (out.split(from).length !== 2) throw new Error(`not one match: ${from}`);
    out = out.replace(from, () => to);
  }
  return out;
};
const JOIN = head.slice(
  head.indexOf('  // Adds the items upgraded'),
  head.indexOf('  const createEdgeHandler'),
);
const SELECT = head.slice(
  head.indexOf('  // The nodes of the slot change whose'),
  head.indexOf('  const createEdgeHandler'),
);
const FOCUS = '        chosenBy = undefined;\n        isMoved = true;\n';
export const variants = {
  main: base,
  subject: head,
  // The registered candidate as it is, in slot-listener-1/probes/roving-candidate.diff.
  registered: swap(base, [
    `  useSlot(host, slotSelector, (_, nodes) => {
    items.value = nodes.filter(isItem);
    // When slot content changes, recompute the active tab stop.
    items.setTabStop(items.getTabStopCandidate());
  });`,
    `  useSlot(host, slotSelector, (slot, nodes) => {
    const update = () => {
      items.value = slot.assignedNodes().filter(isItem);
      items.setTabStop(items.getTabStopCandidate());
    };

    update();

    for (const node of nodes) {
      if (node instanceof HTMLElement && !node.matches(':defined')) {
        void customElements.whenDefined(node.localName).then(() => {
          customElements.upgrade(node);
          update();
        });
      }
    }
  });`,
  ]),
  // The registered candidate's read, with the subject's two other checks.
  candidate: swap(head, [
    '            if (isItem(node)) {\n              join(nodes, current);\n            }',
    '            items.value = current.filter(isItem);\n            select();',
  ]),
  // The candidate that leaves a tab stop that focus moved.
  moved: swap(head, [
    JOIN,
    `  const join = (_: readonly Node[], current: readonly Node[]) => {
    const { tabbable } = items;
    items.value = current.filter(isItem);
    if (isMoved) items.setTabStop(tabbable);
    else select();
  };

`,
  ]),
  // A default choice is one boolean, so any late item can take it.
  boolean: swap(head, ['    if (chosenBy === nodes) {', '    if (chosenBy) {']),
  // The same states in one variable: nodes, undefined, or null for a moved tab stop.
  single: swap(
    head,
    [
      '  let chosenBy: readonly Node[] | undefined;\n  // Whether focus moved the tab stop after the last read.\n  let isMoved = false;\n',
      '  let chosenBy: readonly Node[] | null | undefined;\n',
    ],
    [
      '  const select = (nodes = chosenBy) => {',
      '  const select = (nodes = chosenBy) => {\n    if (chosenBy === null) chosenBy = undefined;',
    ],
    ['    isMoved = false;\n', ''],
    ['    if (isMoved) {', '    if (chosenBy === null) {'],
    [FOCUS, '        chosenBy = null;\n'],
    ['chosenBy = nodes;', 'chosenBy = nodes ?? undefined;'],
  ),
  // The default choice is dropped only before another item than the chosen one: a late item before the chosen one in the
  // changed nodes takes the tab stop. No record of the slot change; a boolean for a choice by default.
  before: swap(
    head,
    [
      SELECT,
      `  let isDefault = false;
  let isMoved = false;
  const select = () => {
    const { active } = items;
    const target = items.getTabStopCandidate();
    items.setTabStop(target);
    isMoved = false;
    if (target?.value === host.value) isDefault = false;
    else if (target !== active) isDefault = true;
  };
  const join = (node: Node, current: readonly Node[]) => {
    const { tabbable } = items;
    if (isDefault && tabbable && current.indexOf(node) < current.indexOf(tabbable)) items.setTabStop();
    items.value = current.filter(isItem);
    if (isMoved) items.setTabStop(tabbable);
    else select();
  };

`,
    ],
    ['    select(nodes);\n\n    for', '    select();\n\n    for'],
    ['join(nodes, current)', 'join(node, current)'],
    [FOCUS, '        isDefault = false;\n        isMoved = true;\n'],
  ),
  // The intended tab stop is a node, which may be one that isn't an item yet.
  intended: swap(
    head,
    [
      SELECT,
      `  let intended: Node | undefined;
  const isLate = (node: Node): node is HTMLElement =>
    node instanceof HTMLElement && node.localName.includes('-') && !node.matches(':defined');
  const isEnabled = (node: Node) => isItem(node) ? !node.disabled : isLate(node) && !node.hasAttribute('disabled');
  let all: readonly Node[] = [];
  const show = () => {
    items.setTabStop(intended && isItem(intended) && items.contains(intended) && !intended.disabled ? intended : items.getTabStopCandidate());
  };
  const select = () => {
    const pool = all.filter(isEnabled);
    const { focused } = items;
    intended =
      pool.find((node) => (isItem(node) ? node.value : (node as Element).getAttribute('value')) === host.value) ??
      [focused, intended].find((node) => node && pool.includes(node)) ?? pool[0];
    show();
  };
  const join = (_: readonly Node[], current: readonly Node[]) => {
    items.value = current.filter(isItem);
    if (intended && (isItem(intended) || isLate(intended))) show();
    else select();
  };

`,
    ],
    [
      '    select(nodes);\n\n    for',
      '    all = nodes;\n    select();\n\n    for',
    ],
    ["        !node.matches(':defined')\n", '        isLate(node)\n'],
    [FOCUS, '        intended = target;\n'],
  ),
  // The nodes of the default choice's slot change give the next default choice themselves, so the waits pass none.
  snapshot: swap(
    head,
    [
      JOIN,
      `  const join = (current: readonly Node[]) => {
    const { tabbable } = items;
    items.value = current.filter(isItem);
    const { enabled } = items;
    if (isMoved) items.setTabStop(tabbable);
    else if (chosenBy && !enabled.some((item) => item.value === host.value))
      items.setTabStop(chosenBy.find((node): node is Item => enabled.includes(node as Item)));
    else select();
  };

`,
    ],
    ['join(nodes, current)', 'join(current)'],
  ),
  // The same with the nodes of every slot change since the last choice by value or focus, in the order of the changes.
  priority: swap(
    head,
    [
      SELECT,
      `  let order: readonly Node[] = [];
  let isMoved = false;
  const select = (nodes: readonly Node[] = []) => {
    const target = items.getTabStopCandidate();
    if (target?.value === host.value) order = [target!];
    else order = [...order, ...nodes];
    items.setTabStop(target);
    isMoved = false;
  };
  const join = (current: readonly Node[]) => {
    const { tabbable } = items;
    items.value = current.filter(isItem);
    const { enabled } = items;
    const target = enabled.find((item) => item.value === host.value);
    if (isMoved) items.setTabStop(tabbable);
    else if (target) select();
    else items.setTabStop(order.find((node): node is Item => enabled.includes(node as Item)));
  };

`,
    ],
    ['join(nodes, current)', 'join(current)'],
    [FOCUS, '        order = [target];\n        isMoved = true;\n'],
  ),
  // The six mutations of mutations.mjs that the rows pass.
  mutantMatch: swap(head, [
    '      chosenBy = undefined;\n    } else',
    '    } else',
  ]),
  mutantMoved: swap(head, [
    '    items.setTabStop(target);\n    isMoved = false;',
    '    items.setTabStop(target);',
  ]),
  mutantNodes: swap(head, [
    'items.value = current.filter(isItem);',
    'items.value = nodes.filter(isItem);',
  ]),
  mutantSelect: swap(head, [
    '      select(nodes);\n    }\n  };',
    '      select();\n    }\n  };',
  ]),
  mutantJoin: swap(head, [
    '            if (isItem(node)) {',
    '            if (node) {',
  ]),
  mutantValue: swap(head, [
    '      select();\n    },',
    '      chosenBy = undefined;\n      select();\n    },',
  ]),
};
for (const [name, source] of Object.entries(variants)) {
  const path = `${dir}/zz-roving-${name}.ts`;
  if (process.argv.includes('--remove')) rmSync(path, { force: true });
  else writeFileSync(path, `// @ts-nocheck\n${source}`);
}
