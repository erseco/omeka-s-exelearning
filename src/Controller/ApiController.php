<?php
declare(strict_types=1);

namespace ExeLearning\Controller;

use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\JsonModel;
use ExeLearning\Service\ElpFileService;

/**
 * REST API controller for eXeLearning operations.
 */
class ApiController extends AbstractActionController
{
    /** @var ElpFileService */
    protected $elpService;

    /**
     * @param ElpFileService $elpService
     */
    public function __construct(ElpFileService $elpService)
    {
        $this->elpService = $elpService;
    }

    /**
     * Save an edited eXeLearning file.
     *
     * POST /api/exelearning/save/:id
     *
     * @return JsonModel
     */
    public function saveAction()
    {
        $request = $this->getRequest();

        // Only accept POST requests
        if (!$request->isPost()) {
            $this->getResponse()->setStatusCode(405);
            return new JsonModel([
                'success' => false,
                'message' => 'Method not allowed',
            ]);
        }

        // Check authentication
        $user = $this->identity();
        if (!$user) {
            $this->getResponse()->setStatusCode(401);
            return new JsonModel([
                'success' => false,
                'message' => 'Unauthorized',
            ]);
        }

        // Validate CSRF token
        $csrfToken = $request->getPost('csrf') ?? $request->getHeaders()->get('X-CSRF-Token')?->getFieldValue();
        if ($csrfToken) {
            $csrf = new \Laminas\Validator\Csrf(['name' => 'csrf']);
            if (!$csrf->isValid($csrfToken)) {
                $this->getResponse()->setStatusCode(403);
                return new JsonModel([
                    'success' => false,
                    'message' => 'CSRF: Invalid or missing CSRF token',
                ]);
            }
        }

        $mediaId = $this->params('id');
        if (!$mediaId) {
            $this->getResponse()->setStatusCode(400);
            return new JsonModel([
                'success' => false,
                'message' => 'Media ID required',
            ]);
        }

        // Get the media
        $api = $this->api();
        try {
            $media = $api->read('media', $mediaId)->getContent();
        } catch (\Exception $e) {
            $this->getResponse()->setStatusCode(404);
            return new JsonModel([
                'success' => false,
                'message' => 'Media not found',
            ]);
        }

        // Check permissions
        $acl = $this->getEvent()->getApplication()->getServiceManager()->get('Omeka\Acl');
        if (!$acl->userIsAllowed($media->item(), 'update')) {
            $this->getResponse()->setStatusCode(403);
            return new JsonModel([
                'success' => false,
                'message' => 'Forbidden',
            ]);
        }

        // Get uploaded file
        $files = $request->getFiles();
        if (empty($files['file'])) {
            $this->getResponse()->setStatusCode(400);
            return new JsonModel([
                'success' => false,
                'message' => 'No file uploaded',
            ]);
        }

        $uploadedFile = $files['file'];

        // Check for upload errors
        if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
            $this->getResponse()->setStatusCode(400);
            return new JsonModel([
                'success' => false,
                'message' => 'Upload failed: error code ' . $uploadedFile['error'],
            ]);
        }

        try {
            // Replace the file
            $result = $this->elpService->replaceFile($media, $uploadedFile['tmp_name']);

            // Build preview URL
            $previewUrl = null;
            if ($result['hasPreview']) {
                $serverUrl = $this->getRequest()->getUri()->getScheme() . '://'
                    . $this->getRequest()->getUri()->getHost();
                $basePath = $this->getRequest()->getBasePath();
                $previewUrl = $serverUrl . $basePath . '/modules/ExeLearning/data/exelearning/'
                    . $result['hash'] . '/index.html';
            }

            return new JsonModel([
                'success' => true,
                'message' => 'File saved successfully',
                'media_id' => (int) $mediaId,
                'preview_url' => $previewUrl,
            ]);
        } catch (\Exception $e) {
            $this->getResponse()->setStatusCode(500);
            return new JsonModel([
                'success' => false,
                'message' => 'Save failed: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Get eXeLearning file data.
     *
     * GET /api/exelearning/elp-data/:id
     *
     * @return JsonModel
     */
    public function getDataAction()
    {
        $mediaId = $this->params('id');

        if (!$mediaId) {
            $this->getResponse()->setStatusCode(400);
            return new JsonModel([
                'success' => false,
                'message' => 'Media ID required',
            ]);
        }

        // Get the media
        $api = $this->api();
        try {
            $media = $api->read('media', $mediaId)->getContent();
        } catch (\Exception $e) {
            $this->getResponse()->setStatusCode(404);
            return new JsonModel([
                'success' => false,
                'message' => 'Media not found',
            ]);
        }

        $hash = $this->elpService->getMediaHash($media);
        $hasPreview = $this->elpService->hasPreview($media);

        // Build preview URL
        $previewUrl = null;
        if ($hash && $hasPreview) {
            $serverUrl = $this->getRequest()->getUri()->getScheme() . '://'
                . $this->getRequest()->getUri()->getHost();
            $basePath = $this->getRequest()->getBasePath();
            $previewUrl = $serverUrl . $basePath . '/modules/ExeLearning/data/exelearning/'
                . $hash . '/index.html';
        }

        return new JsonModel([
            'success' => true,
            'id' => (int) $mediaId,
            'url' => $media->originalUrl(),
            'title' => $media->displayTitle(),
            'filename' => $media->filename(),
            'hasPreview' => $hasPreview,
            'previewUrl' => $previewUrl,
        ]);
    }
}
