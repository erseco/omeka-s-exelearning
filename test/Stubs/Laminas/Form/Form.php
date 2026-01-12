<?php

declare(strict_types=1);

namespace Laminas\Form;

/**
 * Minimal stub for Laminas\Form\Form for tests.
 */
class Form
{
    protected array $elements = [];
    protected string $name = '';

    public function __construct(?string $name = null, array $options = [])
    {
        $this->name = $name ?? '';
    }

    public function add(array $elementSpec): self
    {
        $this->elements[$elementSpec['name']] = $elementSpec;
        return $this;
    }

    public function get(string $name): ?array
    {
        return $this->elements[$name] ?? null;
    }

    public function has(string $name): bool
    {
        return isset($this->elements[$name]);
    }

    public function getElements(): array
    {
        return $this->elements;
    }

    public function init(): void
    {
        // Override in subclasses
    }
}
