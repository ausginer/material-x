import type { ComponentDocDefinition } from '../types.ts';
import { componentM3Links } from './m3-links.ts';

const BUTTON_FAMILY_DOC_PAGE = 'src/docs/components/button-family.mdx';
const BUTTON_DOC_PAGE = 'src/docs/components/button.mdx';
const ICON_BUTTON_DOC_PAGE = 'src/docs/components/icon-button.mdx';
const LINK_BUTTON_DOC_PAGE = 'src/docs/components/link-button.mdx';
const SPLIT_BUTTON_DOC_PAGE = 'src/docs/components/split-button.mdx';
const SWITCH_BUTTON_DOC_PAGE = 'src/docs/components/switch-button.mdx';
const SWITCH_ICON_BUTTON_DOC_PAGE =
  'src/docs/components/switch-icon-button.mdx';
const BUTTON_GROUP_DOC_PAGE = 'src/docs/components/button-group.mdx';
const CONNECTED_BUTTON_GROUP_DOC_PAGE =
  'src/docs/components/connected-button-group.mdx';
const FAB_DOC_PAGE = 'src/docs/components/fab.mdx';
const ICON_DOC_PAGE = 'src/docs/components/icon.mdx';
const TEXT_FIELD_DOC_PAGE = 'src/docs/components/text-field.mdx';
const MULTILINE_TEXT_FIELD_DOC_PAGE =
  'src/docs/components/multiline-text-field.mdx';

export const componentDocs: readonly ComponentDocDefinition[] = [
  {
    id: 'button',
    title: 'Button',
    exportPath: './button/button.js',
    sourceFile: 'src/button/button.ts',
    typeSourceFiles: ['src/button/button.ts', 'src/button/ButtonCore.ts'],
    templateFiles: ['src/button/button.tpl.html'],
    propertiesType: 'ButtonProperties',
    eventsType: 'ButtonEvents',
    cssPropertiesType: 'ButtonCSSProperties',
    meta: {
      id: 'button',
      title: 'Button',
      docPage: BUTTON_DOC_PAGE,
      summary:
        'Buttons communicate high-emphasis and medium-emphasis actions in flows like forms, dialogs, and toolbars. Material X provides one `mx-button` element with multiple visual variants controlled by attributes.',
      whenToUse: [
        'Use for high-emphasis and medium-emphasis actions such as save, submit, or continue.',
        'Use with icon slot when action benefit from a visual cue.',
      ],
      pitfalls: [
        'Do not use button variants for navigation; prefer `mx-link-button` when the action changes location.',
        'Avoid mixing too many emphasis levels in the same action group.',
      ],
      deltas: [
        'Material X keeps one tag with color variants (`filled`, `elevated`, `tonal`, `outlined`, `text`) via `color` attribute.',
      ],
      a11yCaveats: [],
      m3: componentM3Links['button']!,
    },
  },
  {
    id: 'icon-button',
    title: 'Icon Button',
    exportPath: './button/icon-button.js',
    sourceFile: 'src/button/icon-button.ts',
    typeSourceFiles: [
      'src/button/icon-button.ts',
      'src/button/ButtonCore.ts',
      'src/button/button.ts',
    ],
    templateFiles: ['src/button/icon-button.tpl.html'],
    propertiesType: 'IconButtonProperties',
    eventsType: 'IconButtonEvents',
    cssPropertiesType: 'IconButtonCSSProperties',
    meta: {
      id: 'icon-button',
      title: 'Icon Button',
      docPage: ICON_BUTTON_DOC_PAGE,
      summary:
        'Icon buttons provide compact, icon-only actions when space is constrained. They are useful for utility actions in toolbars, cards, and list items.',
      whenToUse: [
        'Use for compact actions represented by a single icon.',
        'Prefer when layout density is limited and label is unnecessary.',
      ],
      pitfalls: [
        'Do not rely on icon shape alone for meaning; provide `aria-label`/`aria-labelledby` for accessible naming.',
        'Avoid using icon buttons for destructive actions without additional confirmation context.',
      ],
      deltas: [
        '`width` supports `wide`/`narrow` sizing presets in addition to base shape and size tokens.',
      ],
      a11yCaveats: [],
      m3: componentM3Links['icon-button']!,
    },
  },
  {
    id: 'link-button',
    title: 'Link Button',
    exportPath: './button/link-button.js',
    sourceFile: 'src/button/link-button.ts',
    typeSourceFiles: ['src/button/link-button.ts', 'src/button/ButtonCore.ts'],
    templateFiles: ['src/button/link-button.tpl.html'],
    propertiesType: 'LinkButtonProps',
    eventsType: 'LinkButtonEvents',
    cssPropertiesType: 'LinkButtonCSSProperties',
    meta: {
      id: 'link-button',
      title: 'Link Button',
      docPage: LINK_BUTTON_DOC_PAGE,
      summary:
        'Link buttons combine button visuals with anchor semantics for navigation-focused actions. They preserve standard link capabilities such as `href` and `target`.',
      whenToUse: [
        'Use when action semantically navigates to another location.',
        'Prefer over regular button when you need native anchor behavior (`href`, `target`).',
      ],
      pitfalls: [
        'Do not use for in-place form actions; use `mx-button` instead.',
        'If disabled, ensure surrounding UX still communicates why navigation is unavailable.',
      ],
      deltas: [
        'Disabled state is emulated (`aria-disabled`, `tabindex=-1`) because anchors do not support native `disabled`.',
      ],
      a11yCaveats: [],
      m3: componentM3Links['link-button']!,
    },
  },
  {
    id: 'split-button',
    title: 'Split Button',
    exportPath: './button/split-button.js',
    sourceFile: 'src/button/split-button.ts',
    typeSourceFiles: [
      'src/button/split-button.ts',
      'src/button/ButtonCore.ts',
      'src/button-group/connected-button-group.ts',
    ],
    templateFiles: ['src/button/split-button.tpl.html'],
    propertiesType: 'SplitButtonProperties',
    eventsType: 'SplitButtonEvents',
    cssPropertiesType: 'SplitButtonCSSProperties',
    meta: {
      id: 'split-button',
      title: 'Split Button',
      docPage: SPLIT_BUTTON_DOC_PAGE,
      summary:
        'Split buttons expose a primary action plus a secondary trigger for related alternatives. Material X handles this as a composed control with a `toggle` event for menu/popover flows.',
      whenToUse: [
        'Use when primary action and alternative actions are closely related.',
        'Use `toggle` event to open an attached menu/popover.',
      ],
      pitfalls: [
        'Do not use split buttons when there is no meaningful secondary action list.',
        'Avoid nesting additional action menus that create deep interaction stacks.',
      ],
      deltas: [
        'Implemented as composition of `mx-button` and `mx-icon-button` inside `mx-connected-button-group`.',
      ],
      a11yCaveats: [],
      m3: componentM3Links['split-button']!,
    },
  },
  {
    id: 'switch-button',
    title: 'Switch Button',
    exportPath: './button/switch-button.js',
    sourceFile: 'src/button/switch-button.ts',
    typeSourceFiles: [
      'src/button/switch-button.ts',
      'src/button/ButtonCore.ts',
    ],
    templateFiles: ['src/button/button.tpl.html'],
    propertiesType: 'SwitchButtonProperties',
    eventsType: 'SwitchButtonEvents',
    cssPropertiesType: 'SwitchButtonCSSProperties',
    additionalEvents: [
      {
        name: 'input',
        optional: false,
        type: 'Event',
        description:
          'Emitted on activation to support controlled switch patterns.',
      },
      {
        name: 'change',
        optional: false,
        type: 'Event',
        description:
          'Emitted on activation. Consumers are expected to update `checked`.',
      },
    ],
    meta: {
      id: 'switch-button',
      title: 'Switch Button',
      docPage: SWITCH_BUTTON_DOC_PAGE,
      summary:
        'Switch buttons provide toggleable, button-styled selection controls. They are designed for controlled state management in application logic.',
      whenToUse: [
        'Use for on/off states with button-like visual styling.',
        'Use as a controlled component bound to app state.',
      ],
      pitfalls: [
        'Do not expect automatic toggling; update `checked` in your `change` handler.',
        'Avoid using switch buttons for one-time actions; use regular buttons for commands.',
      ],
      deltas: [
        'Switch state does not self-toggle; host `checked` should be updated by consumer logic on `change`.',
      ],
      a11yCaveats: [
        {
          title: 'Controlled switch behavior is required',
          detail:
            'Activation emits `input`/`change`, but state announcements rely on consumer updating `checked`.',
        },
      ],
      m3: componentM3Links['switch-button']!,
    },
  },
  {
    id: 'switch-icon-button',
    title: 'Switch Icon Button',
    exportPath: './button/switch-icon-button.js',
    sourceFile: 'src/button/switch-icon-button.ts',
    typeSourceFiles: [
      'src/button/switch-icon-button.ts',
      'src/button/icon-button.ts',
      'src/button/ButtonCore.ts',
    ],
    templateFiles: ['src/button/icon-button.tpl.html'],
    propertiesType: 'SwitchIconButtonProperties',
    eventsType: 'SwitchIconButtonEvents',
    cssPropertiesType: 'SwitchIconButtonCSSProperties',
    additionalEvents: [
      {
        name: 'input',
        optional: false,
        type: 'Event',
        description:
          'Emitted on activation to support controlled switch patterns.',
      },
      {
        name: 'change',
        optional: false,
        type: 'Event',
        description:
          'Emitted on activation. Consumers are expected to update `checked`.',
      },
    ],
    meta: {
      id: 'switch-icon-button',
      title: 'Switch Icon Button',
      docPage: SWITCH_ICON_BUTTON_DOC_PAGE,
      summary:
        'Switch icon buttons combine icon-only density with toggle semantics. They are useful in segmented or compact selection surfaces.',
      whenToUse: [
        'Use for icon-only toggle states in constrained layouts.',
        'Prefer in segmented/connected button groups when selection is visual.',
      ],
      pitfalls: [
        'Do not expect automatic toggling; update `checked` in your `change` handler.',
        'Ensure each icon-only control has an accessible name.',
      ],
      deltas: [
        'Switch state is consumer-controlled through `checked` updates in response to `change`.',
      ],
      a11yCaveats: [
        {
          title: 'Controlled switch behavior is required',
          detail:
            'Activation emits `input`/`change`, but state announcements rely on consumer updating `checked`.',
        },
      ],
      m3: componentM3Links['switch-icon-button']!,
    },
  },
  {
    id: 'button-group',
    title: 'Button Group',
    exportPath: './button-group/button-group.js',
    sourceFile: 'src/button-group/button-group.ts',
    typeSourceFiles: [
      'src/button-group/button-group.ts',
      'src/button-group/ButtonGroupCore.ts',
      'src/button/ButtonCore.ts',
    ],
    templateFiles: ['src/button-group/button-group.tpl.html'],
    propertiesType: 'ButtonGroupProperties',
    eventsType: 'ButtonGroupEvents',
    cssPropertiesType: 'ButtonGroupCSSProperties',
    meta: {
      id: 'button-group',
      title: 'Button Group',
      docPage: BUTTON_GROUP_DOC_PAGE,
      summary:
        'Button groups provide coordinated styling and behavior for related action sets. Shared size/shape/color context is propagated to child controls.',
      whenToUse: [
        'Use to visually and semantically group related actions.',
        'Use for grouped actions that share size/shape/color context.',
      ],
      pitfalls: [
        'Do not leave groups unnamed for assistive technologies.',
        'Avoid overloading groups with too many actions that reduce scanability.',
      ],
      deltas: [
        'Group-level attributes are propagated to child buttons via internal context.',
      ],
      a11yCaveats: [
        {
          title: 'Provide an accessible group label',
          detail:
            'Set `aria-label` or `aria-labelledby` on the group host to expose a useful accessible name.',
        },
      ],
      m3: componentM3Links['button-group']!,
    },
  },
  {
    id: 'connected-button-group',
    title: 'Connected Button Group',
    exportPath: './button-group/connected-button-group.js',
    sourceFile: 'src/button-group/connected-button-group.ts',
    typeSourceFiles: [
      'src/button-group/connected-button-group.ts',
      'src/button-group/ButtonGroupCore.ts',
      'src/button/ButtonCore.ts',
    ],
    templateFiles: ['src/button-group/button-group.tpl.html'],
    propertiesType: 'ConnectedButtonGroupProperties',
    eventsType: 'ConnectedButtonGroupEvents',
    cssPropertiesType: 'ConnectedButtonGroupCSSProperties',
    meta: {
      id: 'connected-button-group',
      title: 'Connected Button Group',
      docPage: CONNECTED_BUTTON_GROUP_DOC_PAGE,
      summary:
        'Connected button groups are segmented controls with coordinated selection and keyboard navigation. They are optimized for exclusive-option UIs.',
      whenToUse: [
        'Use for segmented controls with single active selection and keyboard roving behavior.',
        'Use `value` to reflect the selected child option.',
      ],
      pitfalls: [
        'Do not omit accessible group naming (`aria-label` or `aria-labelledby`).',
        'Avoid mixed semantics inside one group (e.g., mixing toggles and command actions).',
      ],
      deltas: [
        'Implements roving tabindex navigation for keyboard selection flow.',
      ],
      a11yCaveats: [
        {
          title: 'Provide an accessible group label',
          detail:
            'Set `aria-label` or `aria-labelledby` on the group host to expose a useful accessible name.',
        },
      ],
      m3: componentM3Links['connected-button-group']!,
    },
  },
  {
    id: 'fab',
    title: 'FAB',
    exportPath: './fab/fab.js',
    sourceFile: 'src/fab/fab.ts',
    typeSourceFiles: ['src/fab/fab.ts'],
    templateFiles: ['src/fab/fab.tpl.html'],
    propertiesType: 'FABProperties',
    eventsType: 'FABEvents',
    cssPropertiesType: 'FABCSSProperties',
    meta: {
      id: 'fab',
      title: 'FAB',
      docPage: FAB_DOC_PAGE,
      summary:
        'Floating action buttons highlight a primary promoted action for a screen or workflow. Material X supports both regular and extended FAB patterns with token-driven styling.',
      whenToUse: [
        'Use to highlight a primary, promoted action on a screen.',
        'Use `extended` mode for actions that benefit from a label.',
      ],
      pitfalls: [
        'Do not use multiple competing FABs in a single viewport area.',
        'Avoid FABs for low-priority or secondary actions.',
      ],
      deltas: [
        'Extended transition state is controlled with explicit `extended="open|closed"` attribute.',
      ],
      a11yCaveats: [],
      m3: componentM3Links['fab']!,
    },
  },
  {
    id: 'icon',
    title: 'Icon',
    exportPath: './icon/icon.js',
    sourceFile: 'src/icon/icon.ts',
    typeSourceFiles: ['src/icon/icon.ts'],
    templateFiles: ['src/icon/icon.tpl.html'],
    propertiesType: 'IconProperties',
    eventsType: 'IconEvents',
    cssPropertiesType: 'IconCSSProperties',
    meta: {
      id: 'icon',
      title: 'Icon',
      docPage: ICON_DOC_PAGE,
      summary:
        'Icons are presentational building blocks used across components and slots. The `mx-icon` element exposes lightweight typography-driven customization via CSS variables.',
      whenToUse: [
        'Use as a presentational companion with button, fab, and text-field slots.',
        'Set icon font and size via CSS custom properties for consistent theming.',
      ],
      pitfalls: [
        'Do not rely on icon-only content to communicate critical meaning without text or ARIA labeling context.',
      ],
      deltas: [
        'Material Symbols font selection is controlled by `--md-icon-font` CSS variable.',
      ],
      a11yCaveats: [],
      m3: componentM3Links['icon']!,
    },
  },
  {
    id: 'text-field',
    title: 'Text Field',
    exportPath: './text-field/text-field.js',
    sourceFile: 'src/text-field/text-field.ts',
    typeSourceFiles: [
      'src/text-field/text-field.ts',
      'src/text-field/TextFieldCore.ts',
    ],
    templateFiles: [
      'src/text-field/text-field.tpl.html',
      'src/text-field/text-field-core.tpl.html',
    ],
    propertiesType: 'TextFieldProperties',
    eventsType: 'TextFieldEvents',
    cssPropertiesType: 'TextFieldCSSProperties',
    additionalEvents: [
      {
        name: 'input',
        optional: false,
        type: 'InputEvent',
        description:
          'Native input event from the internal control (composed through shadow boundary).',
      },
      {
        name: 'change',
        optional: false,
        type: 'Event',
        description: 'Native change event from the internal control.',
      },
    ],
    meta: {
      id: 'text-field',
      title: 'Text Field',
      docPage: TEXT_FIELD_DOC_PAGE,
      summary:
        'Text fields collect structured and unstructured user input with Material 3-inspired states and slots. Material X supports filled and outlined variants plus rich slot anatomy.',
      whenToUse: [
        'Use for single-line text, numeric, URL, search, and email input.',
        'Use slot anatomy for label, support text, prefix/suffix, and leading/trailing icons.',
      ],
      pitfalls: [
        'Always provide meaningful label content or explicit ARIA naming.',
        'Avoid placeholder-only labeling patterns for critical forms.',
      ],
      deltas: [
        'Uses slotted label/support/prefix/suffix content instead of dedicated child helper components.',
      ],
      a11yCaveats: [
        {
          title: 'Always provide a label slot or explicit ARIA name',
          detail:
            'Without a meaningful label, assistive technologies can receive an empty accessible name.',
        },
        {
          title:
            'Supporting and counter slots should be meaningful when present',
          detail:
            'The component wires described-by relationships for support/counter content; keep those slots intentional.',
        },
      ],
      m3: componentM3Links['text-field']!,
    },
  },
  {
    id: 'multiline-text-field',
    title: 'Multiline Text Field',
    exportPath: './text-field/multiline-text-field.js',
    sourceFile: 'src/text-field/multiline-text-field.ts',
    typeSourceFiles: [
      'src/text-field/multiline-text-field.ts',
      'src/text-field/TextFieldCore.ts',
    ],
    templateFiles: [
      'src/text-field/multiline-text-field.tpl.html',
      'src/text-field/text-field-core.tpl.html',
    ],
    propertiesType: 'TextFieldProperties',
    eventsType: 'TextFieldEvents',
    cssPropertiesType: 'TextFieldCSSProperties',
    additionalEvents: [
      {
        name: 'input',
        optional: false,
        type: 'InputEvent',
        description: 'Native input event from the internal textarea control.',
      },
      {
        name: 'change',
        optional: false,
        type: 'Event',
        description: 'Native change event from the internal textarea control.',
      },
    ],
    meta: {
      id: 'multiline-text-field',
      title: 'Multiline Text Field',
      docPage: MULTILINE_TEXT_FIELD_DOC_PAGE,
      summary:
        'Multiline text fields support wrapped long-form input while keeping the same Material X text-field anatomy. They share slots, tokens, and accessibility patterns with single-line fields.',
      whenToUse: [
        'Use for long-form text with wrapping content.',
        'Use when you need text-field anatomy plus textarea behavior.',
      ],
      pitfalls: [
        'Always provide meaningful label content or explicit ARIA naming.',
        'Avoid multiline fields for short constrained values where single-line input is clearer.',
      ],
      deltas: [
        'Implements multiline support with `textarea` while reusing the same slot and token system as `mx-text-field`.',
      ],
      a11yCaveats: [
        {
          title: 'Always provide a label slot or explicit ARIA name',
          detail:
            'Without a meaningful label, assistive technologies can receive an empty accessible name.',
        },
      ],
      m3: componentM3Links['multiline-text-field']!,
    },
  },
];

export const componentDocsById: Readonly<
  Record<string, ComponentDocDefinition>
> = Object.freeze(
  Object.fromEntries(
    componentDocs.map((component) => [component.id, component]),
  ),
);

export const buttonFamilyDocPage = BUTTON_FAMILY_DOC_PAGE;
