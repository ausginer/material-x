// Builds each candidate, reads its sizes, and runs own-value.browser.test.ts in
// the engines named. Restores the sources. Run from the repository's root:
//   node .plan/aria-own-value-1/probes/candidates.mjs [--engines=a,b] [name …]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const args = process.argv.slice(2);
const engines = (args.find((a) => a.startsWith('--engines='))?.slice(10) ?? '')
  .split(',')
  .filter(Boolean);
const only = args.filter((a) => !a.startsWith('--'));
const CORE = 'packages/core/src/';
const MX = 'packages/material-x/src/';
const touched = new Map();
const edit = (file, ...pairs) => {
  const good = fs.readFileSync(file, 'utf8');
  if (!touched.has(file)) touched.set(file, good);
  let text = good;
  for (const [from, to] of pairs) {
    if (text.split(from).length !== 2)
      throw Error(`${file}: not one match: ${from}`);
    text = text.replace(from, () => to);
  }
  fs.writeFileSync(file, text);
};
const restore = () => {
  for (const [file, text] of touched) fs.writeFileSync(file, text);
  touched.clear();
};
const sh = (cmd, cwd, env = {}) => {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 1e8,
      env: { ...process.env, NO_COLOR: '1', ...env },
    });
  } catch (error) {
    return `${error.stdout}${error.stderr}`;
  }
};
const ARIA = `${CORE}controllers/useARIA.ts`;
const WRITE =
  'setAttribute(target, name, transform(name, host.getAttribute(name)));';

// The component pushes its own value. `useARIA` keeps it and puts it under the host's.
const push = ({ snapshot = true, ownWins = false } = {}) => {
  edit(
    ARIA,
    [
      'export function useARIA(',
      `const mirrors = new WeakMap<
  HTMLElement,
  (name: string, value: string | null) => void
>();

export function setOwnARIA(
  target: HTMLElement,
  name: string,
  value: string | null,
): void {
  const mirror = mirrors.get(target);

  if (mirror) {
    mirror(name, value);
  } else {
    setAttribute(target, name, value);
  }
}

export function useARIA(`,
    ],
    [
      '): void {\n  const sync',
      `): void {
  const own = new Map<string, string | null>(${snapshot ? 'Array.from(target.attributes, ({ name, value }) => [name, value])' : ''});

  const sync`,
    ],
    [
      WRITE,
      ownWins
        ? 'setAttribute(target, name, own.get(name) ?? transform(name, host.getAttribute(name)));'
        : 'setAttribute(target, name, transform(name, host.getAttribute(name)) ?? own.get(name) ?? null);',
    ],
    [
      '  // It isn',
      `  mirrors.set(target, (name, value) => {
    own.set(name, value);
    sync(name);
  });

  // It isn`,
    ],
  );
  const own = "import { setOwnARIA } from '../controllers/useARIA.ts';\n";
  edit(
    `${CORE}traits/linkable.ts`,
    ['import { useAttributes }', `${own}import { useAttributes }`],
    [
      "target.ariaDisabled = 'true';",
      "setOwnARIA(target, 'aria-disabled', 'true');",
    ],
    [
      "target.ariaDisabled = host.getAttribute('aria-disabled');",
      "setOwnARIA(target, 'aria-disabled', null);",
    ],
  );
  edit(
    `${CORE}traits/selectable.ts`,
    ['import { transfer, useAttributes }', `${own}import { useAttributes }`],
    [
      "selected: transfer(target, 'aria-selected', (value) =>\n      value == null ? 'false' : 'true',\n    ),",
      "selected: (_, value) =>\n      setOwnARIA(target, 'aria-selected', String(value != null)),",
    ],
  );
  const validatable = fs.readFileSync(`${CORE}traits/validatable.ts`, 'utf8');
  const imported =
    /import \{[^}]*\btransfer\b[^}]*\} from '\.\.\/controllers\/useAttributes\.ts';/u.exec(
      validatable,
    )[0];
  edit(
    `${CORE}traits/validatable.ts`,
    [
      imported,
      `${own}import { useAttributes } from '../controllers/useAttributes.ts';`,
    ],
    [
      "error: transfer(target, 'aria-invalid', present),",
      "error: (_, value) => setOwnARIA(target, 'aria-invalid', present(value)),",
    ],
    [
      "required: transfer(target, 'aria-required', present),",
      "required: (_, value) => setOwnARIA(target, 'aria-required', present(value)),",
    ],
  );
  edit(
    `${MX}list/list-link-item.ts`,
    [
      'import { useAttributes, via }',
      "import { setOwnARIA } from '@ydinjs/core/controllers/useARIA.js';\nimport { useAttributes, via }",
    ],
    [
      "target.ariaCurrent = value ? 'page' : null;",
      "setOwnARIA(target, 'aria-current', value ? 'page' : null);",
    ],
  );
  edit(
    `${MX}button/SwitchCore.ts`,
    [
      'import { useAttributes, via }',
      "import { setOwnARIA } from '@ydinjs/core/controllers/useARIA.js';\nimport { useAttributes, via }",
    ],
    [
      'target.ariaChecked = String(value);',
      "setOwnARIA(target, 'aria-checked', String(value));",
    ],
    ...(snapshot
      ? []
      : [
          [
            '  useValidatable(host, target);\n',
            "  useValidatable(host, target);\n  setOwnARIA(target, 'aria-checked', 'false');\n",
          ],
        ]),
  );
  if (!snapshot) {
    for (const name of ['switch-button', 'switch-icon-button']) {
      edit(`${MX}button/${name}.tpl.html`, ['  aria-checked="false"\n', '']);
    }
  }
};
// The text fields' fallback ids become their own value, and their transformer goes.
// Needs RF-131: a slot that changes while out must run the callback.
const textField = () =>
  edit(
    `${MX}text-field/TextFieldCore.ts`,
    ['import { useARIA }', 'import { setOwnARIA, useARIA }'],
    [
      `  useARIA(host, input, (name, value) =>
    name in ariaParams && value == null
      ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        getFallback(ariaParams[name as keyof typeof ARIA_PARAMS])
      : value,
  );
`,
      '  useARIA(host, input);\n',
    ],
    [
      `        if (host.getAttribute(attr) == null) {
          setAttribute(input, attr, getFallback(slots));
        }
`,
      '        setOwnARIA(input, attr, getFallback(slots));\n',
    ],
  );
// Each component's transformer computes its own value from the host, and the
// writers stay. The last of the two to change stands while the host gives the name.
const pull = ({ linksOnly = false } = {}) => {
  const param = '  transform?: ARIATransformer,\n';
  const type = [
    'import { useARIA }',
    'import { type ARIATransformer, useARIA }',
  ];
  edit(
    `${MX}button/ButtonCore.ts`,
    type,
    [
      '  init?: Partial<ShadowRootInit>,\n): HTMLElement',
      `  init?: Partial<ShadowRootInit>,\n${param}): HTMLElement`,
    ],
    ['useARIA(host, target);', 'useARIA(host, target, transform);'],
  );
  edit(
    `${MX}list/ListInteractiveItemCore.ts`,
    type,
    [
      '  template: HTMLTemplateElement,\n)',
      `  template: HTMLTemplateElement,\n${param})`,
    ],
    ['useARIA(host, target);', 'useARIA(host, target, transform);'],
  );
  edit(`${MX}button/link-button.ts`, [
    '      { delegatesFocus: true },\n',
    "      { delegatesFocus: true },\n      (name, value) =>\n        value ?? (name === 'aria-disabled' && this.disabled ? 'true' : null),\n",
  ]);
  edit(`${MX}list/list-link-item.ts`, [
    '      template,\n',
    "      template,\n      (name, value) =>\n        value ??\n        (name === 'aria-disabled' && this.disabled\n          ? 'true'\n          : name === 'aria-current' && this.selected\n            ? 'page'\n            : null),\n",
  ]);
  if (linksOnly) return;
  edit(`${MX}list/list-button-item.ts`, [
    'useInteractiveListItemCore(this, template);',
    "useInteractiveListItemCore(this, template, (name, value) =>\n      value ?? (name === 'aria-selected' ? String(this.selected) : null),\n    );",
  ]);
  edit(`${MX}button/SwitchCore.ts`, [
    '    init,\n  ) as',
    `    init,
    (name, value) =>
      value ??
      (name === 'aria-checked'
        ? String(host.checked)
        : (name === 'aria-invalid' && host.error) ||
            (name === 'aria-required' && host.required)
          ? 'true'
          : null),
  ) as`,
  ]);
  edit(
    `${MX}text-field/TextFieldCore.ts`,
    [
      'function useTextFieldARIA(host: ControlledElement,',
      'function useTextFieldARIA(host: ControlledElement & Validatable,',
    ],
    [
      '      : value,\n  );\n',
      `      : (value ??
        ((name === 'aria-invalid' && host.error) ||
        (name === 'aria-required' && host.required)
          ? 'true'
          : null)),
  );
`,
    ],
  );
};
const candidates = {
  main: () => {},
  'push, host wins': () => push(),
  'push, host wins, no snapshot': () => push({ snapshot: false }),
  'push, own wins': () => push({ ownWins: true }),
  'push, host wins, and the text fields': () => (push(), textField()),
  'push, host wins, no snapshot, and the text fields': () => (
    push({ snapshot: false }),
    textField()
  ),
  'pull, last wins': () => pull(),
  'pull, last wins, links only': () => pull({ linksOnly: true }),
};
let base;
const probe = 'packages/material-x/tests/own-value.browser.test.ts';
try {
  for (const [name, apply] of Object.entries(candidates)) {
    if (only.length && name !== 'main' && !only.includes(name)) continue;
    apply();
    console.log(`\n## ${name}`);
    for (const p of ['core', 'material-x']) {
      const types = sh('aube exec just typecheck', `packages/${p}`);
      if (types.includes('error TS'))
        console.log(p, types.match(/.*error TS.*/gu).join('\n'));
      const out = sh(
        `aube exec just ${p === 'core' ? 'build' : 'build-lib'}`,
        `packages/${p}`,
      );
      if (/error/iu.test(out)) console.log(out.slice(0, 800));
    }
    const rows = Object.fromEntries(
      JSON.parse(sh('aube exec size-limit --json', 'packages/material-x')).map(
        ({ name: n, size }) => [n, size],
      ),
    );
    base ??= rows;
    for (const [n, size] of Object.entries(rows)) {
      if (name === 'main' || size !== base[n])
        console.log(`${n} ${base[n]} -> ${size} (${size - base[n]})`);
    }
    for (const engine of engines) {
      fs.copyFileSync(
        '.plan/aria-own-value-1/probes/own-value.browser.test.ts.txt',
        probe,
      );
      const out = sh(
        `aube exec vitest run -c vitest.config.ts --project 'browser*' tests/own-value.browser.test.ts`,
        'packages/material-x',
        { MX_TEST_ENGINES: engine },
      );
      const read = [...new Set(out.match(/READ .*/gu) ?? [])];
      console.log(read.length ? read.join('\n') : out.slice(-1500));
      fs.rmSync(probe);
    }
    if (args.includes('--suites')) {
      for (const p of ['core', 'material-x']) {
        const out = sh(
          `aube exec vitest run -c vitest.config.ts --project 'browser*'`,
          `packages/${p}`,
          { MX_TEST_ENGINES: engines.join(',') },
        );
        console.log(
          [
            p,
            ...(out.match(/^\s*(?:FAIL|Tests|AssertionError:|Error:).*/gmu) ??
              []),
          ].join('\n'),
        );
      }
    }
    restore();
  }
} finally {
  restore();
  fs.rmSync(probe, { force: true });
  sh('aube exec just build', 'packages/core');
  sh('aube exec just build-lib', 'packages/material-x');
}
