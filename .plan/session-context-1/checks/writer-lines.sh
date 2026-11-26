input=$(cat)

# Session context for the material-x coordinator: one file per session name.
ctx_name=$(echo "$input" | jq -r '.session_name // empty' | tr '/' '_')
if [ -n "$ctx_name" ]; then
  ctx_dir=${CLAUDE_CONFIG_DIR:-$HOME/.claude}/ctx
  mkdir -p "$ctx_dir"
  ctx_tmp=$(mktemp "$ctx_dir/.tmp.XXXXXX")
  echo "$input" | jq '{session_name, session_id, transcript_path, cwd,
      written_at: (now | floor), context_window: (.context_window
      | {total_input_tokens, context_window_size, used_percentage})}' \
    > "$ctx_tmp" && mv -f "$ctx_tmp" "$ctx_dir/$ctx_name.json"
fi

printf 'line'
