// Mock implementation of vscode module for testing
export class EventEmitter<T> {
  private listeners: ((e: T) => any)[] = [];

  public event = (listener: (e: T) => any): { dispose: () => void } => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      },
    };
  };

  public fire(event: T): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export interface Uri {
  fsPath: string;
}

export const Uri = {
  file: (path: string): Uri => ({ fsPath: path }),
};

export const workspace = {
  fs: {
    createDirectory: async () => {},
    readFile: async () => new Uint8Array(),
    writeFile: async () => {},
  },
  getConfiguration: () => ({
    get: (key: string, defaultValue: any) => defaultValue,
    has: () => true,
    update: async () => {},
  }),
};

export const window = {
  createWebviewPanel: () => ({
    webview: {
      html: "",
      onDidReceiveMessage: () => ({ dispose: () => {} }),
    },
    onDidDispose: () => ({ dispose: () => {} }),
    onDidChangeViewState: () => ({ dispose: () => {} }),
    reveal: () => {},
    dispose: () => {},
  }),
  showInformationMessage: () => {},
  showErrorMessage: () => {},
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => {},
};

export interface ExtensionContext {
  subscriptions: { dispose(): any }[];
  globalStoragePath: string;
  extensionPath?: string;
  extensionUri?: Uri;
  environmentVariableCollection?: any;
  extensionMode?: ExtensionMode;
  logPath?: string;
  storageUri?: Uri;
  globalStorageUri?: Uri;
  asAbsolutePath?: (relativePath: string) => string;
  workspaceState?: any;
  globalState?: any;
  secrets?: any;
  extension?: any;
  logUri?: Uri;
  storagePath?: string;
  languageModelAccessInformation?: any;
}

export interface SecretStorageChangeEvent {
  key: string;
}

export interface Disposable {
  dispose(): any;
}

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

// Export everything as a default export to match vscode module structure
export default {
  EventEmitter,
  ExtensionMode,
  Uri,
  workspace,
  window,
  commands,
  ConfigurationTarget,
};
