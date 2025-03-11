<?php

namespace App\Enums;

enum ProductTransTypes: int
{
    case Receive = 1;
    case Issue = 2;
    case Adjustment = 3;
    case SystemAdjustment = 4;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Receive => 'Receive',
            self::Issue => 'Issue',
            self::Adjustment => 'Adjustment',
            self::SystemAdjustment => 'System Adjustment',
            default => 'Unknown',
        };
    }
}
