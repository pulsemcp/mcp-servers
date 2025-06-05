#!/bin/bash

# Git Worktree Manager - Interactive CLI
# Manages worktrees with PR status checking and deletion

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'
REVERSE='\033[7m'

# Arrays to store worktree data
declare -a worktrees
declare -a branches
declare -a pr_statuses
declare -a pr_merged
declare -a selected

# Get GitHub repo info
get_github_repo() {
    local remote_url=$(git remote get-url origin 2>/dev/null)
    if [[ $remote_url =~ github.com[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
        echo "${BASH_REMATCH[1]}/${BASH_REMATCH[2]%.git}"
    fi
}

# Check if branch has a PR and if it's merged
check_pr_status() {
    local branch=$1
    local repo=$(get_github_repo)
    
    if [ -z "$repo" ]; then
        echo "NO_REPO|false"
        return
    fi
    
    # Check for PR using GitHub CLI
    if command -v gh &> /dev/null; then
        local pr_info=$(gh pr list --repo "$repo" --head "$branch" --state all --json number,state,mergedAt --limit 1 2>/dev/null)
        
        if [ -n "$pr_info" ] && [ "$pr_info" != "[]" ]; then
            local pr_number=$(echo "$pr_info" | jq -r '.[0].number // ""')
            local pr_state=$(echo "$pr_info" | jq -r '.[0].state // ""')
            local is_merged=$(echo "$pr_info" | jq -r 'if .[0].mergedAt then "true" else "false" end')
            
            if [ "$is_merged" = "true" ]; then
                echo "PR #$pr_number (MERGED)|true"
            elif [ "$pr_state" = "OPEN" ]; then
                echo "PR #$pr_number (OPEN)|false"
            else
                echo "PR #$pr_number ($pr_state)|false"
            fi
        else
            echo "NO PR|false"
        fi
    else
        echo "GH CLI NOT INSTALLED|false"
    fi
}

# Load worktree data
load_worktrees() {
    worktrees=()
    branches=()
    pr_statuses=()
    pr_merged=()
    selected=()
    
    echo -e "${YELLOW}Loading worktrees and checking PR statuses...${RESET}"
    
    # Get the actual main worktree path from git
    local main_worktree_path=""
    local main_branch=""
    
    # Find the main worktree (the one without a detached HEAD or feature branch)
    while IFS= read -r line; do
        if [[ $line =~ ^([^ ]+)[[:space:]]+([^ ]+)[[:space:]]+\[([^\]]+)\] ]]; then
            local path="${BASH_REMATCH[1]}"
            local branch="${BASH_REMATCH[3]}"
            
            # The first entry is typically the main worktree
            if [ -z "$main_worktree_path" ]; then
                main_worktree_path="$path"
                main_branch="$branch"
                local dir_name=$(basename "$path")
                worktrees+=("$dir_name (main)")
                branches+=("$branch")
                pr_statuses+=("MAIN BRANCH")
                pr_merged+=("false")
                selected+=("false")
            fi
        fi
    done < <(git worktree list)
    
    # Get all worktrees
    while IFS= read -r line; do
        if [[ $line =~ ^([^ ]+)[[:space:]]+([^ ]+)[[:space:]]+\[([^\]]+)\] ]]; then
            local path="${BASH_REMATCH[1]}"
            local commit="${BASH_REMATCH[2]}"
            local branch="${BASH_REMATCH[3]}"
            
            # Skip the main worktree (already added)
            if [[ ! $path =~ \(bare\) ]] && [[ $path != "$main_worktree_path" ]]; then
                local dir_name=$(basename "$path")
                worktrees+=("$dir_name")
                branches+=("$branch")
                
                # Check PR status
                local pr_result=$(check_pr_status "$branch")
                local pr_status="${pr_result%|*}"
                local is_merged="${pr_result#*|}"
                
                pr_statuses+=("$pr_status")
                pr_merged+=("$is_merged")
                selected+=("false")
            fi
        fi
    done < <(git worktree list)
}

# Display the table
display_table() {
    clear
    echo -e "${BOLD}Git Worktree Manager${RESET}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    printf "%-3s %-35s %-25s %s\n" "[ ]" "WORKTREE" "PR STATUS" "MERGED"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    
    for i in "${!worktrees[@]}"; do
        local checkbox="[ ]"
        if [ "${selected[$i]}" = "true" ]; then
            checkbox="[X]"
        fi
        
        local color=""
        if [ "${pr_merged[$i]}" = "true" ]; then
            color=$GREEN
        elif [[ "${pr_statuses[$i]}" == "NO PR" ]]; then
            color=$YELLOW
        fi
        
        if [ "$i" -eq "$current_row" ]; then
            echo -e "${REVERSE}${color}$(printf "%-3s %-35s %-25s %s" "$checkbox" "${worktrees[$i]}" "${pr_statuses[$i]}" "${pr_merged[$i]}")${RESET}"
        else
            echo -e "${color}$(printf "%-3s %-35s %-25s %s" "$checkbox" "${worktrees[$i]}" "${pr_statuses[$i]}" "${pr_merged[$i]}")${RESET}"
        fi
    done
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo
    echo -e "${BOLD}Controls:${RESET}"
    echo "  ↑/↓ or j/k: Navigate    Space: Select/Deselect    d: Delete selected"
    echo "  a: Select all non-main  m: Select all merged      q: Quit"
    echo
    
    # Count selected
    local selected_count=0
    for s in "${selected[@]}"; do
        [ "$s" = "true" ] && ((selected_count++))
    done
    
    if [ "$selected_count" -gt 0 ]; then
        echo -e "${YELLOW}Selected: $selected_count worktree(s)${RESET}"
    fi
    
    # Debug output
    # echo -e "${BLUE}Debug: current_row=$current_row, selected=(${selected[*]})${RESET}"
}

# Delete worktree and branch
delete_worktree() {
    local worktree=$1
    local branch=$2
    local index=$3
    
    # Skip main worktree
    if [[ "${worktrees[$index]}" =~ \(main\) ]]; then
        echo -e "${RED}Cannot delete main worktree${RESET}"
        return 1
    fi
    
    # Find the full path of the worktree
    local worktree_path=""
    while IFS= read -r line; do
        # Check if this line contains our branch
        if [[ $line == *"[$branch]"* ]] && [[ ! $line =~ \(bare\) ]]; then
            # Extract the path (first field)
            worktree_path=$(echo "$line" | awk '{print $1}')
            break
        fi
    done < <(git worktree list)
    
    if [ -n "$worktree_path" ]; then
        echo -e "${YELLOW}Removing worktree: $worktree_path${RESET}"
        git worktree remove "$worktree_path" --force 2>/dev/null || git worktree remove "$worktree_path"
        
        # Try to delete the branch
        echo -e "${YELLOW}Deleting branch: $branch${RESET}"
        git branch -D "$branch" 2>/dev/null
        
        return 0
    else
        echo -e "${RED}Could not find worktree path for $worktree${RESET}"
        return 1
    fi
}

# Main interactive loop
current_row=0

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}Warning: GitHub CLI (gh) is not installed. PR status checking will be limited.${RESET}"
    echo "Install with: brew install gh"
    echo "Press any key to continue..."
    read -n 1 -s
fi

load_worktrees

while true; do
    display_table
    
    # Read single character
    read -rsn1 key
    
    # Debug: Show key pressed (comment out later)
    # printf "\nKey pressed: [%s] (ASCII: %d)\n" "$key" "'$key" >&2
    # sleep 0.5
    
    case "$key" in
        $'\x1b') # ESC sequence
            read -rsn2 key
            case "$key" in
                '[A') # Up arrow
                    ((current_row--))
                    [ $current_row -lt 0 ] && current_row=$((${#worktrees[@]} - 1))
                    ;;
                '[B') # Down arrow
                    ((current_row++))
                    [ $current_row -ge ${#worktrees[@]} ] && current_row=0
                    ;;
            esac
            ;;
        'k') # Up
            ((current_row--))
            [ $current_row -lt 0 ] && current_row=$((${#worktrees[@]} - 1))
            ;;
        'j') # Down
            ((current_row++))
            [ $current_row -ge ${#worktrees[@]} ] && current_row=0
            ;;
        ' '|'') # Space - toggle selection (handle both space and empty string)
            # Only process if it's actually a space (ASCII 32) or empty string from space
            if [ -z "$key" ] || [ "$key" = " " ]; then
                if [ "${selected[$current_row]}" = "true" ]; then
                    selected[$current_row]="false"
                else
                    selected[$current_row]="true"
                fi
            fi
            ;;
        'a') # Select all non-main
            for i in "${!worktrees[@]}"; do
                if [[ ! "${worktrees[$i]}" =~ \(main\) ]]; then
                    selected[$i]="true"
                fi
            done
            ;;
        'm') # Select all merged
            for i in "${!worktrees[@]}"; do
                if [ "${pr_merged[$i]}" = "true" ]; then
                    selected[$i]="true"
                fi
            done
            ;;
        'd') # Delete selected
            # Count selected
            local to_delete=()
            for i in "${!selected[@]}"; do
                if [ "${selected[$i]}" = "true" ]; then
                    to_delete+=($i)
                fi
            done
            
            if [ ${#to_delete[@]} -eq 0 ]; then
                echo -e "${YELLOW}No worktrees selected${RESET}"
                sleep 2
            else
                echo
                echo -e "${RED}About to delete ${#to_delete[@]} worktree(s):${RESET}"
                for i in "${to_delete[@]}"; do
                    echo "  - ${worktrees[$i]} (${branches[$i]})"
                done
                echo
                echo -n "Are you sure? (y/N): "
                read -n 1 confirm
                echo
                
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    for i in "${to_delete[@]}"; do
                        delete_worktree "${worktrees[$i]}" "${branches[$i]}" "$i"
                    done
                    echo
                    echo "Press any key to continue..."
                    read -n 1 -s
                    
                    # Reload worktrees
                    load_worktrees
                    current_row=0
                fi
            fi
            ;;
        'q') # Quit
            echo -e "${GREEN}Exiting...${RESET}"
            exit 0
            ;;
    esac
done