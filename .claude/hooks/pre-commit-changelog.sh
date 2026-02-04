#!/bin/bash
#
# Claude Code PreToolUse hook for Bash commands.
# Intercepts git commit commands and blocks them if:
#   - No changelog entry exists for the current minor version
#
# Exit code 2 = block the tool call.
#

set -e

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Only check git commit commands
if ! echo "$COMMAND" | grep -qE 'git commit'; then
  exit 0
fi

# Skip version bump commits and changelog update commits
if echo "$COMMAND" | grep -qE 'bump version|update changelog|chore:'; then
  exit 0
fi

CHANGELOG_FILE="src/lib/changelog.ts"
VERSION_FILE="src/lib/version.ts"

CURRENT_VERSION=$(grep -oP "^export const VERSION = '\K[^']+" "$VERSION_FILE" 2>/dev/null | head -1 || echo "")
if [ -z "$CURRENT_VERSION" ]; then
  exit 0
fi

# Extract MAJOR.MINOR from current version
CURRENT_MINOR=$(echo "$CURRENT_VERSION" | sed 's/\.[0-9]*$//')

# Get the latest changelog version
CHANGELOG_VERSION=$(grep -oP "version: '\K[^']+" "$CHANGELOG_FILE" 2>/dev/null | head -1)
if [ -z "$CHANGELOG_VERSION" ]; then
  echo "No changelog entries found in $CHANGELOG_FILE. Add an entry for v${CURRENT_MINOR}.0 before committing." >&2
  exit 2
fi

CHANGELOG_MINOR=$(echo "$CHANGELOG_VERSION" | sed 's/\.[0-9]*$//')

if [ "$CHANGELOG_MINOR" != "$CURRENT_MINOR" ]; then
  echo "CHANGELOG MISSING: Latest entry is v${CHANGELOG_VERSION} but current version is v${CURRENT_MINOR}.x." >&2
  echo "Add a changelog entry for v${CURRENT_MINOR}.0 in $CHANGELOG_FILE before committing." >&2
  exit 2
fi

exit 0
