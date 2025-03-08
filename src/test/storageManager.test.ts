import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as sinon from "sinon";
import {
  StorageManager,
  Session,
  Log,
  LogGroup,
} from "../storage/storageManager";
import { EventEmitter } from "vscode";

// Mock VSCode namespace for testing
const mockVscode = {
  workspace: {
    fs: {
      createDirectory: sinon.stub().resolves(),
    },
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
  EventEmitter: EventEmitter,
  ExtensionMode: { Test: 1 },
  SecretStorageChangeEvent: Object,
};

// Replace the actual vscode with our mock for testing
(global as any).vscode = mockVscode;

suite("StorageManager Test Suite", () => {
  let storageManager: StorageManager;
  let context: vscode.ExtensionContext;
  let tempDbPath: string;

  setup(async () => {
    // Create a mock extension context
    tempDbPath = path.join(__dirname, "temp-test.db");

    // Remove the test database if it exists
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }

    // Create a simplified mock extension context with just what we need for the database
    context = {
      globalStoragePath: path.dirname(tempDbPath),
      subscriptions: [],
    } as any;

    // Our mock already has the createDirectory stub
    const createDirectoryStub = mockVscode.workspace.fs.createDirectory;

    // Initialize the storage manager
    storageManager = new StorageManager(context);
    await storageManager.initialize();

    // Restore the stub
    createDirectoryStub.restore();
  });

  teardown(async () => {
    // Close the database connection
    await storageManager.close();

    // Remove the test database
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  test("Should create and retrieve a session", async () => {
    const now = Date.now();
    const sessionName = "Test Session";
    const cloudProvider = "aws";
    const startTime = now - 86400000; // 1 day ago
    const endTime = now;

    // Create a session
    const session = await storageManager.createSession(
      sessionName,
      cloudProvider,
      startTime,
      endTime
    );

    // Verify session properties
    assert.strictEqual(session.name, sessionName);
    assert.strictEqual(session.cloudProvider, cloudProvider);
    assert.strictEqual(session.startTime, startTime);
    assert.strictEqual(session.endTime, endTime);
    assert.strictEqual(session.status, "new");

    // Retrieve the session
    const retrievedSession = await storageManager.getSession(session.id);

    // Verify retrieved session
    assert.ok(retrievedSession);
    assert.strictEqual(retrievedSession?.id, session.id);
    assert.strictEqual(retrievedSession?.name, sessionName);
    assert.strictEqual(retrievedSession?.cloudProvider, cloudProvider);
    assert.strictEqual(retrievedSession?.startTime, startTime);
    assert.strictEqual(retrievedSession?.endTime, endTime);
    assert.strictEqual(retrievedSession?.status, "new");
  });

  test("Should update a session", async () => {
    // Create a session
    const session = await storageManager.createSession(
      "Original Name",
      "aws",
      Date.now() - 86400000,
      Date.now()
    );

    // Update the session
    const updatedName = "Updated Name";
    session.name = updatedName;
    session.status = "in_progress";

    await storageManager.updateSession(session);

    // Retrieve the updated session
    const retrievedSession = await storageManager.getSession(session.id);

    // Verify updated session
    assert.ok(retrievedSession);
    assert.strictEqual(retrievedSession?.name, updatedName);
    assert.strictEqual(retrievedSession?.status, "in_progress");
  });

  test("Should get all sessions", async () => {
    // Create multiple sessions
    const now = Date.now();
    await storageManager.createSession("Session 1", "aws", now - 86400000, now);
    await storageManager.createSession(
      "Session 2",
      "azure",
      now - 86400000,
      now
    );

    // Get all sessions
    const sessions = await storageManager.getAllSessions();

    // Verify sessions
    assert.strictEqual(sessions.length, 2);
    assert.ok(
      sessions.some((s) => s.name === "Session 1" && s.cloudProvider === "aws")
    );
    assert.ok(
      sessions.some(
        (s) => s.name === "Session 2" && s.cloudProvider === "azure"
      )
    );
  });

  test("Should delete a session", async () => {
    // Create a session
    const session = await storageManager.createSession(
      "Session to Delete",
      "aws",
      Date.now() - 86400000,
      Date.now()
    );

    // Delete the session
    await storageManager.deleteSession(session.id);

    // Try to retrieve the deleted session
    const retrievedSession = await storageManager.getSession(session.id);

    // Verify session is deleted
    assert.strictEqual(retrievedSession, undefined);
  });

  test("Should save and retrieve logs", async () => {
    // Create a session
    const session = await storageManager.createSession(
      "Log Test Session",
      "aws",
      Date.now() - 86400000,
      Date.now()
    );

    // Create logs
    const logs: Log[] = [
      {
        id: "log-1",
        sessionId: session.id,
        logContent: "Error in service A",
        timestamp: Date.now(),
        service: "ServiceA",
        logLevel: "error",
      },
      {
        id: "log-2",
        sessionId: session.id,
        logContent: "Warning in service B",
        timestamp: Date.now(),
        service: "ServiceB",
        logLevel: "warning",
      },
    ];

    // Save logs
    await storageManager.saveLogs(logs);

    // Retrieve logs
    const retrievedLogs = await storageManager.getSessionLogs(session.id);

    // Verify logs
    assert.strictEqual(retrievedLogs.length, 2);
    assert.ok(
      retrievedLogs.some((l) => l.id === "log-1" && l.service === "ServiceA")
    );
    assert.ok(
      retrievedLogs.some((l) => l.id === "log-2" && l.service === "ServiceB")
    );
  });

  test("Should create and retrieve log groups", async () => {
    // Create a session
    const session = await storageManager.createSession(
      "Group Test Session",
      "aws",
      Date.now() - 86400000,
      Date.now()
    );

    // Create a log group
    const groupName = "Error Group";
    const groupDescription = "Group of error logs";
    const logGroup = await storageManager.createLogGroup(
      session.id,
      groupName,
      groupDescription
    );

    // Verify log group properties
    assert.strictEqual(logGroup.name, groupName);
    assert.strictEqual(logGroup.description, groupDescription);
    assert.strictEqual(logGroup.sessionId, session.id);
    assert.strictEqual(logGroup.status, "new");

    // Retrieve the log group
    const retrievedGroup = await storageManager.getLogGroup(logGroup.id);

    // Verify retrieved log group
    assert.ok(retrievedGroup);
    assert.strictEqual(retrievedGroup?.id, logGroup.id);
    assert.strictEqual(retrievedGroup?.name, groupName);
    assert.strictEqual(retrievedGroup?.description, groupDescription);
    assert.strictEqual(retrievedGroup?.sessionId, session.id);
    assert.strictEqual(retrievedGroup?.status, "new");
  });

  test("Should update a log group", async () => {
    // Create a session
    const session = await storageManager.createSession(
      "Update Group Session",
      "aws",
      Date.now() - 86400000,
      Date.now()
    );

    // Create a log group
    const logGroup = await storageManager.createLogGroup(
      session.id,
      "Original Group Name"
    );

    // Update the log group
    const updatedName = "Updated Group Name";
    const rootCause = "Database connection timeout";
    const suggestedFix = "Increase connection timeout setting";

    logGroup.name = updatedName;
    logGroup.rootCause = rootCause;
    logGroup.suggestedFix = suggestedFix;
    logGroup.status = "analyzed";

    await storageManager.updateLogGroup(logGroup);

    // Retrieve the updated log group
    const retrievedGroup = await storageManager.getLogGroup(logGroup.id);

    // Verify updated log group
    assert.ok(retrievedGroup);
    assert.strictEqual(retrievedGroup?.name, updatedName);
    assert.strictEqual(retrievedGroup?.rootCause, rootCause);
    assert.strictEqual(retrievedGroup?.suggestedFix, suggestedFix);
    assert.strictEqual(retrievedGroup?.status, "analyzed");
  });

  test("Should assign logs to a group", async () => {
    // Create a session
    const session = await storageManager.createSession(
      "Assign Logs Session",
      "aws",
      Date.now() - 86400000,
      Date.now()
    );

    // Create logs
    const logs: Log[] = [
      {
        id: "assign-log-1",
        sessionId: session.id,
        logContent: "Error in service A",
        timestamp: Date.now(),
        service: "ServiceA",
        logLevel: "error",
      },
      {
        id: "assign-log-2",
        sessionId: session.id,
        logContent: "Error in service A again",
        timestamp: Date.now(),
        service: "ServiceA",
        logLevel: "error",
      },
    ];

    // Save logs
    await storageManager.saveLogs(logs);

    // Create a log group
    const logGroup = await storageManager.createLogGroup(
      session.id,
      "Service A Errors"
    );

    // Assign logs to the group
    await storageManager.assignLogsToGroup(
      logGroup.id,
      logs.map((l) => l.id)
    );

    // Get logs for the group
    const groupLogs = await storageManager.getGroupLogs(logGroup.id);

    // Verify logs are assigned to the group
    assert.strictEqual(groupLogs.length, 2);
    assert.ok(groupLogs.some((l) => l.id === "assign-log-1"));
    assert.ok(groupLogs.some((l) => l.id === "assign-log-2"));
    assert.ok(groupLogs.every((l) => l.groupId === logGroup.id));
  });
});
