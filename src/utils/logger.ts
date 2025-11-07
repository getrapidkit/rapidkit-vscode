/**
 * Logger utility for RapidKit extension
 */

import * as vscode from 'vscode';

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private debugMode: boolean = false;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('RapidKit');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  public show(): void {
    this.outputChannel.show();
  }

  public hide(): void {
    this.outputChannel.hide();
  }

  public info(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [INFO] ${message}`;
    this.outputChannel.appendLine(formattedMessage);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  public warn(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [WARN] ${message}`;
    this.outputChannel.appendLine(formattedMessage);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  public error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [ERROR] ${message}`;
    this.outputChannel.appendLine(formattedMessage);
    if (error) {
      if (error instanceof Error) {
        this.outputChannel.appendLine(`Error: ${error.message}`);
        if (error.stack) {
          this.outputChannel.appendLine(`Stack: ${error.stack}`);
        }
      } else {
        this.outputChannel.appendLine(JSON.stringify(error, null, 2));
      }
    }
  }

  public debug(message: string, ...args: any[]): void {
    if (!this.debugMode) {
      return;
    }
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [DEBUG] ${message}`;
    this.outputChannel.appendLine(formattedMessage);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
  }

  public dispose(): void {
    this.outputChannel.dispose();
  }
}
