<?php

namespace App\Enums;

enum SavingsStatus: int
{
    case Active = 1;
    case Closed = 2;
    case Dormant = 3;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Active->value => 'Active',
            self::Closed->value => 'Closed',
            self::Dormant->value => 'Dormant',
            default => 'Unknown',
        };
    }
}