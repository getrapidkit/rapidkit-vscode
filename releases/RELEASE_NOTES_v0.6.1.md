# Release Notes — v0.6.1

**Release date:** 2026-02-03

## Patch Summary

This patch focuses on reliability, UX polish, and quick workflows:

- 🎯 Fixed "Checking..." continuous status issue by replacing interval polling with debounced updates and sending initial installation status when the welcome panel loads.
- 🔍 Correctly distinguish between npm CLI and pipx-installed RapidKit to avoid false `npm` detection.
- 📋 Added copy-to-clipboard for installation commands across Setup Wizard and Module cards (uses full slug, e.g., `rapidkit add module free/cache/redis`).
- 🖥️ Replaced placeholder icon with terminal-style icon on module copy button and updated label to "Manual install" for clarity.
- 🏷️ Header version display updated to show current extension version alongside update availability.

## Files Updated
- `src/ui/panels/welcomePanel.ts` — major updates to UI, detection and copy commands
- `CHANGELOG.md`, `RELEASE_NOTES.md`, package metadata updated

## Notes for users
- After installing the update, open the Welcome panel and verify the Setup Wizard shows actual statuses (not "Checking...").
- Use the "Manual install" button on module cards to copy the exact install command for pasting into your terminal.

---

Enjoy!
