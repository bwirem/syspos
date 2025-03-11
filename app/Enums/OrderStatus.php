<?php

namespace App\Enums;

enum OrderStatus: int
{
    case Open = 0;
    case Closed = 1;
    case Partial = 2;
    case Approved = 3;
    case Checked = 4;
    case Voided = 5;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Open => 'Open',
            self::Closed => 'Closed',
            self::Partial => 'Partial',
            self::Approved => 'Approved',
            self::Checked => 'Checked',
            self::Voided => 'Voided',
            default => 'Unknown',
        };
    }
}


