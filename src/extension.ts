// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { StorageManager } from "./storage/storageManager";
import { RootsyWebviewProvider } from "./ui/webviewProvider";
import { v4 as uuidv4 } from "uuid";
import { showError } from "./utils/helpers";

// Global storage manager instance
let storageManager: StorageManager | undefined;
let webviewProvider: RootsyWebviewProvider | undefined;

/**
 * Manages the settings webview panel
 */
class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "rootsySettings",
      "Rootsy Settings",
      column || vscode.ViewColumn.One,
      {
        // Enable JavaScript in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the extension's directory
        localResourceRoots: [extensionUri],
      }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      (e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "saveSettings":
            this._saveSettings(message.settings);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  private _saveSettings(settings: any) {
    const config = vscode.workspace.getConfiguration("rootsy");

    // Update LLM provider settings
    config.update(
      "llmProvider",
      settings.llmProvider,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "openai.apiKey",
      settings.openai.apiKey,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "openai.model",
      settings.openai.model,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "anthropic.apiKey",
      settings.anthropic.apiKey,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "anthropic.model",
      settings.anthropic.model,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "ollamaEndpoint",
      settings.ollamaEndpoint,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "ollamaModel",
      settings.ollamaModel,
      vscode.ConfigurationTarget.Global
    );

    // Update cloud provider settings
    config.update(
      "cloudProvider",
      settings.cloudProvider,
      vscode.ConfigurationTarget.Global
    );

    // AWS settings
    config.update(
      "aws.accessKeyId",
      settings.aws.accessKeyId,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "aws.secretAccessKey",
      settings.aws.secretAccessKey,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "aws.region",
      settings.aws.region,
      vscode.ConfigurationTarget.Global
    );

    // Azure settings
    config.update(
      "azure.tenantId",
      settings.azure.tenantId,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "azure.clientId",
      settings.azure.clientId,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "azure.clientSecret",
      settings.azure.clientSecret,
      vscode.ConfigurationTarget.Global
    );

    // GCP settings
    config.update(
      "gcp.projectId",
      settings.gcp.projectId,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      "gcp.keyFilePath",
      settings.gcp.keyFilePath,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage("Rootsy settings saved successfully!");
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = "Rootsy Settings";
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the current settings
    const config = vscode.workspace.getConfiguration("rootsy");

    // LLM provider settings
    const currentProvider = config.get("llmProvider", "openai") as string;
    const currentOpenAIApiKey = config.get("openai.apiKey", "");
    const currentAnthropicApiKey = config.get("anthropic.apiKey", "");
    const currentOllamaEndpoint = config.get(
      "ollamaEndpoint",
      "http://localhost:11434"
    );
    const currentOllamaModel = config.get("ollamaModel", "llama3");

    // Cloud provider settings
    const currentCloudProvider = config.get("cloudProvider", "aws") as string;

    // AWS settings
    const currentAwsAccessKeyId = config.get("aws.accessKeyId", "");
    const currentAwsSecretAccessKey = config.get("aws.secretAccessKey", "");
    const currentAwsRegion = config.get("aws.region", "us-east-1") as string;

    // Azure settings
    const currentAzureTenantId = config.get("azure.tenantId", "");
    const currentAzureClientId = config.get("azure.clientId", "");
    const currentAzureClientSecret = config.get("azure.clientSecret", "");

    // GCP settings
    const currentGcpProjectId = config.get("gcp.projectId", "");
    const currentGcpKeyFilePath = config.get("gcp.keyFilePath", "");

    // Create the HTML content
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rootsy Settings</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
            }
            h1 {
                color: var(--vscode-editor-foreground);
                font-size: 24px;
                margin-bottom: 20px;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            select, input {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 2px;
            }
            button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 2px;
                margin-top: 10px;
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .provider-specific {
                margin-top: 10px;
                padding: 10px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                display: none;
            }
            .description {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-top: 4px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Rootsy Settings</h1>
            <div class="form-group">
                <label for="llmProvider">LLM Provider</label>
                <select id="llmProvider">
                    <option value="openai" ${
                      currentProvider === "openai" ? "selected" : ""
                    }>OpenAI</option>
                    <option value="anthropic" ${
                      currentProvider === "anthropic" ? "selected" : ""
                    }>Anthropic</option>
                    <option value="ollama" ${
                      currentProvider === "ollama" ? "selected" : ""
                    }>Ollama (Local)</option>
                </select>
                <div class="description">Select the LLM provider to use for root cause analysis</div>
            </div>
            
            <div id="openaiSection" class="provider-specific">
               <div class="form-group" style="padding-right: 20px;">
                   <label for="openaiApiKey">OpenAI API Key</label>
                   <input type="password" id="openaiApiKey" value="${currentOpenAIApiKey}" />
                   <div class="description">API key for OpenAI</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="openaiModel">OpenAI Model</label>
                   <select id="openaiModel">
                       <option value="gpt-4o" ${
                         config.get("openai.model") === "gpt-4o"
                           ? "selected"
                           : ""
                       }>GPT-4o</option>
                       <option value="gpt-4-turbo" ${
                         config.get("openai.model") === "gpt-4-turbo"
                           ? "selected"
                           : ""
                       }>GPT-4 Turbo</option>
                       <option value="gpt-4" ${
                         config.get("openai.model") === "gpt-4"
                           ? "selected"
                           : ""
                       }>GPT-4</option>
                       <option value="gpt-3.5-turbo" ${
                         config.get("openai.model") === "gpt-3.5-turbo"
                           ? "selected"
                           : ""
                       }>GPT-3.5 Turbo</option>
                   </select>
                   <div class="description">Select the OpenAI model to use</div>
               </div>
           </div>
           
           <div id="anthropicSection" class="provider-specific">
               <div class="form-group" style="padding-right: 20px;">
                   <label for="anthropicApiKey">Anthropic API Key</label>
                   <input type="password" id="anthropicApiKey" value="${currentAnthropicApiKey}" />
                   <div class="description">API key for Anthropic</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="anthropicModel">Anthropic Model</label>
                   <select id="anthropicModel">
                       <option value="claude-3-opus" ${
                         config.get("anthropic.model") === "claude-3-opus"
                           ? "selected"
                           : ""
                       }>Claude 3 Opus</option>
                       <option value="claude-3-sonnet" ${
                         config.get("anthropic.model") === "claude-3-sonnet"
                           ? "selected"
                           : ""
                       }>Claude 3 Sonnet</option>
                       <option value="claude-3-haiku" ${
                         config.get("anthropic.model") === "claude-3-haiku"
                           ? "selected"
                           : ""
                       }>Claude 3 Haiku</option>
                   </select>
                   <div class="description">Select the Anthropic model to use</div>
               </div>
           </div>
           
           <div id="ollamaSection" class="provider-specific">
               <div class="form-group" style="padding-right: 20px;">
                   <label for="ollamaEndpoint">Ollama Endpoint</label>
                   <input type="text" id="ollamaEndpoint" value="${currentOllamaEndpoint}" />
                   <div class="description">Endpoint URL for Ollama</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="ollamaModel">Ollama Model</label>
                   <input type="text" id="ollamaModel" value="${currentOllamaModel}" />
                   <div class="description">Model to use with Ollama</div>
               </div>
           </div>
           
           <h2 style="margin-top: 30px; margin-bottom: 15px;">Cloud Provider Settings</h2>
           
           <div class="form-group">
               <label for="cloudProvider">Cloud Provider</label>
               <select id="cloudProvider">
                   <option value="aws" ${
                     currentCloudProvider === "aws" ? "selected" : ""
                   }>AWS</option>
                   <option value="azure" ${
                     currentCloudProvider === "azure" ? "selected" : ""
                   }>Azure</option>
                   <option value="gcp" ${
                     currentCloudProvider === "gcp" ? "selected" : ""
                   }>Google Cloud (GCP)</option>
               </select>
               <div class="description">Select the cloud provider to pull logs from</div>
           </div>
           
           <div id="awsSection" class="provider-specific">
               <div class="form-group" style="padding-right: 20px;">
                   <label for="awsAccessKeyId">AWS Access Key ID</label>
                   <input type="password" id="awsAccessKeyId" value="${currentAwsAccessKeyId}" />
                   <div class="description">Your AWS Access Key ID</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="awsSecretAccessKey">AWS Secret Access Key</label>
                   <input type="password" id="awsSecretAccessKey" value="${currentAwsSecretAccessKey}" />
                   <div class="description">Your AWS Secret Access Key</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="awsRegion">AWS Region</label>
                   <select id="awsRegion">
                       <option value="us-east-1" ${
                         currentAwsRegion == "us-east-1" ? "selected" : ""
                       }>US East (N. Virginia)</option>
                       <option value="us-east-2" ${
                         currentAwsRegion == "us-east-2" ? "selected" : ""
                       }>US East (Ohio)</option>
                       <option value="us-west-1" ${
                         currentAwsRegion == "us-west-1" ? "selected" : ""
                       }>US West (N. California)</option>
                       <option value="us-west-2" ${
                         currentAwsRegion == "us-west-2" ? "selected" : ""
                       }>US West (Oregon)</option>
                       <option value="af-south-1" ${
                         currentAwsRegion == "af-south-1" ? "selected" : ""
                       }>Africa (Cape Town)</option>
                       <option value="ap-east-1" ${
                         currentAwsRegion == "ap-east-1" ? "selected" : ""
                       }>Asia Pacific (Hong Kong)</option>
                       <option value="ap-south-1" ${
                         currentAwsRegion == "ap-south-1" ? "selected" : ""
                       }>Asia Pacific (Mumbai)</option>
                       <option value="ap-northeast-1" ${
                         currentAwsRegion == "ap-northeast-1" ? "selected" : ""
                       }>Asia Pacific (Tokyo)</option>
                       <option value="ap-northeast-2" ${
                         currentAwsRegion == "ap-northeast-2" ? "selected" : ""
                       }>Asia Pacific (Seoul)</option>
                       <option value="ap-northeast-3" ${
                         currentAwsRegion == "ap-northeast-3" ? "selected" : ""
                       }>Asia Pacific (Osaka)</option>
                       <option value="ap-southeast-1" ${
                         currentAwsRegion == "ap-southeast-1" ? "selected" : ""
                       }>Asia Pacific (Singapore)</option>
                       <option value="ap-southeast-2" ${
                         currentAwsRegion == "ap-southeast-2" ? "selected" : ""
                       }>Asia Pacific (Sydney)</option>
                       <option value="ca-central-1" ${
                         currentAwsRegion == "ca-central-1" ? "selected" : ""
                       }>Canada (Central)</option>
                       <option value="eu-central-1" ${
                         currentAwsRegion == "eu-central-1" ? "selected" : ""
                       }>Europe (Frankfurt)</option>
                       <option value="eu-west-1" ${
                         currentAwsRegion == "eu-west-1" ? "selected" : ""
                       }>Europe (Ireland)</option>
                       <option value="eu-west-2" ${
                         currentAwsRegion == "eu-west-2" ? "selected" : ""
                       }>Europe (London)</option>
                       <option value="eu-west-3" ${
                         currentAwsRegion == "eu-west-3" ? "selected" : ""
                       }>Europe (Paris)</option>
                       <option value="eu-north-1" ${
                         currentAwsRegion == "eu-north-1" ? "selected" : ""
                       }>Europe (Stockholm)</option>
                       <option value="eu-south-1" ${
                         currentAwsRegion == "eu-south-1" ? "selected" : ""
                       }>Europe (Milan)</option>
                       <option value="me-south-1" ${
                         currentAwsRegion == "me-south-1" ? "selected" : ""
                       }>Middle East (Bahrain)</option>
                       <option value="sa-east-1" ${
                         currentAwsRegion == "sa-east-1" ? "selected" : ""
                       }>South America (São Paulo)</option>
                   </select>
                   <div class="description">Select your AWS Region</div>
               </div>
           </div>
           
           <div id="azureSection" class="provider-specific">
               <div class="form-group" style="padding-right: 20px;">
                   <label for="azureTenantId">Azure Tenant ID</label>
                   <input type="text" id="azureTenantId" value="${currentAzureTenantId}" />
                   <div class="description">Your Azure Tenant ID</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="azureClientId">Azure Client ID</label>
                   <input type="text" id="azureClientId" value="${currentAzureClientId}" />
                   <div class="description">Your Azure Client ID</div>
               </div>
               <div class="form-group" style="padding-right: 20px;">
                   <label for="azureClientSecret">Azure Client Secret</label>
                   <input type="password" id="azureClientSecret" value="${currentAzureClientSecret}" />
                   <div class="description">Your Azure Client Secret</div>
               </div>
           </div>
           
           <div id="gcpSection" class="provider-specific">
               <div class="form-group" style="padding-right: 20px;">
                   <label for="gcpProjectId">GCP Project ID</label>
                   <input type="text" id="gcpProjectId" value="${currentGcpProjectId}" />
                   <div class="description">Your Google Cloud Project ID</div>
               </div>
               <div class="form-group" style="padding-right: 0;">
                   <label for="gcpKeyFilePath">GCP Key File Path</label>
                   <input type="text" id="gcpKeyFilePath" value="${currentGcpKeyFilePath}" />
                   <div class="description">Path to your Google Cloud service account key file (JSON)</div>
               </div>
           </div>
           
           <button id="saveButton">Save Settings</button>
        </div>

        <script>
            (function() {
                const vscode = acquireVsCodeApi();
                
                // LLM provider elements
                const llmProviderSelect = document.getElementById('llmProvider');
                const openaiSection = document.getElementById('openaiSection');
                const anthropicSection = document.getElementById('anthropicSection');
                const ollamaSection = document.getElementById('ollamaSection');
                
                // Cloud provider elements
                const cloudProviderSelect = document.getElementById('cloudProvider');
                const awsSection = document.getElementById('awsSection');
                const azureSection = document.getElementById('azureSection');
                const gcpSection = document.getElementById('gcpSection');
                
                const saveButton = document.getElementById('saveButton');
                
                // Function to update UI based on selected LLM provider
                function updateLlmProviderUI() {
                    const selectedProvider = llmProviderSelect.value;
                    
                    // Hide all provider sections
                    openaiSection.style.display = 'none';
                    anthropicSection.style.display = 'none';
                    ollamaSection.style.display = 'none';
                    
                    // Show the selected provider section
                    if (selectedProvider === "openai") {
                        openaiSection.style.display = 'block';
                    } else if (selectedProvider === "anthropic") {
                        anthropicSection.style.display = 'block';
                    } else if (selectedProvider === "ollama") {
                        ollamaSection.style.display = 'block';
                    }
                }
                
                // Function to update UI based on selected cloud provider
                function updateCloudProviderUI() {
                    const selectedProvider = cloudProviderSelect.value;
                    
                    // Hide all cloud provider sections
                    awsSection.style.display = 'none';
                    azureSection.style.display = 'none';
                    gcpSection.style.display = 'none';
                    
                    // Show the selected provider section
                    if (selectedProvider === "aws") {
                        awsSection.style.display = 'block';
                    } else if (selectedProvider === "azure") {
                        azureSection.style.display = 'block';
                    } else if (selectedProvider === "gcp") {
                        gcpSection.style.display = 'block';
                    }
                }
                
                // Initialize UI
                updateLlmProviderUI();
                updateCloudProviderUI();
                
                // Add event listeners
                llmProviderSelect.addEventListener('change', updateLlmProviderUI);
                cloudProviderSelect.addEventListener('change', updateCloudProviderUI);
                
                saveButton.addEventListener('click', () => {
                    // Collect settings
                    const settings = {
                        // LLM provider settings
                        llmProvider: llmProviderSelect.value,
                        openai: {
                            apiKey: document.getElementById('openaiApiKey').value,
                            model: document.getElementById('openaiModel').value
                        },
                        anthropic: {
                            apiKey: document.getElementById('anthropicApiKey').value,
                            model: document.getElementById('anthropicModel').value
                        },
                        ollamaEndpoint: document.getElementById('ollamaEndpoint').value,
                        ollamaModel: document.getElementById('ollamaModel').value,
                        
                        // Cloud provider settings
                        cloudProvider: cloudProviderSelect.value,
                        
                        // AWS settings
                        aws: {
                            accessKeyId: document.getElementById('awsAccessKeyId').value,
                            secretAccessKey: document.getElementById('awsSecretAccessKey').value,
                            region: document.getElementById('awsRegion').value
                        },
                        
                        // Azure settings
                        azure: {
                            tenantId: document.getElementById('azureTenantId').value,
                            clientId: document.getElementById('azureClientId').value,
                            clientSecret: document.getElementById('azureClientSecret').value
                        },
                        
                        // GCP settings
                        gcp: {
                            projectId: document.getElementById('gcpProjectId').value,
                            keyFilePath: document.getElementById('gcpKeyFilePath').value
                        }
                    };
                    
                    // Send message to extension
                    vscode.postMessage({
                        command: 'saveSettings',
                        settings: settings
                    });
                });
            })();
        </script>
    </body>
    </html>`;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "rootsy" is now active!');

  // Initialize the storage manager
  try {
    storageManager = new StorageManager(context);
    await storageManager.initialize();
    console.log("Storage manager initialized successfully");
    
    // Initialize webview provider
    webviewProvider = new RootsyWebviewProvider(context.extensionUri, storageManager);
    
    // Register webview provider
    const webviewView = vscode.window.registerWebviewViewProvider(
      RootsyWebviewProvider.viewType,
      webviewProvider
    );
    
    context.subscriptions.push(webviewView);
    
  } catch (error) {
    console.error("Failed to initialize storage manager:", error);
    vscode.window.showErrorMessage(
      `Failed to initialize Rootsy: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const helloWorldCommand = vscode.commands.registerCommand(
    "rootsy.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("I am a new extension");
    }
  );

  // Register the command to open the settings panel
  const openSettingsCommand = vscode.commands.registerCommand(
    "rootsy.openSettings",
    () => {
      SettingsPanel.createOrShow(context.extensionUri);
    }
  );

  context.subscriptions.push(helloWorldCommand, openSettingsCommand);
}

/**
 * Generates mock logs for testing
 */
function generateMockLogs(sessionId: string, errorLogsOnly: boolean): any[] {
  const logs = [];
  const now = Date.now();
  const services = ['lambda', 'api-gateway', 'dynamodb', 's3'];
  const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  
  // Generate some mock logs
  for (let i = 0; i < 20; i++) {
    const isError = Math.random() < 0.3;
    const logLevel = isError ? 'ERROR' : logLevels[Math.floor(Math.random() * logLevels.length)];
    
    if (errorLogsOnly && logLevel !== 'ERROR') {
      continue;
    }
    
    const service = services[Math.floor(Math.random() * services.length)];
    const timestamp = now - Math.floor(Math.random() * 86400000); // Random time in the last 24 hours
    
    let logContent = '';
    if (logLevel === 'ERROR') {
      logContent = `[${logLevel}] Error processing request: Connection timeout or resource not found`;
    } else if (logLevel === 'WARN') {
      logContent = `[${logLevel}] Slow response time detected for request`;
    } else {
      logContent = `[${logLevel}] Request processed successfully`;
    }
    
    logs.push({
      id: uuidv4(),
      sessionId,
      logContent,
      timestamp,
      service,
      logLevel
    });
  }
  
  // Sort by timestamp
  logs.sort((a, b) => a.timestamp - b.timestamp);
  
  return logs;
}

// This method is called when your extension is deactivated
export async function deactivate() {
  // Close the database connection
  if (storageManager) {
    try {
      await storageManager.close();
      console.log("Storage manager closed successfully");
    } catch (error) {
      console.error("Error closing storage manager:", error);
    }
  }
}
