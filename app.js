const STORAGE_KEYS = {
  items: "aps-home-items-v2",
  tasks: "aps-home-maintenance-v1",
  categories: "aps-home-categories-v1",
  syncSettings: "aps-home-sync-settings-v1",
};

const DEFAULT_SYNC_SETTINGS = {
  owner: "AnnPasz",
  repo: "APSHomeApp",
  branch: "main",
  path: "data/state.json",
  token: "",
};

const DEFAULT_CATEGORY_ID = "cat-inne";

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
    return {
      ...fallback,
      ...parsed,
    };
  } catch {
    return { ...fallback };
  }
}

function normalizeCategories(categories) {
  const cleaned = categories
    .filter((category) => category && typeof category.name === "string")
    .map((category) => ({
      id: category.id || `cat-${crypto.randomUUID()}`,
      name: category.name.trim(),
    }))
    .filter((category) => category.name.length > 0);

  const hasDefault = cleaned.some((category) => category.id === DEFAULT_CATEGORY_ID);
  if (!hasDefault) {
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
  const nextItems = currentState.items.map((item) => {
    if (categoryIds.has(item.categoryId)) {
      return item;
    }
    return {
      ...item,
      categoryId: DEFAULT_CATEGORY_ID,
    };
  });

  return {
    ...currentState,
    items: nextItems,
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
}

function renderCategoryControls() {
  const previousItemCategory = itemCategorySelect.value;
  itemCategorySelect.innerHTML = "";

  state.categories
    .sort((first, second) => first.name.localeCompare(second.name, "pl"))
    .forEach((category) => {
      itemCategorySelect.appendChild(optionNode(category.id, category.name));
    });

  itemCategorySelect.value =
    previousItemCategory && state.categories.some((category) => category.id === previousItemCategory)
      ? previousItemCategory
      : DEFAULT_CATEGORY_ID;

  const previousFilter = filters.categoryId;
  categoryFilterSelect.innerHTML = "";
  categoryFilterSelect.appendChild(optionNode("all", "Wszystkie kategorie"));

  state.categories
    .sort((first, second) => first.name.localeCompare(second.name, "pl"))
    .forEach((category) => {
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

    const isDefault = category.id === DEFAULT_CATEGORY_ID;
    if (!isDefault) {
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

  const alreadyExists = state.categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase()
  );
  if (alreadyExists) {
    categoryNameInput.focus();
    return;
  }

  const newCategory = {
    id: `cat-${crypto.randomUUID()}`,
    name,
  };

  state.categories.push(newCategory);
  categoryNameInput.value = "";
  persistAndRender();
}

function removeCategory(categoryId) {
  const hasItems = state.items.some((item) => item.categoryId === categoryId);
  if (hasItems || categoryId === DEFAULT_CATEGORY_ID) {
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
  card.className = "card";
  card.draggable = true;
  card.classList.add("draggable-card");
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
  const category = state.categories.find((entry) => entry.id === categoryId);
  return category ? category.name : "Inne";
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
  state.categories
    .sort((first, second) => first.name.localeCompare(second.name, "pl"))
    .forEach((category) => {
      categorySelect.appendChild(optionNode(category.id, category.name));
    });
  categorySelect.value = item.categoryId;

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Zapisz", "btn btn-success", () => {}));
  actions.appendChild(button("Anuluj", "btn", cancelEditItem));

  const saveButton = actions.firstChild;
  saveButton.type = "submit";

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
    const fromTransfer = event.dataTransfer?.getData("text/plain");
    const itemId = fromTransfer || draggedItemId;
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

  const ordered = [...state.tasks].sort((first, second) => {
    return new Date(first.nextDueAt) - new Date(second.nextDueAt);
  });

  ordered.forEach((task) => maintenanceList.appendChild(taskCard(task)));
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

  const saveButton = actions.firstChild;
  saveButton.type = "submit";

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
  const base = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${encodedPath}`;
  const query = `?ref=${encodeURIComponent(settings.branch)}`;
  return `${base}${query}`;
}

function getAuthHeaders(token) {
  if (!token) {
    return {
      Accept: "application/vnd.github+json",
    };
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
    const endpoint = buildContentsEndpoint(settings);
    const response = await fetch(endpoint, {
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
    const parsed = JSON.parse(decoded);
    applySyncPayload(parsed);
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
}const STORAGE_KEYS = {
  items: "aps-home-items-v1",
  tasks: "aps-home-maintenance-v1",
  syncSettings: "aps-home-sync-settings-v1",
};

const DEFAULT_SYNC_SETTINGS = {
  owner: "AnnPasz",
  repo: "APSHomeApp",
  branch: "main",
  path: "data/state.json",
  token: "",
};

const defaultItems = [
  { id: crypto.randomUUID(), name: "Flour", note: "1kg", state: "stock" },
  { id: crypto.randomUUID(), name: "Pasta", note: "500g", state: "stock" },
  { id: crypto.randomUUID(), name: "Onions", note: "2kg", state: "stock" },
  { id: crypto.randomUUID(), name: "Washing Machine Pods", note: "", state: "stock" },
  { id: crypto.randomUUID(), name: "Dishwasher Pods", note: "", state: "stock" },
];

const nowIso = () => new Date().toISOString();

const defaultTasks = [
  {
    id: crypto.randomUUID(),
    name: "Wash the shower",
    intervalDays: 7,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 7).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Wash the fridge",
    intervalDays: 30,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 30).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Wash the windows",
    intervalDays: 45,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 45).toISOString(),
  },
];

let state = {
  items: loadData(STORAGE_KEYS.items, defaultItems),
  tasks: loadData(STORAGE_KEYS.tasks, defaultTasks),
};

let syncSettings = loadObjectData(STORAGE_KEYS.syncSettings, DEFAULT_SYNC_SETTINGS);

let editingItemId = null;
let editingTaskId = null;
let draggedItemId = null;

const stockList = document.getElementById("stock-list");
const shoppingList = document.getElementById("shopping-list");
const maintenanceList = document.getElementById("maintenance-list");
const syncForm = document.getElementById("sync-form");
const syncOwnerInput = document.getElementById("sync-owner");
const syncRepoInput = document.getElementById("sync-repo");
const syncBranchInput = document.getElementById("sync-branch");
const syncPathInput = document.getElementById("sync-path");
const syncTokenInput = document.getElementById("sync-token");
const syncDownloadButton = document.getElementById("sync-download");
const syncUploadButton = document.getElementById("sync-upload");
const syncStatus = document.getElementById("sync-status");

document.getElementById("item-form").addEventListener("submit", handleAddItem);
document.getElementById("task-form").addEventListener("submit", handleAddTask);
syncForm.addEventListener("submit", handleSaveSyncSettings);
syncDownloadButton.addEventListener("click", downloadFromGitHub);
syncUploadButton.addEventListener("click", uploadToGitHub);

setSyncFormValues(syncSettings);

renderAll();

function loadData(key, fallback) {
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
    return {
      ...fallback,
      ...parsed,
    };
  } catch {
    return { ...fallback };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
}

function saveSyncSettings() {
  localStorage.setItem(STORAGE_KEYS.syncSettings, JSON.stringify(syncSettings));
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + Number(days));
  return copy;
}

function handleAddItem(event) {
  event.preventDefault();
  const nameInput = document.getElementById("item-name");
  const noteInput = document.getElementById("item-note");
  const name = nameInput.value.trim();
  const note = noteInput.value.trim();

  if (!name) return;

  state.items.push({
    id: crypto.randomUUID(),
    name,
    note,
    state: "stock",
    depletionLevel: null,
    movedToShoppingAt: null,
    purchasedAt: null,
  });

  nameInput.value = "";
  noteInput.value = "";
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

function persistAndRender() {
  saveData();
  renderAll();
}

function renderAll() {
  renderShopping();
  renderMaintenance();
}

function renderShopping() {
  const stockItems = state.items.filter((item) => item.state === "stock");
  const shoppingItems = state.items.filter((item) => item.state === "shopping");

  stockList.innerHTML = "";
  shoppingList.innerHTML = "";

  setupDropZone(stockList, "stock");
  setupDropZone(shoppingList, "shopping");

  if (!stockItems.length) {
    stockList.appendChild(emptyState("No stocked items. Add one above."));
  } else {
    stockItems
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => stockList.appendChild(itemCard(item, "stock")));
  }

  if (!shoppingItems.length) {
    shoppingList.appendChild(emptyState("Shopping list is clear. Great!"));
  } else {
    shoppingItems
      .sort((a, b) => new Date(a.movedToShoppingAt) - new Date(b.movedToShoppingAt))
      .forEach((item) => shoppingList.appendChild(itemCard(item, "shopping")));
  }
}

function itemCard(item, column) {
  const card = document.createElement("article");
  card.className = "card";
  card.draggable = true;
  card.classList.add("draggable-card");
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

  if (column === "stock") {
    meta.textContent = item.note || "No note";
  } else {
    const level = item.depletionLevel || "needed";
    meta.textContent = `Status: ${level}${item.note ? ` • ${item.note}` : ""}`;
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  if (column === "stock") {
    actions.appendChild(button("Mark Low", "btn btn-warning", () => markForShopping(item.id, "low")));
    actions.appendChild(button("Mark Gone", "btn btn-danger", () => markForShopping(item.id, "gone")));
    actions.appendChild(button("Edit", "btn", () => startEditItem(item.id)));
    actions.appendChild(button("Delete", "btn", () => removeItem(item.id)));
  } else {
    actions.appendChild(button("Confirm Purchased", "btn btn-success", () => confirmPurchased(item.id)));
    actions.appendChild(button("Back to Stock", "btn", () => returnToStock(item.id)));
    actions.appendChild(button("Edit", "btn", () => startEditItem(item.id)));
  }

  card.append(title, meta, actions);
  return card;
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

  const noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.placeholder = "Optional note";
  noteInput.value = item.note || "";

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Save", "btn btn-success", () => {}));
  actions.appendChild(button("Cancel", "btn", cancelEditItem));

  const saveButton = actions.firstChild;
  saveButton.type = "submit";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedName = nameInput.value.trim();
    const updatedNote = noteInput.value.trim();
    if (!updatedName) return;
    state.items = state.items.map((current) =>
      current.id === item.id
        ? {
            ...current,
            name: updatedName,
            note: updatedNote,
          }
        : current
    );
    editingItemId = null;
    persistAndRender();
  });

  form.append(nameInput, noteInput, actions);
  return form;
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
    const fromTransfer = event.dataTransfer?.getData("text/plain");
    const itemId = fromTransfer || draggedItemId;
    if (!itemId) return;
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
    maintenanceList.appendChild(emptyState("No maintenance tasks yet."));
    return;
  }

  const ordered = [...state.tasks].sort((first, second) => {
    return new Date(first.nextDueAt) - new Date(second.nextDueAt);
  });

  ordered.forEach((task) => maintenanceList.appendChild(taskCard(task)));
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
  meta.textContent = `Every ${task.intervalDays} day(s) • Next due: ${formatDate(dueDate)}`;

  const badge = document.createElement("span");
  badge.className = `badge ${getDueBadgeClass(dueDays)}`;
  badge.textContent = getDueLabel(dueDays);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Mark Done", "btn btn-success", () => completeTask(task.id)));
  actions.appendChild(button("Edit", "btn", () => startEditTask(task.id)));
  actions.appendChild(button("Delete", "btn", () => removeTask(task.id)));

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
  actions.appendChild(button("Save", "btn btn-success", () => {}));
  actions.appendChild(button("Cancel", "btn", cancelEditTask));

  const saveButton = actions.firstChild;
  saveButton.type = "submit";

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
  if (dueDays < 0) return `${Math.abs(dueDays)} day(s) overdue`;
  if (dueDays === 0) return "Due today";
  if (dueDays <= 3) return `Due in ${dueDays} day(s)`;
  return "On schedule";
}

function getDueBadgeClass(dueDays) {
  if (dueDays < 0) return "badge-overdue";
  if (dueDays <= 3) return "badge-soon";
  return "badge-ok";
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
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

function handleSaveSyncSettings(event) {
  event.preventDefault();
  syncSettings = readSyncSettingsFromForm();
  saveSyncSettings();
  setSyncStatus("Sync settings saved locally.", "success");
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
    throw new Error("Please fill owner, repo, branch, and data path.");
  }
  if (requireToken && !latest.token) {
    throw new Error("A GitHub token is required for upload.");
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
  const base = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${encodedPath}`;
  const query = `?ref=${encodeURIComponent(settings.branch)}`;
  return `${base}${query}`;
}

function getAuthHeaders(token) {
  if (!token) {
    return {
      Accept: "application/vnd.github+json",
    };
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
    version: 1,
    updatedAt: nowIso(),
    state: {
      items: state.items,
      tasks: state.tasks,
    },
  };
}

function applySyncPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Remote data format is invalid.");
  }

  const remoteState = payload.state || payload;
  if (!remoteState || typeof remoteState !== "object") {
    throw new Error("Remote state is missing.");
  }

  const nextItems = Array.isArray(remoteState.items) ? remoteState.items : null;
  const nextTasks = Array.isArray(remoteState.tasks) ? remoteState.tasks : null;

  if (!nextItems || !nextTasks) {
    throw new Error("Remote state must contain items and tasks arrays.");
  }

  state = {
    items: nextItems,
    tasks: nextTasks,
  };

  editingItemId = null;
  editingTaskId = null;
  persistAndRender();
}

async function downloadFromGitHub() {
  try {
    setSyncBusy(true);
    setSyncStatus("Downloading data from GitHub...", "info");
    const settings = validateSyncSettings(false);
    const endpoint = buildContentsEndpoint(settings);
    const response = await fetch(endpoint, {
      method: "GET",
      headers: getAuthHeaders(settings.token),
    });

    if (response.status === 404) {
      throw new Error("Remote data file not found. Upload first to create it.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub download failed (${response.status}): ${errorText.slice(0, 160)}`);
    }

    const payload = await response.json();
    if (!payload.content) {
      throw new Error("GitHub response did not include file content.");
    }

    const decoded = fromBase64(payload.content.replace(/\n/g, ""));
    const parsed = JSON.parse(decoded);
    applySyncPayload(parsed);
    setSyncStatus("Download complete. Local data was updated from GitHub.", "success");
  } catch (error) {
    setSyncStatus(error.message || "Download failed.", "error");
  } finally {
    setSyncBusy(false);
  }
}

async function uploadToGitHub() {
  try {
    setSyncBusy(true);
    setSyncStatus("Uploading data to GitHub...", "info");
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
      throw new Error(`Cannot check existing file (${existing.status}): ${errText.slice(0, 160)}`);
    }

    const body = {
      message: `Sync app state ${new Date().toISOString()}`,
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
      throw new Error(`GitHub upload failed (${pushResponse.status}): ${errorText.slice(0, 160)}`);
    }

    setSyncStatus("Upload complete. GitHub data file is updated.", "success");
  } catch (error) {
    setSyncStatus(error.message || "Upload failed.", "error");
  } finally {
    setSyncBusy(false);
  }
}