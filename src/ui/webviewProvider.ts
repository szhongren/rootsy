import * as vscode from 'vscode';
import { StorageManager, Session, LogGroup, Log } from '../storage/storageManager';
import { getNonce } from '../utils/helpers';

/**
 * Manages the main webview panel for the Rootsy extension
 */
export class RootsyWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'rootsy.webview';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _storageManager: StorageManager
  ) {}

  /**
   * Called when the view is first created or becomes visible again
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'createSession':
          vscode.commands.executeCommand('rootsy.createSession');
          break;
        case 'switchSession':
          if (message.sessionId) {
            await this._storageManager.setCurrentSession(message.sessionId);
            this.refresh();
          }
          break;
        case 'pullErrorLogs':
          vscode.commands.executeCommand('rootsy.pullErrorLogs');
          break;
        case 'pullAllLogs':
          vscode.commands.executeCommand('rootsy.pullAllLogs');
          break;
        case 'analyzeLogGroup':
          if (message.logGroupId) {
            vscode.commands.executeCommand('rootsy.analyzeLogGroup', message.logGroupId);
          }
          break;
      }
    });
  }

  /**
   * Refreshes the webview content
   */
  public async refresh() {
    if (!this._view) {
      return;
    }

    this._view.webview.html = this._getHtmlForWebview(this._view.webview);
  }

  /**
   * Generates the HTML for the webview
   */
  private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    // Get the local path to main script and stylesheet
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js')
    );
    
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.css')
    );

    // Get current session and data
    const currentSession = this._storageManager.getCurrentSession();
    const sessions = await this._storageManager.getAllSessions();
    
    let logGroups: LogGroup[] = [];
    let logs: Log[] = [];
    
    if (currentSession) {
      logGroups = await this._storageManager.getSessionLogGroups(currentSession.id);
      logs = await this._storageManager.getSessionLogs(currentSession.id);
    }

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleUri}" rel="stylesheet">
      <title>Rootsy</title>
    </head>
    <body>
      <div class="container">
        <h1>Rootsy</h1>
        
        ${!currentSession ? `
          <div class="session-selector">
            <h2>Select a Session</h2>
            ${sessions.length > 0 ? `
              <div class="session-list">
                ${sessions.map(session => `
                  <div class="session-item" data-session-id="${session.id}">
                    <span class="session-name">${session.name}</span>
                    <span class="session-date">${new Date(session.createdAt).toLocaleString()}</span>
                    <button class="select-session-btn" data-session-id="${session.id}">Select</button>
                  </div>
                `).join('')}
              </div>
            ` : `<p>No sessions found.</p>`}
            
            <button id="createSessionBtn" class="primary-button">Create New Session</button>
          </div>
        ` : `
          <div class="session-info">
            <h2>Session: ${currentSession.name}</h2>
            <div class="session-details">
              <span>Created: ${new Date(currentSession.createdAt).toLocaleString()}</span>
              <span>Status: ${currentSession.status}</span>
              <span>Cloud Provider: ${currentSession.cloudProvider}</span>
            </div>
            
            <div class="action-buttons">
              <button id="pullErrorLogsBtn" class="primary-button">Pull Error Logs</button>
              <button id="pullAllLogsBtn" class="secondary-button">Pull All Logs</button>
              <button id="switchSessionBtn" class="text-button">Switch Session</button>
            </div>
            
            <div class="log-groups-container">
              <h3>Log Groups</h3>
              ${logGroups.length > 0 ? `
                <div class="log-groups">
                  ${logGroups.map(group => `
                    <div class="log-group" data-group-id="${group.id}" data-status="${group.status}">
                      <div class="log-group-header">
                        <span class="log-group-name">${group.name}</span>
                        <span class="log-group-status">${group.status}</span>
                        <button class="analyze-btn" data-group-id="${group.id}">Analyze</button>
                      </div>
                      <div class="log-group-content">
                        ${group.description ? `<p class="description">${group.description}</p>` : ''}
                        ${group.rootCause ? `
                          <div class="root-cause">
                            <h4>Root Cause</h4>
                            <p>${group.rootCause}</p>
                          </div>
                        ` : ''}
                        ${group.suggestedFix ? `
                          <div class="suggested-fix">
                            <h4>Suggested Fix</h4>
                            <p>${group.suggestedFix}</p>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `<p>No log groups found. Pull logs to get started.</p>`}
            </div>
          </div>
        `}
        
        ${!currentSession ? '' : `
          <div class="logs-container">
            <h3>Recent Logs</h3>
            ${logs.length > 0 ? `
              <div class="logs">
                ${logs.slice(0, 10).map(log => `
                  <div class="log-item ${log.logLevel?.toLowerCase() || ''}">
                    <div class="log-header">
                      <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                      ${log.service ? `<span class="log-service">${log.service}</span>` : ''}
                      ${log.logLevel ? `<span class="log-level">${log.logLevel}</span>` : ''}
                    </div>
                    <div class="log-content">${log.logContent}</div>
                  </div>
                `).join('')}
                ${logs.length > 10 ? `<div class="more-logs">+ ${logs.length - 10} more logs</div>` : ''}
              </div>
            ` : `<p>No logs found. Pull logs to get started.</p>`}
          </div>
        `}
      </div>
      
      <script nonce="${nonce}" src="${scriptUri}"></script>
      <script nonce="${nonce}">
        // Initialize with data
        const currentSession = ${currentSession ? JSON.stringify(currentSession) : 'null'};
        const logGroups = ${JSON.stringify(logGroups)};
        const logs = ${JSON.stringify(logs)};
        
        // Initialize the webview
        (function() {
          const vscode = acquireVsCodeApi();
          setupEventListeners(vscode);
          
          if (currentSession) {
            updateUIForSession(currentSession, logGroups, logs);
          }
        })();
      </script>
    </body>
    </html>`;
  }
}
