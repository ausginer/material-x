#!/bin/bash
# Appends each status line payload, stamped, to payloads.jsonl beside this script.
jq -c '{captured_at: now} + .' >> "$(dirname "$0")/payloads.jsonl"
echo probe
