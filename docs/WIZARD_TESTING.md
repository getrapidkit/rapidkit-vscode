# 🧪 Setup Wizard Testing Guide

## Pre-Test Setup

### Test Environment 1: Clean System (No Packages)
```bash
# Temporarily hide npm package
sudo mv /usr/local/bin/rapidkit /tmp/rapidkit.bak

# Temporarily hide Python package (if using pyenv)
pyenv shell system  # Switch to system Python without rapidkit-core
```

### Test Environment 2: npm Only
```bash
# Restore npm
sudo mv /tmp/rapidkit.bak /usr/local/bin/rapidkit

# Python Core still not installed
```

### Test Environment 3: Python Core Only
```bash
# Hide npm again
sudo mv /usr/local/bin/rapidkit /tmp/rapidkit.bak

# Install Python Core
pip install rapidkit-core
```

### Test Environment 4: Both Installed
```bash
# Restore npm
sudo mv /tmp/rapidkit.bak /usr/local/bin/rapidkit

# Python Core already installed
```

## Test Cases

### ✅ Test 1: Clean Install Flow
**Environment**: No packages installed

**Steps**:
1. Open VS Code with Extension
2. Wait for welcome page to auto-open
3. Observe wizard section at top

**Expected Result**:
```
📦 npm Package          ⚠
CLI not installed. Install to use rapidkit commands in terminal.
[⚡ Install CLI] [📄 Docs]

🐍 Python Core          ⚠
Python X.X.X detected, but rapidkit-core not installed.
[🔧 Install Core] [🐍 PyPI]

Progress: ⏳ 0/2 components installed. Click install buttons above.
[✓ Finish Setup] = DISABLED (grayed out)
```

**Actions**:
4. Click `[⚡ Install CLI]`
5. Terminal opens with: `npm install -g rapidkit`
6. Wait for install to complete
7. Click `[🔄 Refresh]`

**Expected Result After Refresh**:
```
📦 npm Package          ✓
v0.16.3 installed at /home/rapidx/.nvm/versions/node/v20.20.0/bin/rapidkit

🐍 Python Core          ⚠
Python X.X.X detected, but rapidkit-core not installed.
[🔧 Install Core] [🐍 PyPI]

Progress: ⚡ 1/2 components installed. Install the missing one.
[✓ Finish Setup] = DISABLED
```

**Actions**:
8. Click `[🔧 Install Core]`
9. Terminal opens with: `pip install rapidkit-core`
10. Wait for install to complete
11. Click `[🔄 Refresh]`

**Expected Result After Second Refresh**:
```
📦 npm Package          ✓
v0.16.3 installed at /home/rapidx/.nvm/versions/node/v20.20.0/bin/rapidkit

🐍 Python Core          ✓
v0.2.1rc1 installed (Python 3.10.19)

Progress: 🎉 All components installed! Ready to create workspaces.
[✓ Finish Setup] = ENABLED (green)
```

**Actions**:
12. Click `[✓ Finish Setup]`

**Expected Result**:
- `rapidkit doctor` command runs
- Output shows in terminal
- Wizard section hides
- Wizard won't show on next launch

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 2: npm Pre-installed
**Environment**: npm package already installed

**Steps**:
1. Open VS Code with Extension
2. Welcome page opens
3. Observe wizard

**Expected Result**:
```
📦 npm Package          ✓
v0.16.3 installed at /path/to/npm

🐍 Python Core          ⚠
Python X.X.X detected, but rapidkit-core not installed.
[🔧 Install Core] [🐍 PyPI]

Progress: ⚡ 1/2 components installed. Install the missing one.
[✓ Finish Setup] = DISABLED
```

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 3: Both Pre-installed
**Environment**: Both packages already installed

**Steps**:
1. Open VS Code with Extension
2. Welcome page opens
3. Observe wizard

**Expected Result**:
```
📦 npm Package          ✓
v0.16.3 installed at /path/to/npm

🐍 Python Core          ✓
v0.2.1rc1 installed (Python 3.10.19)

Progress: 🎉 All components installed! Ready to create workspaces.
[✓ Finish Setup] = ENABLED
```

**Actions**:
4. Click `[✓ Finish Setup]`

**Expected Result**:
- Doctor command runs
- Wizard hides

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 4: Hide Wizard Persistence
**Environment**: Both packages installed

**Steps**:
1. Open VS Code with Extension
2. Welcome page opens, wizard visible
3. Click `[✕ Hide]`

**Expected Result**:
- Wizard section collapses/hides

**Actions**:
4. Close VS Code completely
5. Reopen VS Code
6. Trigger welcome page (Command Palette → "RapidKit: Show Welcome")

**Expected Result**:
- Welcome page opens
- Wizard section is HIDDEN (stays collapsed)
- Main actions section visible

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 5: pyenv Detection
**Environment**: Python Core installed via pyenv (not system Python)

**Setup**:
```bash
# Set pyenv to system (no pip)
pyenv global system

# But rapidkit-core is in pyenv 3.10.19
~/.pyenv/versions/3.10.19/bin/pip show rapidkit-core  # Should work
pip show rapidkit-core  # Should fail
```

**Steps**:
1. Open VS Code with Extension
2. Welcome page opens
3. Observe wizard

**Expected Result**:
```
🐍 Python Core          ✓
v0.2.1rc1 installed (Python 3.10.19)
```

**Note**: Should detect via Method 4 (pyenv exec pip)

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 6: npx Cache Detection
**Environment**: npm package NOT globally installed, but available via npx

**Setup**:
```bash
# Remove global install
npm uninstall -g rapidkit

# But npx cache exists from previous use
npx rapidkit --version  # Should work (uses cache)
```

**Steps**:
1. Open VS Code with Extension
2. Welcome page opens
3. Observe wizard

**Expected Result**:
```
📦 npm Package          ✓
v0.16.3 (npx cache)
```

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 7: No Python Detected
**Environment**: Python not installed on system

**Setup**: (Use Docker or VM without Python)

**Steps**:
1. Open VS Code with Extension
2. Welcome page opens
3. Observe wizard

**Expected Result**:
```
🐍 Python Core          ⚠
Python not detected. Install Python 3.8+ first.
[🔧 Install Core] [🐍 PyPI]
```

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 8: Rapid Refresh Testing
**Environment**: Start with nothing installed

**Steps**:
1. Open welcome page, both show ⚠
2. Install npm in external terminal: `npm install -g rapidkit`
3. In welcome page, click `[🔄 Refresh]`

**Expected Result**:
- npm step updates to ✓ immediately
- Python Core still ⚠

**Actions**:
4. Install Python Core in external terminal: `pip install rapidkit-core`
5. Click `[🔄 Refresh]` again

**Expected Result**:
- Both steps now show ✓
- Finish button enabled

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 9: Button Click Validation
**Environment**: Both packages missing

**Steps**:
1. Open welcome page
2. Click `[📄 Docs]` in npm step

**Expected Result**:
- Opens browser to https://www.npmjs.com/package/rapidkit

**Actions**:
3. Click `[🐍 PyPI]` in Python Core step

**Expected Result**:
- Opens browser to https://pypi.org/project/rapidkit-core/

**Actions**:
4. Click `[⚡ Install CLI]`

**Expected Result**:
- Terminal opens named "Install RapidKit CLI"
- Command visible: `npm install -g rapidkit`

**Actions**:
5. Click `[🔧 Install Core]`

**Expected Result**:
- Terminal opens named "Install RapidKit Core"
- Command visible: `pip install rapidkit-core`

**Status**: ✅ PASS / ❌ FAIL

---

### ✅ Test 10: Multi-Theme Testing
**Environment**: Any

**Steps**:
1. Open welcome page
2. Change VS Code theme to Dark+ (default dark)
3. Observe wizard colors and contrast
4. Change to Light+ (default light)
5. Observe wizard colors and contrast
6. Change to High Contrast
7. Observe wizard colors and contrast

**Expected Result**:
- All themes: Text readable
- All themes: Borders visible
- All themes: Status icons clear
- All themes: Buttons clearly clickable

**Status**: ✅ PASS / ❌ FAIL

---

## Automated Test Commands

### Quick Check: Detection Methods
```bash
# Test Method 1: Python import
python3 -c "import rapidkit_core; print(rapidkit_core.__version__)"

# Test Method 2: python -m pip
python3 -m pip show rapidkit-core

# Test Method 3: Direct pip
pip show rapidkit-core

# Test Method 4: pyenv
pyenv exec pip show rapidkit-core

# Test npm global
which rapidkit
rapidkit --version

# Test npm npx
npx rapidkit --version
```

### Reset Test Environment
```bash
# Clean state
npm uninstall -g rapidkit
pip uninstall rapidkit-core -y

# Restore
npm install -g rapidkit
pip install rapidkit-core
```

## Bug Tracking Template

**Test Case**: [Number and name]  
**Environment**: [Describe setup]  
**Expected**: [What should happen]  
**Actual**: [What actually happened]  
**Severity**: Critical / High / Medium / Low  
**Screenshot**: [Attach if applicable]  
**Reproduction Steps**:
1. Step 1
2. Step 2
3. Step 3

**Error Logs**:
```
[Paste any error messages from Output or Debug Console]
```

## Performance Metrics

Track these for each test:

- **Initial load time**: Time from activation to wizard visible
- **Status check time**: Time for refresh to complete
- **Install command response**: Time from button click to terminal open
- **UI update time**: Time from status check to UI update

**Acceptable Performance**:
- Initial load: < 2 seconds
- Status check: < 3 seconds
- Install command: < 500ms
- UI update: < 100ms

---

## Test Results Summary

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| 1. Clean Install Flow | ⬜ | |
| 2. npm Pre-installed | ⬜ | |
| 3. Both Pre-installed | ⬜ | |
| 4. Hide Persistence | ⬜ | |
| 5. pyenv Detection | ⬜ | |
| 6. npx Cache | ⬜ | |
| 7. No Python | ⬜ | |
| 8. Rapid Refresh | ⬜ | |
| 9. Button Clicks | ⬜ | |
| 10. Multi-Theme | ⬜ | |

**Overall Status**: ⬜ PASS / ⬜ FAIL  
**Tested By**: [Your name]  
**Date**: [Date]  
**Extension Version**: 0.5.0  
**VS Code Version**: [Version]  
**OS**: [Linux/Mac/Windows]
