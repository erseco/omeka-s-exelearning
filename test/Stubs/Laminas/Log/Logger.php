<?php

declare(strict_types=1);

namespace Laminas\Log;

/**
 * Minimal stub for Laminas\Log\Logger for tests.
 */
class Logger
{
    private array $messages = [];

    public function info(string $message, array $extra = []): void
    {
        $this->messages[] = ['level' => 'info', 'message' => $message];
    }

    public function err(string $message, array $extra = []): void
    {
        $this->messages[] = ['level' => 'err', 'message' => $message];
    }

    public function warn(string $message, array $extra = []): void
    {
        $this->messages[] = ['level' => 'warn', 'message' => $message];
    }

    public function debug(string $message, array $extra = []): void
    {
        $this->messages[] = ['level' => 'debug', 'message' => $message];
    }

    public function getMessages(): array
    {
        return $this->messages;
    }
}
