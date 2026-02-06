# 🩺 Workspace Health Check Feature

## Overview

Added a new "Doctor" health check feature to the VS Code extension that allows users to quickly check the health status of their RapidKit workspaces directly from the sidebar.

---

## 🎯 Feature Description

A new inline button (pulse icon 🩺) appears next to each workspace name in the **WORKSPACES** sidebar. Clicking this button runs the `npx rapidkit doctor --workspace` command to perform comprehensive health diagnostics.

---

## 📍 Location

- **Sidebar**: RapidKit Activity Bar → WORKSPACES view
- **Button**: Inline icon next to workspace name (pulse icon)
- **Context Menu**: Also available in right-click context menu

---

## 🛠️ Implementation Details

### Files Modified

1. **package.json**
   - Added command definition: `rapidkit.checkWorkspaceHealth`
   - Added inline button configuration for workspace items
   - Icon: `$(pulse)` - medical pulse/heartbeat icon

2. **src/extension.ts**
   - Registered new command handler
   - Integrated with terminal to run doctor command
   - Added progress notification during check

---

## 💡 How It Works

### User Flow

1. User opens RapidKit sidebar
2. Sees list of workspaces in WORKSPACES view
3. Clicks the pulse icon (🩺) next to workspace name
4. Extension shows progress notification: "🩺 Checking health of workspace: [name]"
5. Terminal opens automatically running `npx rapidkit doctor --workspace`
6. Results displayed in terminal with health status

### Technical Flow

```typescript
Click Pulse Icon
  ↓
Get workspace path
  ↓
Create terminal with workspace cwd
  ↓
Run: npx rapidkit doctor --workspace
  ↓
Show results in terminal
```

---

## 🎨 UI Elements

### Inline Button

```
WORKSPACES
├─ my-workspace (2)  ✓ 🩺     ← Check mark (select) + Pulse (health check)
├─ demo-app (1)      ✓ 🩺
└─ auth-service (3)  ✓ 🩺
```

### Context Menu

Right-click on workspace:
- ✓ Select Workspace
- 🩺 Check Health (Doctor)
- 📁 Open in File Explorer
- 📋 Copy Path
- 🗑️ Remove Workspace

---

## 📊 Health Check Output

The doctor command checks:

✅ **System Tools**:
- Python installation and version
- Poetry availability
- pipx installation
- RapidKit Core installation

✅ **Workspace Details**:
- Workspace name and path
- All projects within workspace

✅ **Project Health** (for each project):
- Virtual environment status
- RapidKit Core in venv
- Dependencies installation
- Configuration validity

---

## 🔧 Example Terminal Output

```bash
🩺 RapidKit Health Check

Workspace: my-workspace
Path: /home/user/Documents/my-workspace

System Tools:

✅ Python: Python 3.10.19
   Using python3
✅ Poetry: Poetry 2.3.2
   Available for dependency management
✅ pipx: pipx 1.8.0
   Available for global tool installation
✅ RapidKit Core: RapidKit Core 0.2.2rc1
   Installed via pipx or system PATH

📦 Projects (2):

✅ Project: my-api
   Path: /home/user/Documents/my-workspace/my-api
   ✅ Virtual environment: Active
   ✅ RapidKit Core: 0.2.2rc1
   ✅ Dependencies: Installed

✅ Project: auth-service
   Path: /home/user/Documents/my-workspace/auth-service
   ✅ Virtual environment: Active
   ✅ RapidKit Core: 0.2.2rc1
   ✅ Dependencies: Installed

✅ All checks passed! Workspace is healthy.
```

---

## 🎯 Use Cases

### ✅ Quick Health Check
Before starting work, verify environment is ready:
```
1. Open RapidKit sidebar
2. Click pulse icon on workspace
3. Wait for terminal results
4. Start coding if all green ✅
```

### ✅ Troubleshooting
When something isn't working:
```
1. Click pulse icon
2. Review error messages
3. Follow suggested fixes
4. Re-run to verify fix
```

### ✅ Onboarding
New team member verifying setup:
```
1. Clone workspace
2. Open in VS Code
3. Click pulse icon
4. Fix any reported issues
5. Ready to develop
```

### ✅ CI/CD Verification
After automated workspace setup:
```
1. Open workspace in VS Code
2. Run health check
3. Verify all tools installed
4. Proceed with build/deploy
```

---

## 🚀 Benefits

1. **Quick Access**: One-click health check from sidebar
2. **Visual Feedback**: Pulse icon is intuitive and recognizable
3. **Integrated**: Uses existing npm CLI doctor command
4. **Informative**: Terminal output shows detailed diagnostics
5. **Non-Intrusive**: Doesn't block UI, runs in terminal

---

## 🔗 Related Features

- **Doctor Command** (npm CLI): `/home/rapidx/Documents/WOSP/Rapid/Front/rapidkit-npm/docs/doctor-command.md`
- **Workspace Explorer**: Shows all registered workspaces
- **Project Explorer**: Shows projects within workspace
- **Setup Wizard**: Initial installation and detection

---

## 📦 Version Information

- **Extension Version**: 0.6.1
- **Feature Added**: February 5, 2026
- **npm CLI Required**: 0.16.5+
- **Python Core Required**: 0.2.2rc1+

---

## 💻 Code Reference

### Command Registration (extension.ts)

```typescript
vscode.commands.registerCommand('rapidkit.checkWorkspaceHealth', async (item: any) => {
  const workspace = item?.workspace;
  if (!workspace?.path) {
    vscode.window.showErrorMessage('No workspace selected');
    return;
  }

  logger.info('Running doctor check for workspace:', workspace.name);
  
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `🩺 Checking health of workspace: ${workspace.name}`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0, message: 'Starting health check...' });

      const terminal = vscode.window.createTerminal({
        name: `RapidKit Doctor - ${workspace.name}`,
        cwd: workspace.path,
      });

      terminal.show();
      progress.report({ increment: 50, message: 'Running diagnostics...' });

      terminal.sendText('npx rapidkit doctor --workspace');

      progress.report({ increment: 100, message: 'Complete!' });

      vscode.window.showInformationMessage(
        `Health check running for "${workspace.name}". Check the terminal for results.`,
        'OK'
      );
    }
  );
});
```

### Command Definition (package.json)

```json
{
  "command": "rapidkit.checkWorkspaceHealth",
  "title": "Check Health (Doctor)",
  "category": "RapidKit",
  "icon": "$(pulse)"
}
```

### Inline Button (package.json)

```json
{
  "command": "rapidkit.checkWorkspaceHealth",
  "when": "view == rapidkitWorkspaces && viewItem == workspace",
  "group": "inline@2"
}
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Basic Functionality**:
   ```
   ✓ Open VS Code with RapidKit extension
   ✓ Open RapidKit sidebar
   ✓ Verify pulse icon appears next to workspace
   ✓ Click pulse icon
   ✓ Verify terminal opens
   ✓ Verify command runs
   ✓ Verify results appear
   ```

2. **Edge Cases**:
   ```
   ✓ No workspace selected
   ✓ Workspace path doesn't exist
   ✓ npm not installed
   ✓ RapidKit CLI not installed
   ```

3. **Multiple Workspaces**:
   ```
   ✓ Click pulse on first workspace
   ✓ Verify correct workspace checked
   ✓ Click pulse on second workspace
   ✓ Verify new terminal for each
   ```

---

## 📝 Future Enhancements

### Potential Improvements

1. **Status Badge**: Show health status (✅/⚠️/❌) directly in tree view
2. **Auto-refresh**: Periodically check health in background
3. **Summary View**: Show results in sidebar panel instead of terminal
4. **Fix Suggestions**: Quick-fix buttons for common issues
5. **Health History**: Track health check results over time
6. **Notifications**: Alert when workspace becomes unhealthy

### Example Status Badge

```
WORKSPACES
├─ my-workspace (2)  ✅ ✓ 🩺    ← Green badge = healthy
├─ demo-app (1)      ⚠️ ✓ 🩺    ← Yellow badge = warnings
└─ auth-service (3)  ❌ ✓ 🩺    ← Red badge = errors
```

---

## 🎓 User Documentation

Users should refer to:
- [Doctor Command Guide](../../rapidkit-npm/docs/doctor-command.md)
- [Workspace Management](./workspace-management.md)
- [Troubleshooting Guide](./troubleshooting.md)

---

**Last Updated**: February 5, 2026  
**Author**: RapidKit Team  
**Extension Version**: 0.6.1
