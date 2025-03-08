import * as sqlite3 from "sqlite3";
import * as path from "path";
import * as vscode from "vscode";
import { promisify } from "util";

/**
 * Database class for managing SQLite connections and operations
 */
export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  /**
   * Creates a new Database instance
   * @param context The extension context used to get the storage path
   */
  constructor(context: vscode.ExtensionContext) {
    this.dbPath = path.join(context.globalStoragePath, "rootsy.db");
  }

  /**
   * Initializes the database connection and creates tables if they don't exist
   * @returns A promise that resolves when the database is initialized
   */
  public async initialize(): Promise<void> {
    // Ensure the directory exists
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.file(path.dirname(this.dbPath))
    );

    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`));
          return;
        }

        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Creates the necessary tables in the database
   * @returns A promise that resolves when the tables are created
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const exec = promisify(this.db.exec.bind(this.db));

    // Create sessions table
    await exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        cloud_provider TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        status TEXT NOT NULL
      )
    `);

    // Create logs table
    await exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        log_content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        service TEXT,
        log_level TEXT,
        group_id TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
      )
    `);

    // Create log_groups table
    await exec(`
      CREATE TABLE IF NOT EXISTS log_groups (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        root_cause TEXT,
        suggested_fix TEXT,
        status TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
      )
    `);
  }

  /**
   * Executes a SQL query with parameters
   * @param sql The SQL query to execute
   * @param params The parameters for the query
   * @returns A promise that resolves with the result of the query
   */
  public async run(
    sql: string,
    params: any[] = []
  ): Promise<sqlite3.RunResult> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise<sqlite3.RunResult>((resolve, reject) => {
      this.db!.run(sql, params, function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  /**
   * Gets a single row from the database
   * @param sql The SQL query to execute
   * @param params The parameters for the query
   * @returns A promise that resolves with the first row or undefined if no rows match
   */
  public async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise<T | undefined>((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row as T | undefined);
      });
    });
  }

  /**
   * Gets all rows from the database that match the query
   * @param sql The SQL query to execute
   * @param params The parameters for the query
   * @returns A promise that resolves with an array of rows
   */
  public async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise<T[]>((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as T[]);
      });
    });
  }

  /**
   * Closes the database connection
   * @returns A promise that resolves when the connection is closed
   */
  public async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.db = null;
        resolve();
      });
    });
  }
}
