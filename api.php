<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

function input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function clean(array $d): array {
    $categories = ['Projet','Incident','Demande','Support','Réunion','Autre'];
    $priorites  = ['Haute','Moyenne','Basse'];
    $statuts    = ['À faire','En cours','En attente','Bloqué','Terminé'];
    return [
        'sujet'            => trim($d['sujet'] ?? ''),
        'categorie'        => in_array($d['categorie'] ?? '', $categories, true) ? $d['categorie'] : 'Autre',
        'projet'           => trim($d['projet'] ?? ''),
        'responsable'      => trim($d['responsable'] ?? ''),
        'priorite'         => in_array($d['priorite'] ?? '', $priorites, true) ? $d['priorite'] : 'Moyenne',
        'statut'           => in_array($d['statut'] ?? '', $statuts, true) ? $d['statut'] : 'À faire',
        'date_debut'       => $d['date_debut'] ?: null,
        'echeance'         => $d['echeance'] ?: null,
        'prochaine_action' => trim($d['prochaine_action'] ?? ''),
        'commentaires'     => trim($d['commentaires'] ?? ''),
    ];
}

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT * FROM taches ORDER BY
            FIELD(priorite, "Haute","Moyenne","Basse"),
            echeance IS NULL, echeance ASC');
        echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $d = clean(input());
        if ($d['sujet'] === '') {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'Le sujet est obligatoire.']);
            break;
        }
        $stmt = $pdo->prepare('INSERT INTO taches
            (sujet, categorie, projet, responsable, priorite, statut, date_debut, echeance, derniere_maj, prochaine_action, commentaires)
            VALUES (:sujet,:categorie,:projet,:responsable,:priorite,:statut,:date_debut,:echeance,CURDATE(),:prochaine_action,:commentaires)');
        $stmt->execute($d);
        $id = $pdo->lastInsertId();
        $row = $pdo->prepare('SELECT * FROM taches WHERE id = ?');
        $row->execute([$id]);
        echo json_encode(['ok' => true, 'data' => $row->fetch()]);
        break;

    case 'PUT':
        $body = input();
        $id = (int)($body['id'] ?? 0);
        if (!$id) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'ID manquant.']);
            break;
        }
        $d = clean($body);
        if ($d['sujet'] === '') {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'Le sujet est obligatoire.']);
            break;
        }
        $d['id'] = $id;
        $stmt = $pdo->prepare('UPDATE taches SET
            sujet=:sujet, categorie=:categorie, projet=:projet, responsable=:responsable,
            priorite=:priorite, statut=:statut, date_debut=:date_debut, echeance=:echeance,
            derniere_maj=CURDATE(), prochaine_action=:prochaine_action, commentaires=:commentaires
            WHERE id=:id');
        $stmt->execute($d);
        $row = $pdo->prepare('SELECT * FROM taches WHERE id = ?');
        $row->execute([$id]);
        echo json_encode(['ok' => true, 'data' => $row->fetch()]);
        break;

    case 'DELETE':
        $body = input();
        $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'ID manquant.']);
            break;
        }
        $stmt = $pdo->prepare('DELETE FROM taches WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Méthode non supportée.']);
}
