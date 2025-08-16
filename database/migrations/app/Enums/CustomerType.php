<?php

namespace App\Enums;

enum CustomerType: string
{
    case INDIVIDUAL = 'individual';
    case COMPANY = 'company';
    case GROUP = 'group';

    // This method returns an array of all the enum values
    public static function values(): array
    {
        return [
            self::INDIVIDUAL->value,
            self::COMPANY->value,
            self::GROUP->value,
        ];
    }

    public function label(): string
    {
        return match ($this) {
            self::INDIVIDUAL => 'Individual',
            self::COMPANY => 'Company',
            self::GROUP => 'Group',
        };
    }
}
