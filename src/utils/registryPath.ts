/**
 * Registry Path Utility
 * Cross-platform path resolution for workspace registry
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Get the cross-platform registry directory path
 * - Windows: %APPDATA%/rapidkit or %USERPROFILE%/.config/rapidkit
 * - Unix/Mac: ~/.rapidkit (for backward compatibility)
 * - Supports XDG_CONFIG_HOME environment variable
 */
export function getRegistryDir(): string {
  if (process.platform === 'win32') {
    // Windows: Use APPDATA if available
    const configHome = process.env.APPDATA || path.join(os.homedir(), '.config');
    return path.join(configHome, 'rapidkit');
  } else {
    // Unix/Mac: Use ~/.rapidkit for backward compatibility
    return path.join(os.homedir(), '.rapidkit');
  }
}

/**
 * Get the full path to workspaces.json registry file
 */
export function getRegistryFilePath(): string {
  return path.join(getRegistryDir(), 'workspaces.json');
}
