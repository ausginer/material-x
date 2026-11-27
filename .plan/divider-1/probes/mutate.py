"""The implementation's witnesses: each mutation edits one source file, runs the
rows' file in Chromium, and restores the file. Prints each mutation's failed
rows and the file's counts. Run from the repository root:
python3 .plan/divider-1/probes/mutate.py [name ...]"""
import pathlib
import re
import subprocess
import sys

PKG = pathlib.Path('packages/material-x')
DIVIDER = PKG / 'src/divider/divider.ts'
STYLES = PKG / 'src/divider/styles/default/main.styles.css'
CARD = PKG / 'src/card/styles/default/main.styles.css'
BEHAVIOR = 'tests/divider/divider.browser.test.ts'
SPEC = 'tests/divider/divider.spec.browser.test.ts'

HOST = """:host {
  display: block;
  box-sizing: content-box !important;
  padding: 0 !important;
"""

MUTATIONS = {
    # The host is positioned, as a containing block for a line would be.
    'host-positioned': (STYLES, HOST, HOST + '  position: relative;\n', 'browser', BEHAVIOR),
    # `orientation` doesn't reach the internals' ariaOrientation.
    'no-aria-orientation': (
        DIVIDER, '        innards.ariaOrientation = newValue;\n', '', 'browser', BEHAVIOR),
    # No padding declaration of the host is `!important`, so a page's reset
    # and a page's padding beat the insets.
    'padding-not-important': (STYLES, None, None, 'spec', SPEC),
    # No forced-colors rule.
    'no-forced-colors': (
        STYLES,
        '@media (forced-colors: active) {\n  :host {\n    background-color: CanvasText;\n  }\n}\n',
        '', 'spec', SPEC),
    # The card has no rule for a divider.
    'no-card-rule': (
        CARD,
        '::slotted(mx-divider:not(:state(vertical))) {\n'
        '  margin-inline: calc(-1 * var(--md-card-padding-inline, 16px)) !important;\n}\n',
        '', 'spec', SPEC),
    # The line is an absolutely positioned box, outside the host's own box.
    'line-outside-box': (
        STYLES, HOST,
        HOST + '  background-color: transparent !important;\n}\n\n'
        ':host::before {\n  content: \'\';\n  position: absolute;\n  inset-inline: 0;\n'
        '  block-size: var(--md-divider-thickness, var(--_thickness));\n'
        '  background-color: var(--md-divider-color, var(--_color));\n}\n\n:host {\n',
        'spec', SPEC),
}

ANSI = re.compile(r'\x1b\[[0-9;]*m')


def run(name):
    path, old, new, project, file = MUTATIONS[name]
    original = path.read_text()
    if old is None:
        mutated = re.sub(r'(padding[-a-z]*: [^;]*) !important;', r'\1;', original)
    elif original.count(old) != 1:
        raise SystemExit(f'{name}: the text to replace is not in {path} once')
    else:
        mutated = original.replace(old, new)
    path.write_text(mutated)
    try:
        result = subprocess.run(
            ['aube', 'exec', 'just', f'test-{"behavior" if project == "browser" else "spec"}', file],
            cwd=PKG, capture_output=True, text=True)
    finally:
        path.write_text(original)
    out = ANSI.sub('', result.stdout + result.stderr)
    print(f'== {name}: {path} ({file})')
    for line in out.splitlines():
        if line.lstrip().startswith('×'):
            print('  ' + re.sub(r' \d+ms$', '', line.strip()))
        elif re.match(r'\s+Tests\s', line):
            print('  ' + line.strip())


for name in sys.argv[1:] or MUTATIONS:
    run(name)
