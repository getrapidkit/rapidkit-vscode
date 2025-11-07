/**
 * Preview Template Command
 * Show template preview in webview
 */

import * as vscode from 'vscode';
import { RapidKitTemplate } from '../types';
import { Logger } from '../utils/logger';
import { TemplatePreviewPanel } from '../ui/panels/templatePreviewPanel';

export async function previewTemplateCommand(template?: RapidKitTemplate) {
  const logger = Logger.getInstance();
  logger.info('Preview Template command initiated', template);

  try {
    if (!template) {
      vscode.window.showWarningMessage('No template selected');
      return;
    }

    // Show template preview panel
    TemplatePreviewPanel.createOrShow(template);
  } catch (error) {
    logger.error('Error in previewTemplateCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
