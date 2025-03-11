<?php

namespace App\Enums;

enum InvoiceStatus: int
{
    case Open = 1;
    case Closed = 2;
    case Cancelled = 3;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Open => 'Open',
            self::Closed => 'Closed',
            self::Cancelled => 'Cancelled',
            default => 'Unknown',
        };
    }
}


