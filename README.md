# material-x monorepo

This repository contains four packages:

| Package | Description |
| --- | --- |
| [`@ydinjs/core`](packages/core) | Framework-agnostic Web Components foundation, including the interim traits API |
| [`@ydinjs/tproc`](packages/tproc) | Private Material token processor used during builds and tests |
| [`@ydinjs/vite-traits-plugin`](packages/vite-traits-plugin) | Vite/Rolldown trait-composition build plugin |
| [`@ydinjs/vite-custom-element-assets`](packages/vite-custom-element-assets) | Private Vite plugins for custom-element CSS and HTML assets |
| [`@ydinjs/material-x`](packages/material-x) | Material Design 3 component library |

## Development

Node.js `>=24` is required.

One extra step registers this repository's own Claude Code plugins, and is needed once per machine before any agent role is started:

```bash
claude plugin marketplace add ./
```

Without it the first session in a fresh clone runs before the effort guard is loadable. See [`AGENTS.md`](AGENTS.md) §Before running a governed role.

```bash
npm install
npm run build       # build all packages
npm run typecheck   # type-check all packages
npm run test        # run all tests
npm run docs:dev    # start Storybook locally
```

## License

Apache-2.0