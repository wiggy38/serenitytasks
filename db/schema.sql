-- Serenity Tasks
-- À importer via phpMyAdmin (cPanel > Bases de données MySQL > phpMyAdmin)

CREATE TABLE IF NOT EXISTS taches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sujet VARCHAR(255) NOT NULL,
  categorie ENUM('Projet','Incident','Demande','Support','Réunion','Autre') NOT NULL DEFAULT 'Autre',
  projet VARCHAR(150) DEFAULT '',
  responsable VARCHAR(120) DEFAULT '',
  priorite ENUM('Haute','Moyenne','Basse') NOT NULL DEFAULT 'Moyenne',
  statut ENUM('À faire','En cours','En attente','Bloqué','Terminé') NOT NULL DEFAULT 'À faire',
  date_debut DATE DEFAULT NULL,
  echeance DATE DEFAULT NULL,
  derniere_maj DATE DEFAULT NULL,
  prochaine_action VARCHAR(255) DEFAULT '',
  commentaires TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quelques exemples pour vérifier que l'appli tourne (à supprimer ensuite)
INSERT INTO taches (sujet, categorie, projet, responsable, priorite, statut, date_debut, echeance, derniere_maj, prochaine_action, commentaires) VALUES
('Migration serveur mail vers Gmail SMTP', 'Projet', 'Infra interne', 'Aziz K.', 'Haute', 'En cours', '2026-08-05', '2026-08-20', '2026-08-17', "Tester l'envoi en prod", "Bloqué par le DNS chez le registrar"),
('Terminal ZKTeco ne pousse plus vers l''ADMS', 'Incident', 'Pointage biométrique', 'Sonia D.', 'Haute', 'Bloqué', '2026-08-14', '2026-08-19', '2026-08-18', 'Vérifier la conf réseau du terminal', 'Client clinique St-Luc, urgent'),
('Devis formation IA — école Sainte Rita', 'Demande', 'Formations IA', 'Aziz K.', 'Moyenne', 'À faire', '2026-08-16', '2026-08-25', '2026-08-16', 'Envoyer le devis journalier', '');
