#!/bin/bash

# Git Worktree script
# Creates a new git worktree with a branch and opens it in VS Code Insider

# Function to display help
show_help() {
    echo "Usage: $(basename $0) [OPTIONS] [branch-suffix]"
    echo ""
    echo "Creates a new git worktree with a branch and opens it in VS Code Insider."
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help      Show this help message"
    echo "  -m, --mcp       Interactive MCP profile selection"
    echo "  --mcp PROFILE   Activate specific MCP profile (e.g., --mcp development)"
    echo ""
    echo "ARGUMENTS:"
    echo "  branch-suffix   Optional branch name suffix (default: patch-{timestamp})"
    echo ""
    echo "Examples:"
    echo "  $(basename $0)                    # Create worktree with auto-generated branch name"
    echo "  $(basename $0) fix-bug            # Create worktree with branch tadasant/fix-bug"
    echo "  $(basename $0) -m fix-bug         # Create worktree and select MCP profile interactively"
    echo "  $(basename $0) --mcp development fix-bug  # Create worktree with development MCP profile"
}

# Get the git repository root (works in both main repo and worktrees)
CURRENT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$CURRENT_ROOT" ]; then
  echo "Error: Not in a git repository"
  exit 1
fi

# Find the main worktree (the actual git directory)
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"
if [ "$GIT_COMMON_DIR" = ".git" ] || [ "$GIT_COMMON_DIR" = "$(pwd)/.git" ]; then
  # We're in the main repository
  MAIN_WORKTREE="$CURRENT_ROOT"
else
  # We're in a worktree, find the main worktree
  MAIN_WORKTREE="$(dirname "$GIT_COMMON_DIR")"
fi

# Parse command line arguments
BRANCH_SUFFIX=""
MCP_PROFILE=""
INTERACTIVE_MCP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -m|--mcp)
            if [[ $# -gt 1 ]] && [[ ! "$2" =~ ^- ]]; then
                # If next arg exists and doesn't start with -, it's the profile name
                MCP_PROFILE="$2"
                shift 2
            else
                # Otherwise, interactive mode
                INTERACTIVE_MCP=true
                shift
            fi
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
        *)
            BRANCH_SUFFIX="$1"
            shift
            ;;
    esac
done

# If no argument provided, use patch-{datetime}
if [ -z "$BRANCH_SUFFIX" ]; then
  BRANCH_SUFFIX="patch-$(date +%s)"
fi

# Create the full branch name with github username prefix
BRANCH_NAME="tadasant/$BRANCH_SUFFIX"

# Create worktree directory name (replace / with -)
WORKTREE_DIR=$(echo "$BRANCH_NAME" | tr '/' '-')

# Stash any uncommitted changes
echo "Checking for uncommitted changes..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Stashing uncommitted changes..."
  git stash push -m "Auto-stash before creating worktree $BRANCH_NAME"
  STASHED=true
else
  STASHED=false
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Switching to main branch..."
  git checkout main
fi

# Pull latest main branch
echo "Pulling latest main branch..."
git pull origin main

# Create the worktree (at the same level as other worktrees)
echo "Creating worktree: $WORKTREE_DIR"
echo "With branch: $BRANCH_NAME"

# Get the parent directory of the main worktree
WORKTREES_PARENT="$(dirname "$MAIN_WORKTREE")"
NEW_WORKTREE_PATH="$WORKTREES_PARENT/$WORKTREE_DIR"

git worktree add "$NEW_WORKTREE_PATH" -b "$BRANCH_NAME"

if [ $? -eq 0 ]; then
  echo "Worktree created successfully!"
  
  # Copy all gitignored files from source worktree
  echo "Copying gitignored files (e.g., .env files)..."
  
  # Method 1: Use rsync to copy everything, then remove tracked files
  # This ensures we get all ignored files including those in subdirectories
  
  # First, copy everything from source to destination
  rsync -a --exclude='.git' "$CURRENT_ROOT/" "$NEW_WORKTREE_PATH/"
  
  # Then remove all tracked files from the destination
  # We do this by getting a list of all tracked files and removing them
  cd "$NEW_WORKTREE_PATH"
  git ls-files | while IFS= read -r file; do
    rm -f "$file"
  done
  
  # Clean up empty directories that might have been left
  find . -type d -empty -delete 2>/dev/null || true
  
  # Count how many files were copied
  COPIED_COUNT=$(find . -type f -not -path './.git/*' | wc -l)
  echo "  ✓ Copied $COPIED_COUNT gitignored file(s)"
  
  # Return to original directory
  cd "$CURRENT_ROOT"
  
  # Handle MCP profile activation
  # Default to base profile if no MCP options provided
  if [ "$INTERACTIVE_MCP" = false ] && [ -z "$MCP_PROFILE" ]; then
    MCP_PROFILE="base"
  fi
  
  if [ "$INTERACTIVE_MCP" = true ] || [ -n "$MCP_PROFILE" ]; then
    # Define profiles directory relative to main worktree
    PROFILES_DIR="$MAIN_WORKTREE/mcp-json-profiles"
    SECRETS_FILE="$PROFILES_DIR/.secrets"
    
    if [ -d "$PROFILES_DIR" ]; then
      if [ "$INTERACTIVE_MCP" = true ]; then
        # Interactive profile selection
        echo ""
        echo "Available MCP profiles:"
        profiles=()
        i=1
        for profile in "$PROFILES_DIR"/.mcp.*.json; do
          if [ -f "$profile" ]; then
            profile_name=$(basename "$profile" | sed 's/.mcp.\(.*\)\.json/\1/')
            profiles+=("$profile_name")
            echo "  $i) $profile_name"
            ((i++))
          fi
        done
        
        if [ ${#profiles[@]} -eq 0 ]; then
          echo "No MCP profiles found in $PROFILES_DIR"
        else
          echo ""
          read -p "Select profile (1-${#profiles[@]}): " selection
          
          if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#profiles[@]} ]; then
            MCP_PROFILE="${profiles[$((selection-1))]}"
          else
            echo "Invalid selection"
          fi
        fi
      fi
      
      # Activate the selected profile
      if [ -n "$MCP_PROFILE" ]; then
        PROFILE_FILE="$PROFILES_DIR/.mcp.$MCP_PROFILE.json"
        if [ -f "$PROFILE_FILE" ]; then
          echo "Activating MCP profile: $MCP_PROFILE"
          cp "$PROFILE_FILE" "$NEW_WORKTREE_PATH/.mcp.json"
          
          # Replace secrets if .secrets file exists
          if [ -f "$SECRETS_FILE" ]; then
            echo "Replacing secret placeholders..."
            
            # Read secrets and replace placeholders
            while IFS='=' read -r key value; do
              # Skip comments and empty lines
              [[ "$key" =~ ^#.*$ ]] || [[ -z "$key" ]] && continue
              
              # Remove leading/trailing whitespace
              key=$(echo "$key" | xargs)
              value=$(echo "$value" | xargs)
              
              # Replace placeholder in .mcp.json
              if [ -n "$key" ] && [ -n "$value" ]; then
                sed -i.bak "s|{{$key}}|$value|g" "$NEW_WORKTREE_PATH/.mcp.json"
              fi
            done < "$SECRETS_FILE"
            
            # Remove backup file
            rm -f "$NEW_WORKTREE_PATH/.mcp.json.bak"
            echo "  ✓ MCP profile activated with secrets"
          else
            echo "  ✓ MCP profile activated (no secrets file found)"
          fi
        else
          echo "Warning: Profile file not found: $PROFILE_FILE"
        fi
      fi
    else
      echo "Warning: MCP profiles directory not found: $PROFILES_DIR"
    fi
  fi
  
  echo "Opening in VS Code Insider..."
  code-insiders "$NEW_WORKTREE_PATH" --new-window
  
  # If we stashed changes, apply them back on main
  if [ "$STASHED" = true ]; then
    echo "Returning to original location and applying stashed changes..."
    cd "$CURRENT_ROOT"
    git stash pop
  fi
else
  echo "Failed to create worktree"
  exit 1
fi