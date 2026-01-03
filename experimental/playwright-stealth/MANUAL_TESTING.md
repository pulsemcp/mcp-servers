# Manual Testing Documentation

## Overview

This document tracks manual testing results for the Playwright Stealth MCP Server. Manual tests verify real browser behavior and are critical before publishing.

## Test Setup

```bash
npm run test:manual:setup
```

This installs Playwright browsers required for testing.

## Latest Test Results

_No manual tests have been run yet. This will be updated before the first release._

## Test Checklist

- [ ] Standard mode: Navigate and extract page title
- [ ] Standard mode: Take screenshot
- [ ] Standard mode: Get browser state
- [ ] Standard mode: Close browser
- [ ] Stealth mode: Navigate to anti-bot test site
- [ ] Stealth mode: Verify webdriver is not detected
- [ ] Error handling: Navigation timeout
- [ ] Error handling: Execution timeout
