const STORAGE_KEYS = {
  items: "aps-home-items-v1",
  tasks: "aps-home-maintenance-v1",
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

let editingItemId = null;
let editingTaskId = null;
let draggedItemId = null;

const stockList = document.getElementById("stock-list");
const shoppingList = document.getElementById("shopping-list");
const maintenanceList = document.getElementById("maintenance-list");

document.getElementById("item-form").addEventListener("submit", handleAddItem);
document.getElementById("task-form").addEventListener("submit", handleAddTask);

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

function saveData() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
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