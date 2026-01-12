<?php

declare(strict_types=1);

namespace Laminas\View\Model;

/**
 * Minimal stub for Laminas\View\Model\ViewModel for tests.
 */
class ViewModel
{
    private array $variables;
    private string $template = '';
    private bool $terminal = false;

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

    public function setTemplate(string $template): self
    {
        $this->template = $template;
        return $this;
    }

    public function getTemplate(): string
    {
        return $this->template;
    }

    public function setTerminal(bool $terminal): self
    {
        $this->terminal = $terminal;
        return $this;
    }

    public function isTerminal(): bool
    {
        return $this->terminal;
    }
}
