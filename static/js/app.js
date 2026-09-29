/* =========================================================
   Student Management System: frontend logic
   Every action below calls the existing FastAPI REST API:
     POST   /students          create
     GET    /students          list (name, course, semester, page, limit)
     GET    /students/{id}     read one
     PUT    /students/{id}     update
     DELETE /students/{id}     delete
   ========================================================= */
"use strict";

const API = "/students";

const state = {
  page: 1,
  limit: 10,
  name: "",
  course: "",
  semester: "",
  lastList: null,     // last GET /students response
};

const $ = (selector) => document.querySelector(selector);

/* ---------------------------------------------------------
   API helper
   --------------------------------------------------------- */
class ApiError extends Error {
  constructor(status, detail) {
    super(`API error ${status}`);
    this.status = status;   // 0 means the server could not be reached
    this.detail = detail;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, null);
  }
  if (response.status === 204) return null;

  let data = null;
  try { data = await response.json(); } catch { /* empty or non-JSON body */ }
  if (!response.ok) throw new ApiError(response.status, data && data.detail);
  return data;
}

function friendlyError(error) {
  switch (error.status) {
    case 0:   return { title: "Unable to connect to the server.", message: "Please make sure the FastAPI server is running." };
    case 400: return { title: "Email already in use", message: "A student with this email already exists." };
    case 404: return { title: "Student not found.", message: "This student may have already been deleted." };
    case 422: return { title: "Invalid information", message: "Please check the entered information." };
    default:  return { title: "Something went wrong", message: `The server responded with status ${error.status}. Please try again.` };
  }
}

/* ---------------------------------------------------------
   Small helpers
   --------------------------------------------------------- */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function icon(name, cls = "icon") {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

function avatarTone(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `av-${hash % 6}`;
}

function avatar(name, size = "") {
  return `<span class="avatar ${size} ${avatarTone(name)}" aria-hidden="true">${escapeHtml(initials(name))}</span>`;
}

function setBusy(button, busy, busyText) {
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${busyText}`;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
}

/* ---------------------------------------------------------
   Toast notifications
   --------------------------------------------------------- */
function toast(type, title, message = "") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.innerHTML = `
    <span class="toast-icon">${icon(type === "success" ? "check" : "alert")}</span>
    <div class="toast-text">
      <p class="toast-title">${escapeHtml(title)}</p>
      ${message ? `<p class="toast-msg">${escapeHtml(message)}</p>` : ""}
    </div>
    <button class="icon-btn" type="button" aria-label="Dismiss">${icon("x")}</button>`;

  const remove = () => {
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector("button").addEventListener("click", remove);
  $("#toasts").appendChild(el);
  setTimeout(remove, type === "error" ? 6000 : 4000);
}

function toastError(error) {
  const { title, message } = friendlyError(error);
  toast("error", title, message);
}

/* ---------------------------------------------------------
   Statistics (reads every page of GET /students)
   --------------------------------------------------------- */
async function fetchAllStudents() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await request("GET", `${API}?page=${page}&limit=100`);
    all.push(...data.students);
    totalPages = data.total_pages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

async function loadStats() {
  try {
    const all = await fetchAllStudents();
    const courses = [...new Set(all.map((s) => s.course))].sort((a, b) => a.localeCompare(b));
    const semesters = all.map((s) => s.semester);

    $("#stat-total").textContent = all.length;
    $("#stat-courses").textContent = courses.length;
    $("#stat-semesters").textContent = semesters.length
      ? (Math.min(...semesters) === Math.max(...semesters)
          ? `${Math.min(...semesters)}`
          : `${Math.min(...semesters)} – ${Math.max(...semesters)}`)
      : "—";

    fillCourseOptions(courses);
  } catch {
    ["#stat-total", "#stat-courses", "#stat-semesters"].forEach((id) => { $(id).textContent = "—"; });
  }
}

function fillCourseOptions(courses) {
  const select = $("#filter-course");
  const current = state.course;
  select.innerHTML = `<option value="">All courses</option>` +
    courses.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  // Keep the active filter selectable even if no student has that course any more
  if (current && !courses.includes(current)) {
    select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(current)}">${escapeHtml(current)}</option>`);
  }
  select.value = current;

  $("#course-options").innerHTML = courses.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
}

/* ---------------------------------------------------------
   Student list
   --------------------------------------------------------- */
let listRequest = 0;

function hasFilters() {
  return Boolean(state.name || state.course || state.semester);
}

function showSkeleton() {
  const row = `
    <tr class="skeleton-row">
      <td><span class="skeleton" style="width:24px"></span></td>
      <td><div class="cell-student"><span class="skeleton skeleton-circle"></span><span class="skeleton-stack"><span class="skeleton" style="width:120px"></span><span class="skeleton" style="width:80px;height:10px"></span></span></div></td>
      <td><span class="skeleton" style="width:150px"></span></td>
      <td><span class="skeleton" style="width:130px"></span></td>
      <td><span class="skeleton" style="width:50px"></span></td>
      <td><span class="skeleton" style="width:90px"></span></td>
    </tr>`;
  $("#student-rows").innerHTML = row.repeat(Math.min(state.limit, 5));
  $("#table-wrap").hidden = false;
  $("#state-panel").hidden = true;
  $("#table-footer").hidden = true;
}

async function loadStudents({ highlightId = null, showLoading = true } = {}) {
  const requestId = ++listRequest;
  if (showLoading) showSkeleton();

  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.name) params.set("name", state.name);
  if (state.course) params.set("course", state.course);
  if (state.semester) params.set("semester", state.semester);

  try {
    const data = await request("GET", `${API}?${params}`);
    if (requestId !== listRequest) return; // a newer request has started

    // The page is now past the end (e.g. after deleting the last student on it)
    if (data.students.length === 0 && data.total > 0 && state.page > 1) {
      state.page = data.total_pages;
      return loadStudents({ highlightId, showLoading: false });
    }

    state.lastList = data;
    renderStudents(data, highlightId);
    setApiStatus(true);
  } catch (error) {
    if (requestId !== listRequest) return;
    renderLoadError(error);
  }
}

function renderStudents(data, highlightId) {
  renderActiveFilters();
  $("#stat-page").innerHTML = `${data.page}<small> / ${Math.max(data.total_pages, 1)}</small>`;
  $("#stat-page-caption").textContent = `${data.limit} students per page`;

  if (data.students.length === 0) {
    renderEmpty();
    return;
  }

  $("#student-rows").innerHTML = data.students.map((s) => `
    <tr data-id="${s.id}" class="${s.id === highlightId ? "is-new" : ""}">
      <td class="cell-id" data-label="ID">#${s.id}</td>
      <td class="cell-student-td" data-label="Student">
        <div class="cell-student">${avatar(s.name)}<span class="student-meta"><strong>${escapeHtml(s.name)}</strong><span class="student-sub">${escapeHtml(s.course)}</span></span></div>
      </td>
      <td class="cell-email" data-label="Email">${escapeHtml(s.email)}</td>
      <td class="cell-course-td" data-label="Course"><span class="badge badge-course">${escapeHtml(s.course)}</span></td>
      <td class="cell-sem-td" data-label="Semester"><span class="badge badge-sem">Semester ${s.semester}</span></td>
      <td class="cell-actions-td">
        <div class="cell-actions">
          <button class="action-btn action-view" type="button" data-action="view" data-id="${s.id}" data-tooltip="View details" aria-label="View ${escapeHtml(s.name)}">${icon("eye")}<span class="action-label">View</span></button>
          <button class="action-btn action-edit" type="button" data-action="edit" data-id="${s.id}" data-tooltip="Edit student" aria-label="Edit ${escapeHtml(s.name)}">${icon("pencil")}<span class="action-label">Edit</span></button>
          <button class="action-btn action-delete" type="button" data-action="delete" data-id="${s.id}" data-name="${escapeHtml(s.name)}" data-tooltip="Delete student" aria-label="Delete ${escapeHtml(s.name)}">${icon("trash")}<span class="action-label">Delete</span></button>
        </div>
      </td>
    </tr>`).join("");

  $("#table-wrap").hidden = false;
  $("#state-panel").hidden = true;
  $("#table-footer").hidden = false;
  renderPagination(data);
}

function renderEmpty() {
  $("#table-wrap").hidden = true;
  $("#table-footer").hidden = true;
  const panel = $("#state-panel");
  panel.hidden = false;

  if (hasFilters()) {
    panel.innerHTML = `
      <span class="state-icon">${icon("search")}</span>
      <h3>No matching students</h3>
      <p>Try changing your search or filters.</p>
      <button class="btn btn-secondary" type="button" data-action="clear-filters">Clear Filters</button>`;
  } else {
    panel.innerHTML = `
      <span class="state-icon">${icon("users")}</span>
      <h3>No Students Found</h3>
      <p>There are currently no student records.</p>
      <button class="btn btn-primary" type="button" data-action="add">${icon("plus")} Add Student</button>`;
  }
}

function renderLoadError(error) {
  setApiStatus(error.status !== 0);
  const { title, message } = friendlyError(error);
  $("#table-wrap").hidden = true;
  $("#table-footer").hidden = true;
  const panel = $("#state-panel");
  panel.hidden = false;
  panel.innerHTML = `
    <span class="state-icon is-error">${icon("alert")}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
    <button class="btn btn-secondary" type="button" data-action="retry">${icon("refresh")} Try Again</button>`;
  $("#stat-page").textContent = "—";
}

function renderActiveFilters() {
  const chips = [];
  if (state.name) chips.push(["name", `Name: “${state.name}”`]);
  if (state.course) chips.push(["course", `Course: ${state.course}`]);
  if (state.semester) chips.push(["semester", `Semester ${state.semester}`]);

  const box = $("#active-filters");
  box.hidden = chips.length === 0;
  box.innerHTML = chips.length
    ? `<span>Filtered by</span>` + chips.map(([key, label]) => `
        <span class="chip">${escapeHtml(label)}
          <button type="button" data-remove-filter="${key}" aria-label="Remove filter ${escapeHtml(label)}">${icon("x")}</button>
        </span>`).join("")
    : "";
}

function pageNumbers(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

function renderPagination(data) {
  const from = (data.page - 1) * data.limit + 1;
  const to = from + data.students.length - 1;
  const noun = data.total === 1 ? "student" : "students";
  $("#showing-text").innerHTML = `Showing <strong>${from}–${to}</strong> of <strong>${data.total}</strong> ${noun}`;

  const total = Math.max(data.total_pages, 1);
  const buttons = [
    `<button class="page-btn" type="button" data-page="${data.page - 1}" ${data.page <= 1 ? "disabled" : ""} aria-label="Previous page">${icon("chev-left", "icon icon-sm")}</button>`,
    ...pageNumbers(data.page, total).map((p) => p === "gap"
      ? `<span class="page-gap">…</span>`
      : `<button class="page-btn ${p === data.page ? "is-current" : ""}" type="button" data-page="${p}" ${p === data.page ? 'aria-current="page"' : ""} aria-label="Page ${p}">${p}</button>`),
    `<button class="page-btn" type="button" data-page="${data.page + 1}" ${data.page >= total ? "disabled" : ""} aria-label="Next page">${icon("chev-right", "icon icon-sm")}</button>`,
  ];
  $("#pager").innerHTML = buttons.join("");
}

/* ---------------------------------------------------------
   Filters
   --------------------------------------------------------- */
function applyFilters() {
  state.name = $("#filter-name").value.trim();
  state.course = $("#filter-course").value;
  state.semester = $("#filter-semester").value;
  state.page = 1;
  loadStudents();
}

function clearFilters() {
  $("#filter-name").value = "";
  $("#filter-course").value = "";
  $("#filter-semester").value = "";
  applyFilters();
}

/* ---------------------------------------------------------
   Modal helpers
   --------------------------------------------------------- */
function openModal(dialog) {
  if (!dialog.open) dialog.showModal();
}

function closeModal(dialog) {
  if (dialog.dataset.busy === "true") return;
  dialog.close();
}

/* ---------------------------------------------------------
   Add / Edit student
   --------------------------------------------------------- */
const FIELDS = ["name", "email", "course", "semester"];
const FIELD_MESSAGES = {
  name: "Please enter the student's full name (up to 100 characters).",
  email: "Please enter a valid email address, e.g. harsh@example.com.",
  course: "Please enter a course (up to 100 characters).",
  semester: "Semester must be a whole number from 1 to 12.",
};
let editingId = null;

function clearFormErrors() {
  FIELDS.forEach((f) => setFieldError(f, ""));
  $("#student-form-alert").hidden = true;
}

function setFieldError(field, message) {
  const input = $(`#f-${field}`);
  $(`#f-${field}-error`).textContent = message;
  if (message) {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", `f-${field}-error`);
  } else {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  }
}

function showFormAlert(message) {
  const alert = $("#student-form-alert");
  alert.innerHTML = `${icon("alert")}<span>${escapeHtml(message)}</span>`;
  alert.hidden = false;
}

function readForm() {
  return {
    name: $("#f-name").value.trim(),
    email: $("#f-email").value.trim(),
    course: $("#f-course").value.trim(),
    semester: $("#f-semester").value.trim(),
  };
}

/* Mirrors the Pydantic rules so users get instant feedback. The API still validates everything. */
function validateForm(values) {
  const errors = {};
  if (!values.name || values.name.length > 100) errors.name = FIELD_MESSAGES.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = FIELD_MESSAGES.email;
  if (!values.course || values.course.length > 100) errors.course = FIELD_MESSAGES.course;
  const sem = Number(values.semester);
  if (!values.semester || !Number.isInteger(sem) || sem < 1 || sem > 12) errors.semester = FIELD_MESSAGES.semester;
  return errors;
}

function openCreateModal() {
  editingId = null;
  const form = $("#student-form");
  form.reset();
  clearFormErrors();
  $("#student-modal-title").textContent = "Add New Student";
  $("#student-modal-sub").textContent = "Fill in the details below to create a student record.";
  $("#f-id").value = "";
  $("#f-id").placeholder = "Auto-generated (e.g. 101)";
  $("#f-id-hint").textContent = "The API assigns the next free ID automatically when the student is created.";
  $("#student-submit").textContent = "Create Student";
  $("#student-form-loading").hidden = true;
  $("#student-form-fields").hidden = false;
  $("#student-submit").disabled = false;
  openModal($("#student-modal"));
  $("#f-name").focus();
}

async function openEditModal(id) {
  editingId = id;
  $("#student-form").reset();
  clearFormErrors();
  $("#student-modal-title").textContent = "Edit Student";
  $("#student-modal-sub").textContent = "Update the student's information and save your changes.";
  $("#student-submit").textContent = "Save Changes";
  $("#student-form-loading").hidden = false;
  $("#student-form-fields").hidden = true;
  $("#student-submit").disabled = true;
  openModal($("#student-modal"));

  try {
    const s = await request("GET", `${API}/${id}`);
    if (editingId !== id) return;
    $("#f-id").value = s.id;
    $("#f-id-hint").textContent = "The student ID cannot be changed.";
    $("#f-name").value = s.name;
    $("#f-email").value = s.email;
    $("#f-course").value = s.course;
    $("#f-semester").value = s.semester;
    $("#student-form-loading").hidden = true;
    $("#student-form-fields").hidden = false;
    $("#student-submit").disabled = false;
    $("#f-name").focus();
  } catch (error) {
    $("#student-modal").close();
    toastError(error);
    if (error.status === 404) refreshAll();
  }
}

async function submitStudentForm(event) {
  event.preventDefault();
  clearFormErrors();

  const values = readForm();
  const errors = validateForm(values);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([f, m]) => setFieldError(f, m));
    $(`#f-${Object.keys(errors)[0]}`).focus();
    return;
  }

  const payload = { ...values, semester: Number(values.semester) };
  const isEdit = editingId !== null;
  const button = $("#student-submit");
  const dialog = $("#student-modal");

  setBusy(button, true, isEdit ? "Saving..." : "Creating...");
  dialog.dataset.busy = "true";
  try {
    const student = isEdit
      ? await request("PUT", `${API}/${editingId}`, payload)
      : await request("POST", API, payload);

    dialog.dataset.busy = "false";
    dialog.close();
    toast("success", isEdit ? "Student updated successfully" : "Student created successfully",
      `${student.name} (ID ${student.id})`);

    if (!isEdit && state.lastList) {
      // Jump to the page where the new student appears (new students are added at the end)
      state.page = Math.max(1, Math.ceil((state.lastList.total + 1) / state.limit));
    }
    refreshAll(student.id);
  } catch (error) {
    dialog.dataset.busy = "false";
    handleFormError(error);
  } finally {
    setBusy(button, false);
  }
}

function handleFormError(error) {
  if (error.status === 400) {
    setFieldError("email", "A student with this email already exists.");
    $("#f-email").focus();
    toastError(error);
  } else if (error.status === 422) {
    const fields = Array.isArray(error.detail)
      ? error.detail.map((d) => d.loc && d.loc[d.loc.length - 1]).filter((f) => FIELDS.includes(f))
      : [];
    fields.forEach((f) => setFieldError(f, FIELD_MESSAGES[f]));
    showFormAlert("Please check the entered information.");
    if (fields.length) $(`#f-${fields[0]}`).focus();
  } else if (error.status === 404) {
    $("#student-modal").close();
    toastError(error);
    refreshAll();
  } else {
    const { title, message } = friendlyError(error);
    showFormAlert(`${title} ${message}`);
  }
}

/* ---------------------------------------------------------
   View student
   --------------------------------------------------------- */
let viewingId = null;

async function openViewModal(id) {
  viewingId = id;
  const body = $("#view-body");
  body.innerHTML = `<div class="modal-loading"><span class="spinner spinner-lg"></span> Loading student...</div>`;
  $("#view-edit").disabled = true;
  openModal($("#view-modal"));

  try {
    const s = await request("GET", `${API}/${id}`);
    if (viewingId !== id) return;
    body.innerHTML = `
      <div class="profile">
        ${avatar(s.name, "avatar-lg")}
        <h3>${escapeHtml(s.name)}</h3>
        <p class="profile-id">Student ID: ${s.id}</p>
      </div>
      <dl class="detail-list">
        <div class="detail-row">
          <span class="detail-icon">${icon("mail")}</span>
          <div><dt>Email</dt><dd>${escapeHtml(s.email)}</dd></div>
        </div>
        <div class="detail-row">
          <span class="detail-icon">${icon("book")}</span>
          <div><dt>Course</dt><dd>${escapeHtml(s.course)}</dd></div>
        </div>
        <div class="detail-row">
          <span class="detail-icon">${icon("calendar")}</span>
          <div><dt>Semester</dt><dd>Semester ${s.semester}</dd></div>
        </div>
      </dl>`;
    $("#view-edit").disabled = false;
  } catch (error) {
    $("#view-modal").close();
    toastError(error);
    if (error.status === 404) refreshAll();
  }
}

/* ---------------------------------------------------------
   Delete student
   --------------------------------------------------------- */
let deletingId = null;

function openDeleteModal(id, name) {
  deletingId = id;
  $("#delete-name").textContent = name;
  openModal($("#delete-modal"));
  $("#delete-modal").querySelector("[data-close]").focus();
}

async function confirmDelete() {
  const button = $("#delete-confirm");
  const dialog = $("#delete-modal");
  const name = $("#delete-name").textContent;

  setBusy(button, true, "Deleting...");
  dialog.dataset.busy = "true";
  try {
    await request("DELETE", `${API}/${deletingId}`);
    toast("success", "Student deleted successfully", `${name} was removed.`);
  } catch (error) {
    toastError(error);
  } finally {
    dialog.dataset.busy = "false";
    setBusy(button, false);
    dialog.close();
    refreshAll();
  }
}

/* ---------------------------------------------------------
   API status + refresh
   --------------------------------------------------------- */
function setApiStatus(online) {
  // The status appears in both the sidebar and the top header
  document.querySelectorAll("[data-api-status]").forEach((el) => { el.dataset.state = online ? "online" : "offline"; });
  document.querySelectorAll("[data-api-status-text]").forEach((el) => { el.textContent = online ? "API connected" : "API not reachable"; });
}

async function checkHealth() {
  try {
    await request("GET", "/health");
    setApiStatus(true);
  } catch {
    setApiStatus(false);
  }
}

function refreshAll(highlightId = null) {
  loadStudents({ highlightId, showLoading: false });
  loadStats();
}

/* ---------------------------------------------------------
   Sidebar (mobile)
   --------------------------------------------------------- */
function setSidebar(open) {
  document.body.classList.toggle("sidebar-open", open);
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
}

function setActiveNav(key) {
  document.querySelectorAll("[data-nav]").forEach((el) => el.classList.toggle("is-active", el.dataset.nav === key));
}

/* ---------------------------------------------------------
   Events
   --------------------------------------------------------- */
function bindEvents() {
  // Delegated clicks: add, view, edit, delete, pagination, clear filters, retry
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action], [data-page], [data-remove-filter]");
    if (!target) return;

    if (target.dataset.page) {
      if (target.disabled || target.classList.contains("is-current")) return;
      state.page = Number(target.dataset.page);
      loadStudents();
      $("#students").scrollIntoView({ block: "start" });
      return;
    }
    if (target.dataset.removeFilter) {
      const key = target.dataset.removeFilter;
      $(`#filter-${key}`).value = "";
      applyFilters();
      return;
    }

    const id = Number(target.dataset.id);
    switch (target.dataset.action) {
      case "add":           setSidebar(false); openCreateModal(); break;
      case "view":          openViewModal(id); break;
      case "edit":          openEditModal(id); break;
      case "delete":        openDeleteModal(id, target.dataset.name); break;
      case "clear-filters": clearFilters(); break;
      case "retry":         checkHealth(); refreshAll(); break;
    }
  });

  $("#filter-form").addEventListener("submit", (e) => { e.preventDefault(); applyFilters(); });
  $("#filter-course").addEventListener("change", applyFilters);
  $("#filter-semester").addEventListener("change", applyFilters);
  $("#clear-filters").addEventListener("click", clearFilters);
  $("#page-size").addEventListener("change", (e) => {
    state.limit = Number(e.target.value);
    state.page = 1;
    loadStudents();
  });

  $("#student-form").addEventListener("submit", submitStudentForm);
  FIELDS.forEach((f) => $(`#f-${f}`).addEventListener("input", () => setFieldError(f, "")));

  $("#view-edit").addEventListener("click", () => {
    $("#view-modal").close();
    openEditModal(viewingId);
  });
  $("#delete-confirm").addEventListener("click", confirmDelete);

  // Close buttons, backdrop clicks and Escape for every modal
  document.querySelectorAll("dialog.modal").forEach((dialog) => {
    dialog.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", () => closeModal(dialog)));
    dialog.addEventListener("click", (e) => { if (e.target === dialog) closeModal(dialog); });
    dialog.addEventListener("cancel", (e) => { if (dialog.dataset.busy === "true") e.preventDefault(); });
  });

  // Sidebar navigation
  $("#menu-toggle").addEventListener("click", () => setSidebar(!document.body.classList.contains("sidebar-open")));
  $("#sidebar-backdrop").addEventListener("click", () => setSidebar(false));
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.addEventListener("click", () => { setActiveNav(link.dataset.nav); setSidebar(false); });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setSidebar(false); });
}

function init() {
  const semesterSelect = $("#filter-semester");
  for (let i = 1; i <= 12; i++) semesterSelect.insertAdjacentHTML("beforeend", `<option value="${i}">Semester ${i}</option>`);

  bindEvents();
  checkHealth();
  loadStudents();
  loadStats();
}

init();
