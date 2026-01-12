<?php

declare(strict_types=1);

namespace Laminas\Http;

/**
 * Minimal stub for Laminas\Http\Headers for tests.
 */
class Headers
{
    private array $headers = [];

    public function addHeaderLine(string $name, $value = null): self
    {
        $this->headers[$name] = new class($name, $value) {
            private string $name;
            private $value;

            public function __construct(string $name, $value)
            {
                $this->name = $name;
                $this->value = $value;
            }

            public function getFieldName(): string
            {
                return $this->name;
            }

            public function getFieldValue(): string
            {
                return (string) $this->value;
            }
        };
        return $this;
    }

    public function get(string $name)
    {
        return $this->headers[$name] ?? null;
    }

    public function toArray(): array
    {
        return $this->headers;
    }
}
