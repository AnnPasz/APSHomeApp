const STORAGE_KEYS = {
  items: "aps-home-items-v2",
  tasks: "aps-home-maintenance-v1",
  categories: "aps-home-categories-v1",
  syncSettings: "aps-home-sync-settings-v1",
  activeView: "aps-home-active-view-v1",
};

const DEFAULT_SYNC_SETTINGS = {
  owner: "AnnPasz",
  repo: "APSHomeApp",
  branch: "main",
  path: "data/state.json",
  token: "",
};

const DEFAULT_CATEGORY_ID = "cat-inne";
const AVAILABLE_VIEWS = ["shopping", "tasks", "settings"];

const defaultCategories = [
  { id: "cat-spozywcze", name: "Spożywcze" },
  { id: "cat-chemia", name: "Chemia domowa" },
  { id: "cat-lazienka", name: "Łazienka" },
  { id: DEFAULT_CATEGORY_ID, name: "Inne" },
];

const nowIso = () => new Date().toISOString();

const defaultItems = [
  { id: crypto.randomUUID(), name: "Mąka", categoryId: "cat-spozywcze", state: "stock" },
  { id: crypto.randomUUID(), name: "Makaron", categoryId: "cat-spozywcze", state: "stock" },
  { id: crypto.randomUUID(), name: "Cebula", categoryId: "cat-spozywcze", state: "stock" },
  { id: crypto.randomUUID(), name: "Kapsułki do prania", categoryId: "cat-chemia", state: "stock" },
  { id: crypto.randomUUID(), name: "Kapsułki do zmywarki", categoryId: "cat-chemia", state: "stock" },
];

const defaultTasks = [
  {
    id: crypto.randomUUID(),
    name: "Umyj prysznic",
    intervalDays: 7,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 7).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Umyj lodówkę",
    intervalDays: 30,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 30).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Umyj okna",
    intervalDays: 45,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 45).toISOString(),
  },
];

let state = {
  categories: normalizeCategories(loadArrayData(STORAGE_KEYS.categories, defaultCategories)),
  items: normalizeItems(loadArrayData(STORAGE_KEYS.items, defaultItems)),
  tasks: normalizeTasks(loadArrayData(STORAGE_KEYS.tasks, defaultTasks)),
};

state = ensureCategoryConsistency(state);

let syncSettings = loadObjectData(STORAGE_KEYS.syncSettings, DEFAULT_SYNC_SETTINGS);
let activeView = loadActiveView();
let editingItemId = null;
let editingTaskId = null;
let draggedItemId = null;

const filters = {
  categoryId: "all",
  searchText: "",
};

const stockList = document.getElementById("stock-list");
const shoppingList = document.getElementById("shopping-list");
const maintenanceList = document.getElementById("maintenance-list");
const itemCategorySelect = document.getElementById("item-category");
const categoryFilterSelect = document.getElementById("category-filter");
const itemSearchInput = document.getElementById("item-search");
const categoryForm = document.getElementById("category-form");
const categoryNameInput = document.getElementById("category-name");
const categoryList = document.getElementById("category-list");
const syncForm = document.getElementById("sync-form");
const syncOwnerInput = document.getElementById("sync-owner");
const syncRepoInput = document.getElementById("sync-repo");
const syncBranchInput = document.getElementById("sync-branch");
const syncPathInput = document.getElementById("sync-path");
const syncTokenInput = document.getElementById("sync-token");
const syncDownloadButton = document.getElementById("sync-download");
const syncUploadButton = document.getElementById("sync-upload");
const syncStatus = document.getElementById("sync-status");
const navLinks = [...document.querySelectorAll(".nav-link")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];

document.getElementById("item-form").addEventListener("submit", handleAddItem);
document.getElementById("task-form").addEventListener("submit", handleAddTask);
categoryForm.addEventListener("submit", handleAddCategory);
categoryFilterSelect.addEventListener("change", (event) => {
  filters.categoryId = event.target.value;
  renderShopping();
});
itemSearchInput.addEventListener("input", (event) => {
  filters.searchText = event.target.value.trim().toLowerCase();
  renderShopping();
});
syncForm.addEventListener("submit", handleSaveSyncSettings);
syncDownloadButton.addEventListener("click", downloadFromGitHub);
syncUploadButton.addEventListener("click", uploadToGitHub);
[
  syncOwnerInput,
  syncRepoInput,
  syncBranchInput,
  syncPathInput,
  syncTokenInput,
].forEach((input) => {
  input.addEventListener("input", handleSyncSettingsInput);
});
navLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveView(link.dataset.view));
});

setSyncFormValues(syncSettings);
renderAll();

function loadArrayData(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadObjectData(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return { ...fallback };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...fallback };
    }
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

function loadActiveView() {
  const savedView = localStorage.getItem(STORAGE_KEYS.activeView);
  return AVAILABLE_VIEWS.includes(savedView) ? savedView : "shopping";
}

function saveActiveView() {
  localStorage.setItem(STORAGE_KEYS.activeView, activeView);
}

function setActiveView(viewName) {
  if (!AVAILABLE_VIEWS.includes(viewName)) {
    return;
  }
  activeView = viewName;
  saveActiveView();
  renderActiveView();
}

function normalizeCategories(categories) {
  const cleaned = categories
    .filter((category) => category && typeof category.name === "string")
    .map((category) => ({
      id: category.id || `cat-${crypto.randomUUID()}`,
      name: category.name.trim(),
    }))
    .filter((category) => category.name.length > 0);

  if (!cleaned.some((category) => category.id === DEFAULT_CATEGORY_ID)) {
    cleaned.push({ id: DEFAULT_CATEGORY_ID, name: "Inne" });
  }

  const uniqueById = new Map();
  cleaned.forEach((category) => {
    if (!uniqueById.has(category.id)) {
      uniqueById.set(category.id, category);
    }
  });
  return [...uniqueById.values()];
}

function normalizeItems(items) {
  return items
    .filter((item) => item && typeof item.name === "string")
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
      categoryId: item.categoryId || DEFAULT_CATEGORY_ID,
      state: item.state === "shopping" ? "shopping" : "stock",
      depletionLevel: item.depletionLevel === "gone" ? "gone" : item.depletionLevel === "low" ? "low" : null,
      movedToShoppingAt: item.movedToShoppingAt || null,
      purchasedAt: item.purchasedAt || null,
    }))
    .filter((item) => item.name.length > 0);
}

function normalizeTasks(tasks) {
  return tasks
    .filter((task) => task && typeof task.name === "string")
    .map((task) => {
      const interval = Number(task.intervalDays);
      const safeInterval = Number.isFinite(interval) && interval > 0 ? interval : 7;
      const lastDoneAt = task.lastDoneAt || nowIso();
      return {
        id: task.id || crypto.randomUUID(),
        name: task.name.trim(),
        intervalDays: safeInterval,
        lastDoneAt,
        nextDueAt: task.nextDueAt || addDays(new Date(lastDoneAt), safeInterval).toISOString(),
      };
    })
    .filter((task) => task.name.length > 0);
}

function ensureCategoryConsistency(currentState) {
  const categoryIds = new Set(currentState.categories.map((category) => category.id));
  return {
    ...currentState,
    items: currentState.items.map((item) =>
      categoryIds.has(item.categoryId)
        ? item
        : {
            ...item,
            categoryId: DEFAULT_CATEGORY_ID,
          }
    ),
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(state.categories));
}

function saveSyncSettings() {
  localStorage.setItem(STORAGE_KEYS.syncSettings, JSON.stringify(syncSettings));
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + Number(days));
  return copy;
}

function persistAndRender() {
  state = ensureCategoryConsistency(state);
  saveData();
  renderAll();
}

function renderAll() {
  renderCategoryControls();
  renderShopping();
  renderMaintenance();
  renderActiveView();
}

function renderActiveView() {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.view === activeView);
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === activeView);
  });
}

function renderCategoryControls() {
  const previousItemCategory = itemCategorySelect.value;
  itemCategorySelect.innerHTML = "";

  const orderedCategories = [...state.categories].sort((first, second) => first.name.localeCompare(second.name, "pl"));
  orderedCategories.forEach((category) => {
    itemCategorySelect.appendChild(optionNode(category.id, category.name));
  });

  itemCategorySelect.value =
    previousItemCategory && state.categories.some((category) => category.id === previousItemCategory)
      ? previousItemCategory
      : DEFAULT_CATEGORY_ID;

  const previousFilter = filters.categoryId;
  categoryFilterSelect.innerHTML = "";
  categoryFilterSelect.appendChild(optionNode("all", "Wszystkie kategorie"));
  orderedCategories.forEach((category) => {
    categoryFilterSelect.appendChild(optionNode(category.id, category.name));
  });

  filters.categoryId =
    previousFilter === "all" || state.categories.some((category) => category.id === previousFilter)
      ? previousFilter
      : "all";
  categoryFilterSelect.value = filters.categoryId;

  renderCategoryList();
}

function renderCategoryList() {
  categoryList.innerHTML = "";
  const categoriesOrdered = [...state.categories].sort((first, second) => first.name.localeCompare(second.name, "pl"));

  categoriesOrdered.forEach((category) => {
    const usageCount = state.items.filter((item) => item.categoryId === category.id).length;

    const chip = document.createElement("div");
    chip.className = "chip";

    const label = document.createElement("span");
    label.textContent = `${category.name} (${usageCount})`;
    chip.appendChild(label);

    if (category.id !== DEFAULT_CATEGORY_ID) {
      const removeButton = button("Usuń", "btn btn-danger", () => removeCategory(category.id));
      if (usageCount > 0) {
        removeButton.disabled = true;
        removeButton.title = "Najpierw zmień kategorię produktów przypisanych do tej kategorii.";
      }
      chip.appendChild(removeButton);
    }

    categoryList.appendChild(chip);
  });
}

function optionNode(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

function handleAddCategory(event) {
  event.preventDefault();
  const name = categoryNameInput.value.trim();
  if (!name) {
    return;
  }

  const alreadyExists = state.categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
  if (alreadyExists) {
    categoryNameInput.focus();
    return;
  }

  state.categories.push({ id: `cat-${crypto.randomUUID()}`, name });
  categoryNameInput.value = "";
  persistAndRender();
}

function removeCategory(categoryId) {
  if (categoryId === DEFAULT_CATEGORY_ID || state.items.some((item) => item.categoryId === categoryId)) {
    return;
  }

  state.categories = state.categories.filter((category) => category.id !== categoryId);
  persistAndRender();
}

function handleAddItem(event) {
  event.preventDefault();
  const nameInput = document.getElementById("item-name");
  const name = nameInput.value.trim();
  const categoryId = itemCategorySelect.value;

  if (!name || !categoryId) {
    return;
  }

  state.items.push({
    id: crypto.randomUUID(),
    name,
    categoryId,
    state: "stock",
    depletionLevel: null,
    movedToShoppingAt: null,
    purchasedAt: null,
  });

  nameInput.value = "";
  persistAndRender();
}

function handleAddTask(event) {
  event.preventDefault();
  const nameInput = document.getElementById("task-name");
  const intervalInput = document.getElementById("task-interval");
  const name = nameInput.value.trim();
  const intervalDays = Number(intervalInput.value);

  if (!name || !Number.isFinite(intervalDays) || intervalDays <= 0) {
    return;
  }

  const now = new Date();
  state.tasks.push({
    id: crypto.randomUUID(),
    name,
    intervalDays,
    lastDoneAt: now.toISOString(),
    nextDueAt: addDays(now, intervalDays).toISOString(),
  });

  nameInput.value = "";
  intervalInput.value = "";
  persistAndRender();
}

function filterItem(item) {
  const matchesCategory = filters.categoryId === "all" || item.categoryId === filters.categoryId;
  const matchesSearch = filters.searchText.length === 0 || item.name.toLowerCase().includes(filters.searchText);
  return matchesCategory && matchesSearch;
}

function renderShopping() {
  const stockItems = state.items.filter((item) => item.state === "stock" && filterItem(item));
  const shoppingItems = state.items.filter((item) => item.state === "shopping" && filterItem(item));

  stockList.innerHTML = "";
  shoppingList.innerHTML = "";

  setupDropZone(stockList, "stock");
  setupDropZone(shoppingList, "shopping");

  if (!stockItems.length) {
    stockList.appendChild(emptyState("Brak produktów spełniających filtr."));
  } else {
    stockItems
      .sort((first, second) => first.name.localeCompare(second.name, "pl"))
      .forEach((item) => stockList.appendChild(itemCard(item, "stock")));
  }

  if (!shoppingItems.length) {
    shoppingList.appendChild(emptyState("Lista zakupów jest pusta."));
  } else {
    shoppingItems
      .sort((first, second) => new Date(first.movedToShoppingAt || nowIso()) - new Date(second.movedToShoppingAt || nowIso()))
      .forEach((item) => shoppingList.appendChild(itemCard(item, "shopping")));
  }
}

function itemCard(item, column) {
  const card = document.createElement("article");
  card.className = "card draggable-card";
  card.draggable = true;

  card.addEventListener("dragstart", (event) => {
    draggedItemId = item.id;
    card.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
  });

  card.addEventListener("dragend", () => {
    draggedItemId = null;
    card.classList.remove("is-dragging");
  });

  if (editingItemId === item.id) {
    card.appendChild(itemEditForm(item));
    return card;
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = item.name;

  const meta = document.createElement("div");
  meta.className = "meta";
  const categoryName = getCategoryName(item.categoryId);
  if (column === "stock") {
    meta.textContent = `Kategoria: ${categoryName}`;
  } else {
    const level = item.depletionLevel === "gone" ? "brak" : "kończy się";
    meta.textContent = `Kategoria: ${categoryName} • Status: ${level}`;
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  if (column === "stock") {
    actions.appendChild(button("Kończy się", "btn btn-warning", () => markForShopping(item.id, "low")));
    actions.appendChild(button("Brak", "btn btn-danger", () => markForShopping(item.id, "gone")));
    actions.appendChild(button("Edytuj", "btn", () => startEditItem(item.id)));
    actions.appendChild(button("Usuń", "btn", () => removeItem(item.id)));
  } else {
    actions.appendChild(button("Kupione", "btn btn-success", () => confirmPurchased(item.id)));
    actions.appendChild(button("Wróć do domu", "btn", () => returnToStock(item.id)));
    actions.appendChild(button("Edytuj", "btn", () => startEditItem(item.id)));
  }

  card.append(title, meta, actions);
  return card;
}

function getCategoryName(categoryId) {
  return state.categories.find((category) => category.id === categoryId)?.name || "Inne";
}

function startEditItem(itemId) {
  editingTaskId = null;
  editingItemId = itemId;
  renderShopping();
}

function cancelEditItem() {
  editingItemId = null;
  renderShopping();
}

function itemEditForm(item) {
  const form = document.createElement("form");
  form.className = "edit-form";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.required = true;
  nameInput.value = item.name;

  const categorySelect = document.createElement("select");
  categorySelect.required = true;
  [...state.categories]
    .sort((first, second) => first.name.localeCompare(second.name, "pl"))
    .forEach((category) => {
      categorySelect.appendChild(optionNode(category.id, category.name));
    });
  categorySelect.value = item.categoryId;

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Zapisz", "btn btn-success", () => {}));
  actions.appendChild(button("Anuluj", "btn", cancelEditItem));
  actions.firstChild.type = "submit";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedName = nameInput.value.trim();
    const updatedCategory = categorySelect.value;
    if (!updatedName || !updatedCategory) {
      return;
    }

    state.items = state.items.map((current) =>
      current.id === item.id
        ? {
            ...current,
            name: updatedName,
            categoryId: updatedCategory,
          }
        : current
    );

    editingItemId = null;
    persistAndRender();
  });

  form.append(nameInput, categorySelect, actions);
  return form;
}

function markForShopping(itemId, depletionLevel) {
  editingItemId = null;
  state.items = state.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          state: "shopping",
          depletionLevel,
          movedToShoppingAt: nowIso(),
        }
      : item
  );
  persistAndRender();
}

function confirmPurchased(itemId) {
  editingItemId = null;
  state.items = state.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          state: "stock",
          depletionLevel: null,
          movedToShoppingAt: null,
          purchasedAt: nowIso(),
        }
      : item
  );
  persistAndRender();
}

function returnToStock(itemId) {
  editingItemId = null;
  state.items = state.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          state: "stock",
          depletionLevel: null,
          movedToShoppingAt: null,
        }
      : item
  );
  persistAndRender();
}

function removeItem(itemId) {
  editingItemId = null;
  state.items = state.items.filter((item) => item.id !== itemId);
  persistAndRender();
}

function setupDropZone(element, targetState) {
  element.ondragover = (event) => {
    event.preventDefault();
    element.classList.add("drop-active");
  };

  element.ondragleave = () => {
    element.classList.remove("drop-active");
  };

  element.ondrop = (event) => {
    event.preventDefault();
    element.classList.remove("drop-active");
    const itemId = event.dataTransfer?.getData("text/plain") || draggedItemId;
    if (!itemId) {
      return;
    }
    moveItemToState(itemId, targetState);
  };
}

function moveItemToState(itemId, targetState) {
  editingItemId = null;
  state.items = state.items.map((item) => {
    if (item.id !== itemId || item.state === targetState) {
      return item;
    }

    if (targetState === "shopping") {
      return {
        ...item,
        state: "shopping",
        depletionLevel: item.depletionLevel || "low",
        movedToShoppingAt: nowIso(),
      };
    }

    return {
      ...item,
      state: "stock",
      depletionLevel: null,
      movedToShoppingAt: null,
    };
  });
  persistAndRender();
}

function renderMaintenance() {
  maintenanceList.innerHTML = "";
  if (!state.tasks.length) {
    maintenanceList.appendChild(emptyState("Brak zadań prewencyjnych."));
    return;
  }

  [...state.tasks]
    .sort((first, second) => new Date(first.nextDueAt) - new Date(second.nextDueAt))
    .forEach((task) => maintenanceList.appendChild(taskCard(task)));
}

function taskCard(task) {
  const card = document.createElement("article");
  card.className = "card";

  if (editingTaskId === task.id) {
    card.appendChild(taskEditForm(task));
    return card;
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = task.name;

  const dueDate = new Date(task.nextDueAt);
  const dueDays = daysUntil(dueDate);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `Co ${task.intervalDays} dni • Termin: ${formatDate(dueDate)}`;

  const badge = document.createElement("span");
  badge.className = `badge ${getDueBadgeClass(dueDays)}`;
  badge.textContent = getDueLabel(dueDays);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Wykonane", "btn btn-success", () => completeTask(task.id)));
  actions.appendChild(button("Edytuj", "btn", () => startEditTask(task.id)));
  actions.appendChild(button("Usuń", "btn", () => removeTask(task.id)));

  card.append(title, meta, badge, actions);
  return card;
}

function completeTask(taskId) {
  editingTaskId = null;
  const now = new Date();
  state.tasks = state.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          lastDoneAt: now.toISOString(),
          nextDueAt: addDays(now, task.intervalDays).toISOString(),
        }
      : task
  );
  persistAndRender();
}

function removeTask(taskId) {
  editingTaskId = null;
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  persistAndRender();
}

function startEditTask(taskId) {
  editingItemId = null;
  editingTaskId = taskId;
  renderMaintenance();
}

function cancelEditTask() {
  editingTaskId = null;
  renderMaintenance();
}

function taskEditForm(task) {
  const form = document.createElement("form");
  form.className = "edit-form";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.required = true;
  nameInput.value = task.name;

  const intervalInput = document.createElement("input");
  intervalInput.type = "number";
  intervalInput.required = true;
  intervalInput.min = "1";
  intervalInput.value = String(task.intervalDays);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Zapisz", "btn btn-success", () => {}));
  actions.appendChild(button("Anuluj", "btn", cancelEditTask));
  actions.firstChild.type = "submit";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedName = nameInput.value.trim();
    const updatedInterval = Number(intervalInput.value);
    if (!updatedName || !Number.isFinite(updatedInterval) || updatedInterval <= 0) {
      return;
    }

    state.tasks = state.tasks.map((current) => {
      if (current.id !== task.id) {
        return current;
      }
      const referenceDate = current.lastDoneAt ? new Date(current.lastDoneAt) : new Date();
      return {
        ...current,
        name: updatedName,
        intervalDays: updatedInterval,
        nextDueAt: addDays(referenceDate, updatedInterval).toISOString(),
      };
    });

    editingTaskId = null;
    persistAndRender();
  });

  form.append(nameInput, intervalInput, actions);
  return form;
}

function emptyState(text) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = text;
  return node;
}

function button(text, className, onClick) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  node.textContent = text;
  node.addEventListener("click", onClick);
  return node;
}

function daysUntil(targetDate) {
  const now = new Date();
  const oneDayMs = 1000 * 60 * 60 * 24;
  return Math.floor((targetDate - now) / oneDayMs);
}

function getDueLabel(dueDays) {
  if (dueDays < 0) return `${Math.abs(dueDays)} dni po terminie`;
  if (dueDays === 0) return "Termin dzisiaj";
  if (dueDays <= 3) return `Termin za ${dueDays} dni`;
  return "W harmonogramie";
}

function getDueBadgeClass(dueDays) {
  if (dueDays < 0) return "badge-overdue";
  if (dueDays <= 3) return "badge-soon";
  return "badge-ok";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function setSyncFormValues(settings) {
  syncOwnerInput.value = settings.owner || "";
  syncRepoInput.value = settings.repo || "";
  syncBranchInput.value = settings.branch || "main";
  syncPathInput.value = settings.path || "data/state.json";
  syncTokenInput.value = settings.token || "";
}

function handleSyncSettingsInput() {
  syncSettings = readSyncSettingsFromForm();
  saveSyncSettings();
}

function handleSaveSyncSettings(event) {
  event.preventDefault();
  syncSettings = readSyncSettingsFromForm();
  saveSyncSettings();
  setSyncStatus("Ustawienia synchronizacji zapisane lokalnie.", "success");
}

function readSyncSettingsFromForm() {
  return {
    owner: syncOwnerInput.value.trim(),
    repo: syncRepoInput.value.trim(),
    branch: syncBranchInput.value.trim() || "main",
    path: syncPathInput.value.trim() || "data/state.json",
    token: syncTokenInput.value.trim(),
  };
}

function validateSyncSettings(requireToken) {
  const latest = readSyncSettingsFromForm();
  if (!latest.owner || !latest.repo || !latest.branch || !latest.path) {
    throw new Error("Uzupełnij właściciela, repozytorium, gałąź i ścieżkę danych.");
  }
  if (requireToken && !latest.token) {
    throw new Error("Do wysyłki wymagany jest token GitHub.");
  }
  syncSettings = latest;
  saveSyncSettings();
  return latest;
}

function setSyncStatus(message, type = "info") {
  syncStatus.textContent = message;
  syncStatus.classList.remove("sync-info", "sync-success", "sync-error");
  syncStatus.classList.add(`sync-${type}`);
}

function setSyncBusy(isBusy) {
  syncDownloadButton.disabled = isBusy;
  syncUploadButton.disabled = isBusy;
  syncForm.querySelectorAll("input, button").forEach((node) => {
    if (node.id === "sync-download" || node.id === "sync-upload") {
      return;
    }
    node.disabled = isBusy;
  });
}

function buildContentsEndpoint(settings) {
  const encodedPath = settings.path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(settings.branch)}`;
}

function getAuthHeaders(token) {
  if (!token) {
    return { Accept: "application/vnd.github+json" };
  }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
  };
}

function toBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

function fromBase64(base64Value) {
  return decodeURIComponent(escape(atob(base64Value)));
}

function exportSyncPayload() {
  return {
    version: 2,
    updatedAt: nowIso(),
    state: {
      categories: state.categories,
      items: state.items,
      tasks: state.tasks,
    },
  };
}

function applySyncPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Niepoprawny format danych zdalnych.");
  }

  const remoteState = payload.state || payload;
  if (!remoteState || typeof remoteState !== "object") {
    throw new Error("Brak danych stanu w pliku zdalnym.");
  }

  const nextCategories = Array.isArray(remoteState.categories)
    ? normalizeCategories(remoteState.categories)
    : normalizeCategories(defaultCategories);
  const nextItems = Array.isArray(remoteState.items) ? normalizeItems(remoteState.items) : null;
  const nextTasks = Array.isArray(remoteState.tasks) ? normalizeTasks(remoteState.tasks) : null;

  if (!nextItems || !nextTasks) {
    throw new Error("Plik zdalny musi zawierać tablice items i tasks.");
  }

  state = ensureCategoryConsistency({
    categories: nextCategories,
    items: nextItems,
    tasks: nextTasks,
  });

  editingItemId = null;
  editingTaskId = null;
  persistAndRender();
}

async function downloadFromGitHub() {
  try {
    setSyncBusy(true);
    setSyncStatus("Pobieranie danych z GitHub...", "info");
    const settings = validateSyncSettings(false);
    const response = await fetch(buildContentsEndpoint(settings), {
      method: "GET",
      headers: getAuthHeaders(settings.token),
    });

    if (response.status === 404) {
      throw new Error("Nie znaleziono pliku danych. Najpierw wyślij dane na GitHub.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Błąd pobierania (${response.status}): ${errorText.slice(0, 160)}`);
    }

    const payload = await response.json();
    if (!payload.content) {
      throw new Error("Brak zawartości pliku w odpowiedzi GitHub.");
    }

    const decoded = fromBase64(payload.content.replace(/\n/g, ""));
    applySyncPayload(JSON.parse(decoded));
    setSyncStatus("Pobrano dane i zaktualizowano stan lokalny.", "success");
  } catch (error) {
    setSyncStatus(error.message || "Pobieranie nie powiodło się.", "error");
  } finally {
    setSyncBusy(false);
  }
}

async function uploadToGitHub() {
  try {
    setSyncBusy(true);
    setSyncStatus("Wysyłanie danych na GitHub...", "info");
    const settings = validateSyncSettings(true);
    const endpoint = buildContentsEndpoint(settings);
    const headers = getAuthHeaders(settings.token);

    let currentSha = null;
    const existing = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (existing.ok) {
      const existingJson = await existing.json();
      currentSha = existingJson.sha || null;
    } else if (existing.status !== 404) {
      const errText = await existing.text();
      throw new Error(`Nie można sprawdzić pliku (${existing.status}): ${errText.slice(0, 160)}`);
    }

    const body = {
      message: `Synchronizacja danych aplikacji ${new Date().toISOString()}`,
      content: toBase64(JSON.stringify(exportSyncPayload(), null, 2)),
      branch: settings.branch,
    };

    if (currentSha) {
      body.sha = currentSha;
    }

    const pushResponse = await fetch(endpoint, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!pushResponse.ok) {
      const errorText = await pushResponse.text();
      throw new Error(`Błąd wysyłki (${pushResponse.status}): ${errorText.slice(0, 160)}`);
    }

    setSyncStatus("Wysłano dane na GitHub.", "success");
  } catch (error) {
    setSyncStatus(error.message || "Wysyłanie nie powiodło się.", "error");
  } finally {
    setSyncBusy(false);
  }
}
