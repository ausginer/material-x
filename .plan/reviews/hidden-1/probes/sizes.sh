# Brotli sizes of variants of the rule. Run from packages/material-x of a built
# clone at dce82dffa: sizes.sh <output directory>
set -euo pipefail
O=${1:?}
CSS=src/core/styles/host/host.styles.css; CORE=src/core/utils/useCore.ts
restore() { git checkout -q dce82dffa -- src; }
size() {
  aube exec just build-lib > /dev/null 2>&1
  aube exec size-limit --json | node -e 'const j=JSON.parse(require("fs").readFileSync(0));console.log(j.map(x=>x.name+" "+x.size).join("\n"))' > "$O/size-$1.txt"
  restore
}
size head
git checkout -q e57c9f074 -- $CORE; size base
printf ':host([hidden]) {\n  display: none;\n}\n' > $CSS; size no-until-found
printf ":host([hidden]:not([hidden='until-found'])) {\n  display: none;\n}\n" > $CSS; size no-i
printf ':host {\n}\n' > $CSS; size empty-sheet
printf ":host([hidden]:not([hidden*='-f' i])) {\n  display: none;\n}\n" > $CSS; size shorter-selector
sed -i "s#\[...styles, hostStyles\]#styles#; s#^    styles as readonly#    styles as readonly#" $CORE; size rule-not-adopted
aube exec just build-lib > /dev/null 2>&1
cd "$O"
for f in size-*.txt; do awk -v n="$f" 'NR==FNR{b[$1]=$2;next}{d=$2-b[$1]; if(NR>0){ if(min==""||d<min)min=d; if(max==""||d>max)max=d; s+=d; c++} if($1=="complete")k=d} END{printf "%-30s min %+d max %+d mean %+.1f complete %+d\n",n,min,max,s/c,k}' size-base.txt "$f"; done
paste size-base.txt size-head.txt | awk '{printf "  %-38s %d to %d (%+d)\n",$1,$2,$4,$4-$2}'
