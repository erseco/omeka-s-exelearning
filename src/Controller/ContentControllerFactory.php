<?php
declare(strict_types=1);

namespace ExeLearning\Controller;

use Interop\Container\ContainerInterface;
use Laminas\ServiceManager\Factory\FactoryInterface;

class ContentControllerFactory implements FactoryInterface
{
    public function __invoke(ContainerInterface $container, $requestedName, array $options = null)
    {
        $config = $container->get('Config');

        // Get the files path from Omeka config
        $localConfig = $config['file_store']['local']['base_path']
            ?? (OMEKA_PATH . '/files');

        $basePath = $localConfig . '/exelearning';

        return new ContentController($basePath);
    }
}
