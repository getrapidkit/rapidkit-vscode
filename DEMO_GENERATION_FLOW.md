# RapidKit Demo Project Generation - How It Works

## 📚 Understanding the Flow

### In rapidkit-npm (CLI Package)
**Location**: `/home/debux/WOSP/Rapid/Front/rapidkit-npm`

#### Two Modes:

**1. Create Demo Workspace**
```bash
npx rapidkit my-workspace --demo
```
- Creates a workspace directory with `generate-demo.js` script
- No Python installation needed
- Can generate multiple projects inside

**2. Generate Project Inside Workspace**
```bash
cd my-workspace
node generate-demo.js my-project
```
- Uses the workspace's `generate-demo.js`
- Which internally calls: `npx rapidkit "my-project" --demo-only`

**3. Standalone Project (No Workspace)**
```bash
npx rapidkit my-project --demo-only
```
- Creates a single project directly
- No workspace container needed

---

### In rapidkit-vscode (VS Code Extension)
**Location**: `/home/debux/WOSP/Rapid/Front/rapidkit-vscode`

#### Implementation in `generateDemo.ts`:

**Case 1: Inside a Demo Workspace**
```typescript
// src/commands/generateDemo.ts (line 94-108)
const proc = execa('node', ['generate-demo.js', projectName], {
  cwd: destinationPath,  // workspace path
  stdio: 'inherit',
});
```
✅ Uses the workspace's `generate-demo.js` script

**Case 2: Outside Workspace (Standalone)**
```typescript
// src/commands/generateDemo.ts (line 111-127)
const cli = new RapidKitCLI();
await cli.generateDemo({
  name: projectName,
  destinationPath: destinationPath,
});
```
✅ Calls `npx rapidkit "projectName" --demo-only` via RapidKitCLI

---

## 🔄 Flow Diagram

```
VS Code Extension User:
  ↓
  Click "Generate Demo Project"
  ↓
  Has demo workspace selected?
  ├─ YES → Run: node generate-demo.js <projectName>
  │        (inside workspace)
  └─ NO  → Run: npx rapidkit <projectName> --demo-only
           (standalone)
  ↓
Both options call RapidKit npm package:
  ├─ createDemoKit() function
  └─ Generates FastAPI project from templates
```

---

## ✅ Verification

**rapidkit-npm** (v0.11.1 - Latest):
- ✅ `--demo` flag: Creates demo workspace
- ✅ `--demo-only` flag: Generates standalone project
- ✅ `generate-demo.js`: Workspace script that calls `--demo-only`

**rapidkit-vscode** (v0.3.1 - Latest):
- ✅ Detects demo workspace with `generate-demo.js`
- ✅ Uses workspace script if available
- ✅ Falls back to `--demo-only` if no workspace
- ✅ Both methods use correct `stdio: 'inherit'` for output visibility

---

## 🎯 Summary

**Both packages are correctly implemented!**

The VS Code extension properly:
1. Detects demo workspaces
2. Uses the correct generation method for each scenario
3. Shows output to the user with `stdio: 'inherit'`
4. Updates progress during generation

The flow matches the npm package's architecture perfectly.
