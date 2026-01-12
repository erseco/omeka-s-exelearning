<?php
declare(strict_types=1);

namespace ExeLearning\Media\FileRenderer;

use Interop\Container\ContainerInterface;
use Laminas\ServiceManager\Factory\FactoryInterface;
use ExeLearning\Service\ElpFileService;

class ExeLearningRendererFactory implements FactoryInterface
{
    public function __invoke(ContainerInterface $services, $requestedName, array $options = null)
    {
        error_log('[ExeLearning RendererFactory] Creating renderer...');
        try {
            $elpService = $services->get(ElpFileService::class);
            error_log('[ExeLearning RendererFactory] ElpFileService obtained successfully');
            return new ExeLearningRenderer($elpService);
        } catch (\Exception $e) {
            error_log(sprintf('[ExeLearning RendererFactory] ERROR: %s', $e->getMessage()));
            throw $e;
        }
    }
}
