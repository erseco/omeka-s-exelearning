<?php
declare(strict_types=1);

namespace ExeLearning;

use Laminas\EventManager\Event;
use Laminas\EventManager\SharedEventManagerInterface;
use Laminas\ServiceManager\ServiceLocatorInterface;
use Laminas\Mvc\Controller\AbstractController;
use Laminas\View\Renderer\PhpRenderer;
use Omeka\Module\AbstractModule;
use Omeka\Mvc\Controller\Plugin\Messenger;
use Omeka\Stdlib\Message;
use ExeLearning\Form\ConfigForm;

/**
 * Main class for the ExeLearning module.
 *
 * Allows uploading, viewing and editing eXeLearning content (.elpx files) in Omeka S.
 */
class Module extends AbstractModule
{
    /** @var string */
    const NAMESPACE = __NAMESPACE__;

    /**
     * Retrieve the configuration array.
     *
     * @return array
     */
    public function getConfig()
    {
        return include __DIR__ . '/config/module.config.php';
    }

    /**
     * Execute logic when the module is installed.
     *
     * @param ServiceLocatorInterface $serviceLocator
     */
    public function install(ServiceLocatorInterface $serviceLocator)
    {
        $messenger = new Messenger();
        $message = new Message("ExeLearning module installed.");
        $messenger->addSuccess($message);

        // Register eXeLearning file types
        $this->updateWhitelist($serviceLocator);

        // Create data directory for extracted content
        $this->createDataDirectory();
    }

    /**
     * Register eXeLearning file types in Omeka settings.
     *
     * @param ServiceLocatorInterface $serviceLocator
     */
    protected function updateWhitelist(ServiceLocatorInterface $serviceLocator): void
    {
        $settings = $serviceLocator->get('Omeka\Settings');

        // Register MIME types for ZIP files
        $whitelist = $settings->get('media_type_whitelist', []);
        $whitelist = array_values(array_unique(array_merge(array_values($whitelist), [
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
        ])));
        $settings->set('media_type_whitelist', $whitelist);

        // Register .elpx extension
        $whitelist = $settings->get('extension_whitelist', []);
        $whitelist = array_values(array_unique(array_merge(array_values($whitelist), [
            'elpx',
            'zip',
        ])));
        $settings->set('extension_whitelist', $whitelist);
    }

    /**
     * Create the data directory for extracted eXeLearning content.
     */
    protected function createDataDirectory(): void
    {
        $basePath = $this->getDataPath();
        if (!is_dir($basePath)) {
            @mkdir($basePath, 0755, true);
        }
    }

    /**
     * Get the path to the data directory.
     *
     * @return string
     */
    public function getDataPath(): string
    {
        return __DIR__ . '/data/exelearning';
    }

    /**
     * Execute logic when the module is uninstalled.
     *
     * @param ServiceLocatorInterface $serviceLocator
     */
    public function uninstall(ServiceLocatorInterface $serviceLocator)
    {
        $messenger = new Messenger();
        $message = new Message("ExeLearning module uninstalled.");
        $messenger->addWarning($message);
    }

    /**
     * Attach event listeners.
     *
     * @param SharedEventManagerInterface $sharedEventManager
     */
    public function attachListeners(SharedEventManagerInterface $sharedEventManager)
    {
        // Listen for media hydration to set the correct renderer
        $sharedEventManager->attach(
            'Omeka\Api\Adapter\MediaAdapter',
            'api.hydrate.post',
            [$this, 'handleMediaHydrate']
        );

        // Listen for media creation to process eXeLearning files
        $sharedEventManager->attach(
            'Omeka\Api\Adapter\MediaAdapter',
            'api.create.post',
            [$this, 'handleMediaCreate']
        );

        // Listen for media deletion to clean up extracted content
        $sharedEventManager->attach(
            'Omeka\Api\Adapter\MediaAdapter',
            'api.delete.pre',
            [$this, 'handleMediaDelete']
        );
    }

    /**
     * Handle media hydration - set the correct renderer for eXeLearning files.
     *
     * @param Event $event
     */
    public function handleMediaHydrate(Event $event)
    {
        $entity = $event->getParam('entity');

        // Get the filename from the entity
        $filename = null;
        if (method_exists($entity, 'getFilename')) {
            $filename = $entity->getFilename();
        } elseif (method_exists($entity, 'getSource')) {
            $filename = $entity->getSource();
        }

        if (!$filename) {
            return;
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // Set our renderer for eXeLearning files
        if (in_array($extension, ['elpx', 'zip'])) {
            if (method_exists($entity, 'setRenderer')) {
                $entity->setRenderer('exelearning_renderer');
            }
        }
    }

    /**
     * Handle media creation event.
     * Process uploaded eXeLearning files.
     *
     * @param Event $event
     */
    public function handleMediaCreate(Event $event)
    {
        $services = $this->getServiceLocator();
        $logger = $services->get('Omeka\Logger');

        $response = $event->getParam('response');
        $media = $response->getContent();

        $logger->info(sprintf('ExeLearning: handleMediaCreate called for media %d', $media->id()));
        $logger->info(sprintf('ExeLearning: Media filename: %s', $media->filename() ?? 'null'));
        $logger->info(sprintf('ExeLearning: Media original URL: %s', $media->originalUrl() ?? 'null'));

        // Check if this is an eXeLearning file
        if (!$this->isExeLearningFile($media)) {
            $logger->info('ExeLearning: Not an eXeLearning file, skipping');
            return;
        }

        $logger->info('ExeLearning: Processing eXeLearning file');

        try {
            $elpService = $services->get(Service\ElpFileService::class);
            $result = $elpService->processUploadedFile($media);
            $logger->info(sprintf(
                'ExeLearning: File processed successfully. Hash: %s, HasPreview: %s, ExtractPath: %s',
                $result['hash'],
                $result['hasPreview'] ? 'yes' : 'no',
                $result['extractPath'] ?? 'null'
            ));

            // Verify media data was saved by re-reading
            $mediaId = $media->id();
            $verifyMedia = $services->get('Omeka\ApiManager')->read('media', $mediaId)->getContent();
            $logger->info(sprintf(
                'ExeLearning: Verification - media data after save: %s',
                json_encode($verifyMedia->mediaData())
            ));
        } catch (\Exception $e) {
            $logger->err(sprintf(
                'ExeLearning: Failed to process uploaded file for media %d: %s',
                $media->id(),
                $e->getMessage()
            ));
            $logger->err('ExeLearning: Stack trace: ' . $e->getTraceAsString());
        }
    }

    /**
     * Handle media deletion event.
     * Clean up extracted content.
     *
     * @param Event $event
     */
    public function handleMediaDelete(Event $event)
    {
        $services = $this->getServiceLocator();
        $logger = $services->get('Omeka\Logger');

        try {
            // Get the entity directly from the event, not via API
            $entity = $event->getParam('entity');
            if (!$entity) {
                return;
            }

            $mediaId = $entity->getId();
            $filename = $entity->getFilename();

            if (!$filename) {
                return;
            }

            $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (!in_array($extension, ['elpx', 'zip'])) {
                return;
            }

            $logger->info(sprintf('ExeLearning: Cleaning up media %d', $mediaId));

            // Get the hash from entity data
            $data = $entity->getData();
            $hash = $data['exelearning_extracted_hash'] ?? null;

            if ($hash) {
                $basePath = $this->getDataPath();
                $extractPath = $basePath . '/' . $hash;
                $this->deleteDirectory($extractPath);
                $logger->info(sprintf('ExeLearning: Deleted extracted content at %s', $extractPath));
            }
        } catch (\Exception $e) {
            $logger->err(sprintf(
                'ExeLearning: Failed to cleanup media: %s',
                $e->getMessage()
            ));
        }
    }

    /**
     * Recursively delete a directory.
     *
     * @param string $dir
     */
    protected function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);

        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                $this->deleteDirectory($path);
            } else {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }

    /**
     * Check if a media item is an eXeLearning file.
     *
     * @param mixed $media
     * @return bool
     */
    protected function isExeLearningFile($media): bool
    {
        $filename = $media->filename();
        if (!$filename) {
            return false;
        }

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, ['elpx', 'zip']);
    }

    /**
     * Get the configuration form for this module.
     *
     * @param PhpRenderer $renderer
     * @return string
     */
    public function getConfigForm(PhpRenderer $renderer)
    {
        $services = $this->getServiceLocator();
        $settings = $services->get('Omeka\Settings');

        $form = new ConfigForm;
        $form->init();

        $form->setData([
            'exelearning_viewer_height' => $settings->get('exelearning_viewer_height', 600),
            'exelearning_show_edit_button' => $settings->get('exelearning_show_edit_button', true) ? '1' : '0',
        ]);

        return $renderer->formCollection($form, false);
    }

    /**
     * Handle the configuration form submission.
     *
     * @param AbstractController $controller
     */
    public function handleConfigForm(AbstractController $controller)
    {
        $services = $this->getServiceLocator();
        $settings = $services->get('Omeka\Settings');

        $config = $controller->params()->fromPost();

        $settings->set(
            'exelearning_viewer_height',
            (int) ($config['exelearning_viewer_height'] ?? 600)
        );
        $settings->set(
            'exelearning_show_edit_button',
            isset($config['exelearning_show_edit_button']) && $config['exelearning_show_edit_button'] === '1'
        );
    }
}
