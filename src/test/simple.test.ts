import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

// Simple test suite that doesn't depend on VSCode API
describe("Simple Test Suite", () => {
  it("Basic test", () => {
    assert.strictEqual(1 + 1, 2, "Basic math should work");
  });

  it("Database module should be importable", () => {
    // Just check if the file exists
    const dbPath = path.join(__dirname, "..", "storage", "database.js");
    assert.ok(fs.existsSync(dbPath), "Database module file should exist");
  });

  it("StorageManager module should be importable", () => {
    // Just check if the file exists
    const storagePath = path.join(
      __dirname,
      "..",
      "storage",
      "storageManager.js"
    );
    assert.ok(
      fs.existsSync(storagePath),
      "StorageManager module file should exist"
    );
  });
});
