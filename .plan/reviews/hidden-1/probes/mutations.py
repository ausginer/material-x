# The review's mutations. Run from packages/material-x of a built clone at
# dce82dffa: python3 mutations.py <engine>
import os, re, subprocess, sys
CSS='src/core/styles/host/host.styles.css'; CORE='src/core/utils/useCore.ts'
RULE=":host([hidden]:not([hidden='until-found' i]))"
M=[
 ('no mutation',None,None,None),
 ('an element that does not reach useCore (mx-icon)','src/icon/icon.ts','useCore(this, [template], {}, [iconStyles]);',"useShadowDOM(this, [template], [iconStyles] as unknown as CSSStyleSheet[]);"),
 ('the sheet before those of the component',CORE,'[...styles, hostStyles]','[hostStyles, ...styles]'),
 ('a specificity below two states',CSS,RULE,":host([hidden]:not(:where([hidden='until-found' i])))"),
 ('the empty value alone, at the same specificity',CSS,RULE,":host([hidden='']:not([hidden=x]))"),
 ('visibility in place of display',CSS,'display: none;','visibility: hidden;'),
 ('a component host display above the rule (mx-slider)','src/slider/styles/default/main.styles.css',':host {\n  display: block;',':host(:not(#x)) {\n  display: block;'),
]
for name,f,a,b in M:
    if f:
        s=open(f).read(); assert s.count(a)==1,(name,s.count(a))
        t=s.replace(a,b)
        if 'useShadowDOM(this' in b: t="import { useShadowDOM } from '@ydinjs/core/controllers/useShadowDOM.js';\n"+t
        open(f,'w').write(t)
    for e in (sys.argv[1],):
        r=subprocess.run(['aube','exec','vitest','run','-c','vitest.config.ts','tests/core/hidden'],capture_output=True,text=True,env={**os.environ,'NO_COLOR':'1','MX_TEST_ENGINES':e})
        o=r.stdout+r.stderr
        c=next((l.strip() for l in o.split('\n') if re.match(r' +Tests ',l)),'no result')
        print(f'## {name} | {e} | {c}',flush=True)
        for l in dict.fromkeys(l for l in o.split('\n') if 'FAIL ' in l): print('   '+re.sub(r'^.*?test\.ts(:\d+)? > ','',l).strip())
    subprocess.run(['git','checkout','-q','--','src'],check=True)
