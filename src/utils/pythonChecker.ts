/**
 * Python Environment Checker
 * Validates Python 3.10+ installation and venv support before critical operations
 */

import { run } from './exec';
import { Logger } from './logger';
import { requirementCache } from './requirementCache';

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

const MINIMUM_PYTHON_VERSION = { major: 3, minor: 10 };

/**
 * Comprehensive Python environment check
 * Returns detailed information about Python availability and capabilities
 */
export async function checkPythonEnvironment(): Promise<PythonCheckResult> {
  const logger = Logger.getInstance();

  // Try python3 first, then python
  for (const cmd of ['python3', 'python'] as const) {
    try {
      // Check if Python is available
      const versionResult = await run(cmd, ['--version'], {
        timeout: 3000,
        stdio: 'pipe',
      });

      if (versionResult.exitCode !== 0) {
        continue;
      }

      const version = versionResult.stdout?.trim() || versionResult.stderr?.trim() || '';
      logger.debug(`Found Python: ${cmd} -> ${version}`);

      // Parse version number (e.g., "Python 3.13.5" -> { major: 3, minor: 13 })
      const versionMatch = version.match(/Python (\d+)\.(\d+)/);
      const versionNumber = versionMatch
        ? { major: parseInt(versionMatch[1]), minor: parseInt(versionMatch[2]) }
        : undefined;

      const meetsMinimumVersion = versionNumber
        ? versionNumber.major > MINIMUM_PYTHON_VERSION.major ||
          (versionNumber.major === MINIMUM_PYTHON_VERSION.major &&
            versionNumber.minor >= MINIMUM_PYTHON_VERSION.minor)
        : false;

      if (!meetsMinimumVersion) {
        return {
          available: true,
          version,
          versionNumber,
          meetsMinimumVersion: false,
          command: cmd,
          venvSupport: false,
          rapidkitCoreInstalled: false,
          error: `Python ${versionNumber?.major}.${versionNumber?.minor} found, but RapidKit requires Python 3.10+`,
          recommendation: `Please install Python 3.10 or higher. Current: ${version}`,
        };
      }

      // Check venv support
      const venvCheck = await run(cmd, ['-m', 'venv', '--help'], {
        timeout: 3000,
        stdio: 'pipe',
      });

      const venvSupport = venvCheck.exitCode === 0;

      if (!venvSupport) {
        const pythonVersion = `${versionNumber?.major}.${versionNumber?.minor}`;

        return {
          available: true,
          version,
          versionNumber,
          meetsMinimumVersion: true,
          command: cmd,
          venvSupport: false,
          rapidkitCoreInstalled: false,
          error: `Python ${pythonVersion} is missing venv support`,
          recommendation: getVenvInstallRecommendation(pythonVersion),
        };
      }

      // Check if rapidkit-core is installed - Comprehensive detection
      let rapidkitCoreInstalled = false;

      // Method 1: Try import check
      try {
        const rapidkitCheck = await run(cmd, ['-c', 'import rapidkit_core; print(1)'], {
          timeout: 3000,
          stdio: 'pipe',
        });
        rapidkitCoreInstalled =
          rapidkitCheck.exitCode === 0 && rapidkitCheck.stdout?.trim() === '1';
      } catch {
        // Try other methods
      }

      // Method 2: Try pip show via python -m pip
      if (!rapidkitCoreInstalled) {
        try {
          const pipCheck = await run(cmd, ['-m', 'pip', 'show', 'rapidkit-core'], {
            timeout: 3000,
            stdio: 'pipe',
          });
          rapidkitCoreInstalled =
            pipCheck.exitCode === 0 && pipCheck.stdout?.includes('Name: rapidkit-core');
        } catch {
          // Continue to next method
        }
      }

      // Method 3: Try with pip/pip3 command directly
      if (!rapidkitCoreInstalled) {
        try {
          const pipCmd = cmd === 'python3' ? 'pip3' : 'pip';
          const pipCheck = await run(pipCmd, ['show', 'rapidkit-core'], {
            timeout: 3000,
            stdio: 'pipe',
          });
          rapidkitCoreInstalled =
            pipCheck.exitCode === 0 && pipCheck.stdout?.includes('Name: rapidkit-core');
        } catch {
          // Continue to next method
        }
      }

      // Method 4: Check all pyenv versions
      if (!rapidkitCoreInstalled) {
        try {
          // Get list of pyenv versions
          const versionsResult = await run('pyenv', ['versions', '--bare'], {
            timeout: 3000,
            stdio: 'pipe',
          });

          if (versionsResult.exitCode === 0 && versionsResult.stdout) {
            const versions = versionsResult.stdout.split('\n').filter((v) => v.trim());

            // Check each version using direct path
            for (const version of versions) {
              try {
                const pyenvRoot = process.env.PYENV_ROOT || `${process.env.HOME}/.pyenv`;
                const pipPath = `${pyenvRoot}/versions/${version.trim()}/bin/pip`;

                const pyenvCheck = await run(pipPath, ['show', 'rapidkit-core'], {
                  timeout: 3000,
                  stdio: 'pipe',
                });
                if (
                  pyenvCheck.exitCode === 0 &&
                  pyenvCheck.stdout?.includes('Name: rapidkit-core')
                ) {
                  rapidkitCoreInstalled = true;
                  break;
                }
              } catch {
                // Try with PYENV_VERSION environment variable
                try {
                  const pyenvCheck = await run(
                    'bash',
                    ['-c', `PYENV_VERSION=${version.trim()} pyenv exec pip show rapidkit-core`],
                    {
                      timeout: 3000,
                      stdio: 'pipe',
                    }
                  );
                  if (
                    pyenvCheck.exitCode === 0 &&
                    pyenvCheck.stdout?.includes('Name: rapidkit-core')
                  ) {
                    rapidkitCoreInstalled = true;
                    break;
                  }
                } catch {
                  continue;
                }
              }
            }
          }
        } catch {
          // pyenv not available
        }
      }

      // Method 5: Check user site-packages
      if (!rapidkitCoreInstalled) {
        try {
          const userSiteCheck = await run(cmd, ['-m', 'site', '--user-site'], {
            timeout: 3000,
            stdio: 'pipe',
          });

          if (userSiteCheck.exitCode === 0 && userSiteCheck.stdout) {
            const userSite = userSiteCheck.stdout.trim();
            const fs = await import('fs');
            const path = await import('path');

            const pkgPath = path.join(userSite, 'rapidkit_core');
            if (fs.existsSync(pkgPath)) {
              rapidkitCoreInstalled = true;
            }
          }
        } catch {
          // Can't check user site
        }
      }

      // Method 6: pipx
      if (!rapidkitCoreInstalled) {
        try {
          const pipxCheck = await run('pipx', ['list'], {
            timeout: 3000,
            stdio: 'pipe',
          });
          if (pipxCheck.exitCode === 0 && pipxCheck.stdout?.includes('rapidkit-core')) {
            rapidkitCoreInstalled = true;
          }
        } catch {
          // pipx not available
        }
      }

      // Method 7: poetry show
      if (!rapidkitCoreInstalled) {
        try {
          const poetryCheck = await run('poetry', ['show', 'rapidkit-core'], {
            timeout: 3000,
            stdio: 'pipe',
          });
          if (poetryCheck.exitCode === 0) {
            rapidkitCoreInstalled = true;
          }
        } catch {
          // poetry not available or package not found
        }
      }

      // Method 8: conda
      if (!rapidkitCoreInstalled) {
        try {
          const condaCheck = await run('conda', ['list', 'rapidkit-core'], {
            timeout: 3000,
            stdio: 'pipe',
          });
          if (condaCheck.exitCode === 0 && condaCheck.stdout?.includes('rapidkit-core')) {
            rapidkitCoreInstalled = true;
          }
        } catch {
          // conda not available
        }
      }

      return {
        available: true,
        version,
        versionNumber,
        meetsMinimumVersion: true,
        command: cmd,
        venvSupport: true,
        rapidkitCoreInstalled,
      };
    } catch (error) {
      logger.debug(`Python check failed for ${cmd}:`, error);
      continue;
    }
  }

  // No Python found
  return {
    available: false,
    meetsMinimumVersion: false,
    venvSupport: false,
    rapidkitCoreInstalled: false,
    error: 'Python not found',
    recommendation:
      'Install Python 3.10+ from https://www.python.org/downloads/ or your package manager',
  };
}

/**
 * Get OS-specific recommendation for installing venv support
 */
function getVenvInstallRecommendation(pythonVersion: string): string {
  const platform = process.platform;

  if (platform === 'linux') {
    // Detect distribution if possible
    const fs = require('fs');
    let isDebian = false;

    try {
      if (fs.existsSync('/etc/debian_version')) {
        isDebian = true;
      }
    } catch {
      // Ignore
    }

    if (isDebian) {
      return `Install venv support:\n  sudo apt update\n  sudo apt install python${pythonVersion}-venv`;
    }

    return `Install venv support for Python ${pythonVersion}:\n  - Debian/Ubuntu: sudo apt install python${pythonVersion}-venv\n  - Fedora/RHEL: sudo dnf install python${pythonVersion}`;
  }

  if (platform === 'darwin') {
    return `Python on macOS should include venv. If not:\n  brew install python@${pythonVersion}`;
  }

  if (platform === 'win32') {
    return 'Reinstall Python from python.org and ensure "pip" option is selected during installation';
  }

  return `Install Python ${pythonVersion} with venv support for your operating system`;
}

/**
 * Quick check if Python with venv is available
 * Use this for fast validation before operations
 */
export async function hasPythonVenv(): Promise<boolean> {
  const result = await checkPythonEnvironment();
  return result.available && result.venvSupport;
}

/**
 * Get a user-friendly error message for Python/venv issues
 */
export function getPythonErrorMessage(checkResult: PythonCheckResult): string {
  if (!checkResult.available) {
    return `Python not found on your system.\n\nRapidKit requires Python 3.10 or higher.\n\n${checkResult.recommendation}\n\nAfter installing Python, restart VS Code.`;
  }

  if (!checkResult.meetsMinimumVersion) {
    return `${checkResult.error}.\n\nRapidKit Core requires Python 3.10 or higher for compatibility.\n\nPlease upgrade Python and restart VS Code.`;
  }

  if (!checkResult.venvSupport) {
    return `${checkResult.error}.\n\n${checkResult.recommendation}\n\nAfter installation, restart VS Code.`;
  }

  return 'Python environment check failed. Please ensure Python 3.10+ is properly installed.';
}

/**
 * Cached version of checkPythonEnvironment
 * Uses cache to speed up repeated checks (TTL: 5 minutes)
 */
export async function checkPythonEnvironmentCached(): Promise<PythonCheckResult> {
  const logger = Logger.getInstance();

  // Try to get from cache first
  const cached = requirementCache.getCachedPythonCheck();
  if (cached) {
    logger.debug('Using cached Python check result');
    return cached;
  }

  // Cache miss - perform actual check
  logger.debug('Python cache miss - performing fresh check');
  const result = await checkPythonEnvironment();

  // Cache the result
  requirementCache.cachePythonCheck(result);

  return result;
}
