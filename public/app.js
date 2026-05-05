let allItems = [];
let activeCategory = "All";
let activeItemId = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const grid          = document.getElementById("itemGrid");
const emptyState    = document.getElementById("emptyState");
const itemCount     = document.getElementById("itemCount");
const searchInput   = document.getElementById("searchInput");

const modalOverlay  = document.getElementById("modalOverlay");
const modalTitle    = document.getElementById("modalTitle");
const itemForm      = document.getElementById("itemForm");
const editId        = document.getElementById("editId");
const photoInput    = document.getElementById("photoInput");
const photoPreview  = document.getElementById("photoPreview");
const photoPlaceholder = document.getElementById("photoPlaceholder");
const photoUploadArea  = document.getElementById("photoUploadArea");

const detailOverlay = document.getElementById("detailOverlay");
const detailBody    = document.getElementById("detailBody");
const editItemBtn   = document.getElementById("editItemBtn");
const deleteItemBtn = document.getElementById("deleteItemBtn");

const toast         = document.getElementById("toast");

// ── Init ──────────────────────────────────────────────────────────────────────
fetchItems();

// ── Fetch / render ────────────────────────────────────────────────────────────
async function fetchItems() {
  const res = await fetch("/api/items");
  allItems = await res.json();
  renderGrid();
}

function renderGrid() {
  const query = searchInput.value.toLowerCase();
  const filtered = allItems.filter(item => {
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    const matchSearch = !query ||
      item.name.toLowerCase().includes(query) ||
      (item.brand || "").toLowerCase().includes(query) ||
      (item.color || "").toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  itemCount.textContent = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  grid.innerHTML = filtered.map(item => `
    <div class="card" data-id="${item.id}">
      ${item.photo
        ? `<img class="card-photo" src="${item.photo}" alt="${escHtml(item.name)}" loading="lazy" />`
        : `<div class="card-photo-placeholder">&#128084;</div>`}
      <div class="card-info">
        <div class="card-name">${escHtml(item.name)}</div>
        <div class="card-meta">
          <span class="card-tag">${escHtml(item.category)}</span>
          ${item.brand ? `<span class="card-tag">${escHtml(item.brand)}</span>` : ""}
          ${item.size  ? `<span class="card-tag">${escHtml(item.size)}</span>`  : ""}
        </div>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => openDetail(card.dataset.id));
  });
}

// ── Category filters ──────────────────────────────────────────────────────────
document.getElementById("categoryFilters").addEventListener("click", e => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeCategory = btn.dataset.cat;
  renderGrid();
});

searchInput.addEventListener("input", renderGrid);

// ── Add modal ─────────────────────────────────────────────────────────────────
document.getElementById("openAddModal").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeModal(); });

function openModal(item = null) {
  itemForm.reset();
  clearPhotoPreview();
  editId.value = "";

  if (item) {
    modalTitle.textContent = "Edit Item";
    editId.value = item.id;
    document.getElementById("fieldName").value     = item.name || "";
    document.getElementById("fieldCategory").value = item.category || "";
    document.getElementById("fieldBrand").value    = item.brand || "";
    document.getElementById("fieldSize").value     = item.size || "";
    document.getElementById("fieldColor").value    = item.color || "";
    document.getElementById("fieldNotes").value    = item.notes || "";
    if (item.photo) showPhotoPreview(item.photo);
  } else {
    modalTitle.textContent = "Add Clothing Item";
  }

  modalOverlay.classList.add("open");
}

function closeModal() {
  modalOverlay.classList.remove("open");
}

// ── Photo preview ─────────────────────────────────────────────────────────────
photoUploadArea.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  showPhotoPreview(url);
});

function showPhotoPreview(src) {
  photoPreview.src = src;
  photoPreview.style.display = "block";
  photoPlaceholder.style.display = "none";
}

function clearPhotoPreview() {
  photoPreview.src = "";
  photoPreview.style.display = "none";
  photoPlaceholder.style.display = "flex";
  photoInput.value = "";
}

// ── Form submit ───────────────────────────────────────────────────────────────
itemForm.addEventListener("submit", async e => {
  e.preventDefault();

  const fd = new FormData();
  fd.append("name",     document.getElementById("fieldName").value.trim());
  fd.append("category", document.getElementById("fieldCategory").value);
  fd.append("brand",    document.getElementById("fieldBrand").value.trim());
  fd.append("size",     document.getElementById("fieldSize").value.trim());
  fd.append("color",    document.getElementById("fieldColor").value.trim());
  fd.append("notes",    document.getElementById("fieldNotes").value.trim());
  if (photoInput.files[0]) fd.append("photo", photoInput.files[0]);

  const id = editId.value;
  const url    = id ? `/api/items/${id}` : "/api/items";
  const method = id ? "PUT" : "POST";

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const res = await fetch(url, { method, body: fd });
    if (!res.ok) throw new Error("Server error");
    closeModal();
    await fetchItems();
    showToast(id ? "Item updated!" : "Item added to your wardrobe!");
  } catch {
    showToast("Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Item";
  }
});

// ── Detail modal ──────────────────────────────────────────────────────────────
function openDetail(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  activeItemId = id;

  detailBody.innerHTML = `
    <div class="detail-photo-wrap">
      ${item.photo
        ? `<img src="${item.photo}" alt="${escHtml(item.name)}" />`
        : `<div class="detail-photo-placeholder">&#128084;</div>`}
    </div>
    <div class="detail-info">
      <div class="detail-name">${escHtml(item.name)}</div>
      <div class="detail-category">${escHtml(item.category)}</div>
      <div class="detail-fields">
        ${item.brand ? detailField("Brand",  item.brand) : ""}
        ${item.size  ? detailField("Size",   item.size)  : ""}
        ${item.color ? detailField("Color",  item.color) : ""}
        ${detailField("Added", new Date(item.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" }))}
      </div>
      ${item.notes ? `<div class="detail-notes">${escHtml(item.notes)}</div>` : ""}
    </div>
  `;

  detailOverlay.classList.add("open");
}

function detailField(label, value) {
  return `<div class="detail-field"><label>${label}</label><span>${escHtml(value)}</span></div>`;
}

document.getElementById("closeDetail").addEventListener("click", closeDetail);
detailOverlay.addEventListener("click", e => { if (e.target === detailOverlay) closeDetail(); });

function closeDetail() {
  detailOverlay.classList.remove("open");
  activeItemId = null;
}

editItemBtn.addEventListener("click", () => {
  const item = allItems.find(i => i.id === activeItemId);
  if (!item) return;
  closeDetail();
  openModal(item);
});

deleteItemBtn.addEventListener("click", async () => {
  if (!activeItemId) return;
  const item = allItems.find(i => i.id === activeItemId);
  if (!confirm(`Delete "${item?.name}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/items/${activeItemId}`, { method: "DELETE" });
    if (!res.ok) throw new Error();
    closeDetail();
    await fetchItems();
    showToast("Item deleted.");
  } catch {
    showToast("Could not delete item.");
  }
});

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
