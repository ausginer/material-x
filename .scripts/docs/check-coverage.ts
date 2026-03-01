import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDocs } from '../../src/docs/data/components.ts';
import { root } from '../utils.ts';

type PackageJSON = Readonly<{
  exports: Readonly<Record<string, unknown>>;
}>;

const rootPath = fileURLToPath(root);

function isPackageJSON(value: unknown): value is PackageJSON {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  if (!Object.hasOwn(value, 'exports')) {
    return false;
  }

  const exportsValue = Reflect.get(value, 'exports');

  return typeof exportsValue === 'object' && exportsValue != null;
}

const packageJSONContents = JSON.parse(
  await readFile(resolve(rootPath, 'package.json'), 'utf8'),
);

if (!isPackageJSON(packageJSONContents)) {
  throw new Error('Invalid package.json shape for docs coverage script.');
}

const packageJSON = packageJSONContents;

const exportedComponents = Object.keys(packageJSON.exports)
  .filter((key) => key.endsWith('.js'))
  .filter((key) => key !== './react.js')
  .toSorted();

const definitionByExport = new Map(
  componentDocs.map((component) => [component.exportPath, component]),
);

const missingDefinitions = exportedComponents.filter(
  (exportPath) => !definitionByExport.has(exportPath),
);

if (missingDefinitions.length > 0) {
  throw new Error(
    `Missing docs definition for exports: ${missingDefinitions.join(', ')}`,
  );
}

const orphanDefinitions = componentDocs
  .map((component) => component.exportPath)
  .filter((exportPath) => !exportedComponents.includes(exportPath));

if (orphanDefinitions.length > 0) {
  throw new Error(
    `Docs definitions reference non-exported components: ${orphanDefinitions.join(', ')}`,
  );
}

type StoryExportExpectation = Readonly<{
  file: string;
  exports: readonly string[];
}>;

const storyExportExpectations: Readonly<
  Record<string, StoryExportExpectation>
> = {
  button: {
    file: 'src/button/button.stories.tsx',
    exports: [
      'ButtonVariants',
      'ButtonVariantsDark',
      'ButtonStates',
      'ButtonStatesDark',
    ],
  },
  'icon-button': {
    file: 'src/button/button.stories.tsx',
    exports: [
      'IconButtonVariants',
      'IconButtonVariantsDark',
      'IconButtonStates',
      'IconButtonStatesDark',
    ],
  },
  'link-button': {
    file: 'src/button/button.stories.tsx',
    exports: [
      'LinkButtonVariants',
      'LinkButtonVariantsDark',
      'LinkButtonStates',
      'LinkButtonStatesDark',
    ],
  },
  'split-button': {
    file: 'src/button/button.stories.tsx',
    exports: [
      'SplitButtonVariants',
      'SplitButtonVariantsDark',
      'SplitButtonStates',
      'SplitButtonStatesDark',
    ],
  },
  'switch-button': {
    file: 'src/button/button.stories.tsx',
    exports: [
      'SwitchButtonVariants',
      'SwitchButtonVariantsDark',
      'SwitchButtonStates',
      'SwitchButtonStatesDark',
    ],
  },
  'switch-icon-button': {
    file: 'src/button/button.stories.tsx',
    exports: [
      'SwitchIconButtonVariants',
      'SwitchIconButtonVariantsDark',
      'SwitchIconButtonStates',
      'SwitchIconButtonStatesDark',
    ],
  },
  'button-group': {
    file: 'src/button-group/button-group.stories.tsx',
    exports: [
      'ButtonGroupVariants',
      'ButtonGroupVariantsDark',
      'ButtonGroupStates',
      'ButtonGroupStatesDark',
    ],
  },
  'connected-button-group': {
    file: 'src/button-group/button-group.stories.tsx',
    exports: [
      'ConnectedButtonGroupVariants',
      'ConnectedButtonGroupVariantsDark',
      'ConnectedButtonGroupStates',
      'ConnectedButtonGroupStatesDark',
    ],
  },
  fab: {
    file: 'src/fab/fab.stories.tsx',
    exports: ['Variants', 'VariantsDark', 'States', 'StatesDark'],
  },
  icon: {
    file: 'src/icon/icon.stories.tsx',
    exports: ['Variants', 'VariantsDark'],
  },
  'text-field': {
    file: 'src/text-field/text-field.stories.tsx',
    exports: ['Variants', 'VariantsDark', 'States', 'StatesDark'],
  },
  'multiline-text-field': {
    file: 'src/text-field/multiline-text-field.stories.tsx',
    exports: ['Variants', 'VariantsDark', 'States', 'StatesDark'],
  },
};

const storyFileCache = new Map<string, string>();

async function getStoryFile(file: string): Promise<string> {
  const cached = storyFileCache.get(file);

  if (cached != null) {
    return cached;
  }

  const content = await readFile(resolve(rootPath, file), 'utf8');
  storyFileCache.set(file, content);
  return content;
}

for (const component of componentDocs) {
  await access(resolve(rootPath, component.meta.docPage), constants.R_OK).catch(
    () => {
      throw new Error(`Doc page not found: ${component.meta.docPage}`);
    },
  );

  await access(
    resolve(rootPath, `src/docs/.generated/components/${component.id}.json`),
    constants.R_OK,
  ).catch(() => {
    throw new Error(
      `Generated API file not found for ${component.id}. Run npm run docs:api.`,
    );
  });

  const expected = storyExportExpectations[component.id];

  if (!expected) {
    continue;
  }

  const storyFile = await getStoryFile(expected.file);
  const missing = expected.exports.filter(
    (name) => !storyFile.includes(`export const ${name}`),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing docs story exports for ${component.id}: ${missing.join(', ')} (file: ${expected.file})`,
    );
  }
}

console.log(
  `Docs coverage OK: ${componentDocs.length} component definitions matched package exports.`,
);
