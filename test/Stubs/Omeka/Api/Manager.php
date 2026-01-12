<?php

declare(strict_types=1);

namespace Omeka\Api;

/**
 * Minimal stub for Omeka\Api\Manager for tests.
 */
class Manager
{
    public function read(string $resource, $id, array $options = [])
    {
        return null;
    }

    public function update(string $resource, $id, array $data, array $options = [])
    {
        return null;
    }

    public function search(string $resource, array $data = [], array $options = [])
    {
        return null;
    }
}
