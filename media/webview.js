// Webview JavaScript for Rootsy

/**
 * Initialize the webview with data
 */
function initializeWebview(vscode, currentSession, logGroups, logs) {
  // Set up event listeners
  setupEventListeners(vscode);

  // Update UI based on session state
  updateUIForSession(currentSession, logGroups, logs);
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners(vscode) {
  // Create session button
  document.getElementById("createSessionBtn")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "createSession",
    });
  });

  // Switch session button
  document.getElementById("switchSessionBtn")?.addEventListener("click", () => {
    // This will open a quick pick in VS Code
    vscode.postMessage({
      command: "openSession",
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

  // Fetch more logs button
  document.getElementById("fetchMoreLogsBtn")?.addEventListener("click", () => {
    vscode.postMessage({
      command: "fetchMoreLogs",
    });
  });

  // Analyze root cause buttons
  document.querySelectorAll(".analyze-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const groupId = button.getAttribute("data-group-id");
      vscode.postMessage({
        command: "analyzeRootCause",
        groupId,
      });
    });
  });

  // Expand log group buttons
  document.querySelectorAll(".expand-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const groupId = button.getAttribute("data-group-id");
      const logsContainer = document.getElementById(`logs-${groupId}`);

      if (logsContainer) {
        const isVisible = logsContainer.style.display !== "none";
        logsContainer.style.display = isVisible ? "none" : "block";
        button.textContent = isVisible ? "Show Logs" : "Hide Logs";
      }
    });
  });
}

/**
 * Update UI based on session state
 */
function updateUIForSession(currentSession, logGroups, logs) {
  // Set status colors for log groups
  document.querySelectorAll(".log-group").forEach((group) => {
    const groupId = group.getAttribute("data-group-id");
    const logGroup = logGroups.find((g) => g.id === groupId);

    if (logGroup) {
      group.setAttribute("data-status", logGroup.status);
    }
  });

  // Disable buttons if no session
  if (!currentSession) {
    document
      .querySelectorAll("#pullErrorLogsBtn, #pullAllLogsBtn, #fetchMoreLogsBtn")
      .forEach((button) => {
        if (button) {
          button.disabled = true;
        }
      });
  }
}

/**
 * Handle messages from the extension
 */
window.addEventListener("message", (event) => {
  const message = event.data;

  switch (message.type) {
    case "updateSession":
      // Refresh the page to show the updated session
      window.location.reload();
      break;

    case "updateLogGroups":
      // Refresh the page to show the updated log groups
      window.location.reload();
      break;

    case "showError":
      // Show error message
      showErrorMessage(message.error);
      break;
  }
});

/**
 * Show an error message
 */
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
    errorDiv.style.marginBottom = "20px";
    errorDiv.style.borderRadius = "4px";

    errorDiv.textContent = `Error: ${error}`;

    // Add close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Dismiss";
    closeButton.style.marginLeft = "10px";
    closeButton.addEventListener("click", () => {
      errorDiv.remove();
    });

    errorDiv.appendChild(closeButton);

    // Insert at the top of the container
    container.insertBefore(errorDiv, container.firstChild);
  }
}
