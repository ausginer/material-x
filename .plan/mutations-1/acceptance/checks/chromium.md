# Mutations: .plan/mutations-1/acceptance/rf-142.mutations.ts

At 9173a25a1d0d80289aa188b05230d6a02c480362, in chromium.

- chromium, unmutated: 193 rows ran, 0 failed, 0 skipped

| Mutation | Group | chromium | Engines |
| --- | --- | --- | --- |
| aria-disabled isn't watched | doubted | as expected (0) |  |
| the state observer is never disconnected | doubted | as expected (0) |  |
| a disabled control keeps its description | mechanism | as expected (2) |  |
| a disabled handle keeps its description | mechanism | as expected (4) |  |
| a disabled handle keeps its touch-action | mechanism | as expected (4) |  |
| a disabled handle loses its role | mechanism | as expected (4) |  |
| a disabled handle loses its name | mechanism | as expected (4) |  |
| the item's own value isn't written again | mechanism | as expected (2) |  |
| a page's touch-action is removed | doubted | as expected (0) |  |
| an item without a handle is admitted | mechanism | as expected (4) |  |
| an item with a handle is admitted | mechanism | as expected (6) |  |
| a disabled item leaves the collection | mechanism | as expected (2) |  |
| a press whose item is disabled before the lift is canceled | doubted | as expected (0) |  |
| a pending commit is refused when the item is disabled in its handler | mechanism | as expected (2) |  |

Groups: mechanism 10, engine 0, doubted 4, other 0.

Every outcome is as expected, and no mutation differs between engines.

## Each mutation

### aria-disabled isn't watched, chromium: as expected

- expected survives: No row writes `aria-disabled` on a disabled handle and then enables the item (the feature proof's `reviewer-1`)

### the state observer is never disconnected, chromium: as expected

- expected survives: No row changes `disabled` on an item that has left the list (the feature proof's `reviewer-1`)

### a disabled control keeps its description, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should describe the control of an item without a handle only while it is enabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should describe the control of an item without a handle only while it is enabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should describe the control of an item without a handle only while it is enabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should describe the control of an item without a handle only while it is enabled

### a disabled handle keeps its description, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle after it is disabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle after it is disabled

### a disabled handle keeps its touch-action, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle after it is disabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle after it is disabled

### a disabled handle loses its role, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle after it is disabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle after it is disabled

### a disabled handle loses its name, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle after it is disabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle from the start; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle from the start
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle after it is disabled

### the item's own value isn't written again, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should write the semantics of a disabled handle after it is disabled; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should write the semantics of a disabled handle after it is disabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should write the semantics of a disabled handle after it is disabled

### a page's touch-action is removed, chromium: as expected

- expected survives: The row writes the page's `touch-action` before the claim only (the feature proof's `reviewer-1`)

### an item without a handle is admitted, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should propose nothing in a pointer drag without a handle; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should propose nothing for an arrow key on a page's control in an item without a handle; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should propose nothing in a pointer drag without a handle; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should propose nothing for an arrow key on a page's control in an item without a handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should propose nothing in a pointer drag without a handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should propose nothing for an arrow key on a page's control in an item without a handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should propose nothing in a pointer drag without a handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should propose nothing for an arrow key on a page's control in an item without a handle

### an item with a handle is admitted, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should propose nothing in a pointer drag by its handle; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should propose nothing for an arrow key on its focused handle; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should propose nothing in a pointer drag by its handle; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should propose nothing for an arrow key on its focused handle; packages/material-x/tests/list/sortable-list.browser.test.ts > should keep focus on a span handle that has it, and move with it again once enabled; packages/material-x/tests/list/sortable-list.browser.test.ts > should keep focus on a button handle that has it, and move with it again once enabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should propose nothing in a pointer drag by its handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should propose nothing for an arrow key on its focused handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should propose nothing in a pointer drag by its handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should propose nothing for an arrow key on its focused handle
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items should keep focus on a span handle that has it, and move with it again once enabled
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items should keep focus on a button handle that has it, and move with it again once enabled

### a disabled item leaves the collection, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-button-item should let an enabled item move past it; packages/material-x/tests/list/sortable-list.browser.test.ts > mx-list-link-item should let an enabled item move past it
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-button-item should let an enabled item move past it
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items mx-list-link-item should let an enabled item move past it

### a press whose item is disabled before the lift is canceled, chromium: as expected

- expected survives: No row disables an item between the press and the lift (the feature proof's `reviewer-1`)

### a pending commit is refused when the item is disabled in its handler, chromium: as expected

- expected fails: packages/material-x/tests/list/sortable-list.browser.test.ts > disabled in its reorder handler should be moved by an arrow key; packages/material-x/tests/list/sortable-list.browser.test.ts > disabled in its reorder handler should be moved by a drop
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items disabled in its reorder handler should be moved by an arrow key
  - failed: packages/material-x/tests/list/sortable-list.browser.test.ts > mx-sortable-list disabled items disabled in its reorder handler should be moved by a drop