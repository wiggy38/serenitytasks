-- Migration : ajoute la colonne termine_le (date de passage au statut "Terminé")
-- À exécuter une seule fois sur une base existante (via phpMyAdmin ou mysql CLI).

ALTER TABLE taches ADD COLUMN termine_le DATE DEFAULT NULL AFTER derniere_maj;

-- Backfill : pour les tâches déjà terminées, on réutilise derniere_maj comme
-- meilleure approximation disponible de la date de complétion réelle.
UPDATE taches SET termine_le = derniere_maj WHERE statut = 'Terminé' AND termine_le IS NULL;
