# Serenity Tasks

Appli PHP + MySQL, sans dépendance ni build. Compatible avec n'importe quel
hébergement mutualisé cPanel standard (PHP 7.4+ avec PDO MySQL, activé partout par défaut).

## Déploiement sur cPanel

**1. Créer la base de données**
- cPanel > *Bases de données MySQL*
- Crée une base (ex : `suivi`) → cPanel la nomme `tonuser_suivi`
- Crée un utilisateur MySQL, attribue-lui **tous les privilèges** sur cette base
- Note le nom de la base, l'utilisateur et le mot de passe

**2. Importer le schéma**
- cPanel > *phpMyAdmin*
- Sélectionne ta base `tonuser_suivi`
- Onglet *Importer* → choisis `db/schema.sql` → Exécuter
- (le fichier contient 3 sujets d'exemple, à supprimer une fois que tu as vérifié que ça marche)

**3. Configurer la connexion**
- Ouvre `config.php`
- Remplace `DB_NAME`, `DB_USER`, `DB_PASS` par tes identifiants réels
- `DB_HOST` reste `localhost` dans 99% des cas sur du mutualisé

**4. Uploader les fichiers**
- cPanel > *Gestionnaire de fichiers* (ou FTP/FileZilla)
- Dépose tout le contenu du dossier dans `public_html/` (ou dans un sous-dossier,
  ex : `public_html/suivi/` si tu veux l'app à `tondomaine.com/suivi/`)
- Le dossier `db/` peut être supprimé après l'import, il ne sert pas à l'exécution

**5. Tester**
- Va sur `https://tondomaine.com/` (ou `/suivi/`)
- Tu dois voir le tableau de bord avec les 3 sujets d'exemple

## Structure

```
index.php          → page principale (structure HTML)
api.php             → API JSON (GET liste / POST créer / PUT modifier / DELETE supprimer)
config.php          → identifiants MySQL (à éditer)
assets/app.js       → toute la logique (filtres, kanban, formulaire, appels API)
assets/style.css    → styles
db/schema.sql       → structure de la table + données d'exemple
```

## Sécurité minimale à prévoir avant mise en prod

- Le dossier n'a **aucune authentification** pour l'instant — si l'app est accessible
  publiquement, ajoute au minimum une protection par mot de passe cPanel
  (*Confidentialité du répertoire*) ou un `.htpasswd`, le temps d'ajouter un vrai login.
- `config.php` contient un mot de passe en clair : vérifie que le dossier n'est pas
  listable publiquement (un fichier `index.php` à la racine suffit généralement à l'éviter).

## Évolutions naturelles

- Login utilisateur (table `users` + session PHP)
- Alerte WhatsApp automatique via Evolution API quand un sujet passe en retard
  (même logique que sur le pointage biométrique) — un simple `cron` cPanel qui
  appelle un script PHP toutes les heures suffit
- Export Excel du tableau (réutilisable depuis le fichier `.xlsx` d'origine)
