#!/bin/bash
#
# Claude Code PostToolUse hook for Bash commands.
# Detects git commits and reminds Claude to update src/lib/changelog.ts.
#
# Receives JSON on stdin with tool_input.command containing the Bash command that ran.
#

set -e

INPUT=$(cat)

# Extract the command that was executed
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Check if this was a git commit command (but not a changelog auto-commit)
if echo "$COMMAND" | grep -qE 'git commit' && ! echo "$COMMAND" | grep -q 'update changelog'; then
  # Get the commit message and hash
  COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
  COMMIT_HASH=$(git log -1 --pretty=format:"%h" 2>/dev/null || echo "")
  VERSION=$(grep -oP "VERSION = '\K[^']+" src/lib/version.ts 2>/dev/null || echo "unknown")
  TODAY=$(date +%Y-%m-%d)

  # Skip if this is a version bump commit
  if echo "$COMMIT_MSG" | grep -qE '^chore: bump version'; then
    exit 0
  fi

  # Output a reminder to Claude via stderr (shown to Claude as context)
  echo "CHANGELOG REMINDER: A git commit was just made (${COMMIT_HASH}: ${COMMIT_MSG})." >&2
  echo "Please update src/lib/changelog.ts to include this change under version '${VERSION}' with date '${TODAY}'." >&2
  echo "If an entry for version '${VERSION}' already exists, append the change to its changes array." >&2
  echo "If no entry exists for '${VERSION}', add a new entry at the top of the CHANGELOG array." >&2

  exit 0
fi

exit 0
