import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as sinon from "sinon";
import { Database } from "../storage/database";
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

suite("Database Test Suite", () => {
  let database: Database;
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

    // Initialize the database
    database = new Database(context);
    await database.initialize();

    // Restore the stub
    createDirectoryStub.restore();
  });

  teardown(async () => {
    // Close the database connection
    await database.close();

    // Remove the test database
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  test("Database should initialize with tables", async () => {
    // Check if tables exist by running a simple query
    const tables = await database.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    const tableNames = tables.map((t) => t.name);
    assert.ok(tableNames.includes("sessions"), "sessions table should exist");
    assert.ok(tableNames.includes("logs"), "logs table should exist");
    assert.ok(
      tableNames.includes("log_groups"),
      "log_groups table should exist"
    );
  });

  test("Database run method should execute SQL statements", async () => {
    // Insert a test record
    const result = await database.run(
      "INSERT INTO sessions (id, name, created_at, updated_at, cloud_provider, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        "test-id",
        "Test Session",
        Date.now(),
        Date.now(),
        "aws",
        Date.now(),
        Date.now(),
        "new",
      ]
    );

    assert.ok(result.changes === 1, "One row should be affected");
  });

  test("Database get method should retrieve a single row", async () => {
    // Insert a test record
    const id = "test-get-id";
    const name = "Test Get Session";
    const now = Date.now();

    await database.run(
      "INSERT INTO sessions (id, name, created_at, updated_at, cloud_provider, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, name, now, now, "aws", now, now, "new"]
    );

    // Retrieve the record
    const row = await database.get<{ id: string; name: string }>(
      "SELECT id, name FROM sessions WHERE id = ?",
      [id]
    );

    assert.ok(row, "Row should exist");
    assert.strictEqual(row?.id, id, "ID should match");
    assert.strictEqual(row?.name, name, "Name should match");
  });

  test("Database all method should retrieve multiple rows", async () => {
    // Insert test records
    const now = Date.now();
    await database.run(
      "INSERT INTO sessions (id, name, created_at, updated_at, cloud_provider, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["test-all-1", "Test All 1", now, now, "aws", now, now, "new"]
    );

    await database.run(
      "INSERT INTO sessions (id, name, created_at, updated_at, cloud_provider, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ["test-all-2", "Test All 2", now, now, "aws", now, now, "new"]
    );

    // Retrieve the records
    const rows = await database.all<{ id: string; name: string }>(
      "SELECT id, name FROM sessions WHERE id LIKE ?",
      ["test-all-%"]
    );

    assert.strictEqual(rows.length, 2, "Should retrieve 2 rows");
    assert.ok(
      rows.some((r) => r.id === "test-all-1"),
      "Should include first record"
    );
    assert.ok(
      rows.some((r) => r.id === "test-all-2"),
      "Should include second record"
    );
  });

  test("Database close method should close the connection", async () => {
    // Close the database
    await database.close();

    // Attempting to run a query should throw an error
    try {
      await database.run("SELECT 1");
      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.ok(
        error.message.includes("not initialized"),
        "Error should indicate database is not initialized"
      );
    }
  });
});
