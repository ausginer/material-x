#!/usr/bin/env bash
# Runs the tool with GitHub's real answer for an issue, changed by one jq
# filter, and with written answers. It only reads GitHub.
# Run: bash answers.sh
cd "$(dirname "$0")/../../../.." || exit 1
B=$(mktemp -d); export REAL; REAL=$(command -v gh)
trap 'rm -rf "${B:?}"' EXIT
cat > "${B:?}/gh" <<'S'
#!/usr/bin/env bash
[ -n "$WRITTEN" ] && { printf '%s' "$WRITTEN"; exit 0; }
"$REAL" "$@" | jq -c "$FILTER"
S
chmod +x "${B:?}/gh"
I=.data.repository.issue
tool() { PATH="$B:$PATH" node .scripts/finding.ts "$@" > "$B/out" 2> "$B/err"; echo "  exit $?, out $(wc -c < "$B/out") bytes, err: $(grep -v '^$' "$B/err" | head -3 | tr '\n' '/')"; head -1 "$B/out" | sed 's/^/  /'; tail -1 "$B/out" | sed 's/^/  /'; }
TIER="$I.labels.nodes += [{name: \"tier:B\"}]"
echo "== #228 as it is"; FILTER=. tool 228
echo "== #228 with a tier label"; FILTER=$TIER tool 228
echo "== #228 with a label and the ending of r0: check 8, from GitHub's own times"
FILTER="$TIER | $I.body += \"\n\nRevision 0\n\n— ARCHITECT\n\"" tool 228
N=$(gh issue list --state all --limit 100 --json number,body,comments --jq '[.[]|select(.comments|length>0)|.number][0]')
echo "== #228, the same, with no edit: in order"
FILTER="$TIER | $I.body += \"\n\nRevision 0\n\n— ARCHITECT\n\" | $I.lastEditedAt = null | $I.editor = null" tool 228 r0
echo "== #$N (it has comments), the same"
FILTER="$TIER | $I.body += \"\n\nRevision 0\n\n— ARCHITECT\n\" | $I.lastEditedAt = null | $I.editor = null" tool "$N" r0

A() { jq -cn --arg t "$1" --arg at "$2" '{author:{login:"Lodin"},body:$t,createdAt:$at,lastEditedAt:null}'; }
W() { # editor, revision line, comments
  jq -cn --argjson e "$1" --arg r "$2" --argjson c "$3" '{data:{repository:{issue:{number:300,title:"T",url:"u",state:"OPEN",author:{login:"Lodin"},editor:$e,lastEditedAt:"2026-11-24T10:00:00Z",labels:{nodes:[{name:"tier:B"}]},body:("The contract.\n\n"+$r+"\n\n— ARCHITECT\n"),comments:{totalCount:($c|length),nodes:$c}}}}}'; }
A1=$(A $'### Amendment 1\n\nx\n\n— ARCHITECT\n' 2026-11-24T10:00:05Z)
echo "== r1, edited, the editor is null, as GitHub answers for a deleted account"
WRITTEN=$(W null 'Revision 1' "[$A1]") tool 300 r1
echo "== the same, the editor is another account"
WRITTEN=$(W '{"login":"other"}' 'Revision 1' "[$A1]") tool 300 r1
echo "== Amendment 2 whose heading ends with a space, body at r1"
WRITTEN=$(W '{"login":"Lodin"}' 'Revision 1' "[$A1,$(A $'### Amendment 2 \n\nx\n\n— ARCHITECT' 2026-11-24T11:00:00Z)]") tool 300 r1
echo "== Amendment 2 after an empty first line, body at r1"
WRITTEN=$(W '{"login":"Lodin"}' 'Revision 1' "[$A1,$(A $'\n### Amendment 2\n\nx\n\n— ARCHITECT' 2026-11-24T11:00:00Z)]") tool 300 r1
echo "== Revision 01, Amendment 01 and r01"
WRITTEN=$(W '{"login":"Lodin"}' 'Revision 01' "[$(A $'### Amendment 01\n\nx\n\n— ARCHITECT' 2026-11-24T10:00:05Z)]") tool 300 r01
echo "== r0 with a surplus Amendment 1"
WRITTEN=$(W null 'Revision 0' "[$A1]") tool 300
echo "== r1 in order, from an issue with 101 comments"
WRITTEN=$(W '{"login":"Lodin"}' 'Revision 1' "[$A1]" | jq -c "$I.comments.totalCount = 101") tool 300 r1
echo "== an answer that isn't JSON, and gh's own with CLICOLOR_FORCE=1"
WRITTEN='<html>' tool 300
echo "  -- CLICOLOR_FORCE=1"; CLICOLOR_FORCE=1 node .scripts/finding.ts 228 2>&1 | grep -a SyntaxError | tr -d '\033'
echo "  -- GH_FORCE_TTY=1"; GH_FORCE_TTY=1 GH_PAGER=cat node .scripts/finding.ts 228 2>&1 | grep -a SyntaxError | tr -d '\033'
echo "== an answer without its issue"
WRITTEN='{"data":{"repository":{"issue":null}}}' tool 300
echo "== gh absent, and a bad token"
PATH="$(dirname "$(command -v node)")" "$(command -v node)" .scripts/finding.ts 300
GH_TOKEN=bad node .scripts/finding.ts 300
for n in 225 999999 99999999999; do node .scripts/finding.ts $n; done
