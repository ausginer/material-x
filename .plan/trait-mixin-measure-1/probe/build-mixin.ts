/**
 * Builds `@ydinjs/core` and `@ydinjs/material-x` again, each with its own
 * tsdown configuration and the mixin probe plugin appended after the
 * repository's plugins, into `.plan/trait-mixin-measure-1/.build/<form>/`.
 * The packages' own outputs and `package.json` files are left alone.
 *
 * Forms: `inline` (each mixin writes its brand and `Symbol.hasInstance`) and
 * `helper` (one shared helper in core's `traits/composition`). `none` builds
 * with no probe plugin: the check that this script reproduces the packages'
 * own build output.
 *
 * Run from the repository root after `aube install` and the packages' own
 * builds (material-x's flattener reads core's built traits):
 * `node .plan/trait-mixin-measure-1/probe/build-mixin.ts [inline|helper|none]…`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, type UserConfig } from 'tsdown';
import { traitMixinPlugin, type MixinReport } from './mixin-plugin.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const OUT = `${ROOT}.plan/trait-mixin-measure-1/.build/`;
const FORMS = ['inline', 'helper', 'none'] as const;

type Form = (typeof FORMS)[number];

const requested = process.argv.slice(2);
const forms: readonly Form[] =
  requested.length === 0 ? ['inline', 'helper'] : (requested as Form[]);

for (const form of forms) {
  if (!FORMS.includes(form)) {
    throw new Error(`unknown form ${form}; known: ${FORMS.join(', ')}`);
  }

  for (const name of ['core', 'material-x']) {
    const cwd = `${ROOT}packages/${name}/`;
    const { default: config } = (await import(`${cwd}tsdown.config.ts`)) as {
      default: UserConfig;
    };
    const report: MixinReport = { traits: [], components: [] };

    process.chdir(cwd);
    await build({
      ...config,
      cwd,
      // The configuration is passed whole; loading the file as well would
      // merge it a second time.
      config: false,
      outDir: `${OUT}${form}/${name}`,
      dts: false,
      exports: false,
      publint: false,
      sourcemap: false,
      logLevel: 'warn',
      plugins: [
        ...(config.plugins as unknown[]),
        ...(form === 'none'
          ? []
          : [traitMixinPlugin(report, { helper: form === 'helper' })]),
      ],
    } as UserConfig);

    await mkdir(`${OUT}${form}`, { recursive: true });
    await writeFile(
      `${OUT}${form}/${name}.report.json`,
      JSON.stringify(report, null, 2),
    );
    console.log(
      `${form} ${name}: ${report.traits.length} traits, ${report.components.length} components`,
    );

    for (const line of [...report.traits, ...report.components]) {
      console.log(`  ${line.replace(ROOT, '')}`);
    }
  }
}
