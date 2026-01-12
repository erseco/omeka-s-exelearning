<?php

declare(strict_types=1);

namespace Laminas\View\Model;

/**
 * Minimal stub for Laminas\View\Model\JsonModel for tests.
 */
class JsonModel
{
    private array $variables;

    public function __construct(array $variables = [])
    {
        $this->variables = $variables;
    }

    public function getVariables(): array
    {
        return $this->variables;
    }

    public function getVariable(string $name, $default = null)
    {
        return $this->variables[$name] ?? $default;
    }

    public function setVariable(string $name, $value): self
    {
        $this->variables[$name] = $value;
        return $this;
    }
}
