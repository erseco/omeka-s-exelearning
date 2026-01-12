<?php

declare(strict_types=1);

namespace Laminas\Http;

/**
 * Minimal stub for Laminas\Http\Response for tests.
 */
class Response
{
    private int $statusCode = 200;
    private string $content = '';
    private Headers $headers;

    public function __construct()
    {
        $this->headers = new Headers();
    }

    public function setStatusCode(int $code): self
    {
        $this->statusCode = $code;
        return $this;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function setContent(string $content): self
    {
        $this->content = $content;
        return $this;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function getHeaders(): Headers
    {
        return $this->headers;
    }
}
