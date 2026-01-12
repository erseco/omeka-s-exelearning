<?php

declare(strict_types=1);

namespace Omeka\Api\Representation;

/**
 * Minimal stub of Omeka's MediaRepresentation for tests.
 */
class MediaRepresentation
{
    private string $originalUrl;
    private string $displayTitle;
    private string $filename;
    private int $id;

    public function __construct(string $originalUrl, string $displayTitle, string $filename, int $id = 1)
    {
        $this->originalUrl = $originalUrl;
        $this->displayTitle = $displayTitle;
        $this->filename = $filename;
        $this->id = $id;
    }

    public function originalUrl(): string
    {
        return $this->originalUrl;
    }

    public function displayTitle(): string
    {
        return $this->displayTitle;
    }

    public function filename(): string
    {
        return $this->filename;
    }

    public function id(): int
    {
        return $this->id;
    }
}
