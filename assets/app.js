const STATUTS = ["À faire", "En cours", "Terminé", "En attente", "Bloqué"];
const PRIORITES = ["Haute", "Moyenne", "Basse"];

const STATUT_STYLE = {
  "À faire":    { bg: "#EEF0F4", fg: "#3D4351", col: "#F1F2F5" },
  "En cours":   { bg: "#E7EEFB", fg: "#2452A8", col: "#EAF1FC" },
  "En attente": { bg: "#FBF0DC", fg: "#9A6B00", col: "#FDF6E7" },
  "Bloqué":     { bg: "#FBE7E4", fg: "#B23A24", col: "#FCEEEC" },
  "Terminé":    { bg: "#E6F0EA", fg: "#0F6B4C", col: "#EAF4EE" },
};
const PRIORITE_COLOR = { Haute: "#B23A24", Moyenne: "#B2790E", Basse: "#3D7A5B" };

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
// n'est jamais modifiée).
function effectiveWeek(t) {
  const base = mondayOfISO(t.date_debut || todayISO());
  if (t.statut !== "Terminé" && base < currentMondayISO()) {
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
function alerteInfo(statut, echeance) {
  if (!echeance) return { html: '<span class="alerte-vide">—</span>' };
  if (statut === "Terminé") return { html: `<span class="alerte-fait">Fait le ${echeance}</span>` };
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
    ["Total sujets", total, "#14213D", "#fff"],
    ["En cours", enCours, "#0F6B4C", "#E6F0EA"],
    ["Bloqués", bloques, "#B23A24", "#FBE7E4"],
    ["En attente", enAttente, "#9A6B00", "#FBF0DC"],
    ["Terminés", termines, "#2452A8", "#E7EEFB"],
    ["En retard", retard, "#fff", "#B23A24"],
  ];
  $("#stats").innerHTML = cards.map(([label, val, fg, bg]) => `
    <div class="stat-card" style="background:${bg};${bg === '#fff' ? 'border:1px solid #E4E2DB' : ''}">
      <div class="val" style="color:${fg}">${val}</div>
      <div class="lbl" style="color:${bg === '#B23A24' ? '#FBE7E4' : '#6B7280'}">${label}</div>
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
    const a = alerteInfo(t.statut, t.echeance);
    return `
      <tr>
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
      const a = alerteInfo(t.statut, t.echeance);
      return `
        <div class="kcard" draggable="true" data-id="${t.id}" style="border-left:3px solid ${pc}" onclick="openEdit(${t.id})">
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
  $("#content").innerHTML = view === "liste" ? renderListe(items) : renderKanban(items);
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

  $("#view-liste").addEventListener("click", () => { view = "liste"; $("#view-liste").classList.add("active"); $("#view-kanban").classList.remove("active"); render(); });
  $("#view-kanban").addEventListener("click", () => { view = "kanban"; $("#view-kanban").classList.add("active"); $("#view-liste").classList.remove("active"); render(); });

  loadTaches();
});
