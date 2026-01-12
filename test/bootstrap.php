<?php

declare(strict_types=1);

namespace ExeLearningTest;

// Composer autoload (if present)
if (file_exists(dirname(__DIR__) . '/vendor/autoload.php')) {
    require dirname(__DIR__) . '/vendor/autoload.php';
}

// Lightweight PSR-4 autoloader for tests and stubs
spl_autoload_register(function (string $class): void {
    // Omeka test stubs
    if (strpos($class, 'Omeka\\') === 0) {
        $file = __DIR__ . '/Stubs/' . str_replace('\\', '/', $class) . '.php';
        if (is_file($file)) {
            require $file;
            return;
        }
    }
    // Laminas stubs used by the renderers (PhpRenderer)
    if (strpos($class, 'Laminas\\') === 0) {
        $file = __DIR__ . '/Stubs/' . str_replace('\\', '/', $class) . '.php';
        if (is_file($file)) {
            require $file;
            return;
        }
    }
    // Test helpers/doubles under ExeLearningTest namespace
    if (strpos($class, __NAMESPACE__ . '\\') === 0) {
        $file = __DIR__ . '/' . str_replace('\\', '/', $class) . '.php';
        if (is_file($file)) {
            require $file;
            return;
        }
    }
});
