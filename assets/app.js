const STATUTS = ["À faire", "En cours", "Terminé", "En attente", "Bloqué"];
const PRIORITES = ["Haute", "Moyenne", "Basse"];

const STATUT_STYLE = {
  "À faire":    { bg: "#2A2D33", fg: "#C7CBD3", col: "#1E2024" },
  "En cours":   { bg: "#1B3A66", fg: "#8FB8F0", col: "#15233A" },
  "En attente": { bg: "#4A3A12", fg: "#F0C766", col: "#332A14" },
  "Bloqué":     { bg: "#4A231C", fg: "#FF8A75", col: "#331A15" },
  "Terminé":    { bg: "#173D2C", fg: "#7CD9A8", col: "#12261C" },
};
const PRIORITE_COLOR = { Haute: "#FF6B52", Moyenne: "#F0C766", Basse: "#6FCB9F" };

const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

let taches = [];
let view = "kanban";
let editingId = null;
let currentWeek = null; // initialisé au chargement, lundi ISO de la semaine affichée en Kanban

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Utilitaires dates ----
function todayISO() { return new Date().toISOString().slice(0, 10); }

function mondayOfISO(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=dim..6=sam
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function currentMondayISO() { return mondayOfISO(todayISO()); }

// Semaine Kanban "effective" : une tâche non terminée dont la semaine est
// passée apparaît dans la semaine en cours (affichage uniquement, date_debut
// n'est jamais modifiée). Une tâche terminée reste ancrée à la semaine où
// elle a été déplacée dans "Terminé" (termine_le), pas à sa date de début.
function effectiveWeek(t) {
  if (t.statut === "Terminé") {
    return mondayOfISO(t.termine_le || t.date_debut || todayISO());
  }
  const base = mondayOfISO(t.date_debut || todayISO());
  if (base < currentMondayISO()) {
    return currentMondayISO();
  }
  return base;
}

function weekLabel(mondayISO) {
  const start = new Date(mondayISO + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startTxt = sameMonth ? `${start.getDate()}` : `${start.getDate()} ${MOIS_FR[start.getMonth()]}`;
  return `Semaine du ${startTxt} au ${end.getDate()} ${MOIS_FR[end.getMonth()]} ${end.getFullYear()}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDays(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function shiftWeek(delta) {
  const d = new Date(currentWeek + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  currentWeek = d.toISOString().slice(0, 10);
  render();
}
function goToCurrentWeek() { currentWeek = currentMondayISO(); render(); }

function joursRestants(echeance) {
  if (!echeance) return null;
  const d = new Date(echeance + "T00:00:00");
  const t = new Date(todayISO() + "T00:00:00");
  return Math.round((d - t) / 86400000);
}
function estEnRetard(t) {
  return (t.statut === "À faire" || t.statut === "En cours")
    && t.echeance && joursRestants(t.echeance) < 0;
}
function alerteInfo(statut, echeance, termineLe) {
  if (statut === "Terminé") {
    const dateFait = termineLe || echeance;
    return dateFait
      ? { html: `<span class="alerte-fait">Fait le ${dateFait}</span>` }
      : { html: '<span class="alerte-vide">—</span>' };
  }
  if (!echeance) return { html: '<span class="alerte-vide">—</span>' };
  const jr = joursRestants(echeance);
  if (jr < 0) return { html: `<span class="alerte-retard">⚠ ${Math.abs(jr)} j de retard</span>`, retard: true };
  if (jr <= 2) return { html: `<span class="alerte-urgent">⏱ ${jr}j restants</span>` };
  return { html: `<span class="alerte-ok">${jr}j restants</span>` };
}

// ---- API ----
async function api(method, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (body) opts.body = JSON.stringify(body);
  const url = method === "GET" ? `api.php?_=${Date.now()}` : "api.php";
  const res = await fetch(url, opts);
  return res.json();
}
async function apiDelete(id) {
  const res = await fetch(`api.php?_=${Date.now()}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
    cache: "no-store",
  });
  return res.json();
}

async function loadTaches() {
  const r = await api("GET");
  if (r.ok) taches = r.data;
  render();
}

// ---- Filtres ----
function filteredTaches() {
  const q = $("#q").value.trim().toLowerCase();
  const fs = $("#f-statut").value;
  const fp = $("#f-priorite").value;
  return taches.filter((t) => {
    const matchQ = !q || [t.sujet, t.projet, t.responsable, t.commentaires].join(" ").toLowerCase().includes(q);
    const matchS = fs === "Tous" || t.statut === fs;
    const matchP = fp === "Toutes" || t.priorite === fp;
    const matchW = view !== "kanban" || effectiveWeek(t) === currentWeek;
    return matchQ && matchS && matchP && matchW;
  });
}

// ---- Rendu stats ----
function renderStats() {
  const total = taches.length;
  const enCours = taches.filter(t => t.statut === "En cours").length;
  const bloques = taches.filter(t => t.statut === "Bloqué").length;
  const enAttente = taches.filter(t => t.statut === "En attente").length;
  const termines = taches.filter(t => t.statut === "Terminé").length;
  const retard = taches.filter(t => t.statut !== "Terminé" && t.echeance && joursRestants(t.echeance) < 0).length;

  const cards = [
    ["Total sujets", total, "#000", "#FF7900"],
    ["En cours", enCours, "#8FB8F0", "#1B3A66"],
    ["Bloqués", bloques, "#FF8A75", "#4A231C"],
    ["En attente", enAttente, "#F0C766", "#4A3A12"],
    ["Terminés", termines, "#7CD9A8", "#173D2C"],
    ["En retard", retard, "#fff", "#B23A24"],
  ];
  $("#stats").innerHTML = cards.map(([label, val, fg, bg]) => `
    <div class="stat-card" style="background:${bg}">
      <div class="val" style="color:${fg}">${val}</div>
      <div class="lbl" style="color:${fg};opacity:.75">${label}</div>
    </div>`).join("");
}

// ---- Rendu liste ----
function renderListe(items) {
  if (items.length === 0) {
    return `<div class="empty-state">Aucun sujet ne correspond à ta recherche.</div>`;
  }
  const rows = items.map((t) => {
    const st = STATUT_STYLE[t.statut];
    const pc = PRIORITE_COLOR[t.priorite];
    const a = alerteInfo(t.statut, t.echeance, t.termine_le);
    const rowClass = t.statut === "Terminé" ? ' class="row-termine"' : estEnRetard(t) ? ' class="row-retard"' : "";
    return `
      <tr${rowClass}>
        <td class="sujet-cell">
          <span class="pill-priorite" style="background:${pc}1A;color:${pc}">${t.priorite}</span>
          <div class="titre">${escapeHtml(t.sujet)}</div>
          ${t.projet ? `<div class="projet">${escapeHtml(t.projet)}</div>` : ""}
        </td>
        <td>${escapeHtml(t.categorie)}</td>
        <td><span class="pill" style="background:${st.bg};color:${st.fg}">${t.statut}</span></td>
        <td>${escapeHtml(t.prochaine_action) || "—"}</td>
        <td>${a.html}</td>
        <td>${escapeHtml(t.responsable) || "—"}</td>
        <td>
          <div class="row-actions">
            <button onclick="openEdit(${t.id})">✎</button>
            <button class="del" onclick="deleteTache(${t.id})">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Sujet</th><th>Catégorie</th><th>Statut</th><th>Prochaine action</th><th>Échéance</th><th>Responsable</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ---- Rendu kanban ----
function renderKanban(items) {
  const cols = STATUTS.map((statut) => {
    const st = STATUT_STYLE[statut];
    const colItems = items.filter((t) => t.statut === statut);
    const cards = colItems.map((t) => {
      const pc = PRIORITE_COLOR[t.priorite];
      const a = alerteInfo(t.statut, t.echeance, t.termine_le);
      const cardClass = t.statut === "Terminé" ? "kcard kcard-termine" : estEnRetard(t) ? "kcard kcard-retard" : "kcard";
      return `
        <div class="${cardClass}" draggable="true" data-id="${t.id}" style="border-left:3px solid ${pc}" onclick="openEdit(${t.id})">
          <div class="titre">${escapeHtml(t.sujet)}</div>
          <div class="resp">${escapeHtml(t.responsable) || "Non assigné"}</div>
          ${t.projet ? `<div class="kcard-projet">${escapeHtml(t.projet)}</div>` : ""}
          ${a.html}
        </div>`;
    }).join("");
    return `
      <div class="kcol" data-statut="${statut}" style="background:${st.col}">
        <div class="kcol-head">
          <span class="name" style="color:${st.fg}">${statut}</span>
          <span class="count" style="background:${st.bg};color:${st.fg}">${colItems.length}</span>
        </div>
        <div class="kcol-body">${cards}</div>
      </div>`;
  }).join("");
  return `<div class="kanban">${cols}</div>`;
}

// ---- Rendu roadmap ----
const RM_LABEL_W = 220;
const RM_DAY_W = 26;

function taskRange(t) {
  const start = t.date_debut || t.echeance;
  const end = t.echeance || t.date_debut;
  if (!start) return null;
  return { start, end: end < start ? start : end };
}

function renderRoadmap(items) {
  const ranged = items.map((t) => ({ t, range: taskRange(t) })).filter((x) => x.range);
  if (ranged.length === 0) {
    return `<div class="empty-state">Aucun sujet avec une date de début ou d'échéance à afficher sur la roadmap.</div>`;
  }

  let minStart = ranged[0].range.start;
  let maxEnd = ranged[0].range.end;
  ranged.forEach(({ range }) => {
    if (range.start < minStart) minStart = range.start;
    if (range.end > maxEnd) maxEnd = range.end;
  });

  let gridStart = addDays(mondayOfISO(minStart), -7);
  let gridEnd = addDays(addDays(mondayOfISO(maxEnd), 6), 7);
  const totalDays = diffDays(gridStart, gridEnd) + 1;
  const timelineW = totalDays * RM_DAY_W;

  // Groupes par projet
  const groups = {};
  ranged.forEach((x) => {
    const key = x.t.projet || "Sans projet";
    (groups[key] = groups[key] || []).push(x);
  });
  const groupNames = Object.keys(groups).sort();
  groupNames.forEach((g) => groups[g].sort((a, b) => a.range.start.localeCompare(b.range.start)));

  // Bandeaux de mois
  const monthBands = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const monthStart = cursor;
    const y = Number(cursor.slice(0, 4)), m = Number(cursor.slice(5, 7));
    const nextMonthFirst = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
    const bandEnd = nextMonthFirst <= gridEnd ? addDays(nextMonthFirst, -1) : gridEnd;
    const left = diffDays(gridStart, monthStart) * RM_DAY_W;
    const width = (diffDays(monthStart, bandEnd) + 1) * RM_DAY_W;
    monthBands.push({ left, width, label: `${MOIS_FR[m - 1]} ${y}` });
    cursor = addDays(bandEnd, 1);
  }

  // Repères hebdomadaires (lundis)
  const weekTicks = [];
  let wd = gridStart;
  while (wd <= gridEnd) {
    const d = new Date(wd + "T00:00:00");
    weekTicks.push({ left: diffDays(gridStart, wd) * RM_DAY_W, label: `${d.getDate()}/${d.getMonth() + 1}` });
    wd = addDays(wd, 7);
  }

  const todayOffset = diffDays(gridStart, todayISO()) * RM_DAY_W;
  const showToday = todayISO() >= gridStart && todayISO() <= gridEnd;

  // Lignes de grille verticales (une par semaine)
  const gridLines = weekTicks.map((wt) => `<div class="rm-gridline" style="left:${wt.left}px"></div>`).join("");

  const groupsHtml = groupNames.map((g) => {
    const rows = groups[g].map(({ t, range }) => {
      const st = STATUT_STYLE[t.statut];
      const pc = PRIORITE_COLOR[t.priorite];
      const left = diffDays(gridStart, range.start) * RM_DAY_W;
      const width = Math.max((diffDays(range.start, range.end) + 1) * RM_DAY_W - 4, 16);
      return `
        <div class="rm-row">
          <div class="rm-row-label" title="${escapeHtml(t.sujet)}">
            <div class="titre">${escapeHtml(t.sujet)}</div>
            <div class="resp">${escapeHtml(t.responsable) || "Non assigné"}</div>
          </div>
          <div class="rm-row-track" style="width:${timelineW}px">
            <div class="rm-bar" style="left:${left}px;width:${width}px;background:${st.bg};color:${st.fg};border-left:3px solid ${pc}"
                 onclick="openEdit(${t.id})" title="${escapeHtml(t.sujet)} — ${t.statut}">
              <span class="rm-bar-label">${escapeHtml(t.sujet)}</span>
            </div>
          </div>
        </div>`;
    }).join("");
    return `
      <div class="rm-group">
        <div class="rm-group-title">${escapeHtml(g)}</div>
        ${rows}
      </div>`;
  }).join("");

  return `
    <div class="roadmap">
      <div class="rm-scroll">
        <div class="rm-inner" style="width:${RM_LABEL_W + timelineW}px">
          <div class="rm-header">
            <div class="rm-corner"></div>
            <div class="rm-header-timeline" style="width:${timelineW}px">
              <div class="rm-months">
                ${monthBands.map((b) => `<div class="rm-month" style="left:${b.left}px;width:${b.width}px">${b.label}</div>`).join("")}
              </div>
              <div class="rm-weeks">
                ${weekTicks.map((w) => `<div class="rm-week-tick" style="left:${w.left}px">${w.label}</div>`).join("")}
              </div>
            </div>
          </div>
          <div class="rm-body">
            <div class="rm-gridlines" style="left:${RM_LABEL_W}px">
              ${gridLines}
              ${showToday ? `<div class="rm-today" style="left:${todayOffset}px"><span>Aujourd'hui</span></div>` : ""}
            </div>
            ${groupsHtml}
          </div>
        </div>
      </div>
    </div>`;
}

// ---- Drag & drop kanban ----
let dragId = null;

function attachDnD() {
  if (view !== "kanban") return;

  $$(".kcard").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      dragId = Number(card.dataset.id);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  });

  $$(".kcol").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => {
      col.classList.remove("drag-over");
    });
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const statut = col.dataset.statut;
      if (dragId != null) {
        const t = taches.find((x) => x.id === dragId);
        dragId = null;
        if (t && t.statut !== statut) await moveStatut(t.id, statut);
      }
    });
  });
}

function render() {
  renderStats();
  const weekNav = $("#week-nav");
  if (weekNav) {
    weekNav.classList.toggle("hidden", view !== "kanban");
    if (view === "kanban") $("#week-label").textContent = weekLabel(currentWeek);
  }
  const items = filteredTaches();
  $("#content").innerHTML = view === "liste" ? renderListe(items) : view === "roadmap" ? renderRoadmap(items) : renderKanban(items);
  attachDnD();

  // datalist projets
  const projets = [...new Set(taches.map(t => t.projet).filter(Boolean))].sort();
  $("#projets-list").innerHTML = projets.map(p => `<option value="${escapeHtml(p)}">`).join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// ---- Actions ----
window.openEdit = function (id) {
  const t = taches.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  $("#modal-title").textContent = "Modifier le sujet";
  $("#f-id").value = t.id;
  $("#f-sujet").value = t.sujet;
  $("#f-categorie").value = t.categorie;
  $("#f-priorite-form").value = t.priorite;
  $("#f-projet").value = t.projet || "";
  $("#f-responsable").value = t.responsable || "";
  $("#f-statut-form").value = t.statut;
  $("#f-date-debut").value = t.date_debut || "";
  $("#f-echeance").value = t.echeance || "";
  $("#f-prochaine-action").value = t.prochaine_action || "";
  $("#f-commentaires").value = t.commentaires || "";
  $("#form-error").classList.add("hidden");
  $("#modal").classList.remove("hidden");
};

window.deleteTache = async function (id) {
  if (!confirm("Supprimer ce sujet ?")) return;
  await apiDelete(id);
  await loadTaches();
};

window.moveStatut = async function (id, statut) {
  const t = taches.find(x => x.id === id);
  if (!t) return;
  await api("PUT", { ...t, statut });
  await loadTaches();
};

function openNew() {
  editingId = null;
  $("#modal-title").textContent = "Nouveau sujet";
  $("#form-tache").reset();
  $("#f-id").value = "";
  $("#f-date-debut").value = todayISO();
  $("#f-priorite-form").value = "Moyenne";
  $("#form-error").classList.add("hidden");
  $("#modal").classList.remove("hidden");
}

function closeModal() { $("#modal").classList.add("hidden"); }

async function submitForm(e) {
  e.preventDefault();
  const payload = {
    sujet: $("#f-sujet").value.trim(),
    categorie: $("#f-categorie").value,
    priorite: $("#f-priorite-form").value,
    projet: $("#f-projet").value.trim(),
    responsable: $("#f-responsable").value.trim(),
    statut: $("#f-statut-form").value,
    date_debut: $("#f-date-debut").value,
    echeance: $("#f-echeance").value,
    prochaine_action: $("#f-prochaine-action").value.trim(),
    commentaires: $("#f-commentaires").value.trim(),
  };
  if (!payload.sujet) return;

  const r = editingId
    ? await api("PUT", { id: editingId, ...payload })
    : await api("POST", payload);

  if (!r.ok) {
    $("#form-error").textContent = r.error || "Une erreur est survenue.";
    $("#form-error").classList.remove("hidden");
    return;
  }
  closeModal();
  await loadTaches();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  currentWeek = currentMondayISO();

  STATUTS.forEach(s => $("#f-statut").insertAdjacentHTML("beforeend", `<option>${s}</option>`));
  PRIORITES.forEach(p => $("#f-priorite").insertAdjacentHTML("beforeend", `<option>${p}</option>`));

  $("#week-prev").addEventListener("click", () => shiftWeek(-1));
  $("#week-next").addEventListener("click", () => shiftWeek(1));
  $("#week-today").addEventListener("click", goToCurrentWeek);

  $("#btn-new").addEventListener("click", openNew);
  $("#modal-close").addEventListener("click", closeModal);
  $("#btn-cancel").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#form-tache").addEventListener("submit", submitForm);

  $("#q").addEventListener("input", render);
  $("#f-statut").addEventListener("change", render);
  $("#f-priorite").addEventListener("change", render);

  const viewBtns = { liste: $("#view-liste"), kanban: $("#view-kanban"), roadmap: $("#view-roadmap") };
  function setView(v) {
    view = v;
    Object.entries(viewBtns).forEach(([k, btn]) => btn.classList.toggle("active", k === v));
    render();
  }
  $("#view-liste").addEventListener("click", () => setView("liste"));
  $("#view-kanban").addEventListener("click", () => setView("kanban"));
  $("#view-roadmap").addEventListener("click", () => setView("roadmap"));

  loadTaches();
});
