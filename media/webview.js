// Setup event listeners for the webview
function setupEventListeners(vscode) {
  // Create session button
  document.getElementById("createSessionBtn")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "createSession",
    });
  });

  // Switch session button
  document.getElementById("switchSessionBtn")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "switchSession",
    });
  });
  
  // Pull error logs button
  document.getElementById("pullErrorLogsBtn")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "pullErrorLogs",
    });
  });
  
  // Pull all logs button
  document.getElementById("pullAllLogsBtn")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "pullAllLogs",
    });
  });
  
  // Session selection buttons
  document.querySelectorAll(".select-session-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sessionId = btn.getAttribute("data-session-id");
      vscode.postMessage({
        command: "switchSession",
        sessionId: sessionId,
      });
    });
  });
  
  // Analyze log group buttons
  document.querySelectorAll(".analyze-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const groupId = btn.getAttribute("data-group-id");
      vscode.postMessage({
        command: "analyzeLogGroup",
        logGroupId: groupId,
      });
    });
  });
}

// Update UI based on current session
function updateUIForSession(currentSession, logGroups, logs) {
  // Set status colors for log groups
  document.querySelectorAll(".log-group").forEach((group) => {
    const groupId = group.getAttribute("data-group-id");
    const logGroup = logGroups.find((g) => g.id === groupId);

    if (logGroup) {
      group.setAttribute("data-status", logGroup.status);
    }
  });
  
  // Toggle log group content visibility when clicking on header
  document.querySelectorAll(".log-group-header").forEach((header) => {
    header.addEventListener("click", (event) => {
      // Don't toggle if clicking on the analyze button
      if (event.target.classList.contains("analyze-btn")) {
        return;
      }
      
      const content = header.nextElementSibling;
      if (content) {
        content.style.display = content.style.display === "none" ? "block" : "none";
      }
    });
  });
  
  // Initially hide log group content
  document.querySelectorAll(".log-group-content").forEach((content) => {
    content.style.display = "none";
  });
}

// Show error message
function showErrorMessage(error) {
  const container = document.querySelector(".container");

  if (container) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.style.backgroundColor =
      "var(--vscode-inputValidation-errorBackground)";
    errorDiv.style.color = "var(--vscode-inputValidation-errorForeground)";
    errorDiv.style.border =
      "1px solid var(--vscode-inputValidation-errorBorder)";
    errorDiv.style.padding = "10px";
    errorDiv.style.margin = "10px 0";
    errorDiv.style.borderRadius = "3px";
    errorDiv.textContent = typeof error === "string" ? error : error.message || "An error occurred";

    container.prepend(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}
