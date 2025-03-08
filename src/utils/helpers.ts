import * as vscode from 'vscode';

/**
 * Generates a random nonce string for Content Security Policy
 * @returns A random nonce string
 */
export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Shows an error message with proper formatting
 * @param error The error to display
 */
export function showError(error: unknown): void {
  const message = error instanceof Error 
    ? error.message 
    : String(error);
  
  vscode.window.showErrorMessage(`Rootsy: ${message}`);
}

/**
 * Formats a date for display
 * @param timestamp The timestamp to format
 * @returns A formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
