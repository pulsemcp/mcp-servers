#!/bin/bash

# Use AppleScript to trigger full terminal mode keybinding
osascript <<'EOF'
tell application "System Events"
    tell process "Code - Insiders"
        -- Trigger Ctrl+Cmd+T for full terminal mode
        keystroke "t" using {control down, command down}
        delay 0.5
    end tell
end tell
EOF

# Run Claude Code
exec claude --dangerously-skip-permissions