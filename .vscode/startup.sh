#!/bin/bash

# Use AppleScript to control VS Code Insiders window layout
osascript <<'EOF'
tell application "System Events"
    tell process "Code - Insiders"
        -- Close sidebar (Cmd+B)
        keystroke "b" using command down
        delay 0.5
        
        -- Close all editors (Cmd+K, Cmd+W)
        keystroke "k" using command down
        delay 0.1
        keystroke "w" using command down
        delay 0.5
        
        -- Open/focus terminal (Ctrl+`)
        key code 50 using control down
        delay 0.5
    end tell
end tell
EOF

# Run Claude Code
exec /Users/admin/.claude/local/claude --dangerously-skip-permissions