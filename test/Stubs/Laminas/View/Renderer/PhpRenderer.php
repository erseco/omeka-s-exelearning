<?php

declare(strict_types=1);

namespace Laminas\View\Renderer;

class PhpRenderer
{
    /** @var object */
    private $headScript;
    /** @var object */
    private $headStyle;

    public function __construct()
    {
        $this->headScript = new class {
            /** @var array<int, string> */
            public array $files = [];
            public function appendFile(string $url, $type = null): void
            {
                $this->files[] = $url;
            }
            public function appendScript(string $script): void
            {
            }
        };

        $this->headStyle = new class {
            /** @var array<int, string> */
            public array $styles = [];
            public function appendStyle(string $style): void
            {
                $this->styles[] = $style;
            }
        };
    }

    public function headScript()
    {
        return $this->headScript;
    }

    public function inlineScript()
    {
        return $this->headScript();
    }

    public function headStyle()
    {
        return $this->headStyle;
    }

    public function assetUrl(string $path, ?string $module = null): string
    {
        $prefix = $module ? "/modules/{$module}/" : "/assets/";
        return $prefix . ltrim($path, '/');
    }

    public function plugin(string $name)
    {
        if ($name === 'setting') {
            return function (string $key, $default = null) {
                return $default;
            };
        }
        return null;
    }

    public function translate(string $message): string
    {
        return $message;
    }

    public function escapeHtmlAttr(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public function escapeHtml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
