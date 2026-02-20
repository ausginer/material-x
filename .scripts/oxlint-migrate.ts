import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { JsonValue, JsonObject, JsonArray, Writable } from 'type-fest';

type Counters = Readonly<{
  renamedRuleAliases: number;
  overwrittenRuleAliases: number;
  renamedPlugins: number;
  dedupedPlugins: number;
}>;

const configPath = fileURLToPath(new URL('../.oxlintrc.json', import.meta.url));

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRuleName(ruleName: string): string {
  if (ruleName.startsWith('@typescript-eslint/')) {
    return `typescript/${ruleName.slice('@typescript-eslint/'.length)}`;
  }

  if (ruleName.startsWith('import-x/')) {
    return `import/${ruleName.slice('import-x/'.length)}`;
  }

  return ruleName;
}

function normalizePluginName(pluginName: string): string {
  if (
    pluginName === '@typescript-eslint' ||
    pluginName === 'typescript-eslint'
  ) {
    return 'typescript';
  }

  if (pluginName === 'import-x' || pluginName === 'eslint-plugin-import-x') {
    return 'import';
  }

  return pluginName;
}

function normalizeRules(rules: JsonObject): Readonly<{
  rules: JsonObject;
  renamedRuleAliases: number;
  overwrittenRuleAliases: number;
}> {
  const nextRules: JsonObject = {};
  let renamedRuleAliases = 0;
  let overwrittenRuleAliases = 0;

  for (const [ruleName, ruleValue] of Object.entries(rules)) {
    const normalizedRuleName = normalizeRuleName(ruleName);

    if (normalizedRuleName !== ruleName) {
      renamedRuleAliases += 1;
      if (Object.hasOwn(nextRules, normalizedRuleName)) {
        overwrittenRuleAliases += 1;
      }
    }

    nextRules[normalizedRuleName] = ruleValue;
  }

  return {
    rules: nextRules,
    renamedRuleAliases,
    overwrittenRuleAliases,
  };
}

function normalizePlugins(plugins: JsonValue | undefined): Readonly<{
  plugins: JsonValue | undefined;
  renamedPlugins: number;
  dedupedPlugins: number;
}> {
  if (!Array.isArray(plugins)) {
    return {
      plugins,
      renamedPlugins: 0,
      dedupedPlugins: 0,
    };
  }

  const seen = new Set<string>();
  const nextPlugins: Writable<JsonArray> = [];
  let renamedPlugins = 0;
  let dedupedPlugins = 0;

  for (const pluginValue of plugins) {
    if (typeof pluginValue !== 'string') {
      nextPlugins.push(pluginValue);
      continue;
    }

    const normalizedPluginName = normalizePluginName(pluginValue);

    if (normalizedPluginName !== pluginValue) {
      renamedPlugins += 1;
    }

    if (seen.has(normalizedPluginName)) {
      dedupedPlugins += 1;
      continue;
    }

    seen.add(normalizedPluginName);
    nextPlugins.push(normalizedPluginName);
  }

  return {
    plugins: nextPlugins,
    renamedPlugins,
    dedupedPlugins,
  };
}

function normalizeConfig(config: JsonObject): Readonly<{
  config: JsonObject;
  counters: Counters;
}> {
  const nextConfig = structuredClone(config);
  let renamedRuleAliases = 0;
  let overwrittenRuleAliases = 0;
  let renamedPlugins = 0;
  let dedupedPlugins = 0;

  const rootRules = nextConfig['rules'];
  if (isJsonObject(rootRules)) {
    const result = normalizeRules(rootRules);
    nextConfig['rules'] = result.rules;
    renamedRuleAliases += result.renamedRuleAliases;
    overwrittenRuleAliases += result.overwrittenRuleAliases;
  }

  const rootPluginsResult = normalizePlugins(nextConfig['plugins']);
  if (rootPluginsResult.plugins !== undefined) {
    nextConfig['plugins'] = rootPluginsResult.plugins;
  }

  renamedPlugins += rootPluginsResult.renamedPlugins;
  dedupedPlugins += rootPluginsResult.dedupedPlugins;

  const { overrides } = nextConfig;
  if (Array.isArray(overrides)) {
    const nextOverrides: Writable<JsonArray> = [];

    for (const overrideValue of overrides) {
      if (!isJsonObject(overrideValue)) {
        nextOverrides.push(overrideValue);
        continue;
      }

      const nextOverride = structuredClone(overrideValue);
      const overrideRules = nextOverride['rules'];
      if (isJsonObject(overrideRules)) {
        const result = normalizeRules(overrideRules);
        nextOverride['rules'] = result.rules;
        renamedRuleAliases += result.renamedRuleAliases;
        overwrittenRuleAliases += result.overwrittenRuleAliases;
      }

      const overridePluginsResult = normalizePlugins(nextOverride['plugins']);
      if (overridePluginsResult.plugins !== undefined) {
        nextOverride['plugins'] = overridePluginsResult.plugins;
      }

      renamedPlugins += overridePluginsResult.renamedPlugins;
      dedupedPlugins += overridePluginsResult.dedupedPlugins;

      nextOverrides.push(nextOverride);
    }

    nextConfig['overrides'] = nextOverrides;
  }

  return {
    config: nextConfig,
    counters: {
      renamedRuleAliases,
      overwrittenRuleAliases,
      renamedPlugins,
      dedupedPlugins,
    },
  };
}

async function runMigrate(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      ['@oxlint/migrate', '--type-aware', '--details', '--with-nursery'],
      {
        stdio: 'inherit',
      },
    );

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`Migration was interrupted by signal: ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(
          new Error(`Migration failed with exit code: ${code ?? 'unknown'}`),
        );
        return;
      }

      resolve();
    });
  });
}

await runMigrate();

const configText = await import('../.oxlintrc.json', {
  with: { type: 'json' },
});
if (!isJsonObject(configText)) {
  throw new TypeError('Expected .oxlintrc.json to contain a JSON object.');
}

const normalized = normalizeConfig(configText);

await writeFile(
  configPath,
  `${JSON.stringify(normalized.config, null, 2)}\n`,
  'utf8',
);

console.log(
  [
    'Native oxlint normalization complete.',
    `Rules renamed: ${normalized.counters.renamedRuleAliases}`,
    `Rule alias conflicts overwritten: ${normalized.counters.overwrittenRuleAliases}`,
    `Plugins renamed: ${normalized.counters.renamedPlugins}`,
    `Duplicate plugins removed: ${normalized.counters.dedupedPlugins}`,
  ].join('\n'),
);
