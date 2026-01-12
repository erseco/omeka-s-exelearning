<?php

declare(strict_types=1);

namespace Doctrine\ORM;

/**
 * Minimal stub for Doctrine\ORM\EntityManager for tests.
 */
class EntityManager
{
    public function find(string $className, $id)
    {
        return null;
    }

    public function persist($entity): void
    {
    }

    public function flush(): void
    {
    }

    public function refresh($entity): void
    {
    }
}
