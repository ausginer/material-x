# Mutations: .plan/mutations-1/acceptance/rf-142-wrong.mutations.ts

At 9173a25a1d0d80289aa188b05230d6a02c480362, in chromium.

- chromium, unmutated: 193 rows ran, 0 failed, 0 skipped

| Mutation                                 | Group     | chromium   | Engines |
| ---------------------------------------- | --------- | ---------- | ------- |
| a disabled control keeps its description | mechanism | missed (2) |         |

Groups: mechanism 1, engine 0, doubted 0, other 0.

An outcome other than _as expected_, or a mutation that differs between engines, is the reviewer’s to judge.

## Each mutation

### a disabled control keeps its description, chromium: missed

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should describe the control of an item without a handle only while it is enabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should describe the control of an item without a handle only while it is enabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle from the start
  - missed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should describe the control of an item without a handle only while it is enabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should describe the control of an item without a handle only while it is enabled