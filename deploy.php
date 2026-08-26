<?php
// Webhook GitHub -> déploiement automatique.
// À chaque push sur GitHub, ce script fait un `git pull` dans le dépôt local
// pour que le site reflète toujours la dernière version poussée.
//
// Configuration : GitHub > repo > Settings > Webhooks > Add webhook
//   Payload URL  : https://serenity.expertosoft.com/deploy.php
//   Content type : application/json
//   Secret       : la même valeur que DEPLOY_SECRET dans deploy-config.local.php
//   Events       : "Just the push event"

require __DIR__ . '/deploy-config.local.php';

header('Content-Type: application/json; charset=utf-8');

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

$expected = 'sha256=' . hash_hmac('sha256', $payload, DEPLOY_SECRET);
if (!$signature || !hash_equals($expected, $signature)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Signature invalide.']);
    exit;
}

$repo = DEPLOY_REPO_PATH;
$cmd = 'git -C ' . escapeshellarg($repo) . ' pull origin main 2>&1';
exec($cmd, $output, $exitCode);

echo json_encode([
    'ok' => $exitCode === 0,
    'output' => implode("\n", $output),
]);
