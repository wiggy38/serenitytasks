<?php
// Identifiants MySQL fournis par cPanel > Bases de données MySQL
// Le nom d'utilisateur et de la base sont généralement préfixés par ton user cPanel,
// ex: monuser_suivi (base) et monuser_suivi (utilisateur)

define('DB_HOST', 'localhost');
define('DB_NAME', 'monuser_suivi');
define('DB_USER', 'monuser_suivi');
define('DB_PASS', 'CHANGE_MOI');

function getPDO(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}
