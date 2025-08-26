/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'custom-property-pattern': [
      '^_?([a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      {
        message: (name) =>
          `Expected custom property name "${name}" to be kebab-case (underscore at the start allowed)`,
      },
    ],
  },
};

export default config;
