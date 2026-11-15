#!/usr/bin/env sh
# Deletes the local `dura/*` snapshot branches of the current repository.
#
#   .scripts/dura-prune.sh              delete every dura/* branch
#   .scripts/dura-prune.sh --keep 5     keep the 5 most recent snapshots
#   .scripts/dura-prune.sh --dry-run    list what would be deleted
#
# A running dura creates the branch again at its next snapshot.
set -eu

keep=0
dry_run=false

usage() {
  echo "Usage: dura-prune [--keep N] [--dry-run]" >&2
  exit 64
}

while [ $# -gt 0 ]; do
  case "$1" in
    --keep)
      [ $# -ge 2 ] || usage
      case "$2" in '' | *[!0-9]*) usage ;; esac
      keep=$2
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    *) usage ;;
  esac
done

branches=$(git for-each-ref --sort=-committerdate --format='%(refname:short)' 'refs/heads/dura/*' | tail -n +"$((keep + 1))")

if [ -z "$branches" ]; then
  echo "No dura branches to delete."
  exit 0
fi

count=$(printf '%s\n' "$branches" | wc -l | tr -d ' ')

if [ "$dry_run" = true ]; then
  printf '%s\n' "$branches"
  echo "Would delete $count dura branches."
else
  printf '%s\n' "$branches" | xargs git branch -D -q
  echo "Deleted $count dura branches."
fi
