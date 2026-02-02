# 🐍 Comprehensive Python and rapidkit-core Detection Methods

## Previous Issue
Extension only checked system Python and couldn't detect rapidkit-core installed in pyenv, virtualenv, poetry, etc.

## Solution: 8 Detection Methods

### Method 1: Python Import Check ✅
**Scenarios:**
- System Python with package installed globally
- Active virtualenv/venv with package
- PYTHONPATH includes package location

**Commands:**
```bash
python3 -c "import rapidkit_core; print(1)"
python -c "import rapidkit_core; print(1)"
python3.10 -c "import rapidkit_core; print(1)"
python3.11 -c "import rapidkit_core; print(1)"
python3.12 -c "import rapidkit_core; print(1)"
```

**When it works:**
- ✅ Package is in current Python PATH
- ✅ Virtual environment is active
- ❌ Package is in a different pyenv version (not active)

---

### Method 2: Python -m pip show ✅
**Scenarios:**
- System Python with pip
- Virtual environment with pip
- User site-packages install

**Commands:**
```bash
python3 -m pip show rapidkit-core
python -m pip show rapidkit-core
```

**When it works:**
- ✅ pip module is available
- ✅ Package is in same Python environment
- ❌ System Python without pip (like Python 3.13.5)

---

### Method 3: Direct pip Command ✅
**Scenarios:**
- pip/pip3 available in PATH
- pip symlink points to specific Python version

**Commands:**
```bash
pip show rapidkit-core
pip3 show rapidkit-core
```

**When it works:**
- ✅ pip command in PATH
- ✅ pip points to correct Python
- ❌ pip points to system Python without package

---

### Method 4: pyenv All Versions Check 🔥
**Scenarios:**
- pyenv with multiple Python versions
- Package installed in one of the versions
- pyenv global set to different version

**Commands:**
```bash
# List all pyenv versions
pyenv versions --bare

# Check each version
pyenv exec -g 3.10.19 pip show rapidkit-core
pyenv exec -g 3.11.7 pip show rapidkit-core
pyenv exec -g 3.12.1 pip show rapidkit-core
```

**When it works:**
- ✅ pyenv is installed
- ✅ Package installed in any Python version
- ✅ **SOLVES YOUR PROBLEM!** (package in 3.10.19 but global on system)

---

### Method 5: User Site-Packages Check ✅
**Scenarios:**
- pip install --user rapidkit-core
- Package in ~/.local/lib/pythonX.Y/site-packages

**Commands:**
```bash
# Get user site location
python3 -m site --user-site

# Check if package exists
ls ~/.local/lib/python3.10/site-packages/rapidkit_core/
```

**When it works:**
- ✅ User install (--user flag)
- ✅ No virtualenv active
- ❌ System-wide install only

---

### Method 6: pipx List ✅
**Scenarios:**
- Package installed via pipx (isolated environments)
- CLI tools installed separately

**Commands:**
```bash
pipx list
```

**When it works:**
- ✅ pipx is installed
- ✅ Package installed via pipx
- ❌ Regular pip install

---

### Method 7: Poetry Show ✅
**Scenarios:**
- Poetry project with rapidkit-core in dependencies
- Poetry virtual environment

**Commands:**
```bash
poetry show rapidkit-core
```

**When it works:**
- ✅ poetry is installed
- ✅ In poetry project directory
- ✅ Package in pyproject.toml
- ❌ Global install only

---

### Method 8: Conda List ✅
**Scenarios:**
- Conda/Miniconda environment
- Anaconda Python distribution

**Commands:**
```bash
conda list rapidkit-core
```

**When it works:**
- ✅ conda is installed
- ✅ conda environment is active
- ✅ Package installed via conda or pip in conda env
- ❌ System Python install

---

## Detection Flow Diagram

```
Start Detection
      ↓
[Method 1] Python Import
      ↓ (failed)
[Method 2] python -m pip show
      ↓ (failed)
[Method 3] pip/pip3 show
      ↓ (failed)
[Method 4] pyenv versions check  ← Your case detected here!
      ↓ (failed)
[Method 5] User site-packages
      ↓ (failed)
[Method 6] pipx list
      ↓ (failed)
[Method 7] poetry show
      ↓ (failed)
[Method 8] conda list
      ↓
Not Found ❌
```

## Real User Scenarios

### Scenario 1: System Python + pip install
```bash
pip install rapidkit-core
```
**Detection:** Method 1, 2, or 3 ✅

### Scenario 2: pyenv + pip install (Your case)
```bash
pyenv global system  # Python 3.13.5 without pip
pip install rapidkit-core  # installs to 3.10.19
```
**Detection:** Method 4 (pyenv versions check) ✅

### Scenario 3: virtualenv
```bash
python3 -m venv myenv
source myenv/bin/activate
pip install rapidkit-core
```
**Detection:** Method 1 (if active), Method 2 ✅

### Scenario 4: poetry project
```bash
poetry add rapidkit-core
```
**Detection:** Method 7 (poetry show) ✅

### Scenario 5: conda environment
```bash
conda create -n myenv python=3.10
conda activate myenv
pip install rapidkit-core
```
**Detection:** Method 1 (if active), Method 8 ✅

### Scenario 6: User install
```bash
pip install --user rapidkit-core
```
**Detection:** Method 5 (user site-packages) ✅

### Scenario 7: pipx isolated
```bash
pipx install rapidkit-core
```
**Detection:** Method 6 (pipx list) ✅

### Scenario 8: Multiple Python versions
```bash
python3.10 -m pip install rapidkit-core
python3.11 -m pip install rapidkit-core
```
**Detection:** Method 1 (with python3.10/3.11 commands) ✅

## Conclusion

With these 8 methods, **no scenario is missed**:

✅ System Python  
✅ pyenv (all versions)  
✅ virtualenv/venv  
✅ poetry  
✅ conda  
✅ pipx  
✅ User site-packages  
✅ Multiple Python versions  

## Test Your System

To test detection:

```bash
# 1. Check system Python
python3 -c "import rapidkit_core; print('Found')"

# 2. Check pip
pip show rapidkit-core

# 3. Check pyenv versions
pyenv versions --bare
for v in $(pyenv versions --bare); do
  echo "Checking $v..."
  pyenv exec -g $v pip show rapidkit-core 2>/dev/null && echo "✅ Found in $v"
done

# 4. Check user site
python3 -m site --user-site
ls $(python3 -m site --user-site)/rapidkit_core 2>/dev/null && echo "✅ Found in user site"

# 5. Check pipx
pipx list | grep rapidkit-core && echo "✅ Found in pipx"

# 6. Check poetry (if in project)
poetry show rapidkit-core 2>/dev/null && echo "✅ Found in poetry"

# 7. Check conda
conda list rapidkit-core 2>/dev/null && echo "✅ Found in conda"
```

## Performance

- Each method has timeout (3 seconds max)
- Stops on first match
- Usually found in Method 1-4
- Worst case: 8 × 3 = 24 seconds (unlikely)
- Best case: < 1 second

## Your Problem Solved! 🎉

```
System: Python 3.13.5 (no pip, no rapidkit-core)
        ↓
pyenv:  Python 3.10.19 (has pip, has rapidkit-core 0.2.1rc1) ← Gets detected!
        ↓
Method 4: pyenv versions check → ✅ FOUND
```
