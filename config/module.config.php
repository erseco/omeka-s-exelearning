<?php
declare(strict_types=1);

namespace ExeLearning;

use Laminas\Router\Http\Literal;
use Laminas\Router\Http\Segment;

return [
    'view_manager' => [
        'template_path_stack' => [
            dirname(__DIR__) . '/view',
        ],
    ],

    'controllers' => [
        'factories' => [
            Controller\ApiController::class => Controller\ApiControllerFactory::class,
            Controller\EditorController::class => Controller\EditorControllerFactory::class,
        ],
    ],

    'service_manager' => [
        'factories' => [
            Service\ElpFileService::class => Service\ElpFileServiceFactory::class,
        ],
    ],

    'form_elements' => [
        'invokables' => [
            Form\ConfigForm::class => Form\ConfigForm::class,
        ],
    ],

    'file_renderers' => [
        'factories' => [
            'exelearning_renderer' => Media\FileRenderer\ExeLearningRendererFactory::class,
        ],
        'aliases' => [
            // MIME types
            'application/zip' => 'exelearning_renderer',
            'application/x-zip-compressed' => 'exelearning_renderer',
            'application/octet-stream' => 'exelearning_renderer',
            // File extensions
            'elpx' => 'exelearning_renderer',
            'zip' => 'exelearning_renderer',
        ],
    ],

    'router' => [
        'routes' => [
            'exelearning-api' => [
                'type' => Literal::class,
                'options' => [
                    'route' => '/api/exelearning',
                    'defaults' => [
                        '__NAMESPACE__' => 'ExeLearning\Controller',
                        'controller' => 'Api',
                    ],
                ],
                'may_terminate' => false,
                'child_routes' => [
                    'save' => [
                        'type' => Segment::class,
                        'options' => [
                            'route' => '/save/:id',
                            'constraints' => [
                                'id' => '\d+',
                            ],
                            'defaults' => [
                                'action' => 'save',
                            ],
                        ],
                    ],
                    'elp-data' => [
                        'type' => Segment::class,
                        'options' => [
                            'route' => '/elp-data/:id',
                            'constraints' => [
                                'id' => '\d+',
                            ],
                            'defaults' => [
                                'action' => 'getData',
                            ],
                        ],
                    ],
                ],
            ],
            'admin' => [
                'child_routes' => [
                    'exelearning-editor' => [
                        'type' => Segment::class,
                        'options' => [
                            'route' => '/exelearning/editor/:action[/:id]',
                            'constraints' => [
                                'action' => '[a-zA-Z][a-zA-Z0-9_-]*',
                                'id' => '\d+',
                            ],
                            'defaults' => [
                                '__NAMESPACE__' => 'ExeLearning\Controller',
                                'controller' => 'Editor',
                                'action' => 'index',
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ],

    'translator' => [
        'translation_file_patterns' => [
            [
                'type' => 'gettext',
                'base_dir' => dirname(__DIR__) . '/language',
                'pattern' => '%s.mo',
                'text_domain' => null,
            ],
        ],
    ],

    'exelearning' => [
        'settings' => [
            'exelearning_viewer_height' => 600,
            'exelearning_show_edit_button' => true,
        ],
    ],
];
