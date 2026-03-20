const STORAGE_KEYS = {
  items: "aps-home-items-v2",
  tasks: "aps-home-maintenance-v1",
  categories: "aps-home-categories-v1",
  taskCategories: "aps-home-task-categories-v1",
  syncSettings: "aps-home-sync-settings-v1",
  activeView: "aps-home-active-view-v1",
  lastGithubDownloadAt: "aps-home-last-github-download-at-v1",
};

const DEFAULT_SYNC_SETTINGS = {
  owner: "AnnPasz",
  repo: "APSHomeApp",
  branch: "main",
  path: "data/state.json",
  token: "",
};

const DEFAULT_CATEGORY_ID = "cat-inne";
const DEFAULT_TASK_CATEGORY_ID = "task-cat-inne";
const AVAILABLE_VIEWS = ["shopping", "tasks", "settings"];
const CATEGORY_COLOR_PALETTE = [
  "#6C63FF",
  "#3BAFDA",
  "#37C48E",
  "#F6A623",
  "#E66A8D",
  "#8D6E63",
  "#26C6DA",
  "#7E57C2",
  "#EF5350",
  "#66BB6A",
  "#42A5F5",
  "#AB47BC",
];

const defaultCategories = [
  { id: "cat-spozywcze", name: "Spożywcze", color: "#6C63FF" },
  { id: "cat-chemia", name: "Chemia domowa", color: "#3BAFDA" },
  { id: "cat-lazienka", name: "Łazienka", color: "#37C48E" },
  { id: DEFAULT_CATEGORY_ID, name: "Inne", color: "#F6A623" },
];

const defaultTaskCategories = [
  { id: "task-cat-sprzatanie", name: "Sprzątanie", color: "#7E57C2" },
  { id: "task-cat-kuchnia", name: "Kuchnia", color: "#42A5F5" },
  { id: "task-cat-lazienka", name: "Łazienka", color: "#37C48E" },
  { id: DEFAULT_TASK_CATEGORY_ID, name: "Inne", color: "#F6A623" },
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
    categoryId: "task-cat-lazienka",
    scheduleType: "interval",
    intervalDays: 7,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 7).toISOString(),
    specificDate: null,
  },
  {
    id: crypto.randomUUID(),
    name: "Umyj lodówkę",
    categoryId: "task-cat-kuchnia",
    scheduleType: "interval",
    intervalDays: 30,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 30).toISOString(),
    specificDate: null,
  },
  {
    id: crypto.randomUUID(),
    name: "Umyj okna",
    categoryId: "task-cat-sprzatanie",
    scheduleType: "interval",
    intervalDays: 45,
    lastDoneAt: nowIso(),
    nextDueAt: addDays(new Date(), 45).toISOString(),
    specificDate: null,
  },
];

let state = {
  categories: normalizeCategories(loadArrayData(STORAGE_KEYS.categories, defaultCategories)),
  taskCategories: normalizeTaskCategories(loadArrayData(STORAGE_KEYS.taskCategories, defaultTaskCategories)),
  items: normalizeItems(loadArrayData(STORAGE_KEYS.items, defaultItems)),
  tasks: normalizeTasks(loadArrayData(STORAGE_KEYS.tasks, defaultTasks)),
};

state = ensureCategoryConsistency(state);

let syncSettings = loadObjectData(STORAGE_KEYS.syncSettings, DEFAULT_SYNC_SETTINGS);
let activeView = loadActiveView();
let editingItemId = null;
let editingTaskId = null;
let draggedItemId = null;
let calendarMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalendarDate = null;
let lastGithubDownloadAt = loadLastGithubDownloadAt();

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
const clearFiltersButton = document.getElementById("clear-filters");
const exportNotesButton = document.getElementById("export-notes");
const exportStatus = document.getElementById("export-status");
const taskCategorySelect = document.getElementById("task-category");
const taskScheduleTypeSelect = document.getElementById("task-schedule-type");
const taskIntervalInput = document.getElementById("task-interval");
const taskDateInput = document.getElementById("task-date");
const categoryForm = document.getElementById("category-form");
const categoryNameInput = document.getElementById("category-name");
const categoryList = document.getElementById("category-list");
const taskCategoryForm = document.getElementById("task-category-form");
const taskCategoryNameInput = document.getElementById("task-category-name");
const taskCategoryList = document.getElementById("task-category-list");
const syncForm = document.getElementById("sync-form");
const syncOwnerInput = document.getElementById("sync-owner");
const syncRepoInput = document.getElementById("sync-repo");
const syncBranchInput = document.getElementById("sync-branch");
const syncPathInput = document.getElementById("sync-path");
const syncTokenInput = document.getElementById("sync-token");
const syncDownloadButton = document.getElementById("sync-download");
const syncUploadButton = document.getElementById("sync-upload");
const syncStatus = document.getElementById("sync-status");
const calendarPrevButton = document.getElementById("calendar-prev");
const calendarNextButton = document.getElementById("calendar-next");
const calendarTodayButton = document.getElementById("calendar-today");
const calendarMonthLabel = document.getElementById("calendar-month-label");
const taskCalendarGrid = document.getElementById("task-calendar-grid");
const taskDateFilter = document.getElementById("task-date-filter");
const sidebarLastUpdate = document.getElementById("sidebar-last-update");
const sidebarRefreshButton = document.getElementById("sidebar-refresh");
const sidebarRefreshStatus = document.getElementById("sidebar-refresh-status");
const navLinks = [...document.querySelectorAll(".nav-link")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];

document.getElementById("item-form").addEventListener("submit", handleAddItem);
document.getElementById("task-form").addEventListener("submit", handleAddTask);
categoryForm.addEventListener("submit", handleAddCategory);
taskCategoryForm.addEventListener("submit", handleAddTaskCategory);
taskScheduleTypeSelect.addEventListener("change", handleTaskScheduleTypeChange);
categoryFilterSelect.addEventListener("change", (event) => {
  filters.categoryId = event.target.value;
  renderShopping();
});
itemSearchInput.addEventListener("input", (event) => {
  filters.searchText = event.target.value.trim().toLowerCase();
  renderShopping();
});
clearFiltersButton.addEventListener("click", clearShoppingFilters);
exportNotesButton.addEventListener("click", exportShoppingListToNotes);
sidebarRefreshButton.addEventListener("click", downloadFromGitHub);
calendarPrevButton.addEventListener("click", () => {
  calendarMonthStart = new Date(calendarMonthStart.getFullYear(), calendarMonthStart.getMonth() - 1, 1);
  renderTaskCalendar();
});
calendarNextButton.addEventListener("click", () => {
  calendarMonthStart = new Date(calendarMonthStart.getFullYear(), calendarMonthStart.getMonth() + 1, 1);
  renderTaskCalendar();
});
calendarTodayButton.addEventListener("click", () => {
  const now = new Date();
  calendarMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  renderTaskCalendar();
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

function loadLastGithubDownloadAt() {
  const raw = localStorage.getItem(STORAGE_KEYS.lastGithubDownloadAt);
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : raw;
}

function saveLastGithubDownloadAt(value) {
  if (!value) {
    localStorage.removeItem(STORAGE_KEYS.lastGithubDownloadAt);
    lastGithubDownloadAt = null;
    return;
  }

  lastGithubDownloadAt = value;
  localStorage.setItem(STORAGE_KEYS.lastGithubDownloadAt, value);
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
      color: normalizeColor(category.color),
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

  const withUniqueColors = [];
  const usedColors = new Set();

  [...uniqueById.values()].forEach((category) => {
    const preferredColor = category.color;
    const color = preferredColor && !usedColors.has(preferredColor)
      ? preferredColor
      : pickNextCategoryColor(usedColors);
    usedColors.add(color);
    withUniqueColors.push({
      ...category,
      color,
    });
  });

  return withUniqueColors;
}

function normalizeTaskCategories(categories) {
  const cleaned = categories
    .filter((category) => category && typeof category.name === "string")
    .map((category) => ({
      id: category.id || `task-cat-${crypto.randomUUID()}`,
      name: category.name.trim(),
      color: normalizeColor(category.color),
    }))
    .filter((category) => category.name.length > 0);

  if (!cleaned.some((category) => category.id === DEFAULT_TASK_CATEGORY_ID)) {
    cleaned.push({ id: DEFAULT_TASK_CATEGORY_ID, name: "Inne" });
  }

  const uniqueById = new Map();
  cleaned.forEach((category) => {
    if (!uniqueById.has(category.id)) {
      uniqueById.set(category.id, category);
    }
  });

  const withUniqueColors = [];
  const usedColors = new Set();

  [...uniqueById.values()].forEach((category) => {
    const preferredColor = category.color;
    const color = preferredColor && !usedColors.has(preferredColor)
      ? preferredColor
      : pickNextCategoryColor(usedColors);
    usedColors.add(color);
    withUniqueColors.push({
      ...category,
      color,
    });
  });

  return withUniqueColors;
}

function normalizeColor(color) {
  if (typeof color !== "string") {
    return null;
  }
  const normalized = color.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null;
}

function pickNextCategoryColor(usedColors) {
  const paletteColor = CATEGORY_COLOR_PALETTE.find((color) => !usedColors.has(color));
  if (paletteColor) {
    return paletteColor;
  }

  let hue = (usedColors.size * 47) % 360;
  let candidate = hslToHex(hue, 68, 62);
  while (usedColors.has(candidate)) {
    hue = (hue + 23) % 360;
    candidate = hslToHex(hue, 68, 62);
  }
  return candidate;
}

function hslToHex(hue, saturation, lightness) {
  const sat = saturation / 100;
  const light = lightness / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = light - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const toHex = (value) => {
    const channel = Math.round((value + m) * 255);
    return channel.toString(16).padStart(2, "0");
  };

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`.toUpperCase();
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
      const scheduleType = task.scheduleType === "date" ? "date" : "interval";
      const interval = Number(task.intervalDays);
      const safeInterval = Number.isFinite(interval) && interval > 0 ? interval : 7;
      const lastDoneAt = task.lastDoneAt || nowIso();
      const specificDate = typeof task.specificDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.specificDate)
        ? task.specificDate
        : null;

      if (scheduleType === "date") {
        const dueDate = specificDate || formatDateKeyLocal(new Date(task.nextDueAt || nowIso()));
        return {
          id: task.id || crypto.randomUUID(),
          name: task.name.trim(),
          categoryId: task.categoryId || DEFAULT_TASK_CATEGORY_ID,
          scheduleType,
          intervalDays: null,
          lastDoneAt,
          nextDueAt: new Date(`${dueDate}T12:00:00`).toISOString(),
          specificDate: dueDate,
        };
      }

      return {
        id: task.id || crypto.randomUUID(),
        name: task.name.trim(),
        categoryId: task.categoryId || DEFAULT_TASK_CATEGORY_ID,
        scheduleType,
        intervalDays: safeInterval,
        lastDoneAt,
        nextDueAt: task.nextDueAt || addDays(new Date(lastDoneAt), safeInterval).toISOString(),
        specificDate: null,
      };
    })
    .filter((task) => task.name.length > 0);
}

function ensureCategoryConsistency(currentState) {
  const itemCategoryIds = new Set(currentState.categories.map((category) => category.id));
  const taskCategoryIds = new Set(currentState.taskCategories.map((category) => category.id));
  return {
    ...currentState,
    items: currentState.items.map((item) =>
      itemCategoryIds.has(item.categoryId)
        ? item
        : {
            ...item,
            categoryId: DEFAULT_CATEGORY_ID,
          }
    ),
    tasks: currentState.tasks.map((task) =>
      taskCategoryIds.has(task.categoryId)
        ? task
        : {
            ...task,
            categoryId: DEFAULT_TASK_CATEGORY_ID,
          }
    ),
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(state.categories));
  localStorage.setItem(STORAGE_KEYS.taskCategories, JSON.stringify(state.taskCategories));
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
  renderTaskCategoryControls();
  renderShopping();
  renderMaintenance();
  renderTaskCalendar();
  renderActiveView();
  renderSidebarUpdateInfo();
  handleTaskScheduleTypeChange();
}

function renderSidebarUpdateInfo() {
  if (!lastGithubDownloadAt) {
    sidebarLastUpdate.textContent = "Ostatnia aktualizacja: brak";
    setSidebarRefreshStatus("Status: gotowe", "info");
    return;
  }

  const formatted = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(lastGithubDownloadAt));
  sidebarLastUpdate.textContent = `Ostatnia aktualizacja: ${formatted}`;
  setSidebarRefreshStatus("Status: gotowe", "success");
}

function setSidebarRefreshStatus(message, type = "info") {
  sidebarRefreshStatus.textContent = message;
  sidebarRefreshStatus.classList.remove("sidebar-refresh-info", "sidebar-refresh-success", "sidebar-refresh-error");
  sidebarRefreshStatus.classList.add(`sidebar-refresh-${type}`);
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
    label.className = "chip-label";

    const colorDot = document.createElement("span");
    colorDot.className = "chip-color-dot";
    colorDot.style.backgroundColor = category.color;
    chip.appendChild(colorDot);
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

function renderTaskCategoryControls() {
  const previousTaskCategory = taskCategorySelect.value;
  taskCategorySelect.innerHTML = "";

  const orderedCategories = [...state.taskCategories].sort((first, second) => first.name.localeCompare(second.name, "pl"));
  orderedCategories.forEach((category) => {
    taskCategorySelect.appendChild(optionNode(category.id, category.name));
  });

  taskCategorySelect.value =
    previousTaskCategory && state.taskCategories.some((category) => category.id === previousTaskCategory)
      ? previousTaskCategory
      : DEFAULT_TASK_CATEGORY_ID;

  renderTaskCategoryList();
}

function renderTaskCategoryList() {
  taskCategoryList.innerHTML = "";
  const categoriesOrdered = [...state.taskCategories].sort((first, second) => first.name.localeCompare(second.name, "pl"));

  categoriesOrdered.forEach((category) => {
    const usageCount = state.tasks.filter((task) => task.categoryId === category.id).length;

    const chip = document.createElement("div");
    chip.className = "chip";

    const label = document.createElement("span");
    label.textContent = `${category.name} (${usageCount})`;
    label.className = "chip-label";

    const colorDot = document.createElement("span");
    colorDot.className = "chip-color-dot";
    colorDot.style.backgroundColor = category.color;
    chip.appendChild(colorDot);
    chip.appendChild(label);

    if (category.id !== DEFAULT_TASK_CATEGORY_ID) {
      const removeButton = button("Usuń", "btn btn-danger", () => removeTaskCategory(category.id));
      if (usageCount > 0) {
        removeButton.disabled = true;
        removeButton.title = "Najpierw zmień kategorię czynności przypisanych do tej kategorii.";
      }
      chip.appendChild(removeButton);
    }

    taskCategoryList.appendChild(chip);
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

  const usedColors = new Set(state.categories.map((category) => category.color));
  state.categories.push({
    id: `cat-${crypto.randomUUID()}`,
    name,
    color: pickNextCategoryColor(usedColors),
  });
  categoryNameInput.value = "";
  persistAndRender();
}

function handleAddTaskCategory(event) {
  event.preventDefault();
  const name = taskCategoryNameInput.value.trim();
  if (!name) {
    return;
  }

  const alreadyExists = state.taskCategories.some((category) => category.name.toLowerCase() === name.toLowerCase());
  if (alreadyExists) {
    taskCategoryNameInput.focus();
    return;
  }

  const usedColors = new Set(state.taskCategories.map((category) => category.color));
  state.taskCategories.push({
    id: `task-cat-${crypto.randomUUID()}`,
    name,
    color: pickNextCategoryColor(usedColors),
  });
  taskCategoryNameInput.value = "";
  persistAndRender();
}

function removeTaskCategory(categoryId) {
  if (categoryId === DEFAULT_TASK_CATEGORY_ID || state.tasks.some((task) => task.categoryId === categoryId)) {
    return;
  }

  state.taskCategories = state.taskCategories.filter((category) => category.id !== categoryId);
  persistAndRender();
}

function handleTaskScheduleTypeChange() {
  const isDateMode = taskScheduleTypeSelect.value === "date";
  taskIntervalInput.classList.toggle("is-hidden", isDateMode);
  taskDateInput.classList.toggle("is-hidden", !isDateMode);
  taskIntervalInput.required = !isDateMode;
  taskDateInput.required = isDateMode;
}

function clearShoppingFilters() {
  filters.categoryId = "all";
  filters.searchText = "";
  categoryFilterSelect.value = "all";
  itemSearchInput.value = "";
  renderShopping();
}

function setExportStatus(message, type = "info") {
  exportStatus.textContent = message;
  exportStatus.classList.remove("export-info", "export-success", "export-error");
  exportStatus.classList.add(`export-${type}`);
}

function shoppingStatusText(item) {
  return item.depletionLevel === "gone" ? "Status: Brak" : "Status: Kończy się";
}

function buildShoppingExportText(groups) {
  const timestamp = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const lines = [`Lista zakupów — APS Home`, `Wygenerowano: ${timestamp}`, "", "Checklist:", ""];

  groups.forEach((group) => {
    lines.push(`${group.categoryName}:`);
    group.items.forEach((item) => {
      lines.push(`- [ ] ${item.name} (${shoppingStatusText(item)})`);
    });
    lines.push("");
  });

  return lines.join("\n").trim();
}

function downloadTextFile(content, fileName) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function exportShoppingListToNotes() {
  const shoppingItems = state.items.filter((item) => item.state === "shopping" && filterItem(item));

  if (!shoppingItems.length) {
    setExportStatus("Brak pozycji do eksportu (po uwzględnieniu filtrów).", "error");
    return;
  }

  const groups = groupShoppingItemsByCategory(shoppingItems);
  const exportText = buildShoppingExportText(groups);

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Lista zakupów APS Home",
        text: exportText,
      });
      setExportStatus("Otworzono panel udostępniania iOS. Wybierz aplikację Notatki.", "success");
      return;
    } catch (error) {
      if (error?.name !== "AbortError") {
        setExportStatus("Nie udało się otworzyć panelu udostępniania. Używam fallbacku.", "info");
      } else {
        setExportStatus("Udostępnianie anulowane.", "info");
        return;
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(exportText);
      setExportStatus("Skopiowano listę do schowka. Wklej ją do Notatek iOS.", "success");
      return;
    } catch {
      setExportStatus("Nie udało się skopiować do schowka. Pobieram plik TXT.", "info");
    }
  }

  const datePart = new Date().toISOString().slice(0, 10);
  downloadTextFile(exportText, `lista-zakupow-${datePart}.txt`);
  setExportStatus("Pobrano plik TXT z listą zakupów.", "success");
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
  const name = nameInput.value.trim();
  const categoryId = taskCategorySelect.value;
  const scheduleType = taskScheduleTypeSelect.value === "date" ? "date" : "interval";

  if (!name || !categoryId) {
    return;
  }

  const now = new Date();

  if (scheduleType === "date") {
    const specificDate = taskDateInput.value;
    if (!specificDate) {
      return;
    }

    state.tasks.push({
      id: crypto.randomUUID(),
      name,
      categoryId,
      scheduleType,
      intervalDays: null,
      lastDoneAt: now.toISOString(),
      nextDueAt: new Date(`${specificDate}T12:00:00`).toISOString(),
      specificDate,
    });
    taskDateInput.value = "";
  } else {
    const intervalDays = Number(taskIntervalInput.value);
    if (!Number.isFinite(intervalDays) || intervalDays <= 0) {
      return;
    }

    state.tasks.push({
      id: crypto.randomUUID(),
      name,
      categoryId,
      scheduleType,
      intervalDays,
      lastDoneAt: now.toISOString(),
      nextDueAt: addDays(now, intervalDays).toISOString(),
      specificDate: null,
    });
    taskIntervalInput.value = "";
  }

  nameInput.value = "";
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
    const grouped = groupShoppingItemsByCategory(shoppingItems);
    grouped.forEach((group) => {
      shoppingList.appendChild(shoppingCategoryGroup(group));
    });
  }
}

function groupShoppingItemsByCategory(items) {
  const groupsMap = new Map();

  items.forEach((item) => {
    const categoryId = item.categoryId || DEFAULT_CATEGORY_ID;
    if (!groupsMap.has(categoryId)) {
      groupsMap.set(categoryId, []);
    }
    groupsMap.get(categoryId).push(item);
  });

  return [...groupsMap.entries()]
    .map(([categoryId, groupedItems]) => {
      const categoryName = getCategoryName(categoryId);
      const categoryColor = getCategoryColor(categoryId);
      const orderedItems = [...groupedItems].sort(
        (first, second) => new Date(first.movedToShoppingAt || nowIso()) - new Date(second.movedToShoppingAt || nowIso())
      );

      return {
        categoryId,
        categoryName,
        categoryColor,
        items: orderedItems,
      };
    })
    .sort((first, second) => first.categoryName.localeCompare(second.categoryName, "pl"));
}

function shoppingCategoryGroup(group) {
  const section = document.createElement("section");
  section.className = "shopping-group";

  const header = document.createElement("header");
  header.className = "shopping-group-header";

  const colorDot = document.createElement("span");
  colorDot.className = "shopping-group-dot";
  colorDot.style.backgroundColor = group.categoryColor;

  const title = document.createElement("span");
  title.textContent = group.categoryName;

  const count = document.createElement("span");
  count.className = "shopping-group-count";
  count.textContent = `${group.items.length}`;

  header.append(colorDot, title, count);
  section.appendChild(header);

  const content = document.createElement("div");
  content.className = "shopping-group-items";
  group.items.forEach((item) => {
    content.appendChild(itemCard(item, "shopping"));
  });

  section.appendChild(content);
  return section;
}

function itemCard(item, column) {
  const card = document.createElement("article");
  card.className = "card draggable-card";
  card.draggable = true;
  const categoryColor = getCategoryColor(item.categoryId);
  applyCategoryCardColor(card, categoryColor);

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
  let shoppingStatusBadge = null;
  if (column === "stock") {
    meta.textContent = `Kategoria: ${categoryName}`;
  } else {
    const level = shoppingStatusText(item);
    meta.textContent = `Kategoria: ${categoryName}`;
    shoppingStatusBadge = document.createElement("span");
    shoppingStatusBadge.className = `badge shopping-status ${item.depletionLevel === "gone" ? "shopping-status-gone" : "shopping-status-low"}`;
    shoppingStatusBadge.textContent = level;
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

  if (shoppingStatusBadge) {
    card.append(title, meta, shoppingStatusBadge, actions);
  } else {
    card.append(title, meta, actions);
  }
  return card;
}

function getCategoryName(categoryId) {
  return state.categories.find((category) => category.id === categoryId)?.name || "Inne";
}

function getCategoryColor(categoryId) {
  return state.categories.find((category) => category.id === categoryId)?.color || "#6C63FF";
}

function applyCategoryCardColor(cardElement, categoryColor) {
  cardElement.style.borderColor = hexToRgba(categoryColor, 0.55);
  cardElement.style.background = `linear-gradient(150deg, ${hexToRgba(categoryColor, 0.14)}, #FFFFFF 42%)`;
  cardElement.style.boxShadow = `0 6px 18px ${hexToRgba(categoryColor, 0.18)}`;
}

function hexToRgba(hexColor, alpha) {
  const cleaned = normalizeColor(hexColor) || "#6C63FF";
  const red = Number.parseInt(cleaned.slice(1, 3), 16);
  const green = Number.parseInt(cleaned.slice(3, 5), 16);
  const blue = Number.parseInt(cleaned.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
  const tasksToDisplay = selectedCalendarDate
    ? state.tasks.filter((task) => getTaskDueDateKey(task) === selectedCalendarDate)
    : state.tasks;

  renderTaskDateFilterInfo(tasksToDisplay.length);

  if (!tasksToDisplay.length) {
    if (selectedCalendarDate) {
      maintenanceList.appendChild(emptyState("Brak czynności zaplanowanych na wybrany dzień."));
      return;
    }
    maintenanceList.appendChild(emptyState("Brak zadań prewencyjnych."));
    return;
  }

  [...tasksToDisplay]
    .sort((first, second) => new Date(first.nextDueAt || nowIso()) - new Date(second.nextDueAt || nowIso()))
    .forEach((task) => maintenanceList.appendChild(taskCard(task)));
}

function renderTaskDateFilterInfo(count) {
  if (!selectedCalendarDate) {
    taskDateFilter.classList.add("is-hidden");
    taskDateFilter.innerHTML = "";
    return;
  }

  const selectedDate = new Date(`${selectedCalendarDate}T12:00:00`);
  const formattedDate = formatDate(selectedDate);
  taskDateFilter.classList.remove("is-hidden");
  taskDateFilter.innerHTML = `
    <span>Filtr daty: <strong>${formattedDate}</strong> • ${count} zadań</span>
    <button id="clear-task-date-filter" type="button" class="btn">Wyczyść</button>
  `;

  const clearButton = document.getElementById("clear-task-date-filter");
  clearButton.addEventListener("click", () => {
    selectedCalendarDate = null;
    renderMaintenance();
    renderTaskCalendar();
  });
}

function taskCard(task) {
  const card = document.createElement("article");
  card.className = "card";
  const categoryColor = getTaskCategoryColor(task.categoryId);
  applyCategoryCardColor(card, categoryColor);

  if (editingTaskId === task.id) {
    card.appendChild(taskEditForm(task));
    return card;
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = task.name;

  const dueDate = new Date(task.nextDueAt);
  const dueDays = daysUntil(dueDate);
  const scheduleLabel = task.scheduleType === "date"
    ? `Konkretny dzień: ${formatDate(dueDate)}`
    : `Co ${task.intervalDays} dni • Termin: ${formatDate(dueDate)}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `Kategoria: ${getTaskCategoryName(task.categoryId)} • ${scheduleLabel}`;

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

  const task = state.tasks.find((currentTask) => currentTask.id === taskId);
  if (!task) {
    return;
  }

  if (task.scheduleType === "date") {
    state.tasks = state.tasks.filter((currentTask) => currentTask.id !== taskId);
  } else {
    state.tasks = state.tasks.map((currentTask) =>
      currentTask.id === taskId
        ? {
            ...currentTask,
            lastDoneAt: now.toISOString(),
            nextDueAt: addDays(now, currentTask.intervalDays).toISOString(),
          }
        : currentTask
    );
  }

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
  intervalInput.required = task.scheduleType !== "date";
  intervalInput.min = "1";
  intervalInput.value = String(task.intervalDays || "");

  const categorySelect = document.createElement("select");
  categorySelect.required = true;
  [...state.taskCategories]
    .sort((first, second) => first.name.localeCompare(second.name, "pl"))
    .forEach((category) => {
      categorySelect.appendChild(optionNode(category.id, category.name));
    });
  categorySelect.value = task.categoryId;

  const scheduleTypeSelect = document.createElement("select");
  scheduleTypeSelect.required = true;
  scheduleTypeSelect.appendChild(optionNode("interval", "Iteracja (co X dni)"));
  scheduleTypeSelect.appendChild(optionNode("date", "Konkretny dzień"));
  scheduleTypeSelect.value = task.scheduleType;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = task.specificDate || "";
  dateInput.required = task.scheduleType === "date";
  intervalInput.classList.toggle("is-hidden", task.scheduleType === "date");
  dateInput.classList.toggle("is-hidden", task.scheduleType !== "date");

  scheduleTypeSelect.addEventListener("change", () => {
    const isDateMode = scheduleTypeSelect.value === "date";
    intervalInput.classList.toggle("is-hidden", isDateMode);
    dateInput.classList.toggle("is-hidden", !isDateMode);
    intervalInput.required = !isDateMode;
    dateInput.required = isDateMode;
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(button("Zapisz", "btn btn-success", () => {}));
  actions.appendChild(button("Anuluj", "btn", cancelEditTask));
  actions.firstChild.type = "submit";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedName = nameInput.value.trim();
    const updatedCategory = categorySelect.value;
    const updatedScheduleType = scheduleTypeSelect.value === "date" ? "date" : "interval";
    const updatedInterval = Number(intervalInput.value);
    const updatedDate = dateInput.value;

    if (!updatedName || !updatedCategory) {
      return;
    }

    state.tasks = state.tasks.map((current) => {
      if (current.id !== task.id) {
        return current;
      }

      if (updatedScheduleType === "date") {
        if (!updatedDate) {
          return current;
        }
        return {
          ...current,
          name: updatedName,
          categoryId: updatedCategory,
          scheduleType: updatedScheduleType,
          intervalDays: null,
          specificDate: updatedDate,
          nextDueAt: new Date(`${updatedDate}T12:00:00`).toISOString(),
        };
      }

      if (!Number.isFinite(updatedInterval) || updatedInterval <= 0) {
        return current;
      }

      const referenceDate = current.lastDoneAt ? new Date(current.lastDoneAt) : new Date();
      return {
        ...current,
        name: updatedName,
        categoryId: updatedCategory,
        scheduleType: updatedScheduleType,
        intervalDays: updatedInterval,
        specificDate: null,
        nextDueAt: addDays(referenceDate, updatedInterval).toISOString(),
      };
    });

    editingTaskId = null;
    persistAndRender();
  });

  form.append(nameInput, categorySelect, scheduleTypeSelect, intervalInput, dateInput, actions);
  return form;
}

function getTaskCategoryName(categoryId) {
  return state.taskCategories.find((category) => category.id === categoryId)?.name || "Inne";
}

function getTaskCategoryColor(categoryId) {
  return state.taskCategories.find((category) => category.id === categoryId)?.color || "#7E57C2";
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

function formatDateKeyLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTaskDueDateKey(task) {
  if (task.scheduleType === "date" && task.specificDate) {
    return task.specificDate;
  }

  if (!task.nextDueAt) {
    return null;
  }

  return formatDateKeyLocal(new Date(task.nextDueAt));
}

function renderTaskCalendar() {
  const monthLabel = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(calendarMonthStart);
  calendarMonthLabel.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const taskDays = new Map();
  state.tasks.forEach((task) => {
    const dateKey = getTaskDueDateKey(task);
    if (!dateKey) {
      return;
    }

    if (!taskDays.has(dateKey)) {
      taskDays.set(dateKey, new Set());
    }
    taskDays.get(dateKey).add(getTaskCategoryColor(task.categoryId));
  });

  const year = calendarMonthStart.getFullYear();
  const month = calendarMonthStart.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  taskCalendarGrid.innerHTML = "";
  const weekDayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
  weekDayLabels.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "calendar-weekday";
    cell.textContent = label;
    taskCalendarGrid.appendChild(cell);
  });

  for (let index = 0; index < firstWeekday; index += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day is-empty";
    taskCalendarGrid.appendChild(emptyCell);
  }

  const todayKey = formatDateKeyLocal(new Date());
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const dateObject = new Date(year, month, dayNumber);
    const dateKey = formatDateKeyLocal(dateObject);

    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";
    dayCell.addEventListener("click", () => {
      selectedCalendarDate = selectedCalendarDate === dateKey ? null : dateKey;
      renderMaintenance();
      renderTaskCalendar();
    });
    if (dateKey === todayKey) {
      dayCell.classList.add("is-today");
    }
    if (selectedCalendarDate === dateKey) {
      dayCell.classList.add("is-selected");
    }

    const dayLabel = document.createElement("span");
    dayLabel.className = "calendar-day-number";
    dayLabel.textContent = String(dayNumber);
    dayCell.appendChild(dayLabel);

    const colors = [...(taskDays.get(dateKey) || [])];
    if (colors.length) {
      dayCell.classList.add("has-task");
      const dots = document.createElement("div");
      dots.className = "calendar-dots";
      colors.slice(0, 3).forEach((color) => {
        const dot = document.createElement("span");
        dot.className = "calendar-dot";
        dot.style.backgroundColor = color;
        dots.appendChild(dot);
      });
      dayCell.appendChild(dots);
    }

    taskCalendarGrid.appendChild(dayCell);
  }
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
  sidebarRefreshButton.disabled = isBusy;
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
      taskCategories: state.taskCategories,
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
  const nextTaskCategories = Array.isArray(remoteState.taskCategories)
    ? normalizeTaskCategories(remoteState.taskCategories)
    : normalizeTaskCategories(defaultTaskCategories);
  const nextItems = Array.isArray(remoteState.items) ? normalizeItems(remoteState.items) : null;
  const nextTasks = Array.isArray(remoteState.tasks) ? normalizeTasks(remoteState.tasks) : null;

  if (!nextItems || !nextTasks) {
    throw new Error("Plik zdalny musi zawierać tablice items i tasks.");
  }

  state = ensureCategoryConsistency({
    categories: nextCategories,
    taskCategories: nextTaskCategories,
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
    setSidebarRefreshStatus("Status: trwa aktualizacja…", "info");
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
    saveLastGithubDownloadAt(nowIso());
    renderSidebarUpdateInfo();
    setSidebarRefreshStatus("Status: sukces", "success");
    setSyncStatus("Pobrano dane i zaktualizowano stan lokalny.", "success");
  } catch (error) {
    setSidebarRefreshStatus("Status: błąd aktualizacji", "error");
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
