<?php
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Serenity Tasks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css?v=<?= filemtime(__DIR__ . '/assets/style.css') ?>">
</head>
<body>

<header class="topbar">
  <div class="wrap topbar-inner">
    <div>
      <div class="eyebrow">Serenity Tasks</div>
      <h1>Suivi des sujets au bureau</h1>
    </div>
    <button id="btn-new" class="btn-primary">+ Nouveau sujet</button>
  </div>
</header>

<main class="wrap">

  <section id="stats" class="stats-grid"></section>

  <section class="toolbar">
    <div class="search">
      <input id="q" type="text" placeholder="Rechercher un sujet, un responsable...">
    </div>
    <select id="f-statut"><option>Tous</option></select>
    <select id="f-priorite"><option>Toutes</option></select>
    <div class="view-toggle">
      <button id="view-liste" class="toggle">Liste</button>
      <button id="view-kanban" class="toggle active">Kanban</button>
    </div>
  </section>

  <section id="content"></section>

</main>

<!-- Modal formulaire -->
<div id="modal" class="modal-backdrop hidden">
  <div class="modal">
    <div class="modal-head">
      <h2 id="modal-title">Nouveau sujet</h2>
      <button id="modal-close" class="icon-btn">✕</button>
    </div>
    <form id="form-tache">
      <input type="hidden" id="f-id">

      <label>Sujet *
        <input id="f-sujet" required placeholder="Ex : Migration serveur mail">
      </label>

      <div class="grid-2">
        <label>Catégorie
          <select id="f-categorie">
            <option>Projet</option><option>Incident</option><option>Demande</option>
            <option>Support</option><option>Réunion</option><option>Autre</option>
          </select>
        </label>
        <label>Priorité
          <select id="f-priorite-form">
            <option>Haute</option><option selected>Moyenne</option><option>Basse</option>
          </select>
        </label>
      </div>

      <div class="grid-2">
        <label>Projet / Service
          <input id="f-projet" list="projets-list" placeholder="Choisis ou tape un nouveau nom">
          <datalist id="projets-list"></datalist>
        </label>
        <label>Responsable
          <input id="f-responsable" placeholder="Ex : Sonia D.">
        </label>
      </div>

      <div class="grid-3">
        <label>Statut
          <select id="f-statut-form">
            <option>À faire</option><option>En cours</option><option>Terminé</option>
            <option>En attente</option><option>Bloqué</option>
          </select>
        </label>
        <label>Date début
          <input type="date" id="f-date-debut">
        </label>
        <label>Échéance
          <input type="date" id="f-echeance">
        </label>
      </div>

      <label>Prochaine action
        <input id="f-prochaine-action" placeholder="Ex : Tester l'envoi en prod">
      </label>

      <label>Commentaires
        <textarea id="f-commentaires" rows="3"></textarea>
      </label>

      <div id="form-error" class="form-error hidden"></div>

      <div class="modal-actions">
        <button type="submit" class="btn-primary full">Enregistrer</button>
        <button type="button" id="btn-cancel" class="btn-secondary">Annuler</button>
      </div>
    </form>
  </div>
</div>

<script src="assets/app.js?v=<?= filemtime(__DIR__ . '/assets/app.js') ?>"></script>
</body>
</html>
