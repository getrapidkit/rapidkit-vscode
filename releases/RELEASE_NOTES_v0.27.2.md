# Workspai v0.27.2 Release Notes

Release date: May 10, 2026
Version: 0.27.1 -> 0.27.2
Release posture: stabilization-only

## Executive Summary

v0.27.2 is a targeted stability patch that eliminates a class of uncaught `Webview is disposed` errors in the Setup & Installation panel. When users closed the panel while background async checks were still running, deferred `postMessage` calls fired against an already-disposed webview, producing noisy uncaught errors in the extension host output. This release makes every such call disposal-safe.

## What Is Fixed

### 1) Webview disposal safety in Setup & Installation panel

**Problem:** Closing the Setup panel mid-check triggered up to 3 uncaught `Webview is disposed` errors per session. Async requirement checks, `setTimeout`-based polling, and `setImmediate` initialization all posted messages after the panel was gone.

**Solution:**

- Added a private `_isDisposing` flag on `SetupExperiencePanel`.
- Registered an explicit `onDidDispose` handler that sets the flag and triggers cleanup before any internal state is torn down.
- Introduced `_safePostMessage(message)` — a thin guard method that checks `_isDisposing` before delegating to `this._panel.webview.postMessage()`, and wraps the call in a `try/catch` to silently absorb any residual disposal errors.
- Replaced all 20+ direct `this._panel.webview.postMessage(...)` calls with `this._safePostMessage(...)`.
- Moved the `onDidReceiveMessage` listener registration into `this._disposables` so it is torn down as part of the standard disposal lifecycle. Added an early-return guard: `if (this._isDisposing) return;` at the top of the message handler.

**Scope:** `src/ui/panels/setupExperiencePanel.ts` only — no behavior changes, no new commands, no API surface changes.

## Changed

- All internal panel message dispatch now routes through `_safePostMessage()` for uniform disposal safety.

## Fixed

- Eliminated `Webview is disposed` uncaught errors that appeared in VS Code extension host output when closing the Setup & Installation panel during active requirement checks.
