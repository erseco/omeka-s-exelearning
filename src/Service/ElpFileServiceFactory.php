<?php
declare(strict_types=1);

namespace ExeLearning\Service;

use Interop\Container\ContainerInterface;
use Laminas\ServiceManager\Factory\FactoryInterface;

class ElpFileServiceFactory implements FactoryInterface
{
    public function __invoke(ContainerInterface $services, $requestedName, array $options = null)
    {
        $api = $services->get('Omeka\ApiManager');
        $entityManager = $services->get('Omeka\EntityManager');
        $logger = $services->get('Omeka\Logger');

        // Get module base path for extracted content
        $basePath = dirname(__DIR__, 2) . '/data/exelearning';

        // Get Omeka files path from the file store configuration
        $fileStore = $services->get('Omeka\File\Store');

        // Try to get the base path from the local file store
        $filesPath = null;
        if (method_exists($fileStore, 'getLocalPath')) {
            $filesPath = dirname($fileStore->getLocalPath(''));
        }

        // Fallback: try config
        if (!$filesPath) {
            $config = $services->get('Config');
            $filesPath = $config['file_store']['local']['base_path'] ?? null;
        }

        // Fallback: use OMEKA_PATH
        if (!$filesPath) {
            $filesPath = defined('OMEKA_PATH') ? OMEKA_PATH . '/files' : '/var/www/html/files';
        }

        // In Docker with volume, files are typically in /var/www/html/volume/files
        // Check if that path exists and use it instead
        $volumePath = '/var/www/html/volume/files';
        if (is_dir($volumePath)) {
            $filesPath = $volumePath;
        }

        $logger->info(sprintf('[ExeLearning] ElpFileService initialized with basePath=%s, filesPath=%s', $basePath, $filesPath));

        return new ElpFileService($api, $entityManager, $basePath, $filesPath, $logger);
    }
}
