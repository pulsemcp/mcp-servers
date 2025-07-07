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
  
  # Ensure git commit safety wrapper is available in new worktree
  echo "Setting up git commit safety wrapper..."
  
  # Copy the git wrapper script to the new worktree
  if [ -f "$MAIN_WORKTREE/bin/git" ]; then
    mkdir -p "$NEW_WORKTREE_PATH/bin"
    cp "$MAIN_WORKTREE/bin/git" "$NEW_WORKTREE_PATH/bin/git"
    chmod +x "$NEW_WORKTREE_PATH/bin/git"
    echo "  ✓ Git wrapper copied to new worktree"
  else
    echo "  ⚠️  Git wrapper not found in main worktree bin/"
  fi
  
  # Add a note about PATH setup
  echo "  📝 Note: Add this worktree's bin/ to PATH to enable git safety wrapper:"
  echo "      export PATH=\"$NEW_WORKTREE_PATH/bin:\$PATH\""
  
  # Copy all gitignored files from source worktree
  echo "Copying gitignored files (e.g., .env files)..."
  
  # Use git to find all ignored files and copy them to the new worktree
  cd "$CURRENT_ROOT"
  
  # Get list of all ignored files (excluding .git directory)
  IGNORED_FILES=$(git status --porcelain --ignored | grep '^!!' | sed 's/^!! //' | grep -v '^\.git/')
  
  # Count files for progress
  COPIED_COUNT=0
  
  # Copy each ignored file/directory to the new worktree
  if [ -n "$IGNORED_FILES" ]; then
    echo "$IGNORED_FILES" | while IFS= read -r ignored_item; do
      if [ -e "$ignored_item" ]; then
        # Create parent directory in destination if needed
        DEST_DIR=$(dirname "$NEW_WORKTREE_PATH/$ignored_item")
        mkdir -p "$DEST_DIR"
        
        # Copy the file or directory
        if [ -d "$ignored_item" ]; then
          cp -r "$ignored_item" "$NEW_WORKTREE_PATH/$ignored_item" 2>/dev/null || true
        else
          cp "$ignored_item" "$NEW_WORKTREE_PATH/$ignored_item" 2>/dev/null || true
        fi
        
        ((COPIED_COUNT++))
      fi
    done
  fi
  
  # Also check for any untracked files that might be useful (like .env files)
  # This catches files that are untracked but not explicitly ignored
  UNTRACKED_ENV_FILES=$(find . -name '.env*' -type f | grep -v '^\.git/' | while read -r f; do
    # Check if it's actually untracked
    git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "$f"
  done)
  
  if [ -n "$UNTRACKED_ENV_FILES" ]; then
    echo "$UNTRACKED_ENV_FILES" | while IFS= read -r env_file; do
      if [ -e "$env_file" ]; then
        # Create parent directory in destination if needed
        DEST_DIR=$(dirname "$NEW_WORKTREE_PATH/$env_file")
        mkdir -p "$DEST_DIR"
        
        # Copy the file
        cp "$env_file" "$NEW_WORKTREE_PATH/$env_file" 2>/dev/null || true
        ((COPIED_COUNT++))
      fi
    done
  fi
  
  echo "  ✓ Copied $COPIED_COUNT gitignored/untracked file(s)"
  
  # Install dependencies in the new worktree if it's a Node.js project
  if [ -f "$NEW_WORKTREE_PATH/package.json" ]; then
    echo "Installing dependencies in new worktree..."
    
    # Function to install dependencies in a directory
    install_deps() {
      local dir="$1"
      local name="$2"
      
      cd "$dir"
      if [ -f "package-lock.json" ]; then
        echo "  📦 Installing dependencies in $name..."
        if npm ci --no-audit --no-fund >/dev/null 2>&1; then
          echo "  ✓ $name dependencies installed"
        else
          echo "  ⚠️  Failed to install dependencies in $name"
        fi
      else
        echo "  📦 Installing dependencies in $name..."
        if npm install --no-audit --no-fund >/dev/null 2>&1; then
          echo "  ✓ $name dependencies installed"
        else
          echo "  ⚠️  Failed to install dependencies in $name"
        fi
      fi
    }
    
    # Function to robustly install dependencies with cleanup if needed
    install_deps_robust() {
      local dir="$1"
      local name="$2"
      
      cd "$dir"
      
      # First attempt: try normal installation
      if [ -f "package-lock.json" ]; then
        echo "  📦 Installing dependencies in $name..."
        if npm ci --no-audit --no-fund >/dev/null 2>&1; then
          echo "  ✓ $name dependencies installed"
          return 0
        fi
      else
        echo "  📦 Installing dependencies in $name..."
        if npm install --no-audit --no-fund >/dev/null 2>&1; then
          echo "  ✓ $name dependencies installed"
          return 0
        fi
      fi
      
      # If first attempt failed, clean and retry
      echo "  ⚠️  Initial install failed, cleaning node_modules and retrying..."
      rm -rf node_modules
      
      if [ -f "package-lock.json" ]; then
        if npm ci --no-audit --no-fund >/dev/null 2>&1; then
          echo "  ✓ $name dependencies installed after cleanup"
          return 0
        fi
      else
        if npm install --no-audit --no-fund >/dev/null 2>&1; then
          echo "  ✓ $name dependencies installed after cleanup"
          return 0
        fi
      fi
      
      echo "  ❌ Failed to install dependencies in $name even after cleanup"
      return 1
    }
    
    # Check if it's a monorepo by looking for workspaces in package.json
    cd "$NEW_WORKTREE_PATH"
    if grep -q '"workspaces"' package.json 2>/dev/null; then
      echo "  🔍 Detected monorepo with workspaces"
      
      # For monorepos, we need to be extra careful about module resolution
      # Clean install from root to avoid module resolution issues
      echo "  🧹 Performing clean installation for monorepo..."
      echo "     (This ensures proper module resolution across workspaces)"
      
      # Remove all node_modules directories to ensure clean state
      echo "  📦 Cleaning existing node_modules..."
      find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
      
      # Use the dedicated monorepo install script
      # First try the main worktree, then try the current worktree
      INSTALL_SCRIPT="$MAIN_WORKTREE/scripts/install-monorepo-deps.sh"
      if [ ! -f "$INSTALL_SCRIPT" ]; then
        INSTALL_SCRIPT="$CURRENT_ROOT/scripts/install-monorepo-deps.sh"
      fi
      
      # Run the install script in background and log output
      echo "  🚀 Starting background installation of all workspace dependencies..."
      echo "     (This will continue in the background - you can start coding immediately)"
      echo "     Log file: $NEW_WORKTREE_PATH/.gw-install.log"
      
      if [ -f "$INSTALL_SCRIPT" ]; then
        nohup "$INSTALL_SCRIPT" "$NEW_WORKTREE_PATH" > "$NEW_WORKTREE_PATH/.gw-install.log" 2>&1 &
        
        # Give a moment for the background process to start
        sleep 2
      
        echo "  ✓ Background installation started (PID: $!)"
        echo "  💡 Tip: Run 'tail -f .gw-install.log' in the new worktree to monitor progress"
      else
        echo "  ⚠️  Monorepo install script not found at: $INSTALL_SCRIPT"
        echo "     Running robust npm install instead..."
        install_deps_robust "$NEW_WORKTREE_PATH" "root"
      fi
    else
      # Not a monorepo, install normally with robust fallback
      install_deps_robust "$NEW_WORKTREE_PATH" "root"
    fi
    
    cd "$CURRENT_ROOT"
  else
    echo "Skipping npm install - no package.json found"
  fi
  
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
                # Escape special characters in the value for sed
                escaped_value=$(printf '%s\n' "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')
                sed -i.bak "s|{{${key}}}|${escaped_value}|g" "$NEW_WORKTREE_PATH/.mcp.json"
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
  
  echo "Opening in VS Code..."
  code "$NEW_WORKTREE_PATH" --new-window
  
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