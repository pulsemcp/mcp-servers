#!/bin/bash
set -e

# Read tool use JSON from stdin
TOOL_JSON=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$TOOL_JSON" | jq -r '.name')

# Define the allowed root using environment variable (prevents path leakage)
ALLOWED_ROOT="$CLAUDE_PROJECT_DIR"

# Function to validate a path (handles absolute, relative, and tilde paths)
# This is the primary security control - all paths must pass through here
validate_path() {
  local path="$1"
  local context="$2"

  # Skip empty paths
  if [ -z "$path" ]; then
    return 0
  fi

  # CRITICAL: Block .. traversal attempts (primary defense)
  # This prevents cumulative escapes like: cd .. && cd .. && cd tmp
  if [[ "$path" == *".."* ]]; then
    echo "Error: Path \"$path\" contains '..' which could escape filesystem root (in $context)" >&2
    exit 1
  fi

  # Resolve to absolute path based on path type
  local resolved
  if [[ "$path" == /* ]]; then
    # Already absolute path
    resolved=$(readlink -f "$path" 2>/dev/null || echo "$path")
  elif [[ "$path" == ~* ]]; then
    # Tilde expansion - expand it first, then resolve
    # Note: This happens in the hook's context, so ~ expands to hook's home
    expanded=$(eval echo "$path" 2>/dev/null || echo "$path")
    resolved=$(readlink -f "$expanded" 2>/dev/null || echo "$expanded")
  else
    # Relative path - CRITICAL: resolve from ALLOWED_ROOT, not current directory
    # This prevents cumulative escapes by always anchoring relative paths to the allowed root
    resolved=$(cd "$ALLOWED_ROOT" && readlink -f "$path" 2>/dev/null || echo "$ALLOWED_ROOT/$path")
  fi

  # Verify resolved path is within allowed root
  # Use trailing slashes to ensure proper directory boundary matching
  # This prevents "/a/b" from matching "/a/bc" and ensures we match whole path segments
  resolved_normalized="$resolved/"
  allowed_normalized="$ALLOWED_ROOT/"

  # Check if resolved path is within or equal to allowed root
  if [[ "$resolved_normalized" != "$allowed_normalized"* ]] && [[ "$resolved" != "$ALLOWED_ROOT" ]]; then
    echo "Error: $context accesses \"$path\" which resolves to \"$resolved\", outside allowed root: $ALLOWED_ROOT" >&2
    exit 1
  fi

  # Additional check: ensure allowed root is not a subdirectory of resolved path
  # This catches cases where agent tries to cd to parent/ancestor directory
  # Example: resolved="/a/b", ALLOWED_ROOT="/a/b/c/d" - This should FAIL
  if [[ "$allowed_normalized" == "$resolved_normalized"* ]] && [[ "$resolved" != "$ALLOWED_ROOT" ]]; then
    echo "Error: $context accesses \"$path\" which resolves to \"$resolved\", which is a parent of allowed root: $ALLOWED_ROOT" >&2
    exit 1
  fi
}

# Function to check if a command word is a directory-changing operation
is_dir_change_cmd() {
  local cmd="$1"
  [[ "$cmd" == "cd" ]] || [[ "$cmd" == "pushd" ]] || [[ "$cmd" == "popd" ]]
}

# Function to extract target directory from cd/pushd command
extract_dir_target() {
  local cmd="$1"
  # Get the second word (the directory) and remove quotes
  echo "$cmd" | awk '{print $2}' | sed 's/["'\''"]//g'
}

# Function to split command on compound operators
# Handles: && || ; | and newlines
split_compound_commands() {
  local cmd="$1"
  # Split on separators while preserving structure
  # This is a simplified approach - doesn't handle all edge cases like nested subshells
  echo "$cmd" | sed 's/[;&|]\+/\n/g'
}

# Validate paths based on tool type
case "$TOOL_NAME" in
  Bash)
    # For Bash, we need to validate each subcommand in compound statements
    COMMAND=$(echo "$TOOL_JSON" | jq -r '.input.command // empty')

    # Whitelist for gh commands (GitHub CLI - read-only tool)
    if [[ "$COMMAND" =~ ^gh[[:space:]] ]]; then
      exit 0
    fi

    # Split command on separators and validate each part
    while IFS= read -r part; do
      # Trim whitespace
      part=$(echo "$part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

      if [ -z "$part" ]; then
        continue
      fi

      # Extract the first word (command name)
      cmd_word=$(echo "$part" | awk '{print $1}')

      # Check for directory-changing commands (cd, pushd, popd)
      if is_dir_change_cmd "$cmd_word"; then
        target=$(extract_dir_target "$part")
        validate_path "$target" "directory change command ($cmd_word)"
        continue
      fi

      # Check for git commands
      if [[ "$part" =~ ^git[[:space:]] ]] || [[ "$cmd_word" == "git" ]]; then
        # Extract git subcommand (word after 'git')
        git_subcmd=$(echo "$part" | awk '{for(i=1;i<=NF;i++) if($i=="git") print $(i+1)}')

        # Whitelist of read-only git commands
        case "$git_subcmd" in
          log|show|diff|status|branch|tag|remote|ls-files|ls-tree|ls-remote|cat-file|rev-parse|describe|shortlog|blame|annotate|reflog|config|grep)
            # Read-only git commands are safe - skip further validation
            continue
            ;;
        esac

        # Check for git -C flag (e.g., git -C /path/to/repo log)
        if [[ "$part" =~ -C[[:space:]] ]]; then
          # Extract the argument after -C (the directory path)
          git_dir=$(echo "$part" | awk '{for(i=1;i<NF;i++) if($i=="-C") print $(i+1)}' | sed 's/["'\''"]//g')
          if [ -n "$git_dir" ]; then
            validate_path "$git_dir" "git -C"
          fi
        fi

        # For write git commands (clone, etc), validate directory arguments
        # Check the last argument if it looks like an absolute path
        last_arg=$(echo "$part" | awk '{print $NF}' | sed 's/["'\''"]//g')
        if [[ "$last_arg" == /* ]]; then
          validate_path "$last_arg" "git $git_subcmd"
        fi

        # Skip further path validation for git commands (branch names can have /)
        continue
      fi

      # Extract ALL paths from the command (absolute, relative with ./, and tilde paths)
      # Note: We don't extract all relative paths (like "foo/bar") because they're too common
      # as non-path arguments. We focus on paths that look like filesystem operations.
      all_paths=$(echo "$part" | grep -oE '(~[^[:space:]]*|/[^[:space:]]*|\./[^[:space:]]*)' | sed 's/["'\''"]//g' || true)

      if [ -n "$all_paths" ]; then
        while IFS= read -r path; do
          if [ -n "$path" ]; then
            # Special handling for git read-only commands - already handled above
            # For all other commands, validate the path
            validate_path "$path" "command argument in '$cmd_word'"
          fi
        done <<< "$all_paths"
      fi
    done < <(split_compound_commands "$COMMAND")
    ;;
  Read|Write|Edit|Glob|NotebookEdit)
    # These tools have file_path or path parameters
    FILE_PATH=$(echo "$TOOL_JSON" | jq -r '.input.file_path // .input.path // .input.notebook_path // empty')
    validate_path "$FILE_PATH" "file operation"
    ;;
  Grep)
    # Grep has optional path parameter
    GREP_PATH=$(echo "$TOOL_JSON" | jq -r '.input.path // empty')
    validate_path "$GREP_PATH" "grep search"
    ;;
esac

# If we get here, validation passed
exit 0