<?php

namespace App\Enums;

enum DebtorTypes: int
{
    case Individual = 0;
    case Group = 1;

    public static function getLabel(int $value): string
    {
        return match ($value) {
            self::Individual => 'Individual',
            self::Group => 'Group',
            default => 'Unknown',
        };
    }
}

