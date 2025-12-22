/**
 * Extension Constants
 * Centralized constants for the RapidKit VS Code extension
 */

import * as vscode from 'vscode';

/**
 * Get the current extension version dynamically from package.json
 */
export function getExtensionVersion(): string {
  const extension = vscode.extensions.getExtension('rapidkit.rapidkit-vscode');
  return extension?.packageJSON?.version || '0.4.4';
}

/**
 * Extension metadata
 */
export const EXTENSION = {
  ID: 'rapidkit.rapidkit-vscode',
  NAME: 'RapidKit',
  PUBLISHER: 'rapidkit',
} as const;

/**
 * Marker file signatures
 */
export const MARKERS = {
  WORKSPACE_SIGNATURE: 'rapidkit-vscode',
  WORKSPACE_SIGNATURE_LEGACY: 'RAPIDKIT_VSCODE_WORKSPACE',
} as const;

/**
 * URLs
 */
export const URLS = {
  DOCS: 'https://getrapidkit.com/docs',
  TROUBLESHOOTING: 'https://getrapidkit.com/docs/troubleshooting',
  GITHUB: 'https://github.com/getrapidkit/rapidkit-vscode',
  MARKETPLACE: 'https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode',
} as const;
