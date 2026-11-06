const form = document.querySelector("#analysis-form");
const textarea = document.querySelector("#email-text");
const analyzeButton = document.querySelector("#analyze-button");
const characterCount = document.querySelector("#character-count");
const resultCard = document.querySelector("#result-card");
const errorMessage = document.querySelector("#error-message");

const HISTORY_KEY = "signal-recent-checks";
const MAX_HISTORY = 5;

function getHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function setLoading(loading) {
  analyzeButton.disabled = loading;
  analyzeButton.classList.toggle("loading", loading);
  analyzeButton.setAttribute("aria-busy", String(loading));
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  resultCard.hidden = true;
}

function renderResult(data) {
  const isSpam = data.label.toLowerCase() === "spam";
  resultCard.classList.toggle("is-spam", isSpam);
  document.querySelector("#result-icon").innerHTML = isSpam
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  document.querySelector("#result-eyebrow").textContent = isSpam ? "SUSPICIOUS MESSAGE" : "MESSAGE LOOKS SAFE";
  document.querySelector("#result-title").textContent = isSpam ? "Spam detected" : "No spam detected";
  document.querySelector("#result-description").textContent = isSpam
    ? "This message was added to your quarantine."
    : "The model did not identify this message as spam.";

  const confidenceWrap = document.querySelector("#confidence-wrap");
  if (typeof data.confidence === "number" && Number.isFinite(data.confidence)) {
    const confidence = Math.max(0, Math.min(1, data.confidence));
    confidenceWrap.hidden = false;
    document.querySelector("#confidence-value").textContent = `${Math.round(confidence * 100)}%`;
    document.querySelector("#confidence-bar").style.width = `${confidence * 100}%`;
  } else {
    confidenceWrap.hidden = true;
  }

  resultCard.hidden = false;
  errorMessage.hidden = true;
}

function saveHistory(label) {
  const history = [{ label, checkedAt: new Date().toISOString() }, ...getHistory()].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Keep the result usable if browser storage is disabled or full.
  }
  renderHistory(history);
  document.querySelector("#last-analysis").textContent = "Just now";
  document.querySelector("#last-analysis-detail").textContent = "Completed successfully";
}

function formatTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function renderHistory(history) {
  const list = document.querySelector("#activity-list");
  const emptyState = document.querySelector("#empty-activity");
  list.replaceChildren();
  emptyState.classList.toggle("visible", history.length === 0);

  for (const item of history) {
    const row = document.createElement("tr");
    const check = document.createElement("td");
    const result = document.createElement("td");
    const time = document.createElement("td");
    const badge = document.createElement("span");
    const label = String(item.label || "").toLowerCase();

    check.textContent = "Email content check";
    badge.className = `activity-result ${label === "spam" ? "spam" : "safe"}`;
    badge.textContent = label === "spam" ? "Spam detected" : "Looks safe";
    result.append(badge);
    time.textContent = formatTime(item.checkedAt);
    row.append(check, result, time);
    list.append(row);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textarea.value.trim();
  if (!text) {
    showError("Paste an email message before running the analysis.");
    textarea.focus();
    return;
  }

  setLoading(true);
  errorMessage.hidden = true;
  resultCard.hidden = true;
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "The email could not be analyzed.";
      throw new Error(detail);
    }
    if (typeof data?.label !== "string") {
      throw new Error("The classifier returned an unexpected response. Please try again.");
    }

    renderResult(data);
    saveHistory(data.label);
    refreshStats();
  } catch (error) {
    showError(error instanceof TypeError
      ? "Could not connect to the model service. Check that the API is running, then try again."
      : error.message);
  } finally {
    setLoading(false);
  }
});

textarea.addEventListener("input", () => {
  characterCount.textContent = `${textarea.value.length.toLocaleString()} / 10,000`;
});

document.querySelector("#sample-button").addEventListener("click", () => {
  textarea.value = "Congratulations! You have been selected to receive a free gift card. Claim your reward now by clicking this link: http://example.com/claim. This limited offer expires today!";
  characterCount.textContent = `${textarea.value.length.toLocaleString()} / 10,000`;
  textarea.focus();
});

document.querySelector("#clear-button").addEventListener("click", () => {
  textarea.value = "";
  characterCount.textContent = "0 / 10,000";
  resultCard.hidden = true;
  errorMessage.hidden = true;
  textarea.focus();
});

document.querySelector("[data-focus-analyzer]").addEventListener("click", () => {
  document.querySelector("#analyze").scrollIntoView({ behavior: "smooth", block: "center" });
  textarea.focus({ preventScroll: true });
});

document.querySelectorAll(".nav-item").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

async function refreshStats() {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) throw new Error("Stats request failed.");
    const data = await response.json();
    document.querySelector("#quarantined-count").textContent = Number(data.quarantined_count || 0).toLocaleString();
  } catch {
    document.querySelector("#quarantined-count").textContent = "—";
  }
}

async function checkHealth() {
  const status = document.querySelector("#model-status");
  const detail = document.querySelector("#model-status-detail");
  const protectionTitle = document.querySelector("#protection-title");
  const protectionDetail = document.querySelector("#protection-detail");
  const serviceStatus = document.querySelector("#service-status");
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Health check failed.");
    const data = await response.json();
    status.textContent = data.model_loaded ? "Online" : "Unavailable";
    detail.textContent = data.model_loaded ? "Ready to classify emails" : "Model could not be loaded";
    protectionTitle.textContent = data.model_loaded ? "Protection active" : "Protection unavailable";
    protectionDetail.textContent = data.model_loaded ? "Model is ready" : "Check the model service";
    serviceStatus.textContent = data.model_loaded ? "All systems operational" : "Model unavailable";
  } catch {
    status.textContent = "Offline";
    detail.textContent = "Cannot reach model service";
    protectionTitle.textContent = "Protection offline";
    protectionDetail.textContent = "Cannot reach model service";
    serviceStatus.textContent = "Service unavailable";
  }
}

const history = getHistory();
renderHistory(history);
if (history.length > 0) {
  document.querySelector("#last-analysis").textContent = formatTime(history[0].checkedAt);
  document.querySelector("#last-analysis-detail").textContent = "Most recent check";
}
refreshStats();
checkHealth();
