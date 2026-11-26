/**
 * RF-142's feature proof's mutations (`.plan/reviews/disabled-item-1/probes/mutations.mjs`),
 * rewritten as data for RD-65's acceptance run. Each expectation is the Chromium
 * reading of that review (`.plan/reviews/disabled-item-1/checks/mutations.txt`):
 * the rows a mutation failed there, or, for the four that failed none, the
 * review's reason. The review recorded no group, so the groups are the
 * implementer's: the four survivors are doubted, the others remove the
 * mechanism of a required property.
 */
import type { MutationFile } from '@ydinjs/mutator';

const ITEM = 'packages/material-x/src/list/sortable-item.ts';
const LIST = 'packages/material-x/src/list/sortable-list.ts';
const ROWS = 'packages/material-x/tests/list/sortable-list.browser.test.ts';

export default {
  runs: [{ dir: 'packages/material-x', tests: ['tests/list/sortable-list'] }],
  engines: ['chromium', 'firefox', 'webkit'],
  mutations: [
    {
      name: "aria-disabled isn't watched",
      group: 'doubted',
      edits: [
        {
          file: ITEM,
          text: "    'aria-disabled',\n",
          replacement: '',
        },
      ],
      expect: {
        survives:
          "No row writes `aria-disabled` on a disabled handle and then enables the item (the feature proof's `reviewer-1`)",
      },
    },
    {
      name: 'the state observer is never disconnected',
      group: 'doubted',
      edits: [
        {
          file: ITEM,
          text: '      state.disconnect();\n',
          replacement: '',
        },
      ],
      expect: {
        survives:
          "No row changes `disabled` on an item that has left the list (the feature proof's `reviewer-1`)",
      },
    },
    {
      name: 'a disabled control keeps its description',
      group: 'mechanism',
      edits: [
        {
          file: ITEM,
          text: "claim(control, controlOwned, 'aria-description', description)",
          replacement:
            "claim(control, controlOwned, 'aria-description', DESCRIPTION)",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should describe the control of an item without a handle only while it is enabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should describe the control of an item without a handle only while it is enabled',
          },
        ],
      },
    },
    {
      name: 'a disabled handle keeps its description',
      group: 'mechanism',
      edits: [
        {
          file: ITEM,
          text: "claim(handle, handleOwned, 'aria-description', description)",
          replacement:
            "claim(handle, handleOwned, 'aria-description', DESCRIPTION)",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle after it is disabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle after it is disabled',
          },
        ],
      },
    },
    {
      name: 'a disabled handle keeps its touch-action',
      group: 'mechanism',
      edits: [
        {
          file: ITEM,
          text: "disabled ? null : 'none'",
          replacement: "'none'",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle after it is disabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle after it is disabled',
          },
        ],
      },
    },
    {
      name: 'a disabled handle loses its role',
      group: 'mechanism',
      edits: [
        {
          file: ITEM,
          text: "claim(handle, handleOwned, 'role', 'button')",
          replacement:
            "claim(handle, handleOwned, 'role', disabled ? null : 'button')",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle after it is disabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle after it is disabled',
          },
        ],
      },
    },
    {
      name: 'a disabled handle loses its name',
      group: 'mechanism',
      edits: [
        {
          file: ITEM,
          text: "'aria-label', 'Reorder'",
          replacement: "'aria-label', disabled ? null : 'Reorder'",
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle after it is disabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle from the start',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle after it is disabled',
          },
        ],
      },
    },
    {
      name: "the item's own value isn't written again",
      group: 'mechanism',
      edits: [
        {
          file: ITEM,
          text: 'element.getAttribute(name) !== value',
          replacement: 'false',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should write the semantics of a disabled handle after it is disabled',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should write the semantics of a disabled handle after it is disabled',
          },
        ],
      },
    },
    {
      name: "a page's touch-action is removed",
      group: 'doubted',
      edits: [
        {
          file: ITEM,
          text: "element!.style.touchAction === 'none'",
          replacement: 'true',
        },
      ],
      expect: {
        survives:
          "The row writes the page's `touch-action` before the claim only (the feature proof's `reviewer-1`)",
      },
    },
    {
      name: 'an item without a handle is admitted',
      group: 'mechanism',
      edits: [
        {
          file: LIST,
          text: 'isDisabled(item) ? null',
          replacement: 'isDisabled(item) && handleOf(item) ? null',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should propose nothing in a pointer drag without a handle',
          },
          {
            file: ROWS,
            row: "mx-list-button-item should propose nothing for an arrow key on a page's control in an item without a handle",
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should propose nothing in a pointer drag without a handle',
          },
          {
            file: ROWS,
            row: "mx-list-link-item should propose nothing for an arrow key on a page's control in an item without a handle",
          },
        ],
      },
    },
    {
      name: 'an item with a handle is admitted',
      group: 'mechanism',
      edits: [
        {
          file: LIST,
          text: 'isDisabled(item) ? null',
          replacement: 'isDisabled(item) && !handleOf(item) ? null',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should propose nothing in a pointer drag by its handle',
          },
          {
            file: ROWS,
            row: 'mx-list-button-item should propose nothing for an arrow key on its focused handle',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should propose nothing in a pointer drag by its handle',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should propose nothing for an arrow key on its focused handle',
          },
          {
            file: ROWS,
            row: 'should keep focus on a span handle that has it, and move with it again once enabled',
          },
          {
            file: ROWS,
            row: 'should keep focus on a button handle that has it, and move with it again once enabled',
          },
        ],
      },
    },
    {
      name: 'a disabled item leaves the collection',
      group: 'mechanism',
      edits: [
        {
          file: LIST,
          text: 'items: () => items,',
          replacement: 'items: () => items.filter((i) => !isDisabled(i)),',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'mx-list-button-item should let an enabled item move past it',
          },
          {
            file: ROWS,
            row: 'mx-list-link-item should let an enabled item move past it',
          },
        ],
      },
    },
    {
      name: 'a press whose item is disabled before the lift is canceled',
      group: 'doubted',
      edits: [
        {
          file: LIST,
          text: '        dragged = item as ControlledElement;\n',
          replacement:
            '        dragged = item as ControlledElement;\n        if (isDisabled(item)) controller?.requestCancel();\n',
        },
      ],
      expect: {
        survives:
          "No row disables an item between the press and the lift (the feature proof's `reviewer-1`)",
      },
    },
    {
      name: 'a pending commit is refused when the item is disabled in its handler',
      group: 'mechanism',
      edits: [
        {
          file: LIST,
          text: '          return ReorderResolution.reject();\n        }\n',
          replacement:
            '          return ReorderResolution.reject();\n        }\n        if (isDisabled(request.item)) return ReorderResolution.reject();\n',
        },
      ],
      expect: {
        fails: [
          {
            file: ROWS,
            row: 'disabled in its reorder handler should be moved by an arrow key',
          },
          {
            file: ROWS,
            row: 'disabled in its reorder handler should be moved by a drop',
          },
        ],
      },
    },
  ],
} satisfies MutationFile;
