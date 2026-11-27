import sys
mode = sys.argv[1]
u = 'src/checkbox/styles/utils.ts'
m = 'src/checkbox/styles/default/main.css.ts'
s = open(u).read()
if mode in ('no-exclusion', 'both'):
    old = "  pseudoClass('not', pseudoClass('disabled')),\n"
    assert old in s
    s = s.replace(old, "")
if mode in ('after-disabled', 'both'):
    old = """    ...ENABLED_PATHS.map((path) => `${ERROR_PREFIX}${path}`),
    'disabled',
    'unselected.disabled',
    'selected.disabled',"""
    assert old in s
    s = s.replace(old, """    'disabled',
    'unselected.disabled',
    'selected.disabled',
    ...ENABLED_PATHS.map((path) => `${ERROR_PREFIX}${path}`),""")
open(u, 'w').write(s)
if mode == 'no-error-css':
    t = open(m).read()
    assert '[defaultTokens, errorTokens]' in t
    open(m, 'w').write(t.replace('[defaultTokens, errorTokens]', '[defaultTokens]'))
