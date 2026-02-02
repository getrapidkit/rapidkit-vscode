# 🎨 Setup Wizard Visual Guide

## Welcome Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                      🚀 RapidKit Logo                            │
│                      RapidKit v0.5.0                             │
│           Build production-ready APIs at warp speed              │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                   🚀 Setup Wizard                                │
│         Complete installation to unlock all features             │
│                                                                  │
│  ┌───────────────────────┬───────────────────────────────────┐  │
│  │  📦 npm Package       │  🐍 Python Core                   │  │
│  │  Status: ✓ Installed  │  Status: ⚠ Not installed          │  │
│  │  ───────────────────  │  ───────────────────────────────  │  │
│  │  v0.16.3 installed    │  Python 3.10.19 detected          │  │
│  │  /usr/local/bin/npm   │  but rapidkit-core not installed  │  │
│  │                       │                                   │  │
│  │                       │  [⚡ Install Core]  [🐍 PyPI]     │  │
│  └───────────────────────┴───────────────────────────────────┘  │
│                                                                  │
│  ⚡ 1/2 components installed. Install the missing one.           │
│  [🔄 Refresh]  [✕ Hide]  [✓ Finish Setup] (disabled)            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                🚀 Create Your First Workspace            │   │
│  │      Organize multiple microservices in one environment  │   │
│  │                   [GET STARTED]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Quick Actions:                                                  │
│  ┌──────────┬──────────┬──────────┬──────────┐                  │
│  │ FastAPI  │ NestJS   │ Modules  │ Doctor   │                  │
│  │ Python   │ TypeScript│ 27+ Free│ System   │                  │
│  └──────────┴──────────┴──────────┴──────────┘                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                   🌐 RapidKit Ecosystem                          │
│                                                                  │
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │ 🎨 VS Code   │ 📦 npm CLI   │ 🐍 Python    │                 │
│  │ Extension    │ Package      │ Core Engine  │                 │
│  │ THIS         │ CLI          │ ENGINE       │                 │
│  │ Visual UI    │ Automation   │ Generator    │                 │
│  │ [Marketplace]│ [Install CLI]│ [PyPI Page]  │                 │
│  │              │ [View Docs]  │ [Install]    │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Wizard States

**Both Installed** (All Green):
```
┌────────────────────────────────────────┐
│ 📦 npm Package          ✓              │  ← Green border
│ v0.16.3 installed                      │  ← Green background tint
│                                        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🐍 Python Core          ✓              │  ← Green border
│ v0.2.1rc1 (Python 3.10.19)             │  ← Green background tint
│                                        │
└────────────────────────────────────────┘

Progress: "🎉 All components installed! Ready to create workspaces."
Button: [✓ Finish Setup] (enabled, green)
```

**Partially Installed** (Mixed):
```
┌────────────────────────────────────────┐
│ 📦 npm Package          ✓              │  ← Green border
│ v0.16.3 installed                      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🐍 Python Core          ⚠              │  ← Orange border
│ Python 3.10.19 detected                │  ← Orange background tint
│ but rapidkit-core not installed        │
│ [⚡ Install Core] [🐍 PyPI]            │
└────────────────────────────────────────┘

Progress: "⚡ 1/2 components installed. Install the missing one."
Button: [✓ Finish Setup] (disabled, gray)
```

**Nothing Installed** (All Orange):
```
┌────────────────────────────────────────┐
│ 📦 npm Package          ⚠              │  ← Orange border
│ CLI not installed                      │  ← Orange background tint
│ [⚡ Install CLI] [📄 Docs]             │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🐍 Python Core          ⚠              │  ← Orange border
│ Python not detected                    │  ← Orange background tint
│ Install Python 3.8+ first              │
│ [🔧 Install Core] [🐍 PyPI]           │
└────────────────────────────────────────┘

Progress: "⏳ 0/2 components installed. Click install buttons above."
Button: [✓ Finish Setup] (disabled, gray)
```

**Checking Status** (Loading):
```
┌────────────────────────────────────────┐
│ 📦 npm Package          ⏳             │  ← Gray border
│ Checking installation status...        │  ← Spinning loader
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🐍 Python Core          ⏳             │  ← Gray border
│ Checking installation status...        │  ← Spinning loader
└────────────────────────────────────────┘

Progress: "Checking installation status..."
```

## User Interactions

### 1. Install npm Package
**User Action**: Clicks `[⚡ Install CLI]`
**System Response**:
- Opens new terminal: "Install RapidKit CLI"
- Runs: `npm install -g rapidkit`
- Shows progress in terminal
- User manually clicks "🔄 Refresh" after install completes

### 2. Install Python Core
**User Action**: Clicks `[🔧 Install Core]`
**System Response**:
- Opens new terminal: "Install RapidKit Core"
- Runs: `pip install rapidkit-core`
- Shows progress in terminal
- User manually clicks "🔄 Refresh" after install completes

### 3. Refresh Status
**User Action**: Clicks `[🔄 Refresh]`
**System Response**:
1. Sets status icons to ⏳ (spinning)
2. Runs 4-method detection for each component
3. Updates UI with results:
   - ✓ if found
   - ⚠ if not found
4. Updates progress message
5. Enables/disables "Finish Setup" button

### 4. Hide Wizard
**User Action**: Clicks `[✕ Hide]`
**System Response**:
- Wizard section collapses/hides
- State saved to VS Code storage
- Won't show again on next launch
- Can manually show via Command Palette

### 5. Finish Setup
**User Action**: Clicks `[✓ Finish Setup]` (when enabled)
**System Response**:
- Runs `rapidkit doctor` command
- Shows system diagnostics
- Hides wizard
- Saves state (won't show again)

## Animation Details

### Loading Spinner
```css
@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```
⏳ rotates continuously while checking status

### Hover Effects
- Cards lift up 2px on hover
- Border changes to accent color
- Shadow appears beneath card
- Smooth transition (0.2s - 0.3s)

### Status Transitions
- Fade in/out when changing states
- Color transition for borders
- Scale effect on button hover (1.02x)

## Accessibility

- **Keyboard Navigation**: All buttons accessible via Tab
- **Screen Readers**: Proper ARIA labels for status
- **High Contrast**: Works in all VS Code themes
- **Color Blind**: Icons + text, not just colors

## Responsive Design

**Wide Screen (>600px)**:
- 2-column grid for steps
- Side-by-side npm and Python cards

**Narrow Screen (<600px)**:
- 1-column stack
- npm card on top
- Python card below
- Full-width buttons

## Technical Implementation

### Status Check Flow
```
User opens Welcome Page
        ↓
JavaScript sends: { command: 'checkInstallStatus' }
        ↓
Extension runs: _checkInstallationStatus()
        ├─→ Check npm (which, npx)
        └─→ Check Python Core (4 methods)
        ↓
Extension sends: { command: 'installStatusUpdate', data: {...} }
        ↓
JavaScript receives & calls: updateWizardUI(data)
        ↓
UI updates with status indicators
```

### Installation Flow
```
User clicks Install Button
        ↓
JavaScript sends: { command: 'installNpmGlobal' or 'installPipCore' }
        ↓
Extension creates terminal & runs command
        ↓
Terminal shows installation progress
        ↓
User waits for install to complete
        ↓
User clicks [🔄 Refresh]
        ↓
Status check flow repeats
        ↓
UI shows updated status
```

## Edge Cases Handled

1. **Python not installed**: Shows warning to install Python first
2. **pip not available**: Tries pip, pip3, python -m pip, pyenv
3. **npm cache only**: Shows "npx cache" instead of path
4. **Partial install**: Shows mixed status, enables selective install
5. **Install in progress**: User can refresh to check anytime
6. **Network errors**: Terminal shows error, user can retry
7. **Permission errors**: Terminal shows sudo prompt if needed

---

**Test the wizard**: Open Extension in Development Host and click "RapidKit: Show Welcome" from Command Palette
