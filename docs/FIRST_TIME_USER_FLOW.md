# 🎯 Complete Extension Flow for First-Time Users

## Scenario: User Only Installed the Extension

### Stage 0: Before Starting
```
User: Installed RapidKit Extension from Marketplace
System: Python 3.10-3.13 may or may not be installed
System: python3-venv may or may not be installed
System: No rapidkit (npm or Python) installed yet
```

---

## Stage 1: Create Workspace

### 1.1 - Pre-flight Checks ✅
```typescript
// Extension runs automatic checks BEFORE creating workspace
checkSystemRequirements()
  ↓
Check 1: Is Python available?
  python3 --version
  ↓
  Result: Found Python 3.13.5 ✅ or Not found ❌

If NOT FOUND:
  ❌ Show error:
     "Python not found on your system.
      
      RapidKit requires Python 3.10+ to create projects.
      
      Install Python:
        • Ubuntu/Debian: sudo apt install python3.13
        • macOS: brew install python@3.13
        • Windows: python.org/downloads
      
      After installing Python, restart VS Code.
      
      [View Setup Guide]"
  
  → Stop here, don't proceed

If FOUND:
  ✅ Continue to version check
  
Check 2: Does Python meet minimum version (3.10+)?
  Parse version from "Python 3.13.5"
  Compare: 3.13 >= 3.10?
  ↓
  Result: Meets requirement ✅ or Too old ❌

If TOO OLD (e.g., Python 3.9):
  ❌ Show error:
     "Python 3.9.2 is too old.
      
      RapidKit requires Python 3.10 or higher.
      
      Upgrade Python:
        • Ubuntu/Debian: sudo apt install python3.13
        • macOS: brew install python@3.13
        • Windows: python.org/downloads
      
      After upgrading, restart VS Code.
      
      [View Setup Guide]"
  
  → Stop here, don't proceed

If MEETS REQUIREMENT:
  ✅ Continue to venv check

Check 3: Is venv support available?
  python3 -m venv --help
  ↓
  Result: SUCCESS ✅ or FAIL ❌

If FAIL:
  Check if auto-fix is available (Ubuntu/Debian with apt)
  
  If can auto-fix:
    ⚠️ Show warning with auto-fix option:
       "Python venv support is missing.
        
        RapidKit can automatically install it for you.
        
        Command: sudo apt update && sudo apt install -y python3.13-venv
        
        This requires administrator confirmation and will take ~10 seconds.
        
        [🔧 Auto Install] [Install Manually] [Cancel]"
    
    If user clicks "Auto Install":
      → Create terminal
      → Run command
      → Wait for completion
      → Verify installation
      → Show success/failure message
      → If success, continue to workspace creation
    
    If user clicks "Install Manually":
      → Open docs in browser
      → Stop here
  
  If cannot auto-fix:
    ❌ Show error with manual instructions:
       "Python 3.13 is missing venv support.
        
        Install venv support:
          • Ubuntu/Debian: sudo apt install python3.13-venv
          • macOS: brew install python@3.13
          • Fedora: sudo dnf install python3.13
        
        After installation, restart VS Code.
        
        [View Setup Guide] [Retry]"
    
    → Stop here, don't proceed

If SUCCESS:
  ✅ All checks passed, continue to workspace creation
```

### 1.2 - First-Time Setup Detection 🎉
```typescript
isFirstTimeSetup() 
  // Checks if <CACHE_DIR>/rapidkit-npm/ exists and has rapidkit package
  ↓
Result: true (first time)
  ↓
Show informational notification:
  "👋 Welcome to RapidKit!
   
   First-time setup will:
     • Download RapidKit CLI (~5-10 seconds)
     • Install Poetry (dependency manager)
     • Create a Python virtual environment
     • Install RapidKit Core engine
   
   This is a one-time process.
   
   [OK, Let's Go!] [Don't Show Again]"
  
  If "Don't Show Again":
    → Save to config: dontShowFirstTimeSetup = true
  
  Continue regardless
```

### 1.3 - Workspace Creation Process ⚙️
```typescript
// User provides workspace details
const projectName = await promptForProjectName();
const projectPath = await promptForLocation();

// Extension internally uses Poetry (no user choice)
const installMethod = 'poetry'; // Fixed choice

// Execute workspace creation
await createWorkspace({
  name: projectName,
  path: projectPath,
  installMethod: 'poetry'
});

Progress shown:
  "⏳ Setting up your RapidKit workspace..."
  
  First time (no cache):
    "📦 Downloading RapidKit CLI (this is a one-time setup)..."
    "⏱️ Estimated time: 1-2 minutes"
  
  Subsequent times:
    "📦 Setting up workspace..."
    "⏱️ Estimated time: 30-60 seconds"
```

### 1.4 - Behind the Scenes (Workspace Creation) 🔧

```bash
# Step 1: npx downloads rapidkit package (first time only)
npx rapidkit workspace create my-project --install-method poetry
  ↓
  # If first time:
  # - Downloads rapidkit@latest from npm
  # - Caches in <CACHE_DIR>/rapidkit-npm/
  # - Takes ~10-30 seconds
  
  # If cached:
  # - Uses cached version
  # - Takes <1 second
  ↓

# Step 2: npm package checks for Poetry
poetry --version
  ↓
  Not found → Install Poetry automatically
  ↓
  curl -sSL https://install.python-poetry.org | python3 -
  ↓
  Wait for Poetry installation
  ↓
  
# Step 3: npm package creates workspace with Poetry
cd my-project
poetry init --name my-project --python "^3.10"
  ↓
  Creates pyproject.toml
  ↓
  
# Step 4: Add rapidkit-core dependency
poetry add rapidkit-core
  ↓
  Creates virtual environment (.venv/)
  Installs rapidkit-core and all dependencies
  ↓
  
# Step 5: Initialize workspace structure
poetry run rapidkit init
  ↓
  Creates workspace files and folders
  ↓
  
# Done! Workspace created successfully ✅
```

### 1.5 - Post-Creation Validation ✅
```typescript
// Extension validates the workspace was created properly
await validateWorkspace(projectPath);

Checks:
  1. Does .venv/ exist?
     Or: Is Poetry venv present? (poetry env info --path)
  
  2. Is rapidkit-core installed in venv?
     python -c "import rapidkit; print(rapidkit.__version__)"
  
  3. Are workspace files present?
     Check for pyproject.toml, src/, modules/, etc.

If validation FAILS:
  ❌ Show error:
     "Workspace creation failed validation.
      
      This usually means:
        • Virtual environment was not created
        • rapidkit-core installation failed
        • Poetry configuration issue
      
      The incomplete workspace has been cleaned up.
      
      Troubleshooting:
        1. Check Python version: python3 --version
        2. Check venv support: python3 -m venv --help
        3. Run RapidKit: Doctor for diagnostics
      
      [Run Doctor] [View Troubleshooting Guide] [Try Again]"
  
  → Clean up incomplete workspace
  → Stop here

If validation SUCCEEDS:
  ✅ Show success message:
     "✅ Workspace created successfully!
      
      Your RapidKit workspace is ready at:
      <WORKSPACE_PATH>
      
      Next steps:
        • Open workspace folder in VS Code
        • Use 'RapidKit: Add Module' to install modules
        • Start building your application!
      
      [Open Workspace] [Close]"
  
  If "Open Workspace":
    → Open folder in VS Code
```

### 1.6 - First-Time Setup Complete Message 🎊
```typescript
// Only shown on first-ever workspace creation
if (isFirstTimeSetup()) {
  await showFirstTimeCompletionMessage();
  
  "🎊 Your first RapidKit workspace is ready!
   
   What you can do now:
     • Add modules: Ctrl+Shift+P → RapidKit: Add Module
     • Run doctor: Check system status
     • View docs: Learn about RapidKit features
   
   The setup cache is now created - future workspaces will be faster!
   
   [Got It!] [View Documentation]"
}
```

---

## Stage 2: Add Module (First Time)

### 2.1 - Pre-flight Checks for Module Installation
```typescript
// Check if current workspace is valid
const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

if (!workspaceRoot) {
  ❌ "No workspace folder is open.
      Please open a RapidKit workspace first."
  → Stop
}

// Check if it's a RapidKit workspace
const hasRapidKit = await isRapidKitWorkspace(workspaceRoot);

if (!hasRapidKit) {
  ❌ "This is not a RapidKit workspace.
      
      Create a workspace first:
        Ctrl+Shift+P → RapidKit: Create New Workspace
      
      [Create Workspace]"
  → Stop
}

// Check Python environment
const pythonCheck = await checkPythonEnvironment();

if (!pythonCheck.available || !pythonCheck.meetsMinimumVersion || !pythonCheck.venvSupport) {
  ❌ Show appropriate error (same as workspace creation)
  → Stop
}

// Check if workspace venv is healthy
const workspaceCheck = await validateWorkspace(workspaceRoot);

if (!workspaceCheck.valid) {
  ❌ "Your workspace environment is not properly set up.
      
      Possible issues:
        • Virtual environment missing
        • rapidkit-core not installed
        • Dependencies corrupted
      
      Run 'RapidKit: Doctor' to diagnose the issue.
      
      [Run Doctor] [Recreate Workspace]"
  → Stop
}

✅ All checks passed, proceed to module installation
```

### 2.2 - Module Selection and Installation
```typescript
// Show module picker
const module = await promptForModule();

// Progress message
vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,
  title: `Installing ${module}...`,
  cancellable: false
}, async (progress) => {
  
  progress.report({ message: "Installing module..." });
  
  // Use workspace's Poetry environment
  cd workspaceRoot
  poetry run rapidkit module add ${module}
  
  // Installation process:
  // 1. Download module from registry
  // 2. Install module dependencies
  // 3. Configure module in workspace
  // 4. Run post-install scripts
  
  progress.report({ message: "Configuring module..." });
  
  // Done
});

Success:
  ✅ "Module '${module}' installed successfully!
      
      The module is now available in your workspace.
      Check the 'modules/' directory for configuration.
      
      [OK]"

Failure:
  ❌ Show categorized error:
     
     If Python issue:
       "Python environment error: ${error}"
     
     If venv missing:
       "Virtual environment not found.
        Your workspace may be corrupted.
        Run 'RapidKit: Doctor' to diagnose."
     
     If rapidkit-core missing:
       "rapidkit-core is not installed in workspace.
        Your workspace may be corrupted.
        Run 'RapidKit: Doctor' to diagnose."
     
     If network error:
       "Failed to download module '${module}'.
        Check your internet connection and try again."
     
     If dependency conflict:
       "Module '${module}' has dependency conflicts.
        This module may not be compatible with your current setup."
```

---

## Stage 3: Doctor Command

### 3.1 - Comprehensive Diagnostics
```typescript
// Run all checks
const diagnostics = await runDiagnostics();

Output in terminal:
```

```
🔍 RapidKit System Diagnostics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 System Requirements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Python:
  ✅ Version: 3.13.5
  ✅ Meets minimum (3.10+): Yes
  ✅ Command: python3
  ✅ venv support: Available

Poetry:
  ✅ Version: 1.7.1
  ✅ Location: <POETRY_BIN_PATH>

Node.js:
  ✅ Version: 20.10.0

Git:
  ✅ Version: 2.34.1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Current Workspace
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workspace Root: <WORKSPACE_PATH>

Virtual Environment:
  ✅ Type: Poetry
  ✅ Location: <POETRY_VENV_PATH>
  ✅ Python: 3.13.5

RapidKit Core:
  ✅ Installed: Yes
  ✅ Version: 0.45.0

Dependencies:
  ✅ All dependencies installed

Workspace Structure:
  ✅ pyproject.toml: Present
  ✅ src/: Present
  ✅ modules/: Present

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your RapidKit environment is healthy and ready to use.
```

If issues found:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Issues Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[X] Python 3.9.5 found (requires 3.10+)
    → Upgrade Python to 3.10 or higher
    → Ubuntu/Debian: sudo apt install python3.13

[X] venv support missing
    → Install venv: sudo apt install python3.13-venv
    → [Auto-Fix Available] - Click to install

[X] rapidkit-core not installed in workspace
    → Reinstall: poetry add rapidkit-core
    → Or recreate workspace
```

---

## Summary: Extension Automation Level

### ❌ Cannot Automate (User Must Do)
- Install Python 3.10+ on system (one-time)
- Install python3-venv on Linux (one-time, but can semi-automate on Ubuntu/Debian)

### ✅ Fully Automated (Extension Handles)
- Download npm package (first-time caching)
- Install Poetry (automatic)
- Create virtual environment (via Poetry)
- Install rapidkit-core (via Poetry)
- Manage dependencies (via Poetry)
- Validate environment before operations
- Provide clear error messages with solutions
- Auto-fix common issues where possible

### 🎯 User Experience Goals
1. **Minimal Manual Setup**: Only Python installation required
2. **Clear Error Messages**: Tell user exactly what to do
3. **Auto-Fix When Possible**: Reduce friction (venv on Ubuntu/Debian)
4. **Fast After First Time**: Cache npm package for instant subsequent use
5. **Fail-Fast with Guidance**: Check requirements before operations, not during
6. **Professional Feel**: Match quality of Microsoft/JetBrains tools

**Result:** After installing Python 3.10+, the extension handles everything automatically. First workspace takes 1-2 minutes, subsequent ones take 30-60 seconds.
