# 🎯 Setup Wizard Improvements - Professional & User-Friendly

## 📋 Overview

Major redesign of the Setup Wizard to provide a professional, scenario-aware experience that guides users through different installation paths based on their needs.

---

## 🎨 New Structure

### Before (Old Design)
```
🚀 Setup Status
├─ ⚙️ Core Toolchain (Required)
│   ├─ Python 3.10+
│   ├─ pipx (Required for Engine)
│   ├─ RapidKit Core
│   └─ RapidKit CLI
└─ 📦 Project Dependencies (Optional)
    ├─ Poetry
    └─ pip
```

### After (New Design)
```
🚀 Setup Status
├─ ⚙️ Required (Must Have)
│   └─ Python 3.10+             [Essential for all workflows]
├─ 🎯 Recommended (Better Performance)
│   ├─ pipx                     [Tool Manager]
│   ├─ RapidKit Core            [Engine]
│   └─ RapidKit CLI             [CLI Bridge]
└─ 📦 Optional (Per-Project)
    ├─ Poetry                   [Recommended]
    └─ pip                      [Installed per workspace/project]
```

---

## 🔍 Key Changes

### 1️⃣ **Three-Tier Hierarchy**

#### **Required (Must Have)**
- ✅ Python 3.10+
- **Why**: Absolute minimum to run anything

#### **Recommended (Better Performance)**
- ⚠️ pipx - Tool Manager
- ⚠️ RapidKit Core - Python Engine
- ⚠️ npm/RapidKit CLI - Workspace Manager
- **Why**: Significantly speeds up workflow, but NOT required

#### **Optional (Per-Project)**
- 📦 Poetry - Per-project dependency manager
- 📦 pip - Fallback package installer
- **Why**: Installed as needed per workspace

---

## 🎯 Supported Scenarios

### ✅ Scenario 1: Full Stack (Fastest)
```bash
# User installs everything
✓ Python 3.10+
✓ pipx
✓ pipx install rapidkit-core    # Global
✓ npm i -g rapidkit             # Global

Result: ⚡ Fastest workspace creation
        ⚡ Fastest project scaffolding
        ⚡ Best developer experience
```

**Setup Wizard Shows**:
```
⚙️ Required
  ✓ Python 3.10.19 ✓ System ready

🎯 Recommended
  ✓ pipx v1.8.0 ✓ Ready for global tools
  ✓ RapidKit Core v0.2.2rc1 ✓ Ready (Global)
  ✓ RapidKit CLI v0.16.5 ✓ Workspace manager ready

📦 Optional
  ✓ Poetry v2.3.2 (Recommended)
  ✓ pip v26.0
```

---

### ✅ Scenario 2: npm CLI Only (Recommended)
```bash
# User installs only npm package
✓ Python 3.10+
✗ pipx (not installed)
✗ rapidkit-core (not global)
✓ npm i -g rapidkit

Result: ✓ Workspace creation works
        ✓ Core installed in each workspace venv
        ⚠️ Slightly slower first-time setup
```

**Setup Wizard Shows**:
```
⚙️ Required
  ✓ Python 3.10.19 ✓ System ready

🎯 Recommended
  ⚠️ pipx Not installed
     💡 Recommended: Speeds up workspace creation
     
  ⚠️ RapidKit Core v0.2.2rc1 ⚠️ In workspace only
     💡 Install globally with pipx for faster workspace creation
     pipx install rapidkit-core
     
  ✓ RapidKit CLI v0.16.5 ✓ Workspace manager ready

📦 Optional
  ⚠️ Poetry Not installed (Recommended)
  ✓ pip v26.0
```

---

### ✅ Scenario 3: Minimal (npx only)
```bash
# User doesn't install anything globally
✓ Python 3.10+
✗ pipx
✗ rapidkit-core
✗ npm global package

# User runs:
npx rapidkit my-workspace

Result: ✓ Works perfectly
        ⚠️ Slower (downloads npm package each time)
        ⚠️ Core installed in workspace venv
```

**Setup Wizard Shows**:
```
⚙️ Required
  ✓ Python 3.10.19 ✓ System ready

🎯 Recommended
  ⚠️ pipx Not installed
     💡 Recommended: Install for better performance
     
  ⚠️ RapidKit Core Not installed
     💡 Optional: Install globally to speed up workspace creation
     
  ⚠️ RapidKit CLI Not installed
     💡 Optional: Install globally for faster access

📦 Optional
  ⚠️ Poetry Not installed (Recommended)
  ✓ pip v26.0
```

---

## 🔧 Technical Implementation

### **New Status Field: `coreInstallType`**

```typescript
interface InstallationStatus {
  coreInstalled: boolean;
  coreVersion: string | null;
  coreInstallType: 'global' | 'workspace' | null;  // NEW
  // ... other fields
}
```

### **Detection Logic**

```typescript
// Method priority for determining install type:
1. pipx list                  → global
2. poetry show rapidkit-core  → workspace
3. python -c "import ..."     → check if in pipx → global/workspace
```

### **UI Display Logic**

```typescript
if (coreInstalled) {
  if (coreInstallType === 'global') {
    // ✓ Green checkmark
    // ✓ Ready (Global)
    // No action button needed
  } else if (coreInstallType === 'workspace') {
    // ⚠️ Orange warning icon
    // ⚠️ In workspace only
    // 💡 Tip: Install globally for speed
    // Show "Install" button for upgrade to global
  }
}
```

---

## 📊 Visual States

### **Global Install (Best)**
```
┌─────────────────────────────────────────────┐
│ [Engine]  RapidKit Core              [✓]   │
│           v0.2.2rc1                         │
│           ✓ Ready (Global)                  │
│                                             │
│ [No action needed]                          │
└─────────────────────────────────────────────┘
Color: Green border
```

### **Workspace Install (Acceptable)**
```
┌─────────────────────────────────────────────┐
│ [Engine]  RapidKit Core              [⚠️]  │
│           v0.2.2rc1                         │
│           ⚠️ In workspace only              │
│           💡 Install globally with pipx     │
│           for faster workspace creation     │
│           pipx install rapidkit-core        │
│                                             │
│ [⚡ Install Globally]  [📋 Copy]            │
└─────────────────────────────────────────────┘
Color: Orange border
```

### **Not Installed (Action Needed)**
```
┌─────────────────────────────────────────────┐
│ [Engine]  RapidKit Core              [⚠]   │
│           Not installed                     │
│           Optional: Speeds up workflow      │
│                                             │
│ [⚡ Install]  [📋 Copy Command]             │
└─────────────────────────────────────────────┘
Color: Red border
```

---

## 💬 User Guidance Messages

### **pipx**
- ✓ Installed: "✓ Ready for global tools"
- ⚠️ Not installed: "Recommended - Speeds up workspace creation"

### **RapidKit Core**
- ✓ Global: "✓ Ready (Global)"
- ⚠️ Workspace: "⚠️ In workspace only" + tip to install globally
- ⚠️ Not installed: "Optional: Speeds up workflow"

### **RapidKit CLI**
- ✓ Installed: "✓ Workspace manager ready"
- ⚠️ Not installed: "Optional: Install globally for faster access"

---

## 🎯 Design Philosophy

### **Progressive Enhancement**
1. **Minimum Viable**: Python only → works with `npx rapidkit`
2. **Good**: Python + npm global → faster, more convenient
3. **Best**: Python + pipx + Core global + npm → fastest possible

### **No Blocking**
- Nothing is absolutely required except Python
- All tools are presented as performance enhancements
- Users can start working immediately with minimal setup

### **Clear Communication**
- **Green ✓**: Optimal setup
- **Orange ⚠️**: Works but can be improved
- **Red ✕**: Missing but optional

### **Actionable Guidance**
- Every warning comes with:
  - Why it matters
  - How to fix it
  - Command to copy

---

## 📈 Benefits

### **For New Users**
✅ Clear understanding of what's required vs optional
✅ Not overwhelmed with "everything must be installed"
✅ Can start quickly with minimal setup
✅ Guided toward optimal setup over time

### **For Experienced Users**
✅ Understand performance trade-offs
✅ Can choose their preferred workflow
✅ See exactly where optimizations are possible
✅ Professional, transparent system status

### **For Enterprise**
✅ CI/CD can use minimal setup (npx only)
✅ Dev machines can use full setup (fastest)
✅ Clear documentation for different scenarios
✅ No surprises about requirements

---

## 🚀 Future Enhancements

### **Potential Additions**

1. **Performance Metrics**
```
Workspace creation time:
  Current setup: ~45 seconds
  With global Core: ~15 seconds ⚡ 3x faster
```

2. **One-Click Optimization**
```
[🎯 Optimize My Setup]
└─ Analyzes current state
└─ Suggests improvements
└─ Runs all installs automatically
```

3. **Scenario Presets**
```
Choose your workflow:
○ Quick Start (npx only)
○ Balanced (npm + poetry)
● Full Stack (everything) ⚡ Recommended
```

4. **Health Score**
```
Setup Health: 80% 🟢
  ✓ Python ready
  ✓ Core available
  ⚠️ Missing pipx (install for +15% performance)
```

---

## 📝 Testing Checklist

### **Scenario Tests**

- [ ] ✅ Python only, npx rapidkit → Works
- [ ] ✅ Python + npm global → Works faster
- [ ] ✅ Python + pipx + Core global → Works fastest
- [ ] ✅ Python + Poetry + Core in workspace → Shows warning
- [ ] ✅ Full stack → All green

### **UI Tests**

- [ ] Required section shows Python only
- [ ] Recommended section shows pipx, Core, CLI
- [ ] Optional section shows Poetry, pip
- [ ] Green checkmark for global Core
- [ ] Orange warning for workspace Core
- [ ] Red X for missing Core
- [ ] Tip message displays for workspace Core
- [ ] Install button shows for workspace Core

### **Detection Tests**

- [ ] Detects pipx-installed Core as global
- [ ] Detects poetry-installed Core as workspace
- [ ] Detects Core in workspace venv
- [ ] Handles missing pipx gracefully
- [ ] Works with npx (limited PATH)

---

## 🎓 User Documentation

Users should refer to:
- [Installation Guide](https://getrapidkit.com/docs/installation)
- [Setup Scenarios](https://getrapidkit.com/docs/setup-scenarios)
- [Performance Tips](https://getrapidkit.com/docs/performance)
- [Troubleshooting](https://getrapidkit.com/docs/troubleshooting)

---

**Last Updated**: February 5, 2026  
**Version**: 0.6.1  
**Author**: RapidKit Team
