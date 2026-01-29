#!/bin/bash
#
# Claude Code PostToolUse hook for Bash commands.
# After a git commit:
#   1. Bumps the patch version in version.ts and package.json
#   2. Stages and amends the commit with the version bump
#   3. Reminds Claude to update the changelog if needed
#

set -e

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Only act on git commit commands
if ! echo "$COMMAND" | grep -qE 'git commit'; then
  exit 0
fi

# Check the tool output to see if the commit actually succeeded
TOOL_OUTPUT=$(echo "$INPUT" | jq -r '.tool_output.stdout // empty' 2>/dev/null)
TOOL_STDERR=$(echo "$INPUT" | jq -r '.tool_output.stderr // empty' 2>/dev/null)

# If there's no evidence of a successful commit, skip
if ! echo "$TOOL_OUTPUT$TOOL_STDERR" | grep -qE '\[.+ [0-9a-f]+\]'; then
  exit 0
fi

# Skip version bump commits to avoid infinite loops
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
if echo "$COMMIT_MSG" | grep -qE '^chore: bump version'; then
  exit 0
fi

VERSION_FILE="src/lib/version.ts"
PACKAGE_FILE="package.json"

CURRENT_VERSION=$(grep -oP "VERSION = '\K[^']+" "$VERSION_FILE" 2>/dev/null || echo "")
if [ -z "$CURRENT_VERSION" ]; then
  exit 0
fi

# Parse and bump patch
MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
PATCH=$(echo "$CURRENT_VERSION" | cut -d. -f3)
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

# Update version files
sed -i "s/VERSION = '.*'/VERSION = '$NEW_VERSION'/" "$VERSION_FILE"
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_FILE"

# Amend the commit to include version bump
git add "$VERSION_FILE" "$PACKAGE_FILE"
git commit --amend --no-edit --no-verify 2>/dev/null

echo "Version bumped: $CURRENT_VERSION -> $NEW_VERSION" >&2

exit 0
