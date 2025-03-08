import { Database } from "./database";
import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";

/**
 * Interface for a debugging session
 */
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  cloudProvider: string;
  startTime: number;
  endTime: number;
  status: "new" | "in_progress" | "completed";
}

/**
 * Interface for a log entry
 */
export interface Log {
  id: string;
  sessionId: string;
  logContent: string;
  timestamp: number;
  service?: string;
  logLevel?: string;
  groupId?: string;
}

/**
 * Interface for a log group
 */
export interface LogGroup {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  rootCause?: string;
  suggestedFix?: string;
  status: "new" | "analyzing" | "analyzed" | "resolved";
}

/**
 * StorageManager class for managing sessions, logs, and log groups
 */
export class StorageManager {
  private db: Database;
  private currentSession: Session | null = null;

  /**
   * Creates a new StorageManager instance
   * @param context The extension context
   */
  constructor(context: vscode.ExtensionContext) {
    this.db = new Database(context);
  }
  
  /**
   * Gets the current active session
   * @returns The current session or null if none is active
   */
  public getCurrentSession(): Session | null {
    return this.currentSession;
  }
  
  /**
   * Sets the current active session
   * @param sessionId The ID of the session to set as active
   * @returns The session that was set as active, or null if not found
   */
  public async setCurrentSession(sessionId: string): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (session) {
      this.currentSession = session;
      return session;
    }
    return null;
  }

  /**
   * Initializes the storage manager
   * @returns A promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    await this.db.initialize();
  }

  /**
   * Creates a new debugging session
   * @param name The name of the session
   * @param cloudProvider The cloud provider for the session
   * @param startTime The start time for log fetching
   * @param endTime The end time for log fetching
   * @returns The created session
   */
  public async createSession(
    name: string,
    cloudProvider: string,
    startTime: number,
    endTime: number
  ): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: uuidv4(),
      name,
      createdAt: now,
      updatedAt: now,
      cloudProvider,
      startTime,
      endTime,
      status: "new",
    };

    await this.db.run(
      `INSERT INTO sessions (id, name, created_at, updated_at, cloud_provider, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.name,
        session.createdAt,
        session.updatedAt,
        session.cloudProvider,
        session.startTime,
        session.endTime,
        session.status,
      ]
    );

    return session;
  }

  /**
   * Gets a session by ID
   * @param id The session ID
   * @returns The session or undefined if not found
   */
  public async getSession(id: string): Promise<Session | undefined> {
    const row = await this.db.get<any>(
      `SELECT id, name, created_at as createdAt, updated_at as updatedAt, 
              cloud_provider as cloudProvider, start_time as startTime, 
              end_time as endTime, status
       FROM sessions
       WHERE id = ?`,
      [id]
    );

    return row as Session | undefined;
  }

  /**
   * Gets all sessions
   * @returns An array of sessions
   */
  public async getAllSessions(): Promise<Session[]> {
    const rows = await this.db.all<any>(
      `SELECT id, name, created_at as createdAt, updated_at as updatedAt, 
              cloud_provider as cloudProvider, start_time as startTime, 
              end_time as endTime, status
       FROM sessions
       ORDER BY updated_at DESC`
    );

    return rows as Session[];
  }

  /**
   * Updates a session
   * @param session The session to update
   * @returns The updated session
   */
  public async updateSession(session: Session): Promise<Session> {
    session.updatedAt = Date.now();

    await this.db.run(
      `UPDATE sessions
       SET name = ?, updated_at = ?, cloud_provider = ?, 
           start_time = ?, end_time = ?, status = ?
       WHERE id = ?`,
      [
        session.name,
        session.updatedAt,
        session.cloudProvider,
        session.startTime,
        session.endTime,
        session.status,
        session.id,
      ]
    );

    return session;
  }

  /**
   * Deletes a session and all associated logs and log groups
   * @param id The session ID
   * @returns A promise that resolves when the session is deleted
   */
  public async deleteSession(id: string): Promise<void> {
    // Delete logs
    await this.db.run("DELETE FROM logs WHERE session_id = ?", [id]);

    // Delete log groups
    await this.db.run("DELETE FROM log_groups WHERE session_id = ?", [id]);

    // Delete session
    await this.db.run("DELETE FROM sessions WHERE id = ?", [id]);
  }

  /**
   * Saves logs to the database
   * @param logs The logs to save
   * @returns A promise that resolves when the logs are saved
   */
  public async saveLogs(logs: Log[]): Promise<void> {
    // Use a transaction for better performance
    await this.db.run("BEGIN TRANSACTION");

    try {
      for (const log of logs) {
        await this.db.run(
          `INSERT INTO logs (id, session_id, log_content, timestamp, service, log_level, group_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            log.id,
            log.sessionId,
            log.logContent,
            log.timestamp,
            log.service || null,
            log.logLevel || null,
            log.groupId || null,
          ]
        );
      }

      await this.db.run("COMMIT");
    } catch (error) {
      await this.db.run("ROLLBACK");
      throw error;
    }
  }

  /**
   * Gets logs for a session
   * @param sessionId The session ID
   * @returns An array of logs
   */
  public async getSessionLogs(sessionId: string): Promise<Log[]> {
    const rows = await this.db.all<any>(
      `SELECT id, session_id as sessionId, log_content as logContent, 
              timestamp, service, log_level as logLevel, group_id as groupId
       FROM logs
       WHERE session_id = ?
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    return rows as Log[];
  }

  /**
   * Creates a log group
   * @param sessionId The session ID
   * @param name The group name
   * @param description The group description
   * @returns The created log group
   */
  public async createLogGroup(
    sessionId: string,
    name: string,
    description?: string
  ): Promise<LogGroup> {
    const logGroup: LogGroup = {
      id: uuidv4(),
      sessionId,
      name,
      description,
      status: "new",
    };

    await this.db.run(
      `INSERT INTO log_groups (id, session_id, name, description, root_cause, suggested_fix, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logGroup.id,
        logGroup.sessionId,
        logGroup.name,
        logGroup.description || null,
        logGroup.rootCause || null,
        logGroup.suggestedFix || null,
        logGroup.status,
      ]
    );

    return logGroup;
  }

  /**
   * Gets a log group by ID
   * @param id The log group ID
   * @returns The log group or undefined if not found
   */
  public async getLogGroup(id: string): Promise<LogGroup | undefined> {
    const row = await this.db.get<any>(
      `SELECT id, session_id as sessionId, name, description, 
              root_cause as rootCause, suggested_fix as suggestedFix, status
       FROM log_groups
       WHERE id = ?`,
      [id]
    );

    return row as LogGroup | undefined;
  }

  /**
   * Gets all log groups for a session
   * @param sessionId The session ID
   * @returns An array of log groups
   */
  public async getSessionLogGroups(sessionId: string): Promise<LogGroup[]> {
    const rows = await this.db.all<any>(
      `SELECT id, session_id as sessionId, name, description, 
              root_cause as rootCause, suggested_fix as suggestedFix, status
       FROM log_groups
       WHERE session_id = ?
       ORDER BY name ASC`,
      [sessionId]
    );

    return rows as LogGroup[];
  }

  /**
   * Updates a log group
   * @param logGroup The log group to update
   * @returns The updated log group
   */
  public async updateLogGroup(logGroup: LogGroup): Promise<LogGroup> {
    await this.db.run(
      `UPDATE log_groups
       SET name = ?, description = ?, root_cause = ?, suggested_fix = ?, status = ?
       WHERE id = ?`,
      [
        logGroup.name,
        logGroup.description || null,
        logGroup.rootCause || null,
        logGroup.suggestedFix || null,
        logGroup.status,
        logGroup.id,
      ]
    );

    return logGroup;
  }

  /**
   * Assigns logs to a log group
   * @param groupId The log group ID
   * @param logIds The log IDs to assign to the group
   * @returns A promise that resolves when the logs are assigned
   */
  public async assignLogsToGroup(
    groupId: string,
    logIds: string[]
  ): Promise<void> {
    await this.db.run("BEGIN TRANSACTION");

    try {
      for (const logId of logIds) {
        await this.db.run("UPDATE logs SET group_id = ? WHERE id = ?", [
          groupId,
          logId,
        ]);
      }

      await this.db.run("COMMIT");
    } catch (error) {
      await this.db.run("ROLLBACK");
      throw error;
    }
  }

  /**
   * Gets logs for a log group
   * @param groupId The log group ID
   * @returns An array of logs
   */
  public async getGroupLogs(groupId: string): Promise<Log[]> {
    const rows = await this.db.all<any>(
      `SELECT id, session_id as sessionId, log_content as logContent, 
              timestamp, service, log_level as logLevel, group_id as groupId
       FROM logs
       WHERE group_id = ?
       ORDER BY timestamp ASC`,
      [groupId]
    );

    return rows as Log[];
  }

  /**
   * Closes the database connection
   * @returns A promise that resolves when the connection is closed
   */
  public async close(): Promise<void> {
    await this.db.close();
  }
}
