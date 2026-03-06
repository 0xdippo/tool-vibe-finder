const state = {
  bootstrap: null,
  messages: [],
  wizard: null,
  busy: false,
};

const elements = {
  messages: document.getElementById("messages"),
  emptyState: document.getElementById("emptyState"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  sendButton: document.getElementById("sendButton"),
  examplePrompts: document.getElementById("examplePrompts"),
  emptyPromptGrid: document.getElementById("emptyPromptGrid"),
  statusChips: document.getElementById("statusChips"),
  wizardPanel: document.getElementById("wizardPanel"),
  aboutBody: document.getElementById("aboutBody"),
  tmdbAttribution: document.getElementById("tmdbAttribution"),
  profileSummary: document.getElementById("profileSummary"),
  resetButton: document.getElementById("resetButton"),
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function createButton(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function renderPromptButtons(container, prompts) {
  container.innerHTML = "";

  for (const prompt of prompts) {
    const button = createButton(prompt, "prompt-pill", () => sendMessage(prompt));
    container.appendChild(button);
  }
}

function renderStatus() {
  const bootstrap = state.bootstrap;
  if (!bootstrap) {
    return;
  }

  elements.statusChips.innerHTML = "";
  const statuses = [
    bootstrap.llmConfigured ? "LLM ready" : "LLM fallback",
    bootstrap.profileSummary.providers.tmdb ? "TMDB on" : "TMDB off",
    bootstrap.profileSummary.providers.watchmode ? "Watchmode on" : "Watchmode off",
    bootstrap.profileSummary.providers.webSearch ? "Web search on" : "Web search off",
  ];

  statuses.forEach((label) => {
    const pill = document.createElement("span");
    pill.className = "status-pill";
    pill.textContent = label;
    elements.statusChips.appendChild(pill);
  });
}

function renderAbout() {
  const bootstrap = state.bootstrap;
  if (!bootstrap) {
    return;
  }

  elements.aboutBody.textContent = bootstrap.about.body;
  elements.tmdbAttribution.textContent = bootstrap.about.tmdbAttribution;
  elements.profileSummary.innerHTML = "";

  const memoryPills = [
    ...bootstrap.profileSummary.hardMemory.map((item) => `Hard: ${item}`),
    ...bootstrap.profileSummary.softMemory.slice(-6).map((item) => `Soft: ${item}`),
    `Feedback: ${bootstrap.profileSummary.feedbackMode}`,
  ];

  memoryPills.forEach((label) => {
    const pill = document.createElement("span");
    pill.className = "memory-pill";
    pill.textContent = label;
    elements.profileSummary.appendChild(pill);
  });
}

function renderCards(cards) {
  if (!cards || cards.length === 0) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "message-cards";

  cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "card";

    const title = document.createElement("h3");
    title.textContent = card.title;
    article.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.textContent = card.subtitle;
    article.appendChild(subtitle);

    if (card.caption) {
      const caption = document.createElement("p");
      caption.className = "meta-line";
      caption.textContent = card.caption;
      article.appendChild(caption);
    }

    if (card.url) {
      const link = document.createElement("a");
      link.href = card.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open source";
      article.appendChild(link);
    }

    wrapper.appendChild(article);
  });

  return wrapper;
}

function renderMessage(message) {
  const article = document.createElement("article");
  article.className = `message ${message.role}`;

  const header = document.createElement("div");
  header.className = "message-header";

  const role = document.createElement("span");
  role.className = "message-role";
  role.textContent = message.role === "user" ? "You" : message.mode === "system" ? "System" : "Vibe Finder";
  header.appendChild(role);
  article.appendChild(header);

  const content = document.createElement("div");
  content.textContent = message.content;
  article.appendChild(content);

  if (message.memoryNote) {
    const note = document.createElement("p");
    note.className = "memory-note";
    note.textContent = message.memoryNote;
    article.appendChild(note);
  }

  const cards = renderCards(message.cards);
  if (cards) {
    article.appendChild(cards);
  }

  if (message.chips && message.chips.length > 0) {
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    message.chips.forEach((chip) => {
      chipRow.appendChild(createButton(chip, "feedback-chip", () => sendMessage(chip)));
    });
    article.appendChild(chipRow);
  }

  return article;
}

function renderMessages() {
  elements.messages.innerHTML = "";
  state.messages.forEach((message) => {
    elements.messages.appendChild(renderMessage(message));
  });

  const hasMessages = state.messages.length > 0;
  elements.emptyState.style.display = hasMessages ? "none" : "block";
  if (hasMessages) {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function renderWizard() {
  const wizard = state.wizard;
  if (!wizard || wizard.completed) {
    elements.wizardPanel.innerHTML = `
      <div class="wizard-shell">
        <p class="eyebrow">Setup</p>
        <h2>Ready</h2>
        <p class="wizard-helper">Provider setup is complete. You can still reset your vibe if you want to replay the guided flow.</p>
      </div>
    `;
    return;
  }

  const step = wizard.step;
  const shell = document.createElement("div");
  shell.className = "wizard-shell";

  shell.innerHTML = `
    <p class="eyebrow">Setup wizard</p>
    <div class="wizard-progress">Step ${step.progress}</div>
    <h2>${step.title}</h2>
    <p>${step.question}</p>
    ${step.helperText ? `<p class="wizard-helper">${step.helperText}</p>` : ""}
  `;

  if (step.kind === "boolean") {
    const actions = document.createElement("div");
    actions.className = "wizard-actions";
    actions.appendChild(createButton("Yes", "wizard-option", () => answerWizard(step.id, true)));
    actions.appendChild(createButton("No", "wizard-option", () => answerWizard(step.id, false)));
    actions.appendChild(createButton("Skip", "ghost-button", () => answerWizard(step.id, undefined, true)));
    shell.appendChild(actions);
  } else if (step.kind === "choice") {
    const actions = document.createElement("div");
    actions.className = "wizard-actions";
    step.options.forEach((option) => {
      actions.appendChild(createButton(option.label, "wizard-option", () => answerWizard(step.id, option.value)));
    });
    actions.appendChild(createButton("Skip", "ghost-button", () => answerWizard(step.id, undefined, true)));
    shell.appendChild(actions);
  } else {
    const form = document.createElement("form");
    form.className = "wizard-form";

    const input = document.createElement(step.kind === "text" || step.kind === "list" ? "textarea" : "input");
    input.className = "wizard-text-input";
    input.placeholder = step.placeholder || "";
    input.rows = 3;
    form.appendChild(input);

    const actions = document.createElement("div");
    actions.className = "wizard-actions";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "wizard-submit";
    submit.textContent = "Save";
    actions.appendChild(submit);
    actions.appendChild(createButton("Skip", "ghost-button", () => answerWizard(step.id, undefined, true)));
    form.appendChild(actions);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      answerWizard(step.id, input.value);
    });

    shell.appendChild(form);
  }

  elements.wizardPanel.innerHTML = "";
  elements.wizardPanel.appendChild(shell);
}

async function answerWizard(stepId, value, skipped = false) {
  try {
    const result = await request("/api/setup/answer", {
      method: "POST",
      body: JSON.stringify({
        stepId,
        value,
        skipped,
      }),
    });

    if (result.error) {
      window.alert(result.error);
      return;
    }

    state.wizard = {
      completed: result.completed,
      step: result.step,
    };

    if (result.message) {
      state.messages.push({
        role: "assistant",
        mode: "system",
        content: result.message,
        cards: [],
        chips: [],
      });
      renderMessages();
    }

    const bootstrap = await request("/api/bootstrap");
    state.bootstrap = bootstrap;
    state.wizard = bootstrap.wizard;
    renderStatus();
    renderAbout();
    renderWizard();
  } catch (error) {
    window.alert(error.message);
  }
}

async function sendMessage(content) {
  if (!content || state.busy) {
    return;
  }

  state.busy = true;
  elements.sendButton.disabled = true;
  elements.chatInput.disabled = true;

  state.messages.push({
    role: "user",
    mode: "system",
    content,
    cards: [],
    chips: [],
  });
  renderMessages();
  elements.chatInput.value = "";

  try {
    const response = await request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: content }),
    });

    state.messages.push({
      role: "assistant",
      mode: response.mode,
      content: response.reply,
      memoryNote: response.memoryNote,
      cards: response.cards || [],
      chips: response.chips || [],
    });

    const bootstrap = await request("/api/bootstrap");
    state.bootstrap = bootstrap;
    state.wizard = bootstrap.wizard;
    renderStatus();
    renderAbout();
    renderWizard();
  } catch (error) {
    state.messages.push({
      role: "assistant",
      mode: "system",
      content: `Request failed: ${error.message}`,
      cards: [],
      chips: [],
    });
  } finally {
    renderMessages();
    state.busy = false;
    elements.sendButton.disabled = false;
    elements.chatInput.disabled = false;
    elements.chatInput.focus();
  }
}

async function loadApp() {
  const bootstrap = await request("/api/bootstrap");
  state.bootstrap = bootstrap;
  state.wizard = bootstrap.wizard;

  renderPromptButtons(elements.examplePrompts, bootstrap.examplePrompts);
  renderPromptButtons(elements.emptyPromptGrid, bootstrap.examplePrompts);
  renderStatus();
  renderAbout();
  renderWizard();
  renderMessages();
}

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(elements.chatInput.value.trim());
});

elements.resetButton.addEventListener("click", async () => {
  await request("/api/profile/reset", {
    method: "POST",
    body: JSON.stringify({}),
  });

  state.messages = [];
  await loadApp();
});

loadApp().catch((error) => {
  window.alert(`Failed to load app: ${error.message}`);
});
