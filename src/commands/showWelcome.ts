/**
 * Show Welcome Command
 * Display welcome page with quick actions
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { WelcomePanel } from '../ui/panels/welcomePanel';

export async function showWelcomeCommand(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  logger.info('Show Welcome command initiated');

  try {
    WelcomePanel.createOrShow(context);
  } catch (error) {
    logger.error('Error in showWelcomeCommand', error);
    vscode.window.showErrorMessage(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
