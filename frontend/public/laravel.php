<?php

// Entry point for the API at <host>/api/... — the React build and the
// Laravel API share one domain. .htaccess sends /api/* here; Laravel's own
// public/index.php does the rest (it resolves paths from its own __DIR__).
require __DIR__ . '/../backend/public/index.php';
