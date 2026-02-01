# Extension Error Handling & Validation Improvements

## Previous Issues

### 1. **No Pre-flight Checks**
- Extension didn't validate the system before creating workspace or adding modules
- Users faced cryptic errors without clear guidance

### 2. **Weak Error Handling**
- npm package errors were ignored
- Incomplete workspaces were registered
- Error messages were unprofessional and unclear

### 3. **Missing Workspace Validation**
- After workspace creation, no checks were done to verify venv and rapidkit-core installation
- Issues appeared later when adding modules

## Implemented Changes

### 1. **Python Environment Checker** (`utils/pythonChecker.ts`)

A comprehensive utility for checking Python environment:

```typescript
export interface PythonCheckResult {
  available: boolean;
  version?: string;
  versionNumber?: { major: number; minor: number };
  meetsMinimumVersion: boolean; // Python 3.10+
  command?: 'python3' | 'python';
  venvSupport: boolean;
  rapidkitCoreInstalled: boolean;
  error?: string;
  recommendation?: string;
}
```

**Features:**
- Check Python availability
- Check venv support (python3-venv)
- Validate Python version (minimum 3.10+)
- Check rapidkit-core installation in system Python
- Provide OS-specific recommendations for venv installation
- User-friendly error messages

**Usage:**
```typescript
const pythonCheck = await checkPythonEnvironment();
if (!pythonCheck.meetsMinimumVersion) {
  showError(getPythonErrorMessage(pythonCheck));
}
if (!pythonCheck.venvSupport) {
  showError(getPythonErrorMessage(pythonCheck));
}
```

### 2. **Workspace Validator** (`utils/workspaceValidator.ts`)

Comprehensive validation for RapidKit workspaces:

```typescript
export interface WorkspaceValidationResult {
  valid: boolean;
  hasVenv: boolean;
  hasRapidkitCore: boolean;
  venvPath?: string;
  pythonPath?: string;
  rapidkitVersion?: string;
  errors: string[];
  warnings: string[];
}
```

**Features:**
- Check for `.venv` or Poetry venv existence
- Verify rapidkit-core installation in venv
- Identify Python executable in venv
- Provide list of errors and warnings with clear guidance

**Usage:**
```typescript
const validation = await validateWorkspace(workspacePath);
if (!validation.valid) {
  // Workspace is incomplete - cleanup and show error
}
```

### 3. **System Requirements Checker** (`utils/systemRequirements.ts`)

System-level dependency checking with auto-fix capabilities:

```typescript
export interface SystemRequirementsResult {
  allMet: boolean;
  python: {
    available: boolean;
    meetsMinimumVersion: boolean; // Python 3.10+
    venvSupport: boolean;
    version?: string;
    canAutoFix: boolean;
    autoFixCommand?: string;
  };
  nodejs: { available: boolean; version?: string };
  git: { available: boolean; version?: string };
}
```

**Features:**
- Check Python 3.10+ availability and version
- Check python3-venv support
- Detect if auto-fix is possible (Ubuntu/Debian with apt)
- Generate sudo command for auto-installation
- Provide OS-specific installation instructions

**Usage:**
```typescript
const sysReq = await checkSystemRequirements();
if (!sysReq.allMet) {
  const action = await showSystemRequirementsError(sysReq);
  if (action === 'install' && sysReq.python.autoFixCommand) {
    await autoFixVenvSupport(sysReq.python.autoFixCommand);
  }
}
```

### 4. **Improved createWorkspace** (`commands/createWorkspace.ts`)

**Changes:**

#### Pre-flight Check:
```typescript
// Check system requirements before starting
const sysReq = await checkSystemRequirements();
if (!sysReq.allMet) {
  // Show clear error with installation guide
  // Option for auto-fix on supported platforms
  // Retry option after installation
  return;
}
```

#### Improved Error Handling:
```typescript
const createResult = await cli.createWorkspace({...});

// Check exitCode
if (createResult.exitCode !== 0) {
  // Identify error type (venv missing, etc.)
  // Show precise error with guidance
  throw new Error(...);
}
```

#### Workspace Validation:
```typescript
// After creation, validate the workspace
const validation = await validateWorkspace(workspacePath);

if (!validation.valid) {
  // Cleanup incomplete workspace
  await fs.remove(workspacePath);
  // Show clear error with list of issues
  throw new Error(...);
}
```

### 5. **Improved addModule** (`commands/addModule.ts`)

**Changes:**

#### Pre-flight Check:
```typescript
// Before adding module
const pythonCheck = await checkPythonEnvironment();

if (!pythonCheck.available || 
    !pythonCheck.meetsMinimumVersion || 
    !pythonCheck.venvSupport) {
  // Show clear error with guidance
  return;
}
```

#### Enhanced Error Messages:
```typescript
if (exitCode !== 0) {
  // Precise error type identification:
  if (stderr.includes('python3-venv')) {
    // Guide for installing python3-venv
  } else if (stderr.includes('No module named rapidkit')) {
    // Guide for workspace corruption
  } else if (stderr.includes('ModuleNotFoundError')) {
    // Guide for rebuilding venv
  }
  
  // Link to documentation
  showErrorWithSetupGuide(...);
}
```

### 6. **Enhanced Doctor Command** (`commands/doctor.ts`)

**Changes:**

- Uses `checkPythonEnvironment()` for comprehensive checks
- More precise display of Python, venv, and rapidkit-core status
- Clearer messages in output

```typescript
const pythonEnv = await checkPythonEnvironment();

// Check Python
result.checks.push({
  name: 'Python',
  status: pythonEnv.available ? 'pass' : 'fail',
  message: pythonEnv.version || pythonEnv.recommendation
});

// Check Python version
result.checks.push({
  name: 'Python Version',
  status: pythonEnv.meetsMinimumVersion ? 'pass' : 'fail',
  message: pythonEnv.meetsMinimumVersion 
    ? `${pythonEnv.version} (meets 3.10+ requirement)` 
    : `${pythonEnv.version} (requires 3.10+)`
});

// Check venv support
result.checks.push({
  name: 'Python venv',
  status: pythonEnv.venvSupport ? 'pass' : 'fail',
  message: pythonEnv.venvSupport 
    ? 'Available' 
    : pythonEnv.recommendation
});
```

## Improved User Experience

### Before:
```
❌ Failed to create project: /home/user/.cache/rapidkit/npm-bridge/venv/bin/python: No module named rapidkit
```

### After (Python not found):
```
❌ Python not found on your system.

RapidKit requires Python 3.10+ to create projects.

Please install Python from:
  • Ubuntu/Debian: sudo apt install python3.13
  • macOS: brew install python@3.13
  • Windows: python.org/downloads

After installing Python, restart VS Code.

[View Setup Guide]
```

### After (Python too old):
```
❌ Python 3.9.2 is too old.

RapidKit requires Python 3.10 or higher.

Please upgrade Python:
  • Ubuntu/Debian: sudo apt install python3.13
  • macOS: brew install python@3.13
  • Windows: python.org/downloads

After upgrading, restart VS Code.

[View Setup Guide]
```

### After (venv missing - with auto-fix):
```
⚠️ Python venv support is missing.

RapidKit can automatically install it for you.

Command: sudo apt update && sudo apt install -y python3.13-venv

This requires sudo password and will take ~10 seconds.

[🔧 Auto Install] [Install Manually] [Cancel]
```

### After (venv missing - manual):
```
⚠️ Cannot create workspace:

Python 3.13 is missing venv support.

Install venv support:
  sudo apt update
  sudo apt install python3.13-venv

After installation, restart VS Code.

[View Setup Guide] [Retry]
```

## New Flow

### Create Workspace:
1. ✅ Pre-flight check: Python 3.10+ + version validation + venv support
2. ✅ If issue found: clear error + guidance + docs link
3. ✅ If auto-fix available (Ubuntu/Debian): offer auto-install option
4. ✅ Execute npx rapidkit
5. ✅ Check exitCode and stderr
6. ✅ Workspace validation (venv + rapidkit-core)
7. ✅ If validation fails: cleanup + comprehensive error
8. ✅ Success: workspace is functional and validated

### Add Module:
1. ✅ Pre-flight check: Python 3.10+ + version validation + venv support
2. ✅ If issue found: clear error + guidance
3. ✅ Execute rapidkit add module
4. ✅ Precise error handling with error type identification
5. ✅ Specific guidance for each error type
6. ✅ Link to troubleshooting docs

## Recommended Tests

### Scenario 1: Python without venv
```bash
# Remove python3-venv
sudo apt remove python3.13-venv

# Try create workspace
# Expected: Clear error with installation guide
# On Ubuntu: Auto-fix option offered
```

### Scenario 2: Old Python version
```bash
# Test with Python 3.9
python3.9 --version

# Try create workspace
# Expected: Clear error about version requirement (3.10+)
```

### Scenario 3: Workspace corruption
```bash
# Create workspace
# Manually delete .venv
# Try add module
# Expected: Clear error about workspace corruption
```

### Scenario 4: Normal flow
```bash
# Install python3.10+ and venv
sudo apt install python3.13 python3.13-venv

# Create workspace
# Expected: workspace with venv and rapidkit-core

# Add module
# Expected: module added without errors
```

## Benefits of This Approach

1. **Fail Fast**: Catch issues earlier
2. **Clear Errors**: User knows exactly what the problem is
3. **Actionable**: Precise guidance for solving problems
4. **Validation**: Incomplete workspaces are not registered
5. **Professional**: Professional UX for production-ready extension
6. **Version Safety**: Ensures Python 3.10+ requirement is met
7. **Auto-fix**: Semi-automatic venv installation on supported platforms

## Breaking Changes

No breaking changes - only improved error handling and validation.

## Next Steps

1. ✅ Test with Python 3.10, 3.11, 3.12, 3.13
2. ✅ Test on Ubuntu, macOS, Windows
3. ✅ Test error scenarios (missing venv, old Python, corrupted workspace, etc.)
4. ✅ Update documentation
5. ✅ Release notes

---

**These changes make the extension production-ready! 🚀**
